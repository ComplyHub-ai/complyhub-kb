# Audit — PRs #84 + #85 + #88: Angela batch June 29 + TGA Picker Batch 3

**Date:** 29 June 2026
**Branches:** `fix/angela-batch-june29` · `fix/angela-batch-june29-b` · `fix/tga-picker-batch3-7a-7d`
**PRs:** #84 · #85 · #88
**Merged by:** Brian (Khian)
**Merge commits:** `b32d830e2` (PR #84) · `80533a95a` (PR #85) · `e3578d153` (PR #88)
**Source register:** `ISSUE-BATCH-2026-06-29.md`
**Migration applied to production:** Yes — `20260629200000_delivery_hours_numeric.sql`, verified. All 6 `tas_unit_delivery_hours` hour columns confirmed `numeric(6,1)`.

---

## What was fixed / delivered

### PR #84 — Batch 1 (Issues 1, 2, 3, 5A)

**Issue 1 — TGA Units: can't type the unit code**
- The qualification search dropdown was portalled to `document.body`, placing it outside the Radix Sheet focus scope. Keystrokes never landed in the search box.
- Fix: dropped the `document.body` portal; renders inline inside the Sheet's focus scope. Typing while open (regression from earlier work) also preserved.

**Issue 2 — "No units found in AOT pack" on single-unit TAS**
- Edge function `fetch-assessment-conditions` sourced units only from `tas_aot_packs.unit_hour_allocations`, which is never populated for single-unit builds (18/20 sampled builds had no `tas_aot_packs` row at all).
- Fix: edge function now sources units primarily from `q1_tas_units` + `q1_tas_units_external` (mirroring `useTasUnits`), keeping AOT pack as a fallback. Multi-unit builds unaffected.

**Issue 3 — Delivery Hours half-hour save failure**
- Six `tas_unit_delivery_hours` columns were `INTEGER`; the AOT calc stored fractional hours (0.5) in jsonb which displayed in cells. Manual cell edits upserted the raw decimal → Postgres rejected `1.5`.
- Fix (Option B chosen): migration changed all six columns to `numeric(6,1)`; `rpc_apply_aot_to_delivery_hours` updated to stop rounding. Half-hours now save correctly from both paths.
- Migration: `20260629200000_delivery_hours_numeric.sql` — applied and verified.

**Issue 5A — Evidence Integrity Check disappears on remount**
- `handleRunIntegrity` wrote results only to `useState`; the mount effect never read back from `tas_evidence_integrity_checks`. Result vanished on page reload.
- Fix: added a read path on mount via `.maybeSingle()` on `tas_evidence_integrity_checks` for the build, hydrating the same integrity state setters.

### PR #85 — Batch 2 (Issues 4, 5B, 6, Issue A)

**Issue 4 — Export Micro-TAS Session Plans to Word**
- `MicroTASDialog.tsx` had a dead "Export PDF" button (no `onClick`) and no Word option. TAS Builder already had working DOCX export.
- Fix (Decision A — Micro-TAS pop-up only): added `buildMicroTASDocx()` client-side, wired the dead button and added "Export Word" button in `MicroTASDialog.tsx`. No new dependency (`docx@9.5.1` already installed).

**Issue 5B — Evidence Integrity Check: 34 items missing review dates**
- `fetch-unit-benchmarks` never stamped `review_date` on `baseline_government` evidence items; 15 older `market_research` rows predated the RPC fix and were never backfilled.
- Fix: `fetch-unit-benchmarks` edge function updated to derive and write `review_date` from `basis_date + 12 months`. `generate-market-research-pack` edge function already sets `review_date`; older rows backfilled manually.
- Edge functions deployed: `fetch-unit-benchmarks` (v379, ACTIVE), `generate-market-research-pack` (v384, ACTIVE).
- Backfill: 271 `baseline_government` + 506 `market_research` rows — all have `review_date`, 0 missing (verified 29 Jun 2026).
- Review cadence decision: **12 months for both source types** (consistent with `fn_evidence_freshness_score()`, `rpc_score_evidence_integrity`, `useBenchmarkScoring.ts`).

**Issue 6 — "Register Your First Tool" button does nothing (Consultant role)**
- `AssessmentToolRegisterPage` excluded Consultants from `canEdit` — the only register to do so. `EmptyRegisterPrompt` rendered the CTA with `onClick={undefined}` → silent no-op.
- Fix: added `Consultant` / `Consultant Assistant` to `canEdit` and `canApproveOrPublish` in `AssessmentToolDetail.tsx`, matching every other register. Decision confirmed by Angela (omission from original setup).

**Issue A — TGA picker dropdown layout (found during Issue 1 QA)**
- Radix Sheet CSS transforms break `position:fixed`; the qualification search dropdown was being clipped or mispositioned.
- Fix: replaced `position:fixed` with `position:absolute + top:100%` inside a `position:relative` container. Typing-while-open fix from PR #84 preserved.

### PR #88 — Batch 3: TGA Picker QA findings (Issues 7A–7D)

Found during QA of Issue 1 fix. All four were in the Add Qualification & Units (TGA) flow.

**Issue 7A — Select All gave no feedback when units were already mapped**
- `selectAllUnits` correctly filtered already-mapped units but showed no feedback; users saw fewer selected than the button advertised.
- Fix: added toast "N units selected (M already mapped — skipped)" after filtering.

**Issue 7B — Already-mapped row body still clickable**
- The wrapping `<div>` in `UnitRow.tsx` always fired `onToggle`; only the `<Checkbox>` was disabled. Clicking the row body could add already-mapped units to the selection.
- Fix: `onClick={alreadyMapped ? undefined : onToggle}` + `cursor-default` class. Also eliminates root cause of Issue 7D (already-mapped units being submitted to the RPC).

**Issue 7C — Unit list too tall, action bar clipped on large qualifications**
- `UnitsList` ScrollArea used fixed `h-72` (288px). On qualifications with 141+ units, the combined card height overflowed the Sheet and clipped the "Add Units" button.
- Fix: changed to `max-h-[calc(100vh-400px)] min-h-[180px]` — viewport-responsive.

**Issue 7D — "0 of N units synced" toast read as failure**
- Toast showed "0 of 12 units synced" when the DB's `ON CONFLICT DO UPDATE WHERE` correctly skipped unchanged rows. Data was fine; message was wrong.
- Fix: toast now shows "N unit(s) added or updated. M already up to date." or "All N units already up to date — no changes needed."

**Bonus: ESLint `--cache` flag**
- Added `--cache` to `npm run lint` in `package.json`. After first run, only changed files are re-linted. Eliminates the 1748 pre-existing problem noise on repeated runs.

---

## Files changed

| Area | Files |
|---|---|
| TGA search dropdown | `src/components/trainer-matrix/tga-picker/QualificationSearchDropdown.tsx` |
| TGA picker | `src/components/trainer-matrix/tga-picker/TgaQualificationUnitPicker.tsx`, `UnitRow.tsx`, `UnitsList.tsx` |
| Assessment conditions edge fn | `supabase/functions/fetch-assessment-conditions/index.ts` |
| Delivery hours | `src/components/tas/builder-sandbox/DeliveryPanel.tsx` |
| Delivery hours migration | `supabase/migrations/20260629200000_delivery_hours_numeric.sql` |
| Evidence integrity | `src/components/tas/builder-sandbox/EvidenceIndexPanel.tsx` |
| Micro-TAS Word export | `src/modules/tas/micro/MicroTASDialog.tsx`, `src/lib/microTasDocumentBuilder.ts` (new) |
| Evidence review_date ingestion | `supabase/functions/fetch-unit-benchmarks/index.ts`, `supabase/functions/generate-market-research-pack/index.ts` |
| Assessment tools register | `src/pages/registers/assessment-tools/index.tsx`, `src/components/registers/AssessmentToolDetail.tsx` |
| Hooks | `src/hooks/useFullTrainerMatrix.ts` |
| Build tooling | `package.json` |

---

## Decisions recorded

| Decision | Outcome |
|---|---|
| Issue 3 — half-hours | Option B (numeric columns) — half-hours genuinely matter for TAS calculations |
| Issue 4 — Word export surface | Micro-TAS pop-up only (Decision A); Trainer Portal deferred |
| Issue 5B — review cadence | 12 months for both `baseline_government` and `market_research` source types |
| Issue 6 — Consultant role | Confirmed — Consultants should be able to create assessment tools (omission from setup) |

---

## Notes / follow-up

- `trainer_pd_review_cadence` column exists on `public.tenants` — per-source-type cadence can be wired without schema changes if Angela decides to differentiate in future.
- The 12-month review cadence is hardcoded in `fn_evidence_freshness_score()`, `rpc_score_evidence_integrity`, and `useBenchmarkScoring.ts` — consistent platform-wide assumption.
- Trainer Portal session plan Word export (deferred) is approximately 1 day of frontend work when ready.
