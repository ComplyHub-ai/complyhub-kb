# Audit — PR #960

> **Date:** 2026-09-03; **Merged:** 2026-09-03 01:59:57 UTC
> **Scope:** Trainer Availability register's "Add New Trainer Availability Record" dialog was listing every tenant member (admins, consultants, generic shared logins) in its Trainer dropdown instead of only actual registered trainers.
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — tracked via `active-work.md` worktree B registry, in-session

---

## Summary

Brian reported (with a screenshot) that the Trainer dropdown on the Trainer Availability
register's create/edit dialog was showing a mix of names that clearly weren't trainers —
"Unknown" entries, generic accounts like "support"/"info"/"aysaustralia", and Angela
Connell-Richards (product owner, not a trainer). Root cause: the dropdown was populated from
every row in `tenant_members` for the tenant with no role filter at all — the code comment
literally read "Load trainers - same as responsible persons for this form."

The correct fix was **not** a simple role filter on `tenant_members`, though. Live verification
found a real production record assigned to someone whose `tenant_members.role` is
"Administrator" but who is a genuine registered trainer in `tp_trainers` (the platform's actual
Trainer & Assessor register, separate from login/permission role). A naive `role IN
('Trainer','Trainer/Assessor')` filter on `tenant_members` would have wrongly excluded this real
trainer. The fix instead sources the dropdown from `tp_trainers`.

While tracing the fix through the same file, a second, unrelated defect was found and fixed in
the same pass: the "Course Codes (Delivery Areas)" checklist further down the same form was
silently broken for every trainer, always showing "no course codes found." It queried
`trainer_unit_map.trainer_id` (which foreign-keys to `tp_trainers.id`) using the auth user id
instead — the exact same defect class already caught and fixed once before in the sibling
`MyWeeklyAvailabilityForm.tsx`, whose own code comment described the earlier incident.

This PR changed 1 file, no migrations, no edge functions. Highest-risk behavioural change: the
newly-added `.eq('status','active')` filter on the Responsible Person query, which didn't exist
before — verified live against production that no existing `tar_register.responsible_person`
value references a deactivated member, so nothing is blanked out by it.

**Branch:** `fix/trainer-availability-trainer-list` (merged; remote and local both deleted) ·
**Merge commit:** `2b3f4740219e09fcf0da8520513705ec5c9d294a` ·
**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/960

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Trainer dropdown | Listed consultants, admins, and generic shared logins (support/info/aysaustralia) instead of only trainers | Query pulled every `tenant_members` row for the tenant with zero role filter, then reused the same list for both Responsible Person and Trainer fields |
| Trainer dropdown (correct fix path) | A naive `tenant_members.role` filter would have wrongly excluded real trainers | Live data showed a production trainer (RJ Badua) whose `tenant_members.role` is "Administrator" but who is a genuine registered trainer in `tp_trainers` — role and trainer-registration are two separate data models |
| **(same-file consistency check)** Course Codes / Delivery Areas | Always showed "No course codes found for selected trainer," for every trainer, every time | `trainer_unit_map.trainer_id` foreign-keys to `tp_trainers.id`, but the form queried it using the auth user id (`formData.trainer`) instead — same defect already fixed once in `MyWeeklyAvailabilityForm.tsx` |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `7d10504ed` | Trainer dropdown sourced from `tp_trainers` instead of unfiltered `tenant_members`; delivery-area lookup resolves the correct `tp_trainers.id` before querying `trainer_unit_map`; Responsible Person query gains `status='active'` filter |

---

## Fixes shipped

### Frontend

- **`src/components/tar/TrainerAvailabilityForm.tsx`** — Trainer dropdown now queries `tp_trainers` (`tenant_id` + `status='active'` + `user_id` not null), matching the same table/filter the existing `useActiveTpTrainers` hook already uses elsewhere in the app. Each trainer's `tp_trainers.id` is now tracked alongside their `user_id` so `handleTrainerChange` resolves the correct id before calling `loadTrainerDeliveryAreas` — `tar_register.trainer` itself keeps storing the auth user id, unchanged, consistent with existing data (no FK constraint on that column, confirmed live). Responsible Person query unchanged in source table, gained `.eq('status','active')`. Display name falls back `full_name || trainer_name || 'Unknown'` — verified live this fallback is load-bearing, not cosmetic: 84 of 99 currently-active linked `tp_trainers` rows only have `trainer_name` populated, not `full_name`.

### Database

None.

### Edge functions

None touched, none redeployed.

---

## Review rounds

1. **Root-cause diagnosis** (this session) — traced the dropdown query in the component, cross-referenced against live `tenant_members` role/status distribution (223 Consultants, 119 Administrators, 47 Trainer/Assessors, etc., matching the screenshot), then confirmed `tp_trainers` as the correct source via a real dual-role production record.
2. **Same-file consistency check** (this session, per repo convention of diffing every query in a touched file against the one just written) — found the `trainer_unit_map` id-type defect via the live foreign key (`trainer_unit_map.trainer_id → tp_trainers.id`) and the sibling file's own code comment describing the same defect caught previously.
3. **Live regression check before shipping** (this session) — queried production for any existing `tar_register.responsible_person`/`trainer` value that would be blanked out by the new filters. Found and disclosed one unrelated pre-existing gap (an orphaned trainer reference in a non-demo but zero-member "vivacity-ian-troubleshooting" test tenant) that predates this change and isn't affected by it either way.
4. **Lint** — `npx eslint` on the touched file, clean.
5. **Pre-commit hook** — `prettier --write` + `eslint --fix --max-warnings=0` ran automatically on commit, no manual fixes needed after.

---

## Production rollout (post-merge)

1. **Vercel production** — `dpl_Av6a9Vcf6cLt45LdjHzFjnB2Jbpg`; `state`/`target`: **READY** / **production**; SHA `2b3f4740219e09fcf0da8520513705ec5c9d294a` (merge commit). Inspector: https://vercel.com/complyhub/complyhub-rto/Av6a9Vcf6cLt45LdjHzFjnB2Jbpg
2. **Edge functions** — none.
3. **Migrations** — none.
4. **Worktrees** — worktree B (`rto-compass-hub-worktree-b`) confirmed clean, fetched `origin/main`, checked out `main` at `2b3f47402`, fast-forwarded cleanly; remote and local feature branch both deleted. Registry row released to `unclaimed`/Ready, pending Brian's instruction to set to standby.

---

## Manual QA checklist (post-merge — Brian-gated)

Not done in-session (no authenticated browser pass after deploy). From the PR's own test plan:

- [ ] Open Trainer Availability register → Add New Trainer Availability Record → confirm Trainer dropdown lists only registered trainers, not consultants/admins/generic logins
- [ ] Select a trainer with known unit mappings → confirm Course Codes (Delivery Areas) now populate
- [ ] Edit the existing record assigned to a dual-role Administrator/Trainer (RJ Badua) → confirm it still shows correctly, doesn't blank out
- [ ] Test from Administrator role (the role that manages this register) on the Vivacity Testing Tenant

---

## Still open / follow-up

- **`sa-delete-tenant-complete` edge function is not actually complete** — surfaced as a tangent
  while scoping removal of the unrelated legacy `vivacity-ian-troubleshooting` test tenant. Its own
  code comment claims 158 CASCADE rules will clean up everything after it explicitly deletes only
  4 support tables; live verification found the vast majority of ~400 tenant-scoped tables
  (including `tar_register`/`tp_trainers`/`trainer_unit_map` from this very PR) have no FK back to
  `tenants(id)` at all, so real content data is silently left orphaned while the function reports
  full success. Not a live risk (orphaned rows become unreachable once the tenant is gone — every
  read path requires active `tenant_members`), just misleading and incomplete. Parked in
  `active-work.md` backlog — needs its own dedicated FRAME, not a rushed inline fix.
- **One pre-existing orphaned trainer reference**, unrelated to this PR — a `tar_register` row in
  the non-demo `vivacity-ian-troubleshooting` tenant (0 members, subscription canceled) points to a
  trainer id that doesn't exist in `tenant_members` or `tp_trainers` at all. Was already unmatched
  under the old dropdown code too, so this PR neither caused nor fixed it. No action taken — noted
  for whoever eventually offboards that tenant.

---

## Soak status

No feature flag. Risk: low — single file, frontend-only, reuses an existing table/RLS policy
already proven working elsewhere in the app (`useActiveTpTrainers` pattern). Watch: any report of
a legitimate trainer still missing from the dropdown (would indicate a `tp_trainers` row for them
doesn't exist or isn't `status='active'`) or a Responsible Person value unexpectedly blank on an
old record (would indicate a deactivated-member edge case not caught by the live check performed
this session).

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/960
- Merge commit: `2b3f4740219e09fcf0da8520513705ec5c9d294a`
- Production deploy: https://vercel.com/complyhub/complyhub-rto/Av6a9Vcf6cLt45LdjHzFjnB2Jbpg
- Active work ledger: `active-work.md`
