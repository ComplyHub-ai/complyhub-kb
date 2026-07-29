# Audit — PR #309, #313, #314, #315, #318

> **Date:** 28 July 2026
> **Scope:** 5 open PRs on `rto-compass-hub`, reviewed and merged in one session
> **Reviewer:** Checker (independent, fresh-context review per PR, no prior summary shared)
> **Merge authority:** Brian (per standing full merge authority — no Carl/Angela sign-off required)

---

## Summary

All five PRs were security/correctness fixes in the trainer-report and governance-meeting area,
plus one unrelated benchmark-tenant-scoping fix. Each was independently reviewed by a fresh-context
Checker agent (no access to any other PR's findings or this session's prior analysis), brought up to
date with `main`, and merged in the order below. Two additional bugs were found and fixed mid-session
(one by Cursor Bugbot, one by Vercel's bot, both on PR #313) before merging.

**Merge order:** #309 → #318 → #315 → #313 → #314

---

## PR #309 — fix(security): restore admin-strict user management

**Branch:** `cursor/critical-bug-investigation-c22a` · **Merged:** 28 Jul 2026

Closed a Consultant RBAC takeover: the 22 Jul widening had allowed Consultants to promote themselves
to Administrator, approve/reject Administrator join requests, or deactivate real administrators.
Fix requires strict Administrator role (`sec.has_tenant_role_strict`) on all user-management RPCs
(`assign_user_roles`, `approve_join_request`, `reject_join_request`, `deactivate_tenant_user`,
`reactivate_tenant_user`, `log_user_management_action`, `get_user_management_audit`), adds restrictive
`tenant_members` INSERT/UPDATE/DELETE RLS policies layered on top of the older permissive policies,
and hardens the self-service role-switch trigger to check `session_user` (not `current_user`, which
SECURITY DEFINER changes) so the bypass can't be inherited by ordinary callers.

**Checker findings:** No blocking issues. Two non-blocking notes: (1) self-role-update safety currently
relies on the trigger as a single point of failure rather than defense-in-depth; (2) Governing Person
loses access to the User Management page — matches backend RPC behaviour, flagged to confirm with
Angela it's intentional (not a defect).

**Migration:** `20260723111654_restrict_user_management_rbac_to_administrator.sql` — applied to production
via `execute_sql`, verified all 7 functions and all 3 restrictive policies exist.

---

## PR #318 — fix(security): close #317 active_tenant_id membership-skip on benchmarks

**Branch:** `cursor/critical-bug-investigation-341c` · **Merged:** 28 Jul 2026

`fetch-unit-benchmarks` skipped its membership check whenever the request's `tenant_id` matched the
caller's `active_tenant_id` — a stale field that persists after a consultant is removed/deactivated
from a tenant. Fix always verifies active membership (never skips), adds a TAS-build ownership check,
and requires active membership on `pre-release-check` and `trial-metrics`.

**Checker findings:** No blocking issues. Confirmed no sibling function has the same unsafe skip
pattern (searched all `active_tenant_id` references in edge functions). One pre-existing, non-PR
observation: `super_admin` bypasses the membership check entirely on this function — an existing
design decision, not introduced or changed by this PR.

**Migration:** None. **Edge functions deployed:** `fetch-unit-benchmarks` (incl. new `auth.ts` +
shared `_shared/roleGates.ts`), `pre-release-check`, `trial-metrics` — all verified live post-deploy
(confirmed `auth.ts` and the widened membership check are present in the deployed source).

---

## PR #315 — fix: scope trainer-report meeting RPCs to the meeting's tenant

**Branch:** `cursor/critical-bug-investigation-318b` · **Merged:** 28 Jul 2026

`get_trainer_report_meeting_summary` and `list_tmr_for_meeting` resolved tenant via unordered
`LIMIT 1` on `tenant_members` or via stale `profiles.tenant_id` — wrong tenant risk for
multi-tenant consultants. Fix resolves tenant strictly from the `governance_meetings` row, and
counts `reviewed`/`approved`/`committed` (not just `submitted`) as turned-in.

**Checker findings + fix applied:** `get_trainer_report_meeting_summary` omitted `'Governing Person'`
from its allowed roles while its sibling function and the canonical `calculate_governance_readiness`
pattern both grant it — confirmed as an accidental omission (cross-checked against the canonical
pattern) and fixed in the same migration file before merge. Also aligned `list_tmr_for_meeting`'s
`search_path` to `''` to match its sibling (was `'public'` — inconsistent, not exploitable, but untidy).

**Migration:** `20260726110616_fix_trainer_report_meeting_rpc_tenant_scope.sql` — applied to production,
verified both functions' source includes `'Governing Person'` in the allowed-role list.

---

## PR #313 — fix: prevent reviewed/approved trainer report re-submit fan-out

**Branch:** `cursor/critical-bug-investigation-de68` · **Merged:** 28 Jul 2026

`submit_trainer_monthly_report`'s `already_submitted` guard only checked `submitted`/`committed` —
a report already moved to `reviewed` or `approved` by a Compliance Manager could be resubmitted,
re-running the full register fan-out (SSR/WHS/OFI/Risk/PDR/etc.) and duplicating rows while wiping
the CM's review state. Fix widens the guard to all four post-draft statuses and centralises them in
a shared `TRAINER_REPORT_LOCKED_STATUSES` constant.

**Checker findings:** No blocking issues. Cross-checked against PR #315's status list — both define
"submitted" identically (`submitted|reviewed|approved|committed`), no contradictory behaviour between
the meeting-summary panel and the submit guard. One known non-blocking duplication (`MonthlyReportForm.tsx`
hardcodes the same 4-status list instead of importing the shared constant) — confirmed still correct,
just not DRY.

**Two bot-flagged bugs found and fixed before merge (not in original Checker pass):**
1. **Cursor Bugbot** — widening the lock to `approved`/`committed` left the trainer-portal locked-state
   banner only recognising `submitted`/`reviewed` as "already submitted"; `approved`/`committed` reports
   wrongly showed "linked governance meeting has started." Fixed by using the shared
   `isTrainerReportPostDraftStatus` helper instead of a partial inline check
   (`src/pages/trainer-portal/monthly-report.tsx`).
2. **Vercel bot** — `MonthlyReportForm.tsx`'s `StatusBadge` component had no map entries for `reviewed`/
   `approved`, so those reports fell through to a muted "Not started" badge. Fixed by adding both entries.

Both fixes verified with `npx tsc --noEmit` (clean) and scoped ESLint (clean) before push.

**Migration:** `20260724150001_reject_reviewed_approved_trainer_report_resubmit.sql` — applied to
production, verified `submit_trainer_monthly_report`'s source includes all four statuses in the guard.

---

## PR #314 — fix: skip completed/cancelled meetings for next trainer report cycle

**Branch:** `cursor/critical-bug-investigation-f3fc` · **Merged:** 28 Jul 2026

`getNextScheduledGovernanceMeeting` (the helper that decides which meeting a new/draft trainer report
binds to) previously had no such shared helper — the next-meeting lookup didn't filter out
completed/cancelled meetings, so a same-day completed meeting plus a future scheduled one could
resolve to the wrong "next" meeting. Fix adds a proper eligibility filter (`scheduled`/`in_progress`
only) shared across `useNextGovernanceMeeting`, `monthly-report.tsx`, and `MonthlyReportsList.tsx`.

**Checker findings:** No blocking issues. Confirmed the all-completed/cancelled edge case degrades
gracefully (returns `null`, callers already handle it). Cross-checked against PR #315's migration and
PR #313's lock logic — no conflict or duplication; `getNextScheduledGovernanceMeeting` only feeds
new/draft report binding, while the lock check reads a report's own already-stored `meeting_id`
independently, so the two can't interfere. One non-blocking note: the underlying query caps at 20
candidate meetings — low risk, not a regression from prior behaviour (which only ever checked 1).

**Merge conflict:** One conflict in `src/pages/trainer-portal/monthly-report.tsx`'s import block
(this PR's `getNextScheduledGovernanceMeeting` import vs. #313's `isTrainerReportPostDraftStatus`
import, both landing in the same file). Resolved by combining both imports — re-verified afterward
by a second independent Checker pass that all three imported symbols are used correctly and that
the "which meeting is next" and "is this report locked" logic remain properly separated (no
conflation risk).

**Migration:** None required.

---

## Post-merge verification

- **Migration ledger:** All three production migrations (#309, #313, #315) confirmed applied via
  `execute_sql`, then reconciled in git/production ledger via `supabase migration repair` (run by
  Brian) in correct chronological order (`20260723111654` → `20260724150001` → `20260726110616`).
  Verified post-repair: `schema_migrations` table shows all three versions with names matching the
  git files exactly.
- **Edge functions:** All three from PR #318 (`fetch-unit-benchmarks`, `pre-release-check`,
  `trial-metrics`) confirmed deployed with the fixed source — verified by fetching live function
  source and confirming the membership-check widening and new `auth.ts`/`_shared/roleGates.ts` files
  are present.
- **"Out-of-order migration" warnings** seen on PR #313 and PR #314 in GitHub's Supabase preview-branch
  bot comments were confirmed to be preview-environment bookkeeping artifacts only (a side effect of
  each branch picking up several already-merged migrations at once) — not a production issue, and
  not something requiring action.

## Known follow-ups (not blocking, not actioned this session)

- Confirm with Angela whether Governing Person is intentionally excluded from the User Management
  page (PR #309).
- `MonthlyReportForm.tsx` duplicates `TRAINER_REPORT_LOCKED_STATUSES` inline instead of importing the
  shared constant (PR #313) — cosmetic/DRY only.
- `useMonthlyReportOverview.ts` has its own separate `DONE_STATUSES` set (includes `tabled`/`archived`)
  not unified with the shared constant — spotted in passing during PR #313 review, out of scope for
  that PR.
- `fetch-unit-benchmarks` lets `super_admin` bypass its membership check entirely — pre-existing
  design decision, arguably in tension with the "super_admin never accesses tenant content" rule,
  not changed by PR #318.
