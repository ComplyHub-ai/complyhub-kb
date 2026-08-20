# Audit - PR #442: Trainer onboarding credential upload + self-service availability

> **Date:** 14 August 2026
> **Scope:** Trainer onboarding credential submission, trainer self-service weekly availability, database access fixes enabling trainer self-service on the Trainer Availability register
> **Project:** `gdwhlstfguxarnxasrrs` (ComplyHub Project)
> **Branch:** `feat/trainer-onboarding-credentials-upload`
> **Worktree:** C (`rto-compass-hub-C`)
> **PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/442
> **Merge commit:** `97ede3dcc`
> **Merged:** 14 August 2026

---

## Summary

PR #442 added two required steps to the Trainer role's onboarding flow — a credential submission and a weekly availability declaration — and, in the process of building the availability piece, discovered and fixed that a Trainer/Trainer-Assessor had never actually been able to write to the Trainer Availability register at all (only Administrator/Compliance Manager could), despite the register being linked from their own sidebar.

The branch went through two adversarial review passes (Scout recon, then Reviewer) before opening the PR, and two further rounds of fixes after Cursor Bugbot and Vercel's bot flagged issues post-push. The migration drift check also failed on first push because of unrelated production schema changes applied directly by someone else; those were reconciled as part of getting this PR to a clean CI state.

---

## Decisions recorded

- **Database access fix is in scope, not deferred.** Trainers being unable to save their own availability was a blocking dependency for the onboarding step, so the RLS fix shipped in this PR rather than as a separate ticket.
- **Weekly availability uses real per-day start/end times**, replacing the previous AM/PM checkboxes.
- **"Upcoming Unavailability" is its own action, not part of the weekly-availability save.** Investigation confirmed it is a simple informational record with no approval workflow, no scheduling logic, and no notification tied to it anywhere in the codebase — so it was split into its own button/dialog without inventing a leave-approval system that nothing currently expects.
- **Responsible Person stays a required field** on the trainer's self-service availability form, same as the admin version.
- **Onboarding credential step reuses the full existing "Add Credential" form** (type, code, title, issuer, dates, evidence) rather than a lightweight attach-only version, since a trainer being onboarded typically already holds the qualification and its details.
- **Availability is a distinct required onboarding step**, gating access to the normal profile tabs until a first weekly-availability record is saved.

---

## Implementation shipped

### Credential upload fix
- `MyCredentialsTab`'s existing "Add Credential" upload now routes through the `register-evidence-manager` edge function instead of uploading directly from the browser to Storage, matching the pattern already used by `TrainerDocumentsTab`.

### Onboarding credential step
- New `OnboardingCredentialForm` + `useOnboardingCredentialForm`, reusing the same fields and insert path as the existing Add Credential dialog, so a credential submitted during onboarding is a complete, real record from day one.

### Trainer availability rework
- `TrainerAvailabilityForm` (admin): AM/PM checkboxes replaced with per-day start/end time inputs; the embedded "Unavailable Periods" UI removed.
- New `UnavailabilityPeriodsDialog`: a separate button/dialog for managing unavailability periods, used both as a compact per-row action on the admin register and on the trainer's own view.
- New trainer self-service surface: `MyWeeklyAvailabilityForm`, `useMyTrainerAvailability`, `useSaveMyWeeklyAvailability`, `useSaveMyUnavailablePeriods`, `useTenantResponsiblePersons`, `useTrainerDeliveryAreas`, and `MyAvailabilityRegisterView` (replaces the admin table view on the existing Trainer Availability register page when the signed-in user is Trainer/Trainer-Assessor).
- `trainer-portal/profile.tsx`: added a required gate after the profile/credential step — a trainer without a weekly-availability record sees `MyWeeklyAvailabilityForm` full-screen instead of the normal tabs.

### Fixes from review rounds
- **RLS — trainer self-write grant.** Added scoped INSERT/UPDATE policies so a Trainer/Trainer-Assessor can write only their own `tar_register` row; previously only Administrator/Compliance Manager could write this table at all.
- **RLS — hijack prevention.** The self-write grant alone would have let a trainer retarget another trainer's row by rewriting its `trainer` column to themselves. Closed with per-command RESTRICTIVE policies (INSERT/UPDATE/DELETE) requiring the row's trainer to already be the caller.
- **RLS — SELECT visibility gap (blocking, caught in review).** `restrict_select_tar_register` only allowed a row to be read via `created_by = auth.uid()`. Every existing trainer's row was created by an admin, so trainers could never see their own record — every onboarding save would have inserted a duplicate instead of updating the real row. Fixed by adding `trainer = auth.uid()` to that policy.
- **RESTRICTIVE policy scope (Vercel bot).** The hijack-prevention policy was originally written `FOR ALL`, which also silently blocked Governing Person and Regulatory Officer from reading the table. Split into three per-command RESTRICTIVE policies, matching this table's existing `write_lock_*` per-command pattern, so SELECT is untouched.
- **Consultant/Consultant Assistant DELETE regression.** Added to the restrictive policy's admin-equivalent role list to preserve delete capability those roles already had.
- **Delivery areas wiped on save (Cursor Bugbot).** `trainer_unit_map.trainer_id` references `tp_trainers.id`, not the auth user id; the form was passing the wrong ID, always returning zero delivery areas, and the save was overwriting `delivery_area` on every update as a result. Fixed by passing the correct ID for the lookup and no longer touching `delivery_area` on UPDATE — only set on first INSERT.
- Magic role-string array replaced with `ROLES.*` constants; defensive normalization added for legacy/malformed `unavailable_periods` entries; a CI guard false-positive (a comment containing the literal text "SECURITY DEFINER") reworded without changing any executable SQL.

---

## Database migrations

### PR migration

| Version | File | Purpose |
|---|---|---|
| `20260814055947` | `tar_register_trainer_self_service.sql` | Adds 14 per-day start/end time columns; grants Trainer/Trainer-Assessor self-scoped insert/update; adds per-command restrictive hijack-prevention (with Administrator/Compliance Manager/Consultant/Consultant Assistant preserved); fixes `restrict_select_tar_register` to add `trainer = auth.uid()`. |

### Migration drift reconciliation

The first CI run's migration drift check failed — 5 schema changes had been applied directly to production by someone else, unrelated to this PR, with no matching file on `main`. Their exact version/name and recorded SQL were retrieved from the production ledger and added as reconciliation files:

| Version | Reconciliation |
|---|---|
| `20260814063022` | RLS init-plan sweep, batch 5 (new non-public schemas). |
| `20260814063115` | Dropped two live duplicate indexes (documents, surveys). |
| `20260814063131` | Revoked `anon` execute on internal TAS RPCs; added a SuperAdmin-only policy on `storage_soak_buckets`. |
| `20260814063203` | Follow-up: revoked `PUBLIC`-inherited execute on the same TAS RPCs, granted `authenticated`/`service_role` explicitly. |
| `20260814063744` | RESTRICTIVE SELECT closure across 28 Trainers Matrix tables (batch 1). |

---

## Production execution and verification

- Target project confirmed as `gdwhlstfguxarnxasrrs`.
- `20260814055947` was executed via Supabase MCP `execute_sql` (not `apply_migration`, not `supabase db push`) and verified: all 14 new time columns present on `tar_register`, and all 6 new/updated policies (`trainer_self_insert_tar_register`, `trainer_self_update_tar_register`, `trainer_scope_insert/update/delete_tar_register`, `restrict_select_tar_register`) confirmed live with correct command/permissive type.
- The 5 reconciliation files were **not** re-executed — their SQL was already live in production (that's what made them drift in the first place). Ledger repair only.
- Brian ran, from worktree C:

  ```text
  supabase migration repair --status applied 20260814055947
  supabase migration repair --status applied 20260814063022
  supabase migration repair --status applied 20260814063115
  supabase migration repair --status applied 20260814063131
  supabase migration repair --status applied 20260814063203
  supabase migration repair --status applied 20260814063744
  ```

- Ledger verification confirmed all 6 versions match their file's version + name exactly.

---

## Verification performed

- Scoped ESLint across every changed/new file (multiple rounds, after each fix)
- `.single()` ban scan
- Security guard scan (hardcoded project ID, dropped tests/migrations, `verify_jwt` downgrade)
- Migration guards
- `npm run type-check` run but treated as non-authoritative per this repo's known vacuous-tsconfig issue; relied on lint + manual review of the hand-edited `types.ts` schema additions instead
- Scout (read-only recon) on the availability form, its data model, and its actual RLS before any code was written
- A second Scout pass specifically investigating whether "Upcoming Unavailability" was a leave-approval workflow before designing around that assumption
- Reviewer (adversarial pass) before PR creation — found the SELECT-visibility blocking bug and two should-fix items, all resolved before push
- A follow-up verification pass confirming all four review fixes were correctly applied
- CI migration drift check — failed once (unrelated production drift), resolved via reconciliation, passed on re-run
- Cursor Bugbot finding (delivery areas wiped) — investigated against the live schema (`trainer_unit_map`'s FK target), confirmed real, fixed
- Vercel bot finding (RESTRICTIVE policy blocking Governing Person/Regulatory Officer reads) — confirmed real, fixed
- Post-merge: production execution + ledger repair + ledger verification (see above)

---

## Follow-up

- Three additional orphaned production migrations were found while auditing post-merge state, unrelated to this PR: `20260812020135`, `20260814061523`, `20260814072717`. None have a matching git file yet. Not reconciled as part of this PR — parked for a separate task.
- Seven migrations from earlier, unrelated PRs (including PR #435) were found merged to `main` but never applied to production. At Brian's request these were applied and ledger-repaired in the same session as this PR's post-merge work, but they are **not** part of PR #442's own changes. No separate audit entry has been filed for that work as of this writing.
- The broader historical Supabase migration drift (the ~2,000-version Lovable-era backlog) remains a separate, already-tracked reconciliation project and was not touched here.
