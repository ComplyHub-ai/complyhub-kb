# Open PR Review — rto-compass-hub

**Documented:** 09 July 2026
**Investigated by:** Khian (via Claude Code)
**Updated:** 09 July 2026 — added changelog cross-reference (Angela's 8 July engineering changelog vs. actual repo/PR/production state); added actioned-PRs log (#155 merged + deployed, plus two related production bugs found and fixed along the way)
**Updated:** 09 July 2026 (later) — 5 new PRs opened after the original review (#165, #166, #167, #168, #169), reviewed and cross-referenced against the existing queue
**Updated:** 10 July 2026 — #169 merged, deployed, migration applied to production
**Updated:** 10 July 2026 (later) — #168 merged and deployed, branch deleted
**Updated:** 10 July 2026 (later still) — #166 merged and deployed after two extra rounds of fixes (see detailed section below); `/pr-review` skill updated off the findings; next up is #165
**Updated:** 10 July 2026 (even later) — #165 fully re-reviewed and fixed after #166 landed underneath it (merge conflict + two rounds of post-push bot findings, plus a follow-up refactor); ready to merge, see "#165 — full history" section below
**Updated:** 10 July 2026 (later still) — cross-referenced an external branch-triage report (4 governance branches never merged: `governance-bug-fixes-3dea`, `governance-module-bugs-90cc`, `governance-register-and-meeting-9dfc`, `minutes-generation-hook-mismatch-ad47`) against #166/#165's actual fix history. One real gap found and confirmed still live on `main` — see "#166/#165 — branch-triage cross-reference" section below
**Updated:** 10 July 2026 (latest) — **#64 merged and deployed** — re-review against current `main` found the original APPROVE was based on migration filenames alone, not live production state; two rounds of fixes applied before merge (a column-rename regression + 3 bot-flagged findings), then verified live in production after apply. See "#64 — full history" section below.
**Updated:** 10 July 2026 (even later) — **#75 merged and deployed**, no migrations/edge functions to close out. Also investigated a Cursor bot comment on #64's already-merged migration claiming a `submitter_email`/`respondent_email` mismatch between `create_qi_response` and `send_qi_survey`/`remind_qi_survey` — confirmed **FALSE POSITIVE** directly against live production (a later gap-fill migration, `20260702031010`, already reconciled the columns before the comment was even left). No code change made. See "#75 — merged" and "#64 — Cursor bot false-positive follow-up" sections below.
**Updated:** 10 July 2026 (later) — 2 new PRs opened, reviewed: **#174** (batch anon-EXECUTE revoke sweep) and **#173** (trainer/student support RLS + bundled reconciliation migrations). See "New PRs found — #174 and #173" section below for full detail and how they slot into the queue.
**Updated:** 11 July 2026 — Angela's Tier A/B PR automation went live on `main` (CODEOWNERS, labeler, auto-merge, stale sweep). Multi-agent read-only audit of the live queue and ruleset; five new PRs (#178–#181, #183) tracked; several merges landed since the 10 July snapshot. See "Automation audit + queue refresh (11 July 2026)" below. Durable record convention: this file replaces `phase1-verdicts-partial.md` (retired).

---

## Automation audit + queue refresh (11 July 2026)

Read-only audit — **Angela's live GitHub config was not changed.** Full write-up:
`pr-process-automation-audit-2026-07-11.md` (workspace root, same folder as this file).

### Merged since the 10 July tracking snapshot

These are no longer open; listed so the queue doc stays current:

| # | Title | Notes |
|---|---|---|
| **#165** | feat(governance): meeting location type, attendee UX, register summary | Was ready 10 July; merged to `main` |
| **#167** | Cursor/persistent payment bar (superseded duplicate) | Close/supersede action completed |
| **#170–#177** | Various (incl. governance/industry-consultation work) | Landed on `main` during 10–11 July catch-up |
| **#177** | SSO monthly report form (merged as PR #177) | On `main` as of 11 July (`cursor/sso-monthly-report-form`) |
| **#182** | (branch work merged 11 July) | No longer in open queue |

### Queue snapshot (11 July 2026, ~22:43 UTC+8)

- **28 open PRs** — well above Angela's ~5 WIP review target; legacy queue must be cleared manually before the new process can be followed in practice.
- **5 new vs last doc entry (#174/#173):** #178, #179, #180, #181, #183
- **7 merge conflicts** (older PRs): #111, #122, #144, #152, #153, #159, #161
- **Automation backfill gap:** label workflow ran on some newer PRs only; many legacy PRs have no `tier-a` / `tier-b` label and were not auto-requested for review.

### Five newest PRs — mechanical triage (not full `/pr-review` verdicts)

| # | Title | Draft | Policy tier | GitHub label | Reviewers requested | Checks | Merge | Notes |
|---|---|---|---|---|---|---|---|---|
| **183** | Fix SSO monthly report authorization and submission state | yes | Tier B | `tier-b` | none | green | BLOCKED | Migration + SSO hooks; dry-run clean, `tsc` pass |
| **181** | fix: public QI survey blank screen + success state | yes | Tier A | — | KhianBrian | green | BLOCKED | UI only; label job never ran; banned-pattern hits (`as any` on public RPCs) need triage |
| **180** | Fix invite RPC grant and trial extension state | no | Tier B | — | KhianBrian, rjvivacity | green | BLOCKED | Migration-only; CODEOWNERS ✓; manual auto-merge ON but still blocked on approval |
| **179** | feat(billing): wire PersistentPaymentBar to AppContext | no | Tier B | — | **none** | green | BLOCKED | Billing + `AppContext`; **no CODEOWNERS request** — silent queue problem; banned-pattern hits in `AppContext.tsx` need triage |
| **178** | feat: Help Centre — data-driven, grouped by category | no | Tier B | `tier-b` | KhianBrian, rjvivacity | green | BLOCKED | UI-heavy but `src/integrations/supabase/types.ts` triggers Tier B path rule; manual auto-merge ON |

**Still open from 10 July doc — automation note on #173:** policy Tier B (migrations, functions, billing, tenant paths) but **no `tier-b` label**; only Khian requested (RJ missing). Prior verdict unchanged: REQUEST CHANGES, rebase conflict in `LiveMeetingTab.tsx`.

### Automation audit — headline findings (for humans, not config changes)

**Working:**

- Tier B CODEOWNERS gate is real — e.g. #180 had all required checks green but remained **BLOCKED** pending code-owner approval.
- Path-based classification is conservative when the labeler runs (any sensitive path → Tier B).
- Draft PRs correctly skip auto-merge (#181, #183).

**Gaps (documented only; no repo changes made in this audit):**

- Repo **CI workflow is disabled**; ruleset requires only Vercel + Vercel Preview Comments + Cursor Bugbot — **unattended Tier A auto-merge is not yet safe** until CI is re-enabled and required.
- Legacy PRs not backfilled with labels/reviewer requests (#179, #180, #173, most of queue).
- Dependabot auto-merge file lives under `.github/workflow/` (singular) — dormant; dependency PRs need manual policy.
- `blocked` / `wip` / `do-not-merge` labels do not currently stop `auto-merge.yml`.
- Future improvement (not implemented): mixed-scope labels (`scope:mixed`, `classification:uncertain`) on top of Angela's Tier A/B — see audit doc.

**Operational stance until legacy queue is cleared:**

- Treat **Tier B + human approval** as usable with manual `tsc` / lint / migration checks.
- Do **not** rely on unattended Tier A auto-merge for new PRs yet.
- Clear the ~28-PR backlog manually; push/reopen or label by hand so automation catches up per PR.

---

## New PRs found — #174 and #173 (10 July 2026)

Two new PRs appeared mid-queue. Both touch security/grant territory already worked on in this doc, so reviewed for overlap before slotting them in — not just diffed in isolation.

### #174 — security: Phase 3 batch-revoke anon EXECUTE on SECURITY DEFINER functions — MERGED ✅ (10 July 2026)

**Status: MERGED and applied to production, verified live.** Branch `cursor/phase3-anon-execute-revoke-f2e6` deleted. Merge commit `7732129b2` on `main`. Migration `20260710140000_revoke_anon_security_definer_batch_phase3.sql` applied to production project `gdwhlstfguxarnxasrrs`.

**Original scope:** a `DO $$` loop over `pg_proc` that revokes `anon`/`PUBLIC` EXECUTE and grants `authenticated`/`service_role` EXECUTE on every `SECURITY DEFINER` function in `public` (~1,558 functions), except an allowlist of public-facing functions (surveys, invite-accept, demo signup) that must stay anon-callable. Idempotent, clean dry-run merge against `main`.

**Manual allowlist cross-check (done pre-merge, since the PR's "Phase 4 branch-test checklist" doesn't apply — no branch-DB isolation in this repo):** walked every public/unauthenticated route in `AppRoutes.tsx` and grepped actual RPC callers in `src/`. Found two real gaps, also independently flagged by Cursor Bugbot: `check_email_trial_status` and `find_tenant_by_email_domain` are both called pre-auth from `DemoSignup.tsx` (`trial-signup` route, no `ProtectedRoute` wrapper) but were missing from the original 14-name allowlist. Also confirmed via GitHub Copilot review: the blanket `GRANT ... TO authenticated` would have silently re-opened `recompute_qi_register_rollup` and `find_auth_user_id_by_identity_email`, both deliberately restricted to `service_role`-only in prior migrations. Fixed by (1) adding the 2 missing names to the allowlist (now 16 total) and (2) changing the grant logic to only re-grant `authenticated` if the function already had that privilege before the migration ran. Pushed as commit `686159d39`, re-passed CI, then approved and merged.

**Post-merge production verification (mandatory step, not skipped):**
- Migration ledger did NOT show this migration pre-apply (confirmed via `list_migrations` — not a name-match assumption) → applied manually via `apply_migration` against `gdwhlstfguxarnxasrrs`.
- Verified via direct `execute_sql` against `pg_proc`/`has_function_privilege` post-apply: allowlisted functions (`accept_invitation`, `check_email_trial_status`, `find_tenant_by_email_domain`) retain anon EXECUTE; dropped functions (`create_demo_signup_admin`, `create_demo_user_complete`) lost anon EXECUTE but kept `authenticated`; the two deliberately-restricted functions (`recompute_qi_register_rollup`, `find_auth_user_id_by_identity_email`) are still `service_role`-only, confirming the Copilot fix held in production.
- Live anon-key smoke test (curl against the production REST endpoint, not just a DB privilege check): `check_email_trial_status` → HTTP 200. `create_demo_signup_admin` → `42501 permission denied`, confirming the revoke took effect for real anon traffic. `find_tenant_by_email_domain` → anon EXECUTE confirmed retained, but at the time originally threw `42P01: relation "public.email_domain_rules" does not exist` — a pre-existing bug in the function body, unrelated to this PR's grant changes.

**Incidental find — `find_tenant_by_email_domain` missing table — RESOLVED ✅ (10 July 2026, same day):** Initially non-blocking (`DemoSignup.tsx:356` catches the error and falls through to "continuing with trial"), but flagged for a real fix rather than left broken. A fix landed on `main` (commit `37a89d41b`, migration `20260710150000_retire_email_domain_rules_dead_table.sql`) — note this migration's own description targets a *different* function (`find_tenant_by_domain`, no "email_" prefix, plus `auto_assign_users`/`system_health_details`/`repair_user_account`), not `find_tenant_by_email_domain` directly, so it looked at first pass like the wrong function had been fixed. Re-verified directly against production rather than trusting the migration's stated scope: pulled `find_tenant_by_email_domain`'s live function body via `pg_get_functiondef` and confirmed the "legacy `email_domain_rules` fallback" block has in fact been removed from it (now only queries `tenant_email_domains` + membership inference) — so the underlying dead-table dependency was cleaned up here too, evidently via a companion change not fully captured by that migration's header comment. Confirmed end-to-end with a fresh anon-key curl smoke test: `HTTP 200`, `{"status": "no_match"}` — no more `42P01`. Considered closed; no further action needed.

### #173 — Fix/trainer student support RLS

**Verdict: REQUEST CHANGES — real merge conflict, must rebase before merge** (branch `fix/trainer-student-support-rls`, 14 files, +1443/-207). Adds a `trainer_id` FK + RESTRICTIVE RLS on `wellbeing_support_plans` (trainers can only see their own assigned plans, no write access), an "Assign to Trainer" field on the wellbeing support plan form, a new `useTrainerStudentSupport` hook, an AI-analysis-state-clear fix in `LiveMeetingTab.tsx`, and a "custom all label" tweak to `SearchFilterBar.tsx`.

It also bundles **8 reconciliation migrations** restating drift already applied directly to production (the same kind of untracked drift this doc has flagged before) — revoking anon/PUBLIC EXECUTE on payment/custom-id RPCs, restoring a trigger function's `search_path`, fixing an always-true billing-gate bypass on 4 tables, enabling RLS on a table missing from the repo baseline, seeding QI custom-ID sequences, setting `security_invoker` on 3 views, and revoking anon EXECUTE on internal/deprecated functions. **Verified live against production directly (read-only query): all 8 are confirmed safe no-ops** — every targeted function/table already has the intended grant/RLS state, just applied earlier under different (untracked) migration versions. Only the new `wellbeing_support_plans` RLS work is genuinely new.

**#174 vs #173 overlap:** real but harmless — both target some of the same functions (payment/custom-id/internal-deprecated), but since production is already at the end state both migrations produce, applying both in either order is redundant, not conflicting.

**Blocker:** `git merge-tree` shows a real conflict in `LiveMeetingTab.tsx` against current `main` (import-ordering clash from #166/#165's prior extensive rework of that file) — not a trivial adjacent-line issue, needs an actual rebase before this can merge.

**Other file-touch collisions to watch in the queue:** `LiveMeetingTab.tsx` is also touched by **#152**, **#161**, **#153** (still open) — whichever merges first will force a rebase on the others. `WellbeingSupportPlanForm.tsx` is also touched by **#103**. No other open PR touches `SearchFilterBar.tsx`.

**Merge-order conclusion:** #174 and #173 don't depend on each other and don't block/get blocked by the rest of the queue, except the known `LiveMeetingTab.tsx` collision with #152/#161/#153 and `WellbeingSupportPlanForm.tsx` with #103 — merge one of that group at a time, rebasing the others as they come up, same pattern already used for #152 vs #161.

---

## New PRs found — opened after the original 28-PR review (09 July 2026)

Fetching `main` surfaced 5 new PRs, plus 4 pushed branches with no PR yet (`cursor/governance-bug-fixes-3dea`, `cursor/governance-module-bugs-90cc`, `cursor/governance-register-and-meeting-9dfc`, `cursor/minutes-generation-hook-mismatch-ad47` — not actionable until a PR exists, worth watching since they look governance-related like #165/#166).

| # | Title | Verdict | Notes |
|---|---|---|---|
| **169** | Fix recent critical security regressions | **MERGED ✅ (10 July 2026)** | Live pre-merge verification found only **2 of the 4 claimed regressions were actually exploitable in production**: `sync_billing_subscription_from_stripe` had no service-role gate (any authenticated user could rewrite any tenant's billing subscription), and `governance_meeting_undo_start` allowed any active tenant member instead of just Admin/CM/Governing Person. The other 2 claims (`v_cb_trending_prompts` security_invoker, `materialise_onboarding_session_records` role gate) were already fixed by #155 on 09 July — reapplying was a harmless no-op. Confirmed no overlap with #153 (doesn't touch `governance_meeting_end`/meeting-close logic). No edge function in this PR. See "Actioned this session" log below for full merge/deploy detail. |
| **168** | chore(deps): patch high-severity build-toolchain vulnerabilities | **MERGED ✅ (10 July 2026)** | vite, glob, rollup/ws/@babel/core/lodash-es overrides, lint-staged pin. Does **not** touch react/react-dom — no interaction with #70's mismatch issue. Re-verified line-by-line before merge at Brian's request (dependency updates warrant extra caution): confirmed every changed package is build-toolchain/dev-only, zero UI library versions touched. Lockfile diff also incidentally fixed pre-existing drift (`remark-gfm` was declared in `package.json` — used by the Help Centre's `GuideRenderer.tsx` — but missing from `package-lock.json`; same version, no behaviour change, just the lockfile catching up). Clean, isolated, clean dry-run merge. No migration, no edge function. Merged by Brian, merge commit `1d6c5e591`, branch `chore/dep-vuln-bumps` deleted from remote (confirmed). |
| **165** | feat(governance): meeting location type, attendee UX, register summary | **READY TO MERGE (10 July 2026)** | Re-reviewed from scratch after #166 landed underneath it — the original "trivial adjacent-import conflict" note turned out to be stale; see "#165 — full history" below for the real merge conflict, two rounds of post-push bot findings (9 confirmed fixes), and a follow-up hook refactor + new unit tests. Vercel preview, Supabase Preview, `tsc`, `eslint`, and the test suite all clean as of the latest push. Not yet merged — waiting on Brian to click merge on GitHub. |
| **166** | feat(governance): waves 6 & 7 — AI minutes, pre-meeting pack, GP notify | **MERGED ✅ (10 July 2026)** | Turned out much more involved than the original review caught — see "#166 — full history" section below for the complete three-round fix log (missing edge functions built, mutateAsync/isPending crash fixed, a hidden `(supabase as any)`-masked column bug, and 7 more findings surfaced by Copilot/Cursor/Vercel bots after the first push). Merge commit `04fb8a182`, branch deleted, production deploy confirmed READY. |
| **167** | "Cursor/persistent payment bar" | **BLOCKED — close, do not merge** | Mislabeled and broken: touches zero payment/billing files (no `BillingGate.tsx`/`PersistentPaymentBar.tsx` — so no risk to that infrastructure either), and is a **pre-fix snapshot of #166** missing 4 hook files that #166's later commit added specifically to fix a Vercel build failure ("add missing hooks to resolve Vercel build failure"). Will fail the build if merged. Adds nothing #166 doesn't already supersede. |

**Updated recommended order (new PRs slotted in ahead of the original queue):**
1. ~~**#169**~~ — **MERGED 10 July 2026**, see below
2. ~~**#168**~~ — **MERGED 10 July 2026**, see below
3. ~~**#166**~~ — **MERGED 10 July 2026** (out of original order — held #165 to fix #166's build-breaking issues first; see full history below)
4. ~~**#165**~~ — **READY TO MERGE 10 July 2026** — fully re-reviewed, real merge conflict resolved, two rounds of post-push bot findings fixed, follow-up refactor done. See "#165 — full history" below. Waiting on Brian to merge on GitHub.
5. Close **#167** on GitHub as a broken/superseded duplicate of #166
6. Then continue with the original queue starting at #64 (see "Recommended merge order" below)

### #169 — Fix recent critical security regressions → **MERGED**

- Taken out of draft, full `/pr-review` run 10 July 2026: clean dry-run merge, no config.toml/edge function involved.
- **Live-production verification before merge** — the PR description claimed 4 regressions; only 2 were actually still exploitable:
  - `sync_billing_subscription_from_stripe` had no service-role gate — any authenticated user could rewrite any tenant's billing subscription state.
  - `governance_meeting_undo_start` allowed any active tenant member to run the destructive undo, not just Admin/Compliance Manager/Governing Person.
  - The other 2 claimed regressions (`v_cb_trending_prompts` losing `security_invoker`, `materialise_onboarding_session_records` losing its tenant-role check) were **already fixed by #155** on 09 July — the PR description was stale on those two; reapplying the guard was a harmless no-op, not a real fix.
- Confirmed this PR does **not** touch `governance_meeting_end` or any meeting-close logic — no overlap/conflict with #153 (still open, unmerged).
- **Merged** by Brian, merge commit `9fd3d299a`. Vercel production deploy confirmed READY.
- **Migration applied to production** (`20260709111000_harden_recent_critical_security_regressions.sql`) via MCP `apply_migration` — all 3 real changes verified live (the two genuine regression fixes plus the harmless reapplied no-op).
- No edge function changes in this PR.

---

### #166 — feat(governance): waves 6 & 7 — AI minutes, pre-meeting pack, GP notify → **MERGED** (full history)

The original review approved this "with 2 things to confirm" — in practice it took three fix rounds to actually work end-to-end. Full record so nothing has to be reconstructed from memory:

**Round 1 (initial Stage 1 review, 09 July):** flagged the two missing edge functions (`generate-governance-minutes`, `notify-gp-meeting`) and the migration needing Dave's coordination. Held behind #165 pending those.

**Round 2 (10 July) — built the missing pieces, found more while validating end-to-end:**
- Built both edge functions. `generate-governance-minutes` delegates to the existing `governance-minutes-draft` function rather than duplicating its ~400 lines of prompt-building logic; `notify-gp-meeting` reuses this repo's shared `_shared/mailgun.ts` / `_shared/log.ts` / `_shared/roleGates.ts` utilities.
- Fixed a **runtime crash**: `useGenerateMeetingMinutes` returned a shape without `mutateAsync`/`isPending`, but `LiveMeetingTab.tsx` already called it that way — clicking "Generate Minutes" would have thrown immediately. Simplified the hook to return the mutation object directly.
- Relocated the GP-notify button from `MeetingSetupTab.tsx` (no meeting context to call it with) to `LiveMeetingTab.tsx` (where a specific completed meeting is actually in scope).
- Found and fixed a **silent data bug** in `PreMeetingPackExport.tsx`: it queried `governance_auto_suggestions.suggestion_text`, a column that doesn't exist — hidden by three `(supabase as any)` casts (the same banned pattern flagged elsewhere in this doc, e.g. #121). Always silently showed "0 pending suggestions."
- Also fixed: minutes not clearing when switching meetings, the pre-meeting pack's print button printing the whole tab instead of just the pack, and AI-generated text being interpolated into a print window without HTML escaping.
- Committed `47939992a`, pushed, Vercel preview confirmed READY.

**Round 3 (10 July) — Copilot/Cursor/Vercel bot review surfaced 7 more findings on the pushed commit.** Verified each against current HEAD (several bot comments referenced already-fixed commits and were stale) before fixing the real ones:
- `GovernanceActionsTable.handleStatusUpdate` could send `undefined` instead of `null` for `resolved_at_meeting_id` — Supabase silently drops `undefined` keys rather than clearing them, so a reopened-then-reresolved action could keep a stale link.
- `ActionFollowupTab.tsx` had the same banned `(supabase as any)` pattern as the pre-meeting pack bug above — removed.
- `PersistentPaymentBar.tsx` had lost its `isSuperAdmin` check during the billing refactor commit (`ca86e5c`, not part of this fix round originally) — Super Admins in normal tenant mode could see the billing bar. Restored.
- `RootAppLayout.tsx`'s `showBillingBar` didn't exclude super admins either, leaving a blank 40px layout gap for them. Fixed to match.
- `useUpdateGovernanceActionStatus` only invalidated its own `governance-actions` query key, not the pre-meeting pack's separate `open-carryover-actions` key on the same table — pack showed stale counts after any status change. Fixed.
- `generate-governance-minutes` (the function built in Round 2) validated `tenant_id` but forwarded only `meeting_id` to `governance-minutes-draft`, which resolves tenant from `profiles.active_tenant_id` instead — a gap introduced by this fix round itself, not the original PR. Fixed by forwarding `tenant_id` and having `governance-minutes-draft` prefer it when present, falling back to the old behaviour for its other existing caller (`MeetingMinutesSection.tsx`) which doesn't pass it.
- Stray UTF-8 BOM stripped from 4 hook files.
- Committed `343f5f43e`, pushed, Vercel preview confirmed READY.

**Merged** by Brian, merge commit `04fb8a182`, branch `cursor/governance-waves6-7` deleted (remote + local confirmed). Vercel production deploy `dpl_ALw8oXmJDpd3JgWBMGreseqRQtU8` confirmed READY.

**Migrations — reconciled (10 July 2026):** Auditing merged PRs for undeployed migrations/edge functions (per Brian's request) found this was more than a "still pending" note — checked live production directly instead of trusting the ledger:
- `notify-gp-meeting` was **not deployed** to production at all (confirmed via `list_edge_functions` — `generate-governance-minutes` was live, this one wasn't). **Deployed now** via MCP `deploy_edge_function` using the exact committed content on `main` (entrypoint + all 5 `_shared/*` dependencies) — ACTIVE, version 1, `verify_jwt: true` matching `config.toml`.
- The 2 custom-ID migrations (`20260709170000_revoke_anon_set_smart_custom_id.sql`, `20260709170100_seed_custom_id_sequences_all_registers.sql`) turned out to be **already functionally live** in production — but via untracked drift, not via these files: `anon` EXECUTE was already revoked on all 4 target functions, and `cid_seq_qi_*` sequences already existed per-tenant. Traced the revoke to a migration named `revoke_anon_execute_payment_and_custom_id_rpcs` (applied 09 July 07:52) that **has no corresponding `.sql` file anywhere in the repo** — direct-to-production drift with zero paper trail. The seed effect was applied under the same name as the repo file but a different version/timestamp.
- Applied a reconciliation migration (`reconcile_custom_id_grants_and_seed_08_09jul`, version `20260710013412`) per `supabase/migrations/CLAUDE.md`'s "if anyone applies directly to production" rule — it doesn't re-run the grants/seed (already idempotently satisfied), it asserts and records that live state matches what #166's two files intended, closing the audit-trail gap.

**Process note:** the `/pr-review` skill has been updated with 5 new/expanded checks directly off this PR's Round 3 findings (banned-pattern sweep, dropped-guard detection beyond routing files, query-key invalidation cross-check, null-vs-undefined write-path check, BOM check) — see `.claude/commands/pr-review.md`. Three of the five were things the skill already said to do but as skippable prose; they're now literal commands.

**Also noted, not actioned:** a separate branch `cursor/minutes-tenant-id-mismatch-7680` appeared independently fixing the same tenant-id forwarding issue as Round 3's fix #6 above — not part of this PR, left untouched, worth checking before it becomes its own PR to avoid a duplicate fix landing twice.

---

### #165 — feat(governance): meeting location type, attendee UX, and register summary → **READY TO MERGE** (full history)

The original review approved this as clean with a "trivial adjacent-import conflict" note. That note was stale by the time #165 actually got its turn — `main` had moved substantially underneath it while #166 was being fixed. Full record:

**Re-review (10 July) — the real merge conflict:**
- Ran a fresh dry-run merge against current `main` rather than trusting the old note. Found a genuine content conflict in `MeetingSetupTab.tsx`, not a trivial one.
- Root cause: #165 and #166 are sibling branches sharing a bad common ancestor — a cursor session had wired `useNotifyGPMeeting`/`handleNotifyGP`/`PreMeetingPackExport` into `MeetingSetupTab.tsx` on **both** branches before those hooks existed anywhere in the repo. That dead code was found and removed on #166's branch (now merged to `main`); #165 never rebased, so it still carried the same unused `notifyGP`/`handleNotifyGP` block (confirmed dead there too — declared, never called, identical to the pattern Copilot/github-code-quality had flagged on #166 before it was fixed there).
- Merged `main` into the branch, resolved the conflict by dropping the same dead code and keeping #165's genuine new work (the `parseLocation.ts` imports for the location-type feature). Verified `tsc`/`eslint` clean after resolving. Committed `62afcdef0`, pushed, Vercel preview confirmed READY.
- While resolving, also fixed a fresh Cursor bot finding on `notify-gp-meeting/index.ts` (the edge function built during #166's fix, now on `main`): `meetingTitle` and `tenantName` — both editable database fields — were interpolated directly into the GP-notification email's HTML body with no escaping, the same class of bug already fixed in the print-preview panel during #166. Added the same `escapeHtml` helper, applied to both fields (left the plain-text subject line un-escaped, correctly).

**Round 2 (10 July) — first batch of post-push bot findings, 4 confirmed and fixed:**
- Merge conflict resolution itself introduced no new issues, but pushing it surfaced 4 real findings from Copilot/Cursor/Vercel bots reviewing the pushed commit (several other flagged items were stale, already-fixed, or referenced older commits — verified each against current HEAD before touching anything):
  - `GovernanceActionsTable.handleStatusUpdate` — same undefined-vs-null Supabase-write bug pattern already fixed once on #166; this instance was a separate occurrence.
  - `ActionFollowupTab.tsx` — a `(supabase as any)` cast on a query whose columns were already confirmed to exist — removed.
  - `PersistentPaymentBar.tsx` / `RootAppLayout.tsx` — the same dropped-`isSuperAdmin`-check issue from #166's billing refactor, carried through via the merge — fixed to match.
  - `useUpdateGovernanceActionStatus` — same stale-cache invalidation gap as #166 (missing `open-carryover-actions` key) — fixed.
- (These four were largely repeats of #166's own Round 3 findings, reappearing here because the merge pulled #166's pre-fix history through before the fix commits — confirms the value of re-verifying against current HEAD rather than assuming a fix "must still be there.")

**Round 3 (10 July) — second batch of post-push bot findings, 9 confirmed and fixed:**
1. **Duplicate `PreMeetingPackExport`** rendered twice in `MeetingSetupTab.tsx` — one instance survived the merge from #166's original placement alongside the one already relocated during #166's own fix. Removed the duplicate.
2. **Stored-XSS via meeting location links** (`LocationBadge.tsx`) — a Zoom/Teams/Meet link is free-text stored in the DB; nothing stopped a `javascript:`/`data:` value from rendering as a clickable link. Added an `http:`/`https:`-only scheme check before rendering the "Join" link.
3. **Register health dashboard overstated problems** (`useGovernanceRegisterSummaries.ts`) — confirmed against actual production data that `q1_tas_builder` only ever has `draft` (101 rows in prod), `in_review` (7), or `archived` (20) status. The code counted every `draft` row as "needing attention," permanently showing the TAS card as amber for any tenant with ordinary work-in-progress. Now only `in_review` counts as needing attention.
4. **Trainer Monthly Reports card couldn't detect a missing table** — the count helper never actually threw on error, so a `try/catch` built to omit the card on failure never triggered. Added an explicit `throwOnError` option.
5. **9 register counts ran sequentially instead of in parallel** — switched to `Promise.all`.
6. **"View more"/"Show less" agenda controls** (`DynamicAgendaBuilder.tsx`) were unlabelled clickable `<div>`s, unreachable by keyboard and not announced to screen readers. Converted to `<button type="button">`.
7. **Remove-attendee / remove-location buttons** missing `type="button"` — without it, a `<button>` defaults to `type="submit"`, risking an unexpected form submission if this ever nests inside a `<form>`. Added to both.
8. **Duplicate-location detection** compared the newly-encoded string against raw stored values, missing equivalent legacy plain-text vs typed-encoding duplicates (and case/whitespace differences). Now normalizes both sides via `parseLocation` before comparing.
9. **Misleading helper text** — said external guests could be added "by typing a name or email" when a name is actually required and email is optional. Corrected the copy.
- Committed `ea46ddd96` alongside the follow-up work below, pushed, Vercel preview confirmed READY.

**Follow-up refactor, done in the same pass at Brian's request:**
- **Extracted `fetchTenantMembers` out of `MeetingSetupTab.tsx`** into a new `useTenantMembersList` hook (`src/hooks/governance/`), matching this repo's hooks-own-fetching convention (the component was querying `supabase.from('tenant_members')` directly in a `useEffect`, which this project's `CLAUDE.md`/`AGENTS.md` explicitly bans). No behaviour change — same query, same display-name resolution logic, same shape consumed downstream.
- **Added unit tests for `parseLocation`/`buildLocation`/`isUrlType`** (11 tests, all passing) covering legacy plain-text fallback, every valid type encoding, an unrecognised type prefix, a value containing its own `::`, and the build/parse round-trip.
- **Found while writing the tests:** the test convention this repo appeared to use (`src/lib/utils/__tests__/*.test.ts`, where two pre-existing files already lived) is actually **dead** — `vitest.config.ts` only picks up `tests/**/*.test.{ts,tsx}`, so those two existing files never run in CI and never have. Placed the new test at `tests/lib/utils/parseLocation.test.ts` instead, matching the pattern that's actually wired up (e.g. `tests/lib/tasStepStateReadiness.test.ts`). Those two dead files were left alone (out of scope — pre-existing, unrelated to this PR).

**Also noted, not actioned:** a separate branch `cursor/duplicate-pre-meeting-export-a5cb` appeared independently fixing the same duplicate-`PreMeetingPackExport` bug as Round 3's fix #1 above — not part of this PR, left untouched, worth checking (alongside the `cursor/minutes-tenant-id-mismatch-7680` branch noted under #166) before either becomes its own PR, to avoid the same fix landing twice.

**Status:** Vercel preview, Supabase Preview, `tsc`, `eslint`, and the vitest suite all clean as of commit `ea46ddd96`. No migrations, no edge functions in this PR. Not yet merged — waiting on Brian.

---

### #64 — Fix critical suggestion and QI RPC regressions → **MERGED** (full history)

The original review approved this as clean, APPROVE, MEDIUM migration risk, based on migration filenames/dates alone. Re-review against current `main` (requested because the branch was old — created 24 June, several PRs merged since) found that assumption was wrong in both directions:

**Re-review (10 July) — checked live production directly instead of trusting file dates:**
- **Genuine regression the PR would have introduced:** `qi_responses.respondent_email`/`respondent_name` were renamed to `submitter_email`/`submitter_name` in production sometime between 24 June and 2 July (a direct Lovable change, captured retroactively by gap-fill migration `20260702031010`). PR #64's `send_qi_survey`/`remind_qi_survey` still referenced the old names via a plpgsql `record` — would not fail at `CREATE FUNCTION` time, only at runtime the next time someone sent/reminded a QI survey. Fixed: swapped both functions to the current `submitter_*` columns.
- **The vulnerabilities this PR claims to fix were NOT already resolved, contrary to the original review's assumption from filenames:** queried live `pg_proc` directly and confirmed `assign_suggestion`, `update_suggestion_retest`, and `update_suggestion_status` had **no auth check at all** in production, and `get_my_suggestion_detail`/`get_my_suggestions_with_unread`/`mark_suggestion_viewed`/`get_suggestion_comments` all still resolved `p.tenant_id` directly rather than the active workspace. Similar-sounding migration files exist in the repo dated 23–24 June, but were evidently never applied to production, or reverted — repo/production drift, same class of issue documented elsewhere in this doc. This PR was a real, needed fix, not a no-op.
- Committed `fe9e62223`, pushed, TypeScript + the PR's own vitest suite both clean.

**Post-push bot findings (Cursor Bugbot + GitHub Copilot) — verified each against live production before fixing, all three real:**
- `REVOKE EXECUTE ... FROM anon` only (not `anon, public`) — confirmed via `information_schema.routine_privileges` that production grants `EXECUTE` to `PUBLIC` on all 9 functions, which `anon` inherits regardless of an anon-only revoke. Not an active bypass (every function has an internal `auth.uid()`/tenant-null check that fails closed for anonymous callers), but a real defense-in-depth gap. Fixed: revoke from `anon, public` on all 9.
- `get_my_suggestions_with_unread` double-joins `suggestion_comments` (as `sc` and `sc2`), inflating `comment_count`/`unread_count` via row multiplication whenever a suggestion has more than one comment — confirmed this exact bug already live in current production (pre-existing, not introduced by this PR, just carried forward unchanged). Fixed with `COUNT(DISTINCT ...)` on both.
- `remind_qi_survey`'s idempotency key suffix (`extract(epoch from now())::bigint`) only has 1-second resolution — confirmed the same pattern already live in production. Two reminder calls within the same second for the same response would collide on the unique index. Fixed with `gen_random_uuid()`.
- Added regression test coverage for all three (6 tests total in `critical-suggestion-qi-rpcs.test.ts`, up from 3).
- Committed `59efc0cfc`, pushed, TypeScript + vitest suite clean.

**Merged** by Brian, merge commit `9875c6fca7`, branch `cursor/critical-bug-investigation-d082` deleted (remote + local confirmed).

**Migration applied to production** (`fix_critical_suggestion_qi_rpcs`) via MCP `apply_migration` on the first attempt hit a syntax error from an accidental copy-paste truncation (missing closing `END;`/`$$;`/REVOKE/GRANT on the last function) — confirmed nothing partial landed before retrying with the complete file. Second attempt succeeded; verified live and directly (not just via the migration ledger):
- `update_suggestion_status`, `assign_suggestion`, `update_suggestion_retest` — all now have the super-admin check
- `get_suggestion_comments`, `get_my_suggestion_detail`, `get_my_suggestions_with_unread`, `mark_suggestion_viewed` — all now use `COALESCE(active_tenant_id, tenant_id)`
- `remind_qi_survey` — uses `submitter_*` columns, `gen_random_uuid()` fix present
- `update_suggestion_status` grants — `anon`/`PUBLIC` confirmed no longer hold `EXECUTE`

No edge functions in this PR.

---

### #75 — Fix legacy admin settings redirects → **MERGED**

- Re-reviewed against current `main` (per handover — original audit was several PRs old by the time this ran). Full `/pr-review` Stage 1: clean dry-run merge, `tsc --noEmit` clean on the branch, no schema/migration/edge-function involvement.
- 3 CI checks showed red (`Block .single() usage`, `Lint (blocking)`, `Security checks`) — traced every flagged line; all sat in files this PR never touched (`securityEnhancement.ts`, `useTrainerImprovementPlan.ts`, `cypress/e2e/rto-settings.cy.ts`, `scripts/codemods/rename-organisation-id.ts`, several edge functions), last modified 25 May 2026 — pre-existing repo-wide guardrail violations already on `main`, not caused by or fixable within this PR. Not a merge blocker.
- Confirmed the fix's redirect target (`/dashboard/settings/organisation`) is a real, guarded nested route (`TenantGuard`/`ErrorBoundary` intact) — no guard or nav entry removed, only the `Navigate to=` string changed.
- **Approved and merged** by Brian, merge commit `2c0ec9456`, branch `cursor/critical-bug-investigation-d24f` deleted (remote confirmed 404, no local copy).
- No migrations, no edge functions in this PR — no post-merge production-apply step required.
- **Side investigation, not part of this PR:** while reviewing, noticed `src/hooks/useRtoSettingsTour.ts` and `src/lib/utils/permissionUtils.ts` both still reference the pre-fix `/settings/organisation` bare path. Traced both fully — **neither is dead code**, so neither is safe to delete outright:
  - `useRtoSettingsTour.ts` is actively called from `RTOSettings.tsx` (routed live at `/settings/rto`) and `TenantSettings.tsx` — its `location.pathname === '/settings/organisation'` check just never matches the real URL, so the onboarding tour silently never auto-starts. Broken, but wired in; deleting the file breaks the import.
  - `permissionUtils.ts`'s `getResourceFromRoute`/`canPerformActionOnCurrentRoute` are imported and called by `PermissionGuard.tsx` — every live `<PermissionGuard>`/`<ProtectedPage>` usage in the app currently passes an explicit `resource` prop, so the stale-path fallback branch never actually fires today, but the file is a live dependency, not orphaned.
  - Both trace back to the original Lovable "Initial commit from remix" (7 Oct 2025); `permissionUtils.ts` and the tour hook have had zero commits since, while the pages that use them (`RTOSettings.tsx`, `TenantSettings.tsx`) have kept changing as recently as June 2026 — a leftover artifact from the import, not a recent regression.
  - **Decision (Brian, 10 July 2026): leave as-is.** Logged here as a known, harmless-today follow-up rather than actioned in this PR.

---

### #64 — Cursor bot false-positive follow-up (10 July 2026)

A Cursor bot comment surfaced on the already-merged #64, flagging (High severity) that `send_qi_survey`/`remind_qi_survey` read `submitter_email`/`submitter_name` from `qi_responses` while `create_qi_response` (allegedly unchanged in that PR) still inserted into `respondent_email`/`respondent_name` — meaning invites/reminders could silently no-op even after a respondent was saved.

- Ran the `cursor-flag-review` skill rather than trusting the flag. The claim was **true at the specific commit Cursor reviewed** (`20260624180000_fix_critical_suggestion_qi_rpcs.sql`, 24 June) — that file did leave `create_qi_response` on the old column names while updating the other two functions.
- But a later migration already in the repo, `20260702031010_gap_fill_qi_response_columns_and_rpcs.sql` (2 July), redefines `create_qi_response` to use `submitter_name`/`submitter_email` too — resolving the exact mismatch before the bot's comment was even posted.
- Verified directly against **live production** (not just the migration files, per this doc's standing rule of checking real state over file/ledger assumptions): `qi_responses` only has `submitter_name`/`submitter_email` columns (no `respondent_*` columns exist at all), and the live definitions of `create_qi_response`, `send_qi_survey`, and `remind_qi_survey` all consistently read/write `submitter_*`.
- **Verdict: FALSE POSITIVE.** No code change made, no reply posted to the (already-merged) PR thread per Brian's call to move on.

---

### #166/#165 — branch-triage cross-reference (10 July 2026)

An external branch-triage report surfaced, warning about 4 governance branches that were never merged: `cursor/governance-bug-fixes-3dea`, `cursor/governance-module-bugs-90cc`, `cursor/governance-register-and-meeting-9dfc`, `cursor/minutes-generation-hook-mismatch-ad47`. All 4 are confirmed gone from `origin` (deleted, never opened as PRs — consistent with what this doc already flagged as "not actionable, watch for a PR"). Since the branches are deleted, cross-referenced their specific commits directly by SHA (objects still present in local git history) against what #166/#165 actually shipped to `main`:

| Branch's commit | What it claimed to fix | Already fixed by #166/#165? |
|---|---|---|
| `a29c7ec51` (minutes-generation-hook-mismatch) — "Fix governance minutes generation hook usage" | `generateMinutes.mutateAsync` crash risk | **Yes — independently, via a different fix.** This commit rewrote the *caller* (`LiveMeetingTab.tsx`) to match a custom hook shape (`isGenerating`, `.generateMinutes()`). #166 Round 2 instead fixed the *hook* (`useGenerateMeetingMinutes.ts`) to return the real TanStack `useMutation` object, so `.mutateAsync`/`.isPending` work as originally called. Confirmed live on `main` — both work, ours needed no caller rewrite. |
| `6115a3058` (governance-bug-fixes-3dea) — "resolve meeting print and notification bugs" | HTML-escaping the printed minutes, minutes not clearing on meeting switch, wiring a GP-notify button | **Yes, all three — independently.** Escaping: #166 Round 2 fixed this in `MinutesPreviewPanel.tsx` (confirmed present on `main`). Minutes-not-clearing: #166 Round 2 fixed this too (confirmed present on `main`, `LiveMeetingTab.tsx`'s meeting-switch handler resets minutes state and even calls `generateMinutes.reset()`). GP-notify: this branch wired the button into `PreMeetingPackExport` (upcoming-meeting context); #166 wired it into `LiveMeetingTab` instead (completed-meeting context) — a deliberate, more correct placement since the edge function sends a "meeting concluded" email, not a "meeting upcoming" one. |
| `5e349bc07` (governance-module-bugs-90cc) — "Fix governance print and filter bugs" | Same print/escaping bugs (independently re-fixed, already covered above) **plus an assignee-filter dropdown bug in `GovernanceActionsTable.tsx`** | **Print/escaping: yes, already covered. Filter bug: NO — confirmed still live on `main` right now.** See gap below. |
| `b61f1a7fa` (governance-register-and-meeting-9dfc) — "address governance register bug findings" | Dead `useNotifyGPMeeting`/`handleNotifyGP` code left in `MeetingSetupTab.tsx`; TAS register dashboard overstating "needs attention" | **Yes, both — and #165's fix is more correct.** Dead code: #165's merge-conflict resolution dropped the exact same dead block (confirmed same root cause — a bad shared ancestor with #166). Register dashboard: this branch's fix kept `draft` status counted as "needs attention" (just renamed the variable) — #165 Round 3 went further, checked actual production data (101 `draft` rows are normal WIP, not a problem) and excluded `draft` entirely, counting only `in_review`. Ours is the more correct fix. |
| `6fb450e24` (governance-register-and-meeting-9dfc) — "meeting location type, attendee UX, and register summary cards" | The feature itself | **This is the same commit as #165** — confirmed via `git merge-base --is-ancestor`, it's already on `main`. The triage report's recommendation to give this "its own PR after #166" is stale; #165 already *is* that PR, already merged with far more fixes than this branch had. |

**⚠️ One real gap found — not caught by #166 or #165, still live on `main`:**

`src/components/governance/GovernanceActionsTable.tsx` — the assignee filter dropdown disappears entirely whenever the currently-selected assignee has no remaining visible actions (e.g. all their actions got reassigned or resolved), because the dropdown is gated on `uniqueAssignees.length > 0`. When that happens, the filter is still silently applied (so the table may show 0 rows) but the control to change or clear it is gone — the user is stuck. `governance-module-bugs-90cc`'s commit `5e349bc07` fixed this correctly (keep the dropdown visible whenever a specific assignee is selected, even if not in the current list) but that branch was never merged and is now deleted. **This needs its own small fix on a proper branch** — not done yet, not part of any currently open PR.

**Answering the two questions directly:**
- **Did we miss anything?** Yes — one thing: the `GovernanceActionsTable.tsx` assignee-filter-disappears bug. Everything else the triage report raised was already independently found and fixed during #166/#165's review rounds, in most cases *before* this report surfaced, and in two cases (the minutes hook, the register dashboard) our fix was arguably better than the one in the deleted branches.
- **Did we solve them before this info came to light?** Yes, for everything except the filter bug above — those fixes all happened during #166 Round 2/3 and #165's re-review, all logged in this doc before this cross-reference was done.

---

## Actioned this session — what actually happened to each PR

Of the 25 open PRs reviewed, only **#155** was actually merged/closed today; everything else in the verdict table below is still pending Brian's action. Full detail here so nothing has to be reconstructed from memory later.

### #155 — Fix ComplyBot and onboarding security gaps → **MERGED**

- Full Stage 1 review (09 July): CLEAN, dry-run merge clean, TypeScript clean, CI green (Vercel/Supabase Preview/Analyze/Bugbot all pass).
- **Live-production check found the exact vulnerability this PR fixes was already exploitable**: `complybot-monthly-report` was deployed live (version 1) in its pre-fix state — any authenticated user could trigger it and pull cross-tenant ComplyBot data via the service-role key. Confirmed via direct MCP read of the deployed function source.
- **Post-push code review findings (Cursor Bugbot + GitHub Copilot) — both real, both fixed on the branch before merge:**
  - Bugbot (HIGH): the new auth check required a human user JWT, but the function's documented cron schedule calls it with no auth header at all — would 401 forever on any scheduled run. Fixed by adding `isScheduledInvocation()` to `auth.ts`, which recognises the service-role bearer token as pre-authorised (matching the pattern used by other cron-invoked functions in this repo), plus corrected the header's cron-setup example.
  - Copilot (HIGH): `materialise_onboarding_session_records`'s catch-all exception handler was re-raising a new generic error via `SQLERRM`, masking the `42501` permission-denied SQLSTATE raised earlier in the same function. Fixed by changing it to a bare `RAISE;`.
  - Both fixes covered by new tests (Deno `auth.test.ts` + 2 new Vitest assertions), committed as `fe19c7e42`, pushed, CI re-ran green.
- **Merged** by Brian, merge commit `8cf02751`, branch `cursor/critical-bug-investigation-a9c6` deleted on GitHub and locally. Vercel production deploy confirmed `success`.
- **Migration applied to production** (`fix_complybot_and_onboarding_security`) via MCP `apply_migration` — verified live: `conv_billing_gate` now restrictive/row-scoped, all 5 `complybot_conversations` policies present, `materialise_onboarding_session_records` grants `authenticated` only (not `PUBLIC`), re-raises errors without masking SQLSTATE.
- **Edge function deployed to production** (`complybot-monthly-report`, now version 2) via MCP `deploy_edge_function`, using the exact content committed on `main` — verified byte-for-byte against the deployed source.
- **Follow-on work discovered while wiring up the fix — two more real production bugs found and fixed, same session:**
  1. Set up the actual monthly cron schedule for `complybot-monthly-report` (jobid 45, `0 22 1 * *`) — the code was ready but nothing had ever told Postgres to actually call it monthly. First automatic run: 1 August 2026.
  2. Discovered two **already-existing** cron jobs (`governance-meeting-reminders` jobid 44, `daily-sso-report-reminders` jobid 43) had been silently failing on every run — both reference `current_setting('app.service_role_key', true)`, a setting that has never existed anywhere in this database (confirmed via git history: it appears in no migration, no edge function, nowhere — these jobs were created directly against production, likely by Lovable, and reconciled into git after the fact without anyone verifying the auth actually worked). Both functions check `bearerToken === SUPABASE_SERVICE_ROLE_KEY` in code, and `'Bearer ' || NULL` is always `NULL` in SQL — a guaranteed 401 every run, not intermittent.
  3. Set up **Supabase Vault** properly (`supabase_vault` extension was already installed but unused) — Brian pulled the real service-role key from the Supabase dashboard and stored it once via `vault.create_secret(...)`, run directly in the Supabase SQL editor so the plaintext never passed through this conversation. All three cron jobs (the new one + the two fixed ones) now reference `vault.decrypted_secrets` by name instead of embedding or referencing a raw key.
  4. Fixed both broken jobs via `cron.alter_job(...)` — confirmed via SQL that neither job's command references the broken setting anymore and both now resolve via Vault. **Real behaviour change, not just a bug fix**: from tonight's scheduled runs onward, Governing Persons will actually start receiving the 7-day/48-hour pre-meeting reminder emails, and Student Support Officers will actually start receiving the SSO monthly-report reminder emails — both had been running nightly and silently doing nothing before this.
- Full verdict + fix history logged in this file (`pr-review-open-prs.md`). `phase1-verdicts-partial.md` is retired.

---

## Changelog cross-reference (Angela's 8 July session notes vs. reality, checked 09 July)

Angela's changelog named 4 production DB/edge changes and 10 branches expected to become PRs. Cross-checked every claim against live Supabase (read-only), `gh pr list`, and branch diffs against current `main` — not just the 25 PRs already tracked below.

**🔴 Active production security hole, independent of anything in this doc:** `complybot-monthly-report` is deployed live (version 1, confirmed via MCP) and is the **pre-fix, unpatched** version — no auth/permission check, so any logged-in user can currently trigger it and pull cross-tenant usage data via the service-role key. **PR #155 fixes exactly this.** This raises #155 from "highest severity in the queue" to "deploy immediately after merge, don't defer."

**Section 1 (DB changes claimed already live) — all 4 verified correct in production:**
- `generate_governance_auto_suggestions` — confirmed, Governing Person role gate present
- `generate-tas-section` edge function — confirmed at version 260 exactly as claimed
- `get_my_app_context` — confirmed returns `requires_payment_method` / `paid_through_date`, queries `billing.subscriptions`
- `rpc_carryover_governance_actions` — confirmed exists, role-gated

**Section 2 (branches claimed to need a PR) — cross-referenced against actual GitHub + git state:**

| Changelog branch | Reality |
|---|---|
| `cursor/sso-report-form`, `cursor/remove-consultant-dashboard`, `cursor/fix-tas-trainer-assignment`, `feat/auto-mark-sso-reports-before-close` | Already match tracked PRs **#144, #151, #152, #153** respectively — no new action |
| `cursor/fix-assessment-conditions-unit-tas-ff64` | Already merged as **#138** (08 July) — changelog entry is a stale snapshot |
| `feature/complybot-intelligence-suite`, `feature/affiliate-portal` | **Dead/superseded — do not PR.** Already-merged **#146** explicitly cherry-picked the safe content from a related stale branch (`feature/affiliate-portal-final`). Diffing these two against current `main` shows each would **delete** dozens of files `main` has gained since (affiliate guards, CI similarity warning, etc.) if merged as-is. Safe to close/delete. |
| `cursor/fix-evidence-index-clean` | Real, current work matching its description (evidence index NOT NULL defaults). No PR exists yet — see staleness caveat below before opening one. |
| `cursor/fix-evidence-index` | **Confirmed contaminated**, exactly as changelog warns — its last commit is an unrelated trainer-assignment-picker change, not evidence-index work. **Never PR this branch.** |
| `cursor/complybot-and-history-fixes` | Drifted past its changelog description (last commit is an unrelated "compliance dashboard redesign"). Would delete 212 files vs. current `main`, including `BillingGate.tsx` and `PersistentPaymentBar.tsx`. High risk if PR'd directly. |
| `cursor/fix-register-insights` | Last commit message is "checkpoint before checking out main" — looks like an unfinished save point. Same stale-base problem as above. |
| `cursor/governance-wave5-carryover` | Already has real, committed frontend code (carryover dialog, `ActionFollowupTab` section, badge, hook) — contradicts the changelog's own Section 4.1 framing ("next session, prompt ready"). Section 1.4 of the same changelog already correctly says this work exists — the changelog is internally inconsistent here; current reality matches 1.4. |

**Pattern found:** the four un-PR'd `cursor/*` branches above (fix-register-insights, complybot-and-history-fixes, fix-evidence-index-clean, governance-wave5-carryover) all share the same stale base — each is missing ~9 migration files and several source files `main` gained between 08–09 July. **None can be opened as a plain PR against current `main` right now** — each would silently reintroduce deleted files/migrations on merge. Each needs the real change hand-extracted and rebuilt on current `main`, the same way #146 already did for the affiliate/ComplyBot branches — not a straight `git worktree` + PR.

**Action items from this cross-reference (not yet done):**
- [ ] Deploy #155 immediately after merge — closes the live vulnerability above, don't defer
- [ ] Close/delete `feature/complybot-intelligence-suite` and `feature/affiliate-portal` (superseded by merged #146)
- [ ] Leave `cursor/fix-evidence-index` untouched/delete — confirmed contaminated
- [ ] For `cursor/fix-evidence-index-clean`, `cursor/complybot-and-history-fixes`, `cursor/fix-register-insights`, `cursor/governance-wave5-carryover` — hand-extract the real change onto a fresh branch off current `main` before opening any PR (do not merge these branches wholesale)

---

## Summary

28 open PRs were reviewed against current `main`. Three are exact duplicates of other open PRs and can be closed outright. Three need a fix before they're safe to merge. The "industry consultation wizard" phase3/phase4/phase5 branches, despite their names, are **not** a clean sequential stack — phase4 and phase5 independently re-implemented work that phase3 already did, so merging them in numeric order will conflict and/or ship a broken wizard. Everything else is clean and independent.

All investigation below is read-only (dry-run merges via `git merge-tree`, diff review, `gh pr view`/`diff`) — nothing was committed, pushed, or merged.

---

## Duplicates — close without further work

| Close | Keep instead | Reason |
|---|---|---|
| **#154** — fix(governance): call auto_mark_sso_reports_reviewed before meeting close | **#153** | Byte-for-byte identical governance fix to #153 in `LiveMeetingTab.tsx`, plus an unrelated, half-wired ComplyBot "promote to KB" feature bolted onto the same branch. If that ComplyBot piece is still wanted, split it into its own PR before closing #154 — Brian's call. |
| **#119** — Fix trainer evidence deduplication ownership | **#118** | Same bug (trainer evidence dedup scope), same 3 files (`useTrainerOnboarding.ts`, `evidenceService.ts`, `types/trainer-onboarding.ts`), near-identical diff. #118's migration uses an idempotent `DO $$ IF NOT EXISTS $$` guard; #119's is a bare `ADD CONSTRAINT` that fails hard if already applied. Do not merge both — would leave two overlapping unique constraints on the same table. |
| **#66** — feat(qi): ASQA evidence upload — Phase 1 | **#120 + #121 + #122** | Stale 25 June monolith (3,132 additions / 21 files) bundling three features that later shipped as separate, cleaner PRs. Byte-identical or near-identical to #120's TAS migration, #121's `QIEvidenceUpload.tsx`, and #122's ComplyBot Training UI (missing one `Badge` import vs #122). 136 conflict markers against current `main`. Fully superseded. |

---

## Needs a fix before merge

| PR | Issue | Fix required |
|---|---|---|
| **#151** — Remove dead ConsultantDashboard page, hook, and route | Deletes the page/route but **16+ other files** still hard-code `/consultant/dashboard` as a nav target: `roleMenuConfigs.ts`, `ConsultantSidebar.tsx`, `GlobalTopbar.tsx`, `TenantSwitcherDialog.tsx`, `routeAfterLogin.ts`, `landing.ts`, `routeToLanding.ts`, `RoleLandingRedirect.tsx`, `SuperAdminGuard.tsx`, `TenantSelect.tsx`, `ConsultantAcceptPage.tsx`, `MyClientsBreadcrumb.tsx`. Merging as-is 404s the Consultant/Consultant Assistant roles on login. Cursor's own review bot flagged the same thing. | Update all dangling `/consultant/dashboard` references (or redirect them) in the same PR before merge. |
| **#161** — feat(trainers): Trainer Unit Mapping Suggestions | New edge function `generate-governance-minutes` has **no matching entry in `config.toml`** — will silently fail to deploy correctly. Also ships a stray `commit-governance-waves6-7.ps1` script at repo root that looks like leftover local tooling, not app code. | Add the `[functions.generate-governance-minutes]` block to `config.toml`; remove the stray `.ps1` script. |
| **#111** — Fix critical tenant isolation and evidence persistence bugs | The fix content is solid (closes a real cross-tenant TGA/TAS overwrite hole where a service-role client was used with caller-supplied IDs), but the branch has genuinely diverged from current `main` — real conflicts on `AssessmentToolForm.tsx` and `supabase/functions/tga-extract-packaging-rules/index.ts`. | Rebase the branch against current `main` and resolve the two conflicts before merge is possible. |
| **#70** — build(deps): bump react and @types/react (dependabot) | Bumps `react` and `@types/react` to 19.x but leaves `react-dom` at 18.3.1. Mismatched React major versions is a known breaking combination (invalid hook calls, rendering errors). | Add matching `react-dom` / `@types/react-dom` 19.x bumps to the same PR before merge; also check for React 19 breaking changes (removed `PropTypes`/`defaultProps` on function components, ref-as-prop changes) against this codebase. |

---

## The consultation-wizard PRs are not a clean phase3→4→5 stack

Branch names (`industry-consultation-phase3/4/5`) imply a linear sequence, but git ancestry says otherwise:

- **#156 (phase3) → #160 (qi-module-phase2)** — this is a real, clean stack. #160's base commit is phase3's exact tip.
- **#159 (phase4)** and **#163 (phase5)** are siblings off a shared "ACT node" commit, but **neither builds on #156 (phase3)** — `merge-base(phase3, phase4) == merge-base(main, phase4)`. Both independently re-implemented the DECIDE-step logic (near-duplicate files, differing only in encoding/em-dash escaping — evidence of separate generation, not a git-based build-on).
- Merging phase4 or phase5 *after* phase3 produces real `add/add` conflicts on the DECIDE-step files (and `config.toml` for phase4).
- Merging **phase5 alone** looks clean via dry-run but is **functionally broken** — it ships ACT/REVIEW steps with no DECIDE step ever landed on `main` (steps depend on decisions recorded in a step that doesn't exist).
- phase5 shares only the ACT-node commit with phase4 — it does **not** include phase4's trainer-AI-mapping commit.

**This needs a manual decision, not just a merge order.** Someone has to reconcile the duplicate DECIDE/ACT implementations between #156 and #159/#163 before either can safely land. Recommendation: merge #156 → #160 now (real, clean stack); hold #159/#163 until that reconciliation happens.

---

## Full verdict table

| # | Title | Verdict | Migration | Notes |
|---|---|---|---|---|
| 155 | Fix ComplyBot and onboarding security gaps | **MERGED ✅ (09 July 2026)** | MEDIUM-HIGH — applied to production, verified live | See "Actioned this session" above for full detail: merged, migration applied, edge function deployed, cron schedule created, 2 unrelated broken cron jobs found + fixed |
| 64 | Fix critical suggestion and QI RPC regressions | **MERGED ✅ (10 July 2026)** | MEDIUM — applied to production, verified live | See "#64 — full history" above: 2 fix rounds (column-rename regression + 3 bot findings), merge commit `9875c6fca7`, migration applied and independently verified |
| 75 | Fix legacy admin settings redirects | **MERGED ✅ (10 July 2026)** | None | Merge commit `2c0ec9456`, branch deleted. See "#75 — merged" above |
| 80 | Fix critical AOT auth and trainer report submission bugs | APPROVE | None | Clean; edge function `generate-aot-determination` config.toml flip confirmed needed |
| 103 | Fix support plan and MCN register data integrity | APPROVE | None | Clean, no file overlap with #111/#117 |
| 117 | Fix document bulk delete and validation schedule corruption | APPROVE | MEDIUM (trigger function `propagate_assessment_tool_validation()` replaced) | Clean |
| 118 | Fix trainer evidence deduplication data loss | APPROVE | LOW (idempotent guard) | Keep over #119 |
| 119 | Fix trainer evidence deduplication ownership | **CLOSE (duplicate)** | — | See above |
| 111 | Fix critical tenant isolation and evidence persistence bugs | REQUEST CHANGES | MEDIUM (additive, all guarded) | Rebase 2 conflicting files |
| 153 | wire auto-mark RPCs before governance_meeting_end | APPROVE | None (RPC pre-exists on main via `20260709000000_gap_fill_lovable_direct_prod_migrations_july.sql`) | Keep over #154 |
| 154 | fix(governance): call auto_mark_sso_reports_reviewed before meeting close | **CLOSE (duplicate)** | — | See above |
| 144 | feat(sso): add monthly report submission form and routes | APPROVE | None | Trivial `AppRoutes.tsx` conflict (adjacent lazy-import lines) |
| 120 | fix(tas): auto-upsert tenant_scope_items for explicit-scope units | APPROVE | MEDIUM (RPC redefine, signature preserved) | Clean |
| 121 | feat(qi): ASQA submission tab with evidence upload | APPROVE | None | Verify `asqa_evidence_*` columns exist on `qi_register` before merge (diff has an `as any` TODO noting this) |
| 66 | feat(qi): ASQA evidence upload — Phase 1 | **CLOSE (duplicate)** | — | See above |
| 122 | feat(superadmin): ComplyBot Training UI | APPROVE | None | Merge after #66 closes to drop inflated conflict count |
| 152 | feat(tas): wire per-unit trainer assignment picker | APPROVE (sequence vs #161) | None | Conflicts with #161 on `LiveMeetingTab.tsx` — merge one, rebase the other |
| 161 | feat(trainers): Trainer Unit Mapping Suggestions | REQUEST CHANGES | None | Fix config.toml gap + remove stray script first |
| 151 | Remove dead ConsultantDashboard page, hook, and route | REQUEST CHANGES | None | Fix 16+ dangling nav references first |
| 156 | industry consultation phase 3 — DECIDE step + design system | APPROVE | None | Real base of the wizard stack |
| 160 | qi module phase2 | APPROVE | LOW (additive: `20260709095300_create_qi_asqa_narrative.sql`) | Stacked cleanly on #156 |
| 159 | industry consultation phase4 | **BLOCKED** | None | Reconcile DECIDE-step duplication vs #156 first |
| 163 | industry consultation phase5 | **BLOCKED** | LOW (additive: `20260709120000_add_completed_at_to_consultation_plans.sql`) | Reconcile vs #156/#159 first; do not merge alone |
| 68 | build(deps): bump @tailwindcss/typography 0.5.19→0.5.20 | APPROVE | — | Patch, trivial |
| 69 | build(deps): bump @radix-ui/react-progress 1.1.7→1.1.10 | APPROVE | — | Patch, trivial |
| 72 | build(deps): bump @radix-ui/react-menubar 1.1.16→1.1.18 | APPROVE | — | Patch, trivial |
| 71 | chore(deps): bump @hookform/resolvers 3.10.0→5.4.0 | APPROVE w/ smoke test | — | Skips a major version; smoke-test form validation flows before merge |
| 70 | build(deps): bump react and @types/react 18.3.1→19.2.7 | FIX FIRST | — | See "Needs a fix before merge" above |

---

## Recommended merge order

1. **#155** — highest-severity security fix, standalone
2. **#64, #75, #80, #103, #117** — any order, all clean and independent of each other
3. **#118** (then close #119 on GitHub)
4. **#153** (then close #154 on GitHub)
5. **#144, #120, #121** — independent, clean (confirm `asqa_evidence_*` columns exist before #121)
6. Close **#66** on GitHub, then merge **#122**
7. **#111** — after rebase against current `main`
8. **#152**, then **#161** (after its config.toml fix) — sequence, don't parallelise; both touch `LiveMeetingTab.tsx`
9. **#156 → #160** — the real, clean stack
10. **#151** — only after the dangling nav references are fixed
11. **#68 → #69 → #72 → #71 → #70** — dependabot last, one at a time (let dependabot rebase the lockfile between each merge); #70 only after the matching `react-dom` bump is added
12. **#159 / #163** — hold until the DECIDE-step duplication is manually reconciled against #156; this is a design decision, not a mechanical merge

---

## Plain English

Of the 28 pull requests currently open, three are exact duplicates of other pull requests already open — they can simply be closed with no extra work. Most of the automated bug-fix pull requests from the Cursor bot are safe on their own and don't interfere with each other, so they can be merged in almost any order. Three pull requests need a small fix before they're safe: one removes a dashboard page but leaves broken menu links pointing at it, one adds a new automated feature that's missing a required deployment setting, and one dependency update only upgraded half of a matching pair of packages. The trickiest issue is a set of "industry consultation wizard" pull requests named like a simple numbered sequence (phase 3, 4, 5) — but two of them were actually built independently and duplicate each other's work rather than building on top of one another, so merging them in that numeric order would cause real conflicts and ship a broken wizard. That part needs a manual decision about which version to keep before any merging happens, rather than just following the numbers.

---

## Status

- [x] Close #154, #119, #66 on GitHub as duplicates — done 09 July 2026
- [x] Full Stage 1 review of #155 completed 09 July 2026 — CLEAN, APPROVE, no fixes needed
- [x] Cross-referenced Angela's 8 July changelog against actual repo/PR/production state — see section above; live security issue found (unpatched `complybot-monthly-report` in production), 2 dead branches identified, 4 branches flagged as needing hand-extraction rather than a plain PR
- [x] **#155 merged, deployed, and verified live** (09 July 2026) — see "Actioned this session" above for full detail
- [x] Set up `complybot-monthly-report` monthly cron schedule (jobid 45) — first run 1 August 2026
- [x] Found and fixed 2 unrelated pre-existing broken cron jobs (`governance-meeting-reminders`, `daily-sso-report-reminders`) — both had been silently failing every run; now fixed via Supabase Vault
- [ ] Fix #151 (dangling nav references), #161 (config.toml gap), #70 (react-dom bump), #111 (rebase)
- [ ] Merge in the order above through step 8
- [ ] Brian/Angela to decide DECIDE-step reconciliation for #159/#163 before those proceed
- [x] Retired `localshi/merging_work/phase1-verdicts-partial.md` as active record — use this file (`pr-review-open-prs.md`) per PR as each is actioned
- [ ] Triage five newest PRs (#178–#181, #183) — full `/pr-review` when Brian picks the next one; #179 needs CODEOWNERS reviewer request + banned-pattern triage first
- [ ] Legacy queue: backfill tier labels / reviewer requests (push or reopen) OR triage manually — automation did not backfill pre-11-July PRs
- [ ] Before trusting Tier A auto-merge: re-enable CI and add blocking jobs to ruleset (see audit doc — not actioned yet)
- [ ] Close/delete `feature/complybot-intelligence-suite` and `feature/affiliate-portal` (superseded by merged #146)
- [ ] Hand-extract real changes from `cursor/fix-evidence-index-clean`, `cursor/complybot-and-history-fixes`, `cursor/fix-register-insights`, `cursor/governance-wave5-carryover` onto fresh branches before opening PRs — do not merge these branches as-is
- [x] Reviewed 5 new PRs (#165, #166, #167, #168, #169) opened after original review — done 09 July 2026, see "New PRs found" section above
- [x] **#169 merged, deployed, and migration applied to production** (10 July 2026) — see "New PRs found" section above for full detail
- [x] **#168 merged and deployed** (10 July 2026) — merge commit `1d6c5e591`, branch deleted; re-verified line-by-line before merge per Brian's request, no issues found
- [x] **#166 merged and deployed** (10 July 2026) — merge commit `04fb8a182`, branch deleted; three fix rounds, see "#166 — full history" section above. **Migration still pending** — 2 custom-ID-function migrations need Dave coordination + manual `apply_migration`, not yet done
- [x] `/pr-review` skill updated with 5 new/expanded checks off #166's Round 3 bot findings — see `.claude/commands/pr-review.md`
- [x] **#166's edge function/migration gaps closed** (10 July 2026) — audited all merged PRs for undeployed migrations/edge functions against live production (not just the ledger). Deployed `notify-gp-meeting` (was missing entirely, now ACTIVE v1). Found the 2 custom-ID migrations were already functionally live via untracked drift (one migration with zero repo file); applied reconciliation migration `reconcile_custom_id_grants_and_seed_08_09jul` (v`20260710013412`) to close the audit-trail gap. See "#166 — full history" section above.
- [ ] Check `cursor/minutes-tenant-id-mismatch-7680` (appeared independently, duplicates a fix already made in #166) before it becomes its own PR
- [x] **#165 fully re-reviewed and fixed** (10 July 2026) — real merge conflict against `main` found and resolved (commit `62afcdef0`), two rounds of post-push bot findings fixed (13 confirmed issues total across both rounds, commit `ea46ddd96`), plus a follow-up `useTenantMembersList` hook refactor and new `parseLocation` unit tests. See "#165 — full history" section above. **Ready to merge — not yet merged**, waiting on Brian.
- [ ] Check `cursor/duplicate-pre-meeting-export-a5cb` (appeared independently, duplicates a fix already made in #165) before it becomes its own PR
- [ ] Merge #165 on GitHub, then run post-merge verification (confirm landed on `main`, branch deleted, production deploy READY)
- [ ] Close #167 on GitHub as broken/superseded duplicate of #166
- [x] Cross-referenced external branch-triage report (4 governance branches) against #166/#165's actual fix history (10 July 2026) — all 4 branches confirmed deleted from remote, never merged. See "#166/#165 — branch-triage cross-reference" section above. Almost everything the report raised was already independently fixed by #166/#165, in two cases better than the deleted branches' own attempt.
- [x] **Gap fixed and verified live on `main`** (10 July 2026) — `GovernanceActionsTable.tsx` assignee filter fix, commit `2b7812da0`. Confirmed directly against `origin/main`: `showAssigneeFilter`/`selectedAssigneeIsVisible` logic and placeholder item all present.
- [x] **#64 merged, deployed, and migration applied to production** (10 July 2026) — re-review against current `main` found a genuine column-rename regression (fixed) plus confirmed the vulnerabilities it targets were still live in production despite similarly-named older migration files; 3 more bot-flagged findings fixed post-push. Merge commit `9875c6fca7`, branch deleted. Migration applied and independently verified live (super-admin checks, active-tenant lookups, submitter_* columns, PUBLIC/anon execute revoked — all confirmed via direct `pg_proc`/grant queries, not just the ledger). See "#64 — full history" section above.
- [x] **#75 merged and deployed** (10 July 2026) — re-reviewed clean against current `main`, no migrations/edge functions. Merge commit `2c0ec9456`, branch deleted. See "#75 — merged" section above.
- [x] **Cursor bot flag on #64 investigated and closed as FALSE POSITIVE** (10 July 2026) — claimed `submitter_email`/`respondent_email` mismatch was real at the flagged commit but already fixed by a later gap-fill migration before the comment was posted; confirmed directly against live production. No code change. See "#64 — Cursor bot false-positive follow-up" section above.
- [x] Investigated whether `useRtoSettingsTour.ts`/`permissionUtils.ts` (noticed during #75's review) are dead code and safe to delete — **neither is**, both are still imported by live components even though the specific stale-path logic inside each never fires correctly today. Brian's call: leave as-is, logged as a known harmless follow-up rather than actioned. See "#75 — merged" section above.
