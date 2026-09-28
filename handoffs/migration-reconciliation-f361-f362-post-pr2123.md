# Handoff — Migration reconciliation: F-361 / F-362 + the new auth-guard fix

**Written:** 28 Sep 2026, end of the session that merged PR #2123
**For:** a fresh chat picking up where this one left off
**Repo:** `rto-compass-hub`, work should happen in a **new worktree** (branch off current `origin/main`, which is `200879ab7` at time of writing)

## Where things actually stand right now (verified live, not from memory)

I checked both Supabase projects directly before writing this — trust this section over anything a KB doc says, since those may be stale.

**Production** (`gdwhlstfguxarnxasrrs`) latest migration: `20260928032844_tas_create_revision_set_previous_tas_id`.
It does **not** yet have:
- `20260928080000_update_invitation_role_allowlist` (the F-361 role-contract fix, PR #2079)
- `20260928090000_harden_rpc_tas_create_revision_write_authority` (the new SuperAdmin/inactive-tenant authorization fix, PR #2123)

Both are merged to `main` but **not applied to production**. Production apply here is not automatic on merge — confirmed by this exact gap.

**QA** (`vemkbbdjzkkgmmfuweod`) latest migration: `20260923070000_map_chc43121_disability_support_anzsco`.
QA is **~34 migrations behind `main`**, including missing:
- `20260922111202_gate_create_invitation_with_tracking` — the original F-207 security gate itself
- Everything from the reconciled PR #2078 migrations onward
- Both migrations listed above

This means QA can't currently be used to verify either fix — it would apply the gate and the forward-fix together instead of testing the real "already-gated" production scenario, and it's missing the TAS builder hardening entirely.

## What this work actually is

Three separate but related threads, all currently open:

### 1. F-361 — invitation role contract migration deployment
`docs/kb/registers/findings/F-361-create-invitation-role-contract-diverges-from-canonical-ui.md`
Its own recorded next action: "Carl/RBAC and Angela/Stabilization should review the branch contract; RJ should confirm the Trainer/Assessor compatibility rule. Then run the relevant UI/authorization QA and apply the migration through the governed deployment path." That review hasn't happened yet as far as I can tell — check for updates before assuming it's still needed.

### 2. F-362 — legacy `rpc_invites_create` disposition
`docs/kb/registers/findings/F-362-rpc-invites-create-is-an-unused-but-authenticated-legacy-invitation-writer.md`
Next action: confirm the function's existence, grants, and recent usage in production (read-only Supabase check — I never did this, it's still open), then choose retire-or-maintain.

### 3. NEW — `rpc_tas_create_revision` authorization hardening deployment (from this session's PR #2123)
Not yet a filed finding/decision — I didn't file one, per direction from Khian this session to fix-first rather than paperwork-first. If you want a durable record, this is a good candidate for one now, since it describes a real (already-closed-in-code, not-yet-deployed) gap:
- Production currently runs `rpc_tas_create_revision` calling `assert_tas_write_authority`, which lets SuperAdmin bypass every check and never verifies the tenant is active.
- `20260928090000` (merged, not deployed) swaps it to `assert_tas_builder_write_authority`, which denies SuperAdmin support-mode writes (F-065 pattern) and checks tenant-active/write-lock/role.
- It also fixes a cross-tenant existence-oracle bug Copilot found in review (same migration, not yet live anywhere, so no production exposure from that specific sub-issue).
- Live disposable-Postgres test exists (`tests/supabase/rpc-tas-create-revision-write-authority.pg.test.ts`) but **I never got to see it actually run** — no Postgres/Docker was available in my environment, so it only ever collected/parsed cleanly locally. It's wired into `ci.yml`'s Postgres migration-guard job, but that job's real execution status on the merge commit is unknown to me (the required checks never finished before Khian merged — see below). **First thing to check in the new session: did this test actually pass in CI on `main` after the merge?**

## The governed deployment path (read this before touching either project)

`AGENTS.md`'s migrations section: a migration reaches production only through the merged-file + governed sync flow — never `apply_migration`, never dashboard SQL, never a raw `psql`/`supabase db push` against it directly.

**This is now technically enforced, not just documented.** This session built `scripts/guard-production-writes.mjs`, wired into Claude Code (`.claude/settings.json`), Codex (`.codex/hooks.json`), and Cursor (`.cursor/hooks.json`) as a pre-action hook. It blocks `apply_migration`, `execute_sql` (unconditionally, against production), `deploy_edge_function`, `*_branch`/`restore_project`/`pause_project`, and shell commands like `supabase db push`/`db reset`/`migration up`/`migration repair`/`link`/`functions deploy`/`secrets set`/`psql`/raw connection strings — all scoped to production specifically; QA remains reachable normally. It's verified working (live subagent test, see PR #2123's plan file). **You shouldn't be able to accidentally push straight to production even if you try** — if a legitimate governed action gets blocked by it, that's worth flagging, not routing around.

The actual QA sync path is `npm run qa:sync` (`scripts/qa-sync.mjs`), gated by `scripts/qa-target-guard.mjs` (fails closed, allowlist is currently just `vemkbbdjzkkgmmfuweod`).

## Why QA is so far behind — worth understanding before syncing it

QA hasn't been synced in a while (34 migrations is a lot). Before just running `npm run qa:sync` and catching it up blindly:
- Check `docs/kb/reference/quality-program/phase-3-playwright-foundation/packet-003-complyhub-qa-verification-transition.md` — this was IN_PROGRESS as of 25 Sep, replacing Supabase Preview with `complyhub-qa` verification. It may have context on why QA wasn't kept current, or a reason to be deliberate about the next sync rather than just catching it up mechanically.
- `qa-migration-preflight.mjs` / `qa-migration-classifier.mjs` / `supabase/migration-safety-allowlist.json` exist specifically to review each migration for QA-safety (DML in function bodies, destructive operations, etc.) before syncing — don't bypass that review just because there's a backlog.

## Suggested order of operations for the new session

1. Fresh session start: pull `complyhub-kb`, confirm which worktree registry slot (if any) applies, read `rto-compass-hub/CLAUDE.md` and `AGENTS.md` fresh (don't trust memory of this session).
2. Re-verify current live state yourself (`list_migrations` on both projects) — don't trust this doc's numbers if time has passed.
3. Check whether `tests/supabase/rpc-tas-create-revision-write-authority.pg.test.ts` actually passed in CI on the PR #2123 merge commit. If it failed, that's the first thing to fix, and it means the authorization fix's correctness isn't actually proven yet.
4. Decide with Khian (and Carl/Angela/RJ per each finding's own named reviewers) whether to: (a) do a proper QA sync first and verify all three items there, or (b) treat the two migrations as low-enough-risk (both already narrowly scoped, already merged, already reviewed) to promote to production directly via the governed path with just the QA-safety static review, given QA itself needs a larger catch-up effort that's a separate piece of work. I don't have a strong opinion — this is a real tradeoff, not obvious.
5. Whichever path: this is production data/schema. Confirm explicitly with Khian before any actual `qa:sync` or governed production apply, per this workspace's standing hard gates (never commit/push/apply without explicit go-ahead).

## Heads up — unrelated to this handoff, but CI on `main` is currently red

After the merge, GitHub's own CI run on `main` (run `36433891750`) failed. I checked why before writing this: it's a single genuine test failure, `tests/tas/tasSprint4NarrativeProtection.test.ts:119` — `expect(source).toContain("effectiveRole === 'Regulatory Officer'")`, about a narrative editor's Regulatory Officer read-only UX, nothing to do with anything in PR #2123.

**Confirmed pre-existing** — I checked out the commit `main` was at immediately before this merge (`1d97f47c4`) and ran the same test file in isolation: it fails there too, identically. So this isn't something this session caused; it was already broken on `main`. The CI aggregate step marks several other checks (lint, type check, migration guards, risk contract) as "failure" too, but that's just this pipeline's coarse-grained job-level rollup — the same job's own internal summary shows those individually passed; only the one test file actually failed.

Worth a quick fix by someone, or at least a finding filed — I didn't do either since it's out of scope for what I was asked to do this session, but flagging it here so it doesn't get missed.

## Useful context from this session, if you want it

- PR #2123: https://github.com/ComplyHub-ai/rto-compass-hub/pull/2123 (merged, commit `200879ab7`)
- `plans/pr-2123.md` in the repo has the full session narrative (4 Copilot review rounds, 12 findings fixed, live guard verification)
- Issue #2074 (the original drift incident this PR reconciled) is closed
- PR #2078 (Angela's original TAS builder PR) is closed as superseded
