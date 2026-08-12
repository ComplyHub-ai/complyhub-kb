# Audit — PR #420: Course/Unit catalog dropdowns for Credit Transfer, Assessment Validation, RPL (12 August 2026)

**Date:** 12 August 2026
**Branch:** `feat/tga-catalog-course-unit-dropdowns`
**PR:** [#420](https://github.com/ComplyHub-ai/rto-compass-hub/pull/420) — merged `f767e3c9f` (squash of `064bae92f` only, see Follow-up below)
**Follow-up PR:** [#422](https://github.com/ComplyHub-ai/rto-compass-hub/pull/422) — carries the combined-dropdown refinement that missed #420's merge window
**Purpose:** RJ flagged (screenshot, Credit Transfer "Add" modal) that "Course Code"/"Course Title"/"Unit Code"/"Unit Title" were free-text inputs, inviting typos and codes that don't exist on the tenant's own registration. Asked for these to be replaced with a dropdown of the RTO's actual courses (quals/skillsets/units) wherever this pattern appears.

---

## Investigation

Findings pass (Explore agent + manual grep) turned up the same free-text pattern in 3 places beyond Credit Transfer's screenshot form, plus one already-working example:

- **RPL** (`RPLRegisterForm.tsx`) — `course_code` was **already** a combobox (`CourseCodeCombobox`, `useTenantQualifications` → `training_products`/`training_product_scope`). Used as the reference pattern.
- **AVR** — the *live* register at `/dashboard/registers/av` and `/avr` is rendered by `AssessmentValidationForm.tsx`, not `AVRForm.tsx`. `AVRForm.tsx` and its page `pages/registers/AVR.tsx` are **dead code**, unreferenced by any route.
- **Credit Transfer** — only `CTRegisterForm.tsx` (routed at `/dashboard/registers/ct`) is live. `CTDrawerForm.tsx` and `CTSinglePageForm.tsx` (+ its page `pages/registers/CT.tsx`) are also **dead code**, unreferenced by any route.

Data-source investigation (with RJ) traced the full TGA pipeline: `tga-fetch-scope`/`tga-rto-sync` → `tga_cache` → `sync-tga-training-products`/`tga-sync-products` → `training_products`/`training_product_scope`, plus a separate, earlier stage: `tga_pre_import` (one row per tenant, raw JSON snapshots), auto-populated the moment a tenant runs the "Connect TGA" wizard (`TgaIntegrationWizard.tsx`) — before anyone has triggered a `training_products` sync, which is a **manual, separate** action. RJ decided to use `tga_pre_import` as the primary source for all three registers (including RPL, for consistency) given it's populated automatically and its `status`/`statusLabel` field makes current-vs-superseded filtering trivial.

Live-DB check (Supabase MCP, `gdwhlstfguxarnxasrrs`) before committing to the switch: of 31 tenants with an active qualification scope in `training_products`/`training_product_scope`, **1 has no `tga_pre_import` row**. Resolved by building a fallback rather than accepting the regression.

## What was implemented

- `src/hooks/useTgaCatalogOptions.ts` (new) — `useTgaCatalogOptions(tenantId, type)`: reads the tenant's `tga_pre_import` snapshot for the given type (`preimport_snapshot`/`units_snapshot`/`skillset_snapshot`), filters to `status`/`statusLabel === 'current'`, dedupes by code. Falls back to `useScopedTrainingProducts` (existing hook, unmodified) filtered by type when the pre-import snapshot is empty for that tenant — covers the 1-of-31 gap above with zero visible regression.
- `src/components/shared/TgaCatalogCombobox.tsx` (new) — `TgaCatalogCombobox` (closed catalog picker, used by RPL and Assessment Validation) and `TgaCatalogOrManualField` (adds a "Not in catalog / other RTO — enter manually" toggle, used by Credit Transfer only, since CT legitimately credits units/quals from a student's *previous, external* RTO that won't be in this tenant's own catalog).
- `RPLRegisterForm.tsx` — swapped `CourseCodeCombobox` (training_products-only) for `TgaCatalogCombobox` (`type="qualification"`).
- `AssessmentValidationForm.tsx` — swapped the 3 free-text inputs for `TgaCatalogCombobox` (qualification code, unit code); `unit_title` now auto-fills from the unit selection and is read-only (no longer independently editable — both registers are always for this RTO's own scope, no external-RTO case).
- `CTRegisterForm.tsx` — swapped the 4 free-text inputs (course_code/course_title/unit_code/unit_title) for 2 `TgaCatalogOrManualField` blocks (qualification pair, unit pair), each with the manual-entry fallback.

## Blast radius

3 live files touched: `RPLRegisterForm.tsx`, `AssessmentValidationForm.tsx`, `CTRegisterForm.tsx` — each confirmed (grep) to have exactly one importing page/route, no shared role-config or route-guard involvement. `useScopedTrainingProducts.ts` read-only, not modified. `useTgaPreImport.ts`/`useTgaPreImportUnits.ts` (existing hooks with 5+ other consumers showing *all* statuses, not just current) deliberately left untouched — the new hook queries `tga_pre_import` independently rather than wrapping/modifying those, to avoid any risk to their existing consumers (`ElectivesSection.tsx`, `TGAImportSection.tsx`, `TenantDetailsTab.tsx`, `UnitsMultiSelect.tsx`, `TgaDataDisplay.tsx`).

**Not touched, flagged instead:** `AVRForm.tsx`/`pages/registers/AVR.tsx`, `CTDrawerForm.tsx`/`CTSinglePageForm.tsx`/`pages/registers/CT.tsx` — confirmed dead/unrouted, out of scope. `CourseCodeCombobox.tsx` is now unreferenced after the RPL swap and can be removed in a follow-up if desired.

## Dave standard / DB impact

No migration. Reads two existing tables (`tga_pre_import`, `training_products`/`training_product_scope`) that are already populated by existing TGA-sync infrastructure — nothing new to sync, nothing to backfill. SELECT RLS on both is tenant-membership-only (`tenant_id = current_tenant_id()`/`is_tenant_member`), no role restriction — already satisfied by every role that can reach Credit Transfer, Assessment Validation, or RPL today. Nothing for Dave.

## Test plan

- `npx tsc --noEmit` — clean.
- `npx eslint` on all changed/added files — clean.
- New unit tests: `tests/hooks/useTgaCatalogOptions.test.ts` (current-status filtering, dedup, sort, fallback-when-empty), `tests/components/shared/TgaCatalogCombobox.test.tsx` (selection fills code+title, legacy value shown when no catalog match, loading state, manual-entry toggle) — all passing.
- Full suite (`npx vitest run`) — 799/811 passing; the 12 failures are in 5 pre-existing files unrelated to this change (`tests/demo-signup.test.tsx`, and 4 Supabase RLS/RPC migration-content assertion files) — confirmed unrelated by content, not re-verified against a clean `main` checkout.
- Manual QA not yet performed: open Credit Transfer → Add, confirm catalog dropdown + "other RTO" manual toggle both work; open Assessment Validation and RPL → Add, confirm closed dropdown behaviour; confirm the 1 tenant without a `tga_pre_import` row still sees its RPL qualification options via the fallback.

## CI note

All blocking checks (Lint, Type check, Security, Migration guards, Edge Functions) passed on #420's commit `064bae92f`. `Supabase Preview` showed failed on #420 — confirmed pre-existing/unrelated: the same check also fails on the already-merged, unrelated PR #417, and matches the known `schema_migrations` ledger-drift issue previously documented against PR #322 (2026-07-29 audit entry) — did not block merge.

Separately, after seeing #420's CI go green RJ merged the PR from the GitHub UI — but a second commit (`8c158697a`, the "combine RPL/CT into one qual+skillset+unit dropdown" refinement, requested after #420 was opened) had just been pushed and wasn't picked up: the merge's diff stat (+549/-48) matches `064bae92f` alone, and `main` post-merge confirmed to still have CT's old two-dropdown layout and no `'all'` catalog type. Reopening #420 wasn't possible (GitHub PRs are terminal once merged), so the second commit was cherry-picked onto a fresh branch off the new `main` and shipped as PR #422 instead — see that PR for its own CI status.

## Follow-up: PR #422 (combine into one dropdown)

Requested by RJ after #420 was opened, once he saw RPL's dropdown live in the Vercel preview and pointed out it only offered qualifications while Credit Transfer split qualification/unit across two separate dropdowns. Decision (confirmed with RJ): collapse to **one** dropdown per register, sourced from all three `tga_pre_import` snapshot columns combined (`preimport_snapshot`/`skillset_snapshot`/`units_snapshot`), since a credited/recognised item can legitimately be any of the three — not just RPL's prior qualification-only view.

- `useTgaCatalogOptions.ts` — added `TgaCatalogType = 'all'`, which queries all three snapshot columns in one row-fetch and merges/dedupes across them (falls back to `useScopedTrainingProducts` unfiltered-by-type when `tga_pre_import` is empty).
- `RPLRegisterForm.tsx` — `type="qualification"` → `type="all"`, otherwise unchanged.
- `CTRegisterForm.tsx` — the two `TgaCatalogOrManualField` blocks (qualification pair, unit pair) collapsed into **one** required field ("Course, Skill Set or Unit"), `type="all"`. `unit_code`/`unit_title` remain in the DB schema (no migration) but are no longer independently editable from the form — whatever is picked fills `course_code`/`course_title` only.
- Assessment Validation deliberately **not** changed — that register structurally needs a qualification code and a unit code as distinct fields (a validation event references a specific unit within a specific qualification), unlike RPL/CT where one generalised "credited item" is the actual data being captured.

No DB/RLS change beyond #420's (same two read-only source tables). Same blast radius/dead-code findings as #420 — nothing new.

---

## Files changed

**#420** (merged, `064bae92f`): New: `src/hooks/useTgaCatalogOptions.ts`, `src/components/shared/TgaCatalogCombobox.tsx`, `tests/hooks/useTgaCatalogOptions.test.ts`, `tests/components/shared/TgaCatalogCombobox.test.tsx`. Modified: `src/components/rpl/RPLRegisterForm.tsx`, `src/components/assessmentValidation/AssessmentValidationForm.tsx`, `src/components/ct/CTRegisterForm.tsx`.

**#422** (open): Modified: `src/hooks/useTgaCatalogOptions.ts` (adds `'all'` type), `src/components/shared/TgaCatalogCombobox.tsx` (placeholder copy), `src/components/rpl/RPLRegisterForm.tsx`, `src/components/ct/CTRegisterForm.tsx`, `tests/hooks/useTgaCatalogOptions.test.ts` (2 new cases for the combined type, 8 total).

All frontend-only across both PRs, no migration, no production DB step required.
