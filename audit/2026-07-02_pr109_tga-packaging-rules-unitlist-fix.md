# Audit — PR #109: TGA packaging-rules extraction silently dropping unit lists

**Date:** 2 July 2026
**Branch:** `fix/tga-packaging-rules-missing-unitlist`
**PR:** #109 (follows #108, `feat/staging-sync`)
**Merged by:** Brian (Khian)
**Merge commit:** `4c8245746`
**Edge function deploy:** Required manual re-run — first CI run failed on an unrelated transient network error (see below), re-run succeeded; verified live via `get_edge_function` that the deployed source matches the fix.
**Migration applied to production:** No migration in this PR — code-only fix (edge function + frontend).

---

## What was reported

Angela, building a TAS for Australian College Pty Ltd (BSB50120, Diploma of Business), found the Unit Selection screen showed "0 core units found" and "No packaging rules defined" after clicking **Import Units and Packaging Rules**. RJ investigated and proposed several theories (a missing "series of APIs," the `training.gov.au` `unitgrid` endpoint not being called, the AI "getting it but having difficulty arranging" the data).

## Diagnosis (traced end to end, verified against live data — not assumptions)

- Two edge functions run on button click: `tga-fetch-tas-details` (fetches TGA HTML, 5 sequential calls) → `tga-extract-packaging-rules` (sends the HTML to Claude Haiku to structure it into `packaging_rules`).
- Live BSB50120 record for Australian College had `packaging_rules.unitCounts`/`rulesProper` correctly populated (5 core, 7 elective) but `unitList` was **entirely absent as a key** — not empty, not malformed, just omitted by the model.
- Confirmed the raw HTML fed to the AI was complete: 22.8KB, ~100 distinct BSB unit codes, 111 `ntr-tcref` tags present. Ruled out RJ's "missing API" and "unitgrid" theories directly — the unit data was already in the fetched content bundle.
- Cross-checked against a working example (SIS40221, provided by RJ) — same function, same code path, came back with a complete 53-unit `unitList`. Confirms it's model-reliability, not a source-data or missing-endpoint issue.
- Root cause: `tool_choice: { type: 'auto' }` on the Anthropic tool call let the model return a schema-incomplete response (silently omitting the `required` `unitList` field) with no post-call validation before the incomplete result was persisted as if it succeeded.

## Fix

- **`supabase/functions/tga-extract-packaging-rules/index.ts`:**
  - Force the tool call (`tool_choice: { type: 'tool', name: 'extract_packaging_rules' }`) instead of `'auto'`.
  - If `unitList` comes back empty/missing, retry once with an emphasized prompt.
  - If still missing after retry, refuse to persist — return an error instead of silently saving an incomplete result.
  - Added real 429 (rate limit) handling: backs off and retries respecting Anthropic's `retry-after` header, instead of failing the whole import on one rate-limit response. 402 (credits exhausted) is never retried.
- **`src/components/tas/builder-sandbox/ElectivesSection.tsx`:**
  - Stopped showing a false "Packaging Rules Extracted" success toast when the backend actually skipped (TGA data not ready) or failed — this compounded the original silent-failure UX.

## CI note — edge function deploy failure was unrelated

The first `deploy-edge-functions.yml` run for this PR failed, but not because of this fix: it errored bundling an unrelated function (`audit-stripe-prices`) on `Import ... failed: 522` — a transient esm.sh CDN timeout. Since the workflow deploys all ~200+ functions alphabetically in one pass and stops on first failure, `tga-extract-packaging-rules` (alphabetically later) never got deployed in that run. Re-ran the same workflow (`gh run rerun`) and it succeeded. Verified the live deployed source via `mcp__supabase__get_edge_function` matches the fix (version 404) before declaring it live — do not trust a green PR/Vercel status alone for edge-function changes; the Vercel deploy and the edge-function deploy are separate pipelines.

## Data repair — pre-existing stuck records

The old code set `is_extracted = true` even when `unitList` was omitted, and the "Import Units and Packaging Rules" button is disabled once `is_extracted = true` (`ElectivesSection.tsx:1724`, `disabled={importingTGA || isExtracted}`) — regardless of whether the saved data is complete. So records broken before this fix are stuck with the button permanently greyed out; re-clicking isn't possible without intervention.

Audited all tenants for `is_extracted = true AND packaging_rules` missing `unitList` (qualifications only). Found and repaired 2 records (manual `UPDATE ... SET is_extracted = false`, explicit approval obtained each time, targeted by exact `id` + `tenant_id` + `qual_code`):

| Tenant | Qual | Record ID | Result after re-import |
|---|---|---|---|
| Vivacity Testing Tenant | CHC43015 (Cert IV Ageing Support) | `69e38b70-3d08-4821-a228-6518c97c52ae` | Verified via UI + DB: 74 units (15 core, 59 elective), `unit_counts` correct |
| Australian College Pty Ltd | BSB50120 (Diploma of Business) | `0e1446c7-28cc-4600-bef9-600649e2bf9f` | Reset done; re-import to be run by Angela — confirmed via DB before reset that `builder_state` was null and no units had ever been selected, so nothing was at risk from the reset |

No other tenants affected — audit query returned only these two before/after repair.

## Files changed

| Area | Files |
|---|---|
| Edge function | `supabase/functions/tga-extract-packaging-rules/index.ts` |
| Frontend | `src/components/tas/builder-sandbox/ElectivesSection.tsx` |

## Notes / follow-up (not yet actioned)

- **"Stuck disabled button" gap not yet fixed at the code level.** Only the two known-affected records were manually repaired. The button's disabled condition still only checks `isExtracted`, not whether `unitList` actually exists — a proposed fix (`disabled={importingTGA || (isExtracted && hasUnitList)}`) has been discussed but not implemented. Decision needed: fix the gating condition, or continue handling any future stuck record case-by-case.
- **Separate, unrelated bug found during QA:** "Create New TAS v2" wizard's Step 2 (Configure TAS) renders completely blank via both the normal path (`advanceFromStep1`) and the "Continue with Variation" path (`handleVariationConfirmed`) in `src/pages/tas/engine/index.tsx`. No thrown JS error observed in console when reproduced. Not yet diagnosed — code reading says it should render; it doesn't. Logged in `tas.md` (workspace root) for follow-up; needs live React state inspection rather than static reading.
- Angela notified of the fix and the reset; asked to re-run the import on the BSB50120 build and confirm.
