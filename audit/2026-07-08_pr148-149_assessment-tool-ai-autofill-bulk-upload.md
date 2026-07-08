# Audit — PRs #148 + #149: Assessment Tool AI auto-fill + bulk upload (08 July 2026)

**Date:** 08 July 2026
**Branches:** `feat/assessment-tool-ai-autofill` (PR #148) · `fix/legacy-doc-format-detection` (PR #149)
**PRs:** #148 · #149 — both merged
**Merged by:** Brian (Khian)
**Merge commits:** `8db62409a` (PR #148) · `4364ce38c` (PR #149)

Feature request from Angela: reorder the Add/Edit Assessment Tool panel so Document Upload is first, add AI auto-fill of the register fields from the uploaded document, and add a bulk-upload path — plus the open design question of how a user reviews AI-filled fields across many files in a bulk run.

---

## PR #148 — AI auto-fill on document upload + bulk upload

### Design decision: bulk review reuses the existing register, no new review UI

The blocking question going in was "how does a user review AI-filled fields file-by-file in a bulk run without either a slow one-at-a-time wizard or a bulk grid that invites rubber-stamping." Resolved by not building a bulk-review screen at all: each bulk-uploaded file is uploaded, AI-extracted, and immediately saved as a normal **draft** `assessment_tools` row via the existing `addTool` mutation. Review then happens by opening each draft from the register table and editing it in the same `AssessmentToolForm` panel used for single uploads — pre-filled, fully editable, submit when ready. No parallel review UI to build or maintain, and no risk of a user bulk-approving a table of unread AI guesses.

### What shipped

- **`AssessmentToolDocumentUpload.tsx`** (new) — Document Upload section extracted out of `AssessmentToolForm.tsx` and moved to the top of the panel (was previously last). Shows a loading state ("Reading document and auto-filling fields below…") while extraction is in flight.
- **`extract-assessment-tool-fields`** edge function (new, `supabase/functions/extract-assessment-tool-fields/{index,helpers}.ts`) — reads the uploaded PDF/DOCX via the user's own JWT/session (no service role key — download uses the same RLS-scoped client the frontend already uses for signed-URL downloads), extracts text (DOCX via `mammoth`; PDF sent to Claude as a vision/document attachment), and returns best-guess `tool_code`, `tool_type`, `description`, `unit_codes`, `current_version`, `version_date`, `validation_cycle_months`, `suggested_tool_name` with a per-field confidence score. Response shape `{ ok, data?, error? }` per this repo's edge function convention. Registered in `config.toml` with `verify_jwt = true`.
- **`useAssessmentToolFieldExtraction.ts`** (new hook) — wraps the edge function via `callEdge`.
- **`AssessmentToolForm.tsx`** — `applyExtractedFields` merges AI results into form state, but only into fields the user hasn't already filled in (checked per-field against empty/default value) — never overwrites a manual edit.
- **`AssessmentToolBulkUploadDialog.tsx`** (new) — select up to 25 files, each processed sequentially (upload → extract → create draft), per-file status shown (queued/uploading/reading/creating/done/failed), one file's AI rate-limit or parse failure doesn't block the rest of the batch.
- **`useAssessmentToolRegister.ts`** — added `addToolAsync` (the existing `addTool` only exposed `.mutate`; bulk upload needs to `await` each creation sequentially).
- **Incidental fix:** `AssessmentToolNamingPanel.tsx`'s "Suggest name (AI)" button was calling `supabase.functions.invoke()` directly instead of `callEdge` — fixed while in the area, per `CLAUDE.md`'s "no raw `supabase.functions.invoke()`" rule.
- Required-field audit: checked every field label against the actual save-gating logic (`disabled={!form.tool_name}`) and DB column defaults — confirmed `tool_name` is the only genuinely required field, and it was already the only one marked with `*`. No change needed.

### Cursor Bugbot findings (5, all verified against HEAD before fixing — `verify-bot-fix` skill)

| # | Finding | Verdict | Fix |
|---|---|---|---|
| 1 | `validation_cycle_months` applied from AI whenever truthy, with no check against the user's current value (every other field checked `!next.field` first) — a deliberate 24-month change could be silently overwritten back to 12 | CONFIRMED | Same default-value guard as every other field |
| 2 | The "clear upload" (X) button for a new tool had no `disabled` tied to extraction in-flight, and `handleFileUpload` never checked the upload was still current before applying AI results — clearing mid-extraction could leave fields auto-filled with no attached document, or a save with fields but no `document_storage_path` | CONFIRMED | Added `activeUploadPathRef` to gate applying stale results; disabled the clear button while extracting |
| 3 | PDF vision attachment only fired when `mimeType === 'application/pdf'` exactly, but Storage-returned Blob type can come back as a generic type (e.g. `application/octet-stream`) even for a genuine PDF — would silently drop the whole document payload, leaving Claude with an empty prompt | CONFIRMED | `callClaude` now trusts `isVisionCompatible` (derived from the filename extension in `extractDocumentContent`, not the Blob mimeType) |
| 4 | `extractTextFromDocx` discarded any text ≤100 characters as "unreadable," even if genuinely extracted | CONFIRMED | Threshold removed — any non-empty trimmed text is used |
| 5 | Bulk upload's sequential `addToolAsync` calls each fire the shared mutation's `onSuccess` (`toast.success('Assessment tool created')` + query invalidation) — stacks N toasts for an N-file batch | CONFIRMED | Added opt-in `skipToast` flag on the mutation payload; single-add flow untouched (flag defaults falsy) |

Also fixed a pre-existing unrelated `no-useless-escape` lint error in `helpers.ts` (regex `\-` at end of character class) while already touching that file.

**Merged** (`8db62409a`).

---

## PR #149 — legacy `.doc` upload produced a confusing generic error

### Discovery

After merge, Brian tested a real upload and got "could not read any of the files — please do it manually." Checked `get_logs` for the edge function first — all three recent invocations returned `200`, ruling out a crash/misconfiguration. Root cause: the uploaded file was a genuine Word 97-2003 `.doc` (binary OLE format). `mammoth` (used for DOCX text extraction) only supports the modern `.docx` (ZIP/XML) format; a real `.doc` fails silently rather than throwing, so it fell through to the generic "couldn't read any text" note with no indication of *why*.

### Fix

- `helpers.ts`: detects legacy `.doc` by its **OLE Compound File byte signature** (`D0 CF 11 E0 A1 B1 1A E1`) rather than trusting the file extension — catches a mislabelled/renamed file too, since the file input's `accept` attribute is only a UI hint, not an enforcement.
- `index.ts`: returns a specific note ("This looks like an older Word 97-2003 (.doc) file... re-save it as .docx or PDF...") instead of the generic message when the signature is detected.
- Both file pickers (`AssessmentToolDocumentUpload.tsx`, `AssessmentToolBulkUploadDialog.tsx`) dropped `.doc` from `accept` and updated the helper text, since it was never actually supported.

**Decision explicitly discussed, not assumed:** considered building real legacy-`.doc` parsing (would need a binary OLE parser or an external conversion service — no Deno-native option) versus just detecting and messaging clearly. Chose detection + messaging — `.doc` hasn't been Word's default format since 2007, and the effort/complexity of real parsing wasn't justified for what should be a rare case.

**Merged** (`4364ce38c`).

---

## GitHub Actions billing outage — manual edge function deploys

Same standing outage documented in the 07 July audit entry (PRs #131/#132/#133) — `deploy-edge-functions.yml` still not running. `extract-assessment-tool-fields` is a brand-new function, so it didn't exist in production at all until manually deployed.

- **After PR #148 merge:** deployed manually via Supabase MCP `deploy_edge_function`, using the exact content committed on `main` at `8db62409a`. Version 1, `ACTIVE`.
- **After PR #149 merge:** re-deployed with the legacy-`.doc` detection fix, using the exact content committed on `main` at `4364ce38c`. Version 2, `ACTIVE`.

Both deploys read the files fresh from the just-pulled `main` working tree immediately before deploying (not from memory/cache), per the standing rule: only ever deploy what's already committed.

---

## Files changed across #148/#149

| File | PR(s) | Change |
|---|---|---|
| `src/pages/registers/assessment-tools/components/AssessmentToolDocumentUpload.tsx` | #148, #149 | **NEW** — Document Upload extracted + moved to top; `.doc` dropped from `accept` (#149) |
| `src/pages/registers/assessment-tools/components/AssessmentToolBulkUploadDialog.tsx` | #148, #149 | **NEW** — bulk upload wizard; `.doc` dropped from `accept` (#149) |
| `src/pages/registers/assessment-tools/components/AssessmentToolForm.tsx` | #148 | Reordered; `applyExtractedFields`; stale-extraction guard |
| `src/pages/registers/assessment-tools/components/AssessmentToolNamingPanel.tsx` | #148 | `supabase.functions.invoke()` → `callEdge` |
| `src/pages/registers/assessment-tools/index.tsx` | #148 | "Bulk Upload" button + dialog wiring |
| `src/hooks/useAssessmentToolFieldExtraction.ts` | #148 | **NEW** — extraction hook |
| `src/hooks/useAssessmentToolRegister.ts` | #148 | `addToolAsync`; opt-in `skipToast` |
| `supabase/functions/extract-assessment-tool-fields/index.ts` | #148, #149 | **NEW** — extraction edge function; PDF vision fix; legacy-`.doc` message (#149) |
| `supabase/functions/extract-assessment-tool-fields/helpers.ts` | #148, #149 | **NEW** — text/content extraction + field sanitisation; legacy-`.doc` byte-signature detection (#149) |
| `supabase/config.toml` | #148 | Registered `extract-assessment-tool-fields` |

---

## Notes

- No DB migrations in this round — both PRs are frontend + edge function only, so no branch DB / production migration step applied.
- `extract-assessment-tool-fields` manually deployed to production twice this session due to the GitHub Actions billing outage — see dedicated section above. Confirmed `ACTIVE` (v1, then v2) via the `deploy_edge_function` response, not CI status.
- **Not yet done:** an actual end-to-end AI-extraction test against a real assessment tool PDF/DOCX in production (only confirmed via edge function logs that calls return `200`, not that the extracted fields are qualitatively good); the `AssessmentToolForm.tsx` component is still ~750+ lines (well over the ~300-line guideline) — flagged to Brian as a possible follow-up refactor, deliberately deferred to avoid entangling a structural refactor with this round's logic changes; the GitHub Actions billing outage itself (needs Carl, per standing note in `CLAUDE.local.md`).
