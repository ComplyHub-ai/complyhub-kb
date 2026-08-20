# Audit — PR #548: parse-tas-document truncates on real-world multi-unit TAS docs (20 August 2026)

**Date:** 20 August 2026
**Branch:** `fix/parse-tas-document-max-tokens-truncation`
**PR:** [#548](https://github.com/ComplyHub-ai/rto-compass-hub/pull/548)
**Merged:** 20 August 2026
**Purpose:** RJ tested the newly-fixed Import Existing TAS wizard (post PR #547) with a real production TAS document (CHC30125, Australian College, 17 units, 39 pages) and hit "we couldn't detect a qualification code" at the Confirm Qualification step, despite the code/title being stated plainly multiple times in the document.

---

## Root cause

Confirmed live via direct query (`tas_import_sessions`/`tas_import_documents`/`tas_import_parsed_data`), not assumed: the document row's actual status was `failed`, `parse_error: "Failed to parse AI response"`, and zero sections were extracted — this was never a content-detection quality problem, the AI call itself never produced parseable JSON at all.

Traced to `parse-tas-document`'s extraction call: `max_tokens: 4096`, with no check for response truncation before attempting `JSON.parse()`. A real multi-unit TAS (17 units × ~12 extracted fields each, plus gaps, compliance mappings, and the qualification_info extra keys added across the Setup/Units and Market/Learners/AOT work) produces a structured JSON response that plausibly exceeds 4096 output tokens, gets cut off mid-object, and breaks `JSON.parse` — surfacing only a generic, unhelpful error.

## Fix

- Raised `max_tokens` to 8192.
- Added the `stop_reason === 'max_tokens'` truncation check this function was missing — an existing pattern already used elsewhere (`generate-lln-strategy`) — so if a document is ever still too large even at 8192, the error returned is actionable ("document too large, try splitting it") instead of the previous generic parse-failure message.

## Blast radius

One file, one edge function (`parse-tas-document/index.ts`). No other function shares this code path.

## DB/RLS impact

None — no schema change, no migration. Pure application-logic fix inside the edge function.

## Test plan

- `npx tsc --incremental --noEmit` clean (edge function isn't covered by the main app's tsc, but confirms nothing else broke).
- CI: all required checks passed; required CODEOWNERS review (RJ) for `/supabase/functions/`, approved, merged.
- RJ to re-upload the same 17-unit document and confirm qualification code/title now populate.

## Files changed

`supabase/functions/parse-tas-document/index.ts`.

## Note for later

RJ flagged that different RTOs use different TAS document formats/sizes — if an even larger document (more units, more detail) still truncates at 8192, the next step would be chunking the extraction (e.g. units table processed separately from governance/market sections) rather than raising the token ceiling indefinitely. Not needed yet — flagged for awareness only.
