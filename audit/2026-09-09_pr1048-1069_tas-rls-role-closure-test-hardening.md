# Audit — PR #1048 / PR #1069

> **Date:** 9 September 2026; **Merged:** #1048 8 Sep 2026 23:52 UTC, #1069 9 Sep 2026 00:08 UTC
> **Scope:** Harden the TAS Builder security test suite's RLS/role-closure assertions; two follow-up
> rounds fixing issues found after #1048's auto-merge.
> **Project:** `gdwhlstfguxarnxasrrs` (ComplyHub RTO production) · **Living doc:** none — tracked in
> `active-work.md`'s per-PR evidence log, this session

---

## Summary

GitHub Copilot's coding agent opened PR #1048 to close issue #643: harden
`tests/security/tas-route-role-closure.test.ts` with explicit assertions that the 5 core TAS tables
(`q1_tas_builder`, `q1_tas_builder_settings`, `q1_tas_units`, `tas_draft_sections`, `tas_governance`)
carry RESTRICTIVE RLS policies matching the canonical author/read-only role split, and to drop a
stale `CONSULTANT_ASSISTANT` role reference from the same test. Test-only PR, no migrations, no
edge functions, no application code in its original diff.

Three things happened after the initial `/pr-review` pass that are worth recording precisely
because none of them are visible from the PR's final diff alone:

1. **A real merge conflict** — `main` had independently fixed the same brittle JSX-whitespace test
   assertion one day after this branch forked (PR #1050). Resolved in favour of `main`'s existing
   pattern.
2. **A pre-existing dead-code bug surfaced during review, then fixed in-branch on Brian's
   instruction** — `ROLES.CONSULTANT_ASSISTANT` had been deleted from the single source-of-truth
   `ROLES` object by an unrelated commit (`f302735ec`, 6 Sep 2026) without updating its 4 callers,
   leaving a TypeScript compile error sitting on `main` since then, undetected because this repo's
   `type-check` command is vacuous (solution-style tsconfig, documented gotcha).
3. **The PR auto-merged itself** — this repo's `enable-automerge` GitHub Actions job merged #1048
   the moment CI went green, seconds after the second fix was pushed, bypassing the intended human
   approval step. GitHub Copilot's own automated reviewer then left 6 comments on the now-merged
   PR; 3 were confirmed real gaps in the new test's own rigor (it would have kept passing through
   several classes of future regression). Those were fixed in a second PR, #1069.

**Branches:** `copilot/fix-tas-authoring-role-contract` (#1048, merged, remote-deleted),
`fix/tas-rls-test-rigor-followup` (#1069, merged, remote-deleted) · **Merge commits:**
`c8fddf4baac7c39edda8c75e0f18f80f8154637a` (#1048), `0c9d5dd9e8a19bdcb24abb958d75c5de951e24a9`
(#1069) · **PRs:** [#1048](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1048),
[#1069](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1069)

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Security test coverage | No automated check that RLS policies on the 5 core TAS tables actually match the intended role contract | Original ask (issue #643) — closed by #1048's new assertions |
| **(review finding)** Merge state | PR #1048 showed `mergeStateStatus: CONFLICTING` on dry-run | `main` had already fixed the same brittle JSX-whitespace assertion in `phase1b-bulk-suite-import.test.ts` via PR #1050, one day after this branch forked — same problem, two independent fixes, textually incompatible |
| **(review finding)** Dead code / compile error | `ROLES.CONSULTANT_ASSISTANT` referenced in 4 unrelated files (`RegisterCascadeRowActions.tsx`, `documentNotificationHelpers.ts`, `ofi/index.tsx`, `SsoMonthlyPack.tsx`) | Commit `f302735ec` (6 Sep 2026) deleted the constant from `src/lib/constants/roles.ts` without updating its callers; confirmed via live DB that the role has zero active users (`tenant_members`: 0 rows `Consultant Assistant`, 223 `Consultant`) and is now DB-blocked by two 6 Sep migrations, so the retirement itself was correct — only the frontend cleanup was incomplete |
| **(Copilot bot finding, post-merge)** Test rigor gap 1 | Role-matrix test only checked roles were *present* in `TenantGuard.tsx`, never that read-only/non-TAS roles were *excluded* from the write set | Confirmed against `main`: no exclusion assertions existed at all |
| **(Copilot bot finding, post-merge)** Test rigor gap 2 | Policy assertions stopped before the `FOR <ACTION>` clause | Confirmed: `expect(rlsMigration).toContain(\`CREATE POLICY "${name}" ... AS RESTRICTIVE\`)` never checked the action, so a policy misdeclared under the wrong SQL action would still pass |
| **(Copilot bot finding, post-merge)** Test rigor gap 3 | Role-array checks searched the whole migration file, and were pinned to one hardcoded migration filename | Confirmed: `toContain(role)` searched the entire file (one correct policy could mask a wrong one elsewhere); migrations are append-only, so a later migration could weaken a policy while the test kept reading the frozen snapshot |

---

## Commit history (substantive only)

### PR #1048 (squash-merged as `c8fddf4ba`)

| Commit (pre-squash) | Summary |
|---|---|
| `65d286d76`, `f00b28dc6` | Copilot coding agent scaffolding ("Initial plan") |
| `cf4aee711` | Original PR: RLS/role-closure test assertions + JSX-whitespace regex fix |
| `c2754f2fc` | Merge `origin/main` in; resolved the JSX-whitespace conflict in favour of `main`'s existing PR #1050 pattern; `html/html.meta.json.gz` modify/delete resolved by taking `main`'s deletion |
| `7bd348e3b` | Removed the dead `ROLES.CONSULTANT_ASSISTANT` reference from the 4 files above, on Brian's instruction after the finding was surfaced |

### PR #1069 (merged as `0c9d5dd9e`)

| Commit | Summary |
|---|---|
| `5889922f0` | Rewrote `tests/security/tas-route-role-closure.test.ts` to close all 3 confirmed Copilot-bot rigor gaps (cherry-picked from the original branch's `168e56116`, since #1048 had already auto-merged by the time this was written) |

---

## Fixes shipped

### Security test suite (`tests/security/tas-route-role-closure.test.ts`)

- **#1048:** Added assertions that all 20 `tas_role_<action>_<table>` RLS policies (5 tables × 4
  actions) exist as RESTRICTIVE in the migration; removed the stale `CONSULTANT_ASSISTANT`
  presence check.
- **#1069:** Role-matrix test now extracts the exact `TAS_AUTHOR_ROLES`/`TAS_READ_ROLES` array
  blocks from `TenantGuard.tsx` (regex-scoped, not whole-file) and asserts both presence *and*
  exclusion (Trainer/Assessor, Regulatory Officer, Executive, Student Support Officer, Student,
  Employer, Third Party must never appear in the write-role set; the 4 non-TAS roles must never
  appear in either set). Added `effectivePolicyStatements()`, a helper that scans every file in
  `supabase/migrations/` in chronological order and keeps the *last* `CREATE POLICY` hit per name —
  matching Postgres's own last-wins application order — replacing a single hardcoded migration
  filename read. Replaced the old 3 presence/whole-file-search tests with one test asserting each
  of the 20 policies' exact full statement (action, clause, role array) via string equality against
  its effective (latest) definition.

### Frontend role references (#1048 only)

- **`RegisterCascadeRowActions.tsx`, `documentNotificationHelpers.ts`, `ofi/index.tsx`,
  `SsoMonthlyPack.tsx`** — removed the dead `ROLES.CONSULTANT_ASSISTANT` entry from 4 role-allowlist
  arrays (register cascade-escalation roles, document status-change notify roles, OFI edit roles,
  SSO monthly-pack threshold-edit roles). No behavioural change for any real user — confirmed zero
  production `tenant_members` rows hold that role.

### Database

None. No migrations in either PR. The 20 RLS policies asserted against already existed in
production, applied via the 4 Sep 2026 baseline squash (`20260904040002_baseline_12.sql`) — verified
directly against live `pg_policies` on `gdwhlstfguxarnxasrrs` (all 20 present, all RESTRICTIVE,
`roles = {authenticated}`, matching the test's expectations exactly).

### Edge functions

None touched, none redeployed.

---

## Review rounds

1. **`/pr-review` full gauntlet on #1048** (this session) — schema verification (20 policy
   assertions cross-checked against both the migration file and live `pg_policies`), CI check
   review (all required checks green), dry-run merge (found the real JSX-whitespace conflict,
   resolved), scoped lint + `git diff --check` (clean).
2. **PR merged automatically** by the repo's `enable-automerge` Actions job before Stage 4 (human
   approve/merge) was reached — flagged to Brian as a process note, not something either of us
   triggered.
3. **GitHub Copilot's automated PR reviewer**, post-merge — left 6 comments. 3 confirmed real
   (test-rigor gaps, see Problem Statement); 1 already moot (the greedy-regex concern was resolved
   by the merge-conflict fix above, in favour of `main`'s pattern); 1 stale (claimed "no migration
   or DB-policy test added," inapplicable to the merged state); Cursor Bugbot did not run
   (team on-demand spend limit reached, per its own comment on the PR).
4. **Fix verification for the test-rigor rewrite** (#1069) — ran the rewritten test file (5/5
   passing), confirmed none of the 20 policy names are redefined in any migration after the
   baseline (each still lives in exactly 1 file today, so the rewrite is correct now while adding
   real future-drift protection), scoped ESLint + `git diff --check` clean.

---

## Production rollout (post-merge)

1. **Vercel production** — #1048: deployment `dpl_H24zCSQMzdcHepeMiQAmw2tdxwMF`, `state: READY`,
   `target: production`. #1069: deployment `dpl_8VBFz8Uzf3fA4y3qADL3DVoWKM5i`, `state: READY`,
   `target: production`. Both confirmed via Vercel MCP `list_deployments`, not assumed.
2. **Edge functions** — none, no deploy needed.
3. **Migrations** — none, no apply needed.
4. **Worktrees** — Worktree A (`rto-compass-hub`) used throughout; released back to `main` (fast-forwarded to `0c9d5dd9e`) after #1069 merged, registry row in `active-work.md` marked unclaimed.

---

## Manual QA checklist (post-merge — Brian-gated)

This PR pair is test-suite-only — there is no user-facing behaviour to click through. Nothing is
owed here beyond what's already been verified programmatically above (live `pg_policies` match,
all tests green, both deploys `READY`).

---

## Still open / follow-up

- **Not fixed, needs its own FRAME:** the underlying reason `ROLES.CONSULTANT_ASSISTANT` could be
  deleted without TypeScript catching the 4 broken callers is that `npm run type-check` on this
  repo is vacuous (solution-style root `tsconfig.json`, documented in
  `complyhub-kb/pinned/conventions.md`). This class of bug (a deleted `as const` object key with
  live callers) will recur silently until that's fixed or callers are audited some other way.
- **Not fixed, low priority:** the `enable-automerge` GitHub Actions job merged #1048
  autonomously the moment CI went green, without a human ever running Stage 4 (approve/merge).
  Worth a decision on whether that's desired behaviour for all Copilot-authored PRs or should be
  scoped down — flagged to Brian during the session, no decision made yet either way.

---

## Soak status

No feature flag — test-suite-only change, nothing to soak. Risk tier: none (no production
behaviour changed; the RLS policies these tests assert against were already live and unchanged by
either PR).

---

## References

- PR #1048: https://github.com/ComplyHub-ai/rto-compass-hub/pull/1048
- PR #1069: https://github.com/ComplyHub-ai/rto-compass-hub/pull/1069
- Merge commits: `c8fddf4baac7c39edda8c75e0f18f80f8154637a`, `0c9d5dd9e8a19bdcb24abb958d75c5de951e24a9`
- Vercel deployments: `dpl_H24zCSQMzdcHepeMiQAmw2tdxwMF`, `dpl_8VBFz8Uzf3fA4y3qADL3DVoWKM5i`
- Active work ledger: `active-work.md` (PR #1048/#1069 evidence entries, 9 Sep 2026)
