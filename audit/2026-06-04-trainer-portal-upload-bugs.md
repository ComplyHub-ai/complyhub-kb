> **Archived:** 04 June 2026 · **Event date:** 04 June 2026 · **Type:** Bug Fix — Trainer Portal upload flows

# Trainer Portal Upload Bugs — 10 Fixes

**Date:** 04 June 2026
**Developer:** Brian (with Claude Code)
**Requested by:** Internal — diagnosed during support investigation for Australian College client (Monica Pasvolsky)
**Branch:** `main` on `ComplyHub-ai/rto-compass-hub` (via Lovable) + direct DB migration
**Commits:** `3d83a9d3b` (PD form + PD plan), `7ec9fdfa0` (currency fixes), additional Lovable commits (duration + future date fixes)
**Purpose:** Unblock Trainer/Assessor users from uploading documents across the PD record, PD plan, and currency record flows; fix future-dated PD records and duration validation

---

## Context

Investigation was triggered by a support call request — Monica Pasvolsky (`pasvolskym@gmail.com`), Trainer/Assessor at Australian College Pty Ltd, had been logging in repeatedly (15+ sessions since 28 May 2026) without successfully submitting any documents. Auth activity log confirmed she was getting into the app but no audit events or document records were being created under her account.

Testing was conducted via `khianbsismundo@gmail.com` (Trainer/Assessor on Vivacity Testing Tenant) to replicate Monica's exact role and permissions.

---

## Bugs Found and Fixed

### Bug 1 — PD Record creation failing silently
**Root cause:** `src/lib/supabase/pd-queries.ts` line 130 throws if `start_date` is missing, but `TrainerPDForm.tsx` Zod schema defined `start_date: z.string().optional()` — no form validation, generic "Failed to create PD record" toast with no actionable message.

**Fix (Lovable — commit `3d83a9d3b`):**
- `src/components/trainer/TrainerPDForm.tsx` — changed Zod schema to `start_date: z.string().min(1, 'Start date is required')`, added red asterisk to label

---

### Bug 2 — Create PD Plan RLS violation
**Root cause:** `handleCreatePlan` in `src/pages/trainer-portal/pd/index.tsx` was missing `tenant_id` in the insert payload. `trainer_pd_plan.tenant_id` is `NOT NULL` with no default, and the RLS `tenant_all` policy requires `tenant_id = sec.claim_tenant_id()`. Insert was blocked with "new row violates row-level security policy".

**Fix (Lovable — commit `3d83a9d3b`):**
- `src/pages/trainer-portal/pd/index.tsx` — added `tenant_id: trainer.tenant_id` and corrected `goals: ''` to `goals: []` (jsonb type mismatch) in the insert payload

---

### Bug 3A — Currency record duplicate error message
**Root cause:** `useCreateTrainerCurrency` `onError` handler showed a generic toast regardless of the actual error. When a duplicate `(trainer_id, activity_title, start_date)` was detected (Postgres code `23505`), the user had no way of knowing what to fix.

**Fix (Lovable — commit `7ec9fdfa0`):**
- `src/hooks/useTrainerCurrency.ts` — added `23505` detection, shows specific message: "A record with this title and start date already exists. Please use a different title or start date."

---

### Bug 3B — Currency Log empty state showing PD copy
**Root cause:** Currency Log page reused `TrainerPDTable` which has hardcoded PD text. Empty state showed "No professional development records found. Click 'Add PD Record'" on the Currency page.

**Fix (Lovable — commit `7ec9fdfa0`):**
- `src/pages/trainer-portal/currency/index.tsx` — added custom empty state rendering when `currencyRecords.length === 0 && !isLoading`, showing correct currency copy without modifying the shared `TrainerPDTable` component

---

### Bug 3C — Unique index missing `activity_type` (DB migration)
**Root cause:** `trainer_industry_currency_unique_activity` index covered `(trainer_id, activity_title, start_date)` but not `activity_type`. A PD record and a currency record with the same trainer, title, and start date incorrectly clashed — they are different activity types and should coexist.

**Fix (direct DB migration — Carl):**
```sql
DROP INDEX IF EXISTS trainer_industry_currency_unique_activity;
CREATE UNIQUE INDEX trainer_industry_currency_unique_activity
ON public.trainer_industry_currency (trainer_id, activity_title, start_date, activity_type);
```

**Pre-migration checks:**
- Zero existing rows conflicted with the new constraint
- Both `start_date` and `activity_type` are `NOT NULL` — safe to index
- No frontend code, triggers, FK constraints, or `ON CONFLICT` clauses reference this index by name
- Change is additive (relaxes the constraint) — no existing valid inserts affected
- 173 total rows across 9 activity types — no data cleanup required

---

### Bug 3D — Currency form Start Date optional in UI but NOT NULL in DB
**Root cause:** `TrainerCurrencyForm.tsx` Zod schema had `start_date: z.string().optional()` but `trainer_industry_currency.start_date` is `NOT NULL`. Missing start date would fail at the DB layer with a generic error.

**Fix (Lovable — commit `7ec9fdfa0`):**
- `src/components/trainer/TrainerCurrencyForm.tsx` — changed Zod schema to `start_date: z.string().min(1, 'Start date is required')`, added red asterisk to label

---

### Bug 4 — Duration field no validation or error feedback
**Root cause:** `TrainerPDForm.tsx` Duration field (`durationHours`/`durationMinutes`) had no `<FormMessage />` components — Zod errors were silently swallowed. No asterisk on the label and no cross-field refine requiring combined duration > 0. Submitting with 0 hrs 0 mins either failed silently or hit the backend. The global error block at the bottom showed a hardcoded generic message instead of listing which specific fields were missing.

**Fix (Lovable):**
- `src/components/trainer/TrainerPDForm.tsx` — added `.refine()` requiring combined duration > 0, added red asterisk to Duration label, added `<FormMessage />` below the Duration row, updated global error block to dynamically list missing required fields by name (Title, Start Date, Completion Date, Duration)

---

### Bug 5A — Future-dated PD records rejected (application-level)
**Root cause:** `pd-queries.ts` pdr_register dual-write hardcoded `status: 'completed'` for every PD record regardless of date. The DB trigger `fn_validate_pdr_dates` correctly rejects `completed` records with future `pd_date`. Trainers legitimately log upcoming PD events with future dates.

**Fix (Lovable):**
- `src/lib/supabase/pd-queries.ts` — changed pdr_register dual-write status to dynamic: `isPastOrToday ? 'completed' : 'pending'`

---

### Bug 5B — P0001 trigger errors showing as generic toast
**Root cause:** `useCreateTrainerPD` and `useUpdateTrainerPD` `onError` handlers showed a hardcoded generic message for all errors including DB trigger exceptions (code `P0001`).

**Fix (Lovable):**
- `src/hooks/useTrainerPD.ts` — added `P0001` detection in both `useCreateTrainerPD` and `useUpdateTrainerPD` `onError` handlers, surfacing the actual DB trigger message instead of the generic fallback

---

### Bug 5C — Future-dated PD records rejected (trigger level) + custom_id collision
**Root cause:** `fn_sync_trainer_pd_to_canonical()` trigger function on `trainer_industry_currency` had two bugs:

1. Hardcoded `'completed'::text` in the pdr_register INSERT — same issue as Bug 5A but at the trigger level (not caught by the application try-catch). This caused `fn_validate_pdr_dates` to fire and reject any PD record where `start_date > CURRENT_DATE`.

2. `custom_id` generation used `COUNT(*)+1` across all pdr_register records for the tenant. This produces incorrect IDs when records have been deleted or gaps exist. Compounded by non-standard IDs in the table (e.g. `PDR-TM-41d115ae`) — the `REGEXP_REPLACE` to extract digits was reading hex characters from those IDs (e.g. extracting `41115` from `41d115ae`), inflating the MAX value and generating conflicting IDs on every insert.

**Fix (direct DB migration):**
```sql
CREATE OR REPLACE FUNCTION fn_sync_trainer_pd_to_canonical()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
-- Changes:
-- 1. Dynamic status: COALESCE(end_date, start_date) > CURRENT_DATE → 'pending', else 'completed'
--    Applied to INSERT and both UPDATE (re-sync and orphan adoption) paths
-- 2. custom_id: MAX+1 restricted to standard PDR-NNNN format only
--    WHERE custom_id ~ '^PDR-[0-9]+$' — ignores non-standard IDs like PDR-TM-xxxxx
--    SUBSTRING(custom_id FROM 5) instead of REGEXP_REPLACE to avoid parsing hex digits
$$;
```

**Pre-change checks:**
- 206 total pdr_register records; 177 completed, 12 pending; zero completed with future pd_date — no existing data at risk
- Trigger fires on INSERT and UPDATE to `trainer_industry_currency` only
- No RLS, FK, or frontend changes required
- Both UPDATE paths (re-sync and orphan adoption) also updated to use dynamic status

---

## Monica's Account — Post-Fix Status

| Upload path | Status after fixes |
|---|---|
| Professional Development → Add PD Record | ✅ Unblocked |
| My Profile & Credentials → Documents tab | ✅ Was already working |
| My Currency Log → Add Currency Record | ✅ Unblocked |
| Create PD Plan | ✅ Fixed (she already has a 2026 plan from admin) |

Monica has a `tp_trainers` record (`5120a0d0`) on Australian College (Diamond, active, `write_locked: false`). Two PD records and two document uploads existed prior to this fix — all admin-created. She is now unblocked to self-serve all three upload paths.

---

## Files Changed

| File | Change | Via |
|---|---|---|
| `src/components/trainer/TrainerPDForm.tsx` | `start_date` required in Zod + asterisk | Lovable |
| `src/pages/trainer-portal/pd/index.tsx` | `tenant_id` + `goals: []` in PD plan insert | Lovable |
| `src/hooks/useTrainerCurrency.ts` | `23505` duplicate error detection | Lovable |
| `src/pages/trainer-portal/currency/index.tsx` | Custom currency empty state | Lovable |
| `src/components/trainer/TrainerCurrencyForm.tsx` | `start_date` required in Zod + asterisk | Lovable |
| `trainer_industry_currency` (DB) | Unique index rebuilt with `activity_type` | Direct migration |
| `src/components/trainer/TrainerPDForm.tsx` | Duration required + asterisk + FormMessage + dynamic error block | Lovable |
| `src/lib/supabase/pd-queries.ts` | Dynamic pdr_register status (pending vs completed) | Lovable |
| `src/hooks/useTrainerPD.ts` | P0001 trigger error surfacing in create + update onError | Lovable |
| `fn_sync_trainer_pd_to_canonical` (DB trigger) | Dynamic status + MAX+1 custom_id using standard PDR-NNNN format only | Direct DB migration |

## Known Remaining Debt

- `currency-queries.ts` uses `(supabase as any)` on line 78 — tech debt, flagged for Carl
- `useDeleteTrainerCurrency` has same generic error pattern as Bug 3A — separate ticket needed
- `TrainerPDTable` prop `pdRecords` leaks PD terminology into currency usage — cosmetic naming debt
