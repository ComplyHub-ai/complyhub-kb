# Audit — PR #908

> **Date:** 2026-09-01; **Merged:** 2026-09-01 00:11:53 UTC  
> **Scope:** Restore workspace access for members whose billing coverage has not expired, while enforcing tenant membership at the billing access gate.  
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `billing-lockout-investigation.md` (deleted after this audit was created)

---

## Summary

PR #908 addressed reported workspace lockouts affecting Louisa Gatto and Hasitha Wijesekara. The investigation found that tenant-level `status=suspended` values were stale for some tenants even though their paid-through dates were in the future. The fix makes the workspace chooser use the canonical billing decision and keeps soft billing states readable without sending users directly to the payment wall.

The PR changed six files: three frontend files, one shared access helper, one Edge Function, and one migration. It added 192 lines and removed 44. The highest-risk change was the database access gate: it now confirms that the caller is an active tenant member, while still allowing approved internal administrators to inspect the gate.

The migration was applied to production with the exact merged SQL through project-scoped `execute_sql`, then the migration ledger was repaired to the merged version. The live database and Edge Function were verified after rollout. Vercel deployment verification could not be completed because the Vercel connector was not logged in at audit time.

**Branch:** `fix/louisa-gatto-billing-lockout` (merged) · **Merge commit:** `8233e9760153af9e0c8b8941eca5dc92c890047b`  
**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/908

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Workspace selection | Paid workspaces could be hidden or disabled when the tenant label was `suspended`. | A chooser path treated the tenant status label as the access decision instead of the canonical paid-through billing decision. |
| Billing access | The billing Edge Function called the security-definer access gate without an end-user identity. | The database gate now requires active membership, but the Edge Function still used its service-role client for that call. |
| Membership loading | Missing profile or tenant rows could throw `.single()` errors and leave the chooser in an error state. | The loader assumed exactly one row for queries that can legitimately return zero or one row. |
| User feedback | Members with a genuine hard billing block had no clear path from the chooser to billing recovery. | The chooser did not distinguish soft billing attention from a hard block with a recovery action. |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `715ef39965edd58e3707a0f21ddfd44fee87b3b6` | Closed paid-workspace lockout paths across the chooser, access helper, billing Edge Function, membership loader, tests, and database migration. |
| `8233e9760153af9e0c8b8941eca5dc92c890047b` | Merged PR #908 into `main`. |

---

## Fixes shipped

### Frontend access and workspace selection

- **Membership loading** — Handles missing profile and tenant rows safely and evaluates each membership through the canonical access gate.
- **Workspace chooser** — Uses the billing decision rather than the stale tenant status label, keeps soft billing states selectable, and gives genuinely blocked members a direct billing-recovery action.
- **Error handling** — Replaced raw browser error output in the affected flow with the application logger.
- **Access helper tests** — Covers paid access, soft billing blocks, hard blocks, transport errors, and empty responses.

### Database

Migration `20260901000433_secure_get_access_gate_membership_scope.sql` adds an idempotent membership guard to `public.get_access_gate(uuid)`. The guard permits active tenant members and approved internal administrators, denies unrelated callers, and preserves the future paid-through access branch.

Applied using the exact merged migration SQL through `execute_sql`, followed by migration-ledger repair. Production ledger verification confirms:

- Version: `20260901000433`
- Name: `secure_get_access_gate_membership_scope`
- Function: `get_access_gate(uuid)` remains `SECURITY DEFINER`.
- Anonymous execution: denied.
- Authenticated execution: granted.
- Membership guard: present.

### Edge functions

The `billing-gate` function now calls `get_access_gate` with the authenticated user client so `auth.uid()` is available to the membership guard. Production is running `billing-gate` version 195 with the merged source, and the function is active.

---

## Review rounds

1. **Original investigation** — Mapped the live Louisa and Hasitha accounts, the chooser routes, the billing gate, tenant status filters, and the paid-through tenant population.
2. **Fresh-eyes review** — Confirmed the missing membership protection, unsafe single-row assumptions, raw error logging, hard-block recovery gap, RPC contract, and compatibility with the live schema. The review also flagged the per-membership RPC burst; the implementation uses sequential checks to reduce concurrent load.
3. **Focused tests** — The access-helper test suite passed all 5 tests.
4. **Lint and type verification** — Changed TypeScript and TSX files passed ESLint; TypeScript verification passed.
5. **Diff and migration checks** — The diff had no whitespace errors; the migration was reviewed for idempotency and applied using the required production procedure.
6. **Post-merge production verification** — Confirmed the migration ledger, database function guard and grants, live Edge Function version/source, and the merged branch state.

---

## Production rollout (post-merge)

1. **Vercel production** — Not verified: the Vercel connector returned `USER_NOT_LOGGED_IN`. No deployment success is claimed here.
2. **Edge functions** — `billing-gate` is active at version 195; its live source includes the authenticated-client access-gate call.
3. **Migrations** — Version `20260901000433` is present in the production ledger with the expected name. The function guard and grants were queried directly after application.
4. **Worktrees** — Worktree B remains on the merged feature branch and is clean. The active-work registry still records the investigation claim and should be released during normal post-merge teardown.

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Sign in as `louisa@thinkrealestate.net.au` and confirm Think Real Estate appears and opens from workspace selection.
- [ ] Sign in as `louisa@rets.com.au` and confirm Real Estate Training Solutions opens despite its stale suspended tenant label.
- [ ] Sign in as `hasitha@australiancollege.edu.au` and confirm Australian College opens normally.
- [ ] Confirm a genuinely unpaid or hard-blocked tenant cannot enter the workspace and is offered the billing recovery path.
- [ ] Confirm a soft billing state remains readable but remains write-locked where appropriate.
- [ ] Repeat the checks after signing out and back in to rule out stale browser session state.

The live database checks are complete; these browser click-throughs were not performed in this audit.

---

## Still open / follow-up

- Seven tenants still have `status=suspended` despite future paid-through dates, affecting 83 active members. This is a stale data-label anomaly, not a confirmed access denial after PR #908.
- The current live scan found 10 tenants with future paid-through dates, 133 active members, zero locked profiles, and zero non-active profile statuses among those members.
- A database-level authenticated-identity check returned `allowed=true` for both Louisa accounts and Hasitha. This is strong live evidence but does not replace a real browser session test.
- Re-run the production Vercel deployment check after reconnecting the Vercel connector.

---

## Soak status

No feature flag is involved. Risk is medium because the change affects login/workspace selection and a security-sensitive database function. Watch billing-gate errors, unexpected `tenant_access_denied` results, workspace chooser reports, and hard-block redirect volume for the next release window.

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/908
- Merge commit: `8233e9760153af9e0c8b8941eca5dc92c890047b`
- Source commit: `715ef39965edd58e3707a0f21ddfd44fee87b3b6`
- Migration: `20260901000433_secure_get_access_gate_membership_scope.sql`
- Source investigation: `billing-lockout-investigation.md` (deleted after this audit was written)
- Active work ledger: `active-work.md`
