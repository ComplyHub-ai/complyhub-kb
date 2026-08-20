# Audit — PR #429: Scoped AI document upload for TAS Builder Add Assessment Tool (13 August 2026)

**Date:** 13 August 2026
**Worktree:** B (`rto-compass-hub-worktree-b`)
**Branch:** `feat/tas-resources-upload-file`
**PR:** [#429](https://github.com/ComplyHub-ai/rto-compass-hub/pull/429)
**Merge commit:** `6384e35c3`
**Merged:** 13 August 2026
**Purpose:** Brian asked for an upload option inside TAS → Resources' existing "Add Assessment Tool" button, using the same upload-and-AI-analyse mechanism the standalone Assessment Tool Register already has, but constrained so the AI can only match units already attached to that TAS.

---

## What was implemented

- **Scout finding that shaped the design:** two separate "Add Assessment Tool" mechanisms existed — the TAS Builder Sandbox modal (`AddAssessmentToolModal.tsx`, manual-entry only, unit checklist already pre-scoped to the TAS via `q1_tas_units`) and the standalone Assessment Tool Register (`AssessmentToolForm.tsx`, has the real upload + AI-extraction flow via edge function `extract-assessment-tool-fields`, completely unscoped — matches unit codes anywhere in the document text against the tenant's whole TGA catalogue). The task was to bring the Register's mechanism into the Builder modal, not build a new one.
- **`supabase/functions/extract-assessment-tool-fields/index.ts` + `helpers.ts`** — added an optional `allowedUnitCodes` param. When present, it's injected into the Claude prompt (only report codes from this list) **and** used to post-filter the model's returned `unit_codes` server-side in `sanitizeFields` — the post-filter is what actually enforces the boundary, since a prompt instruction alone doesn't stop a hallucinated or misread code. An explicitly empty list is treated as "nothing in scope" (checked via `!== undefined`, not `.length`), distinct from `undefined` (no restriction) — the Register's existing callers (`AssessmentToolForm.tsx`, `AssessmentToolBulkUploadDialog.tsx`) send no such field at all, so their behaviour is unchanged.
- **`src/hooks/useAssessmentToolFieldExtraction.ts`** — threads `allowedUnitCodes` through to the edge function call.
- **`AddAssessmentToolModal.tsx`** — added the upload UI (reusing `AssessmentToolDocumentUpload` with `tool={null}`, since this modal only ever creates new tools). Upload sends the TAS's own unit list (`availableUnits`, loaded from `q1_tas_units`) as the whitelist. Extracted fields pre-fill the form and pre-tick the unit checklist; manual entry keeps working unchanged for anyone who skips upload. `document_storage_path` added to the `assessment_tools` insert payload.

## Review passes and what they caught

**Reviewer (fresh-eyes, pre-push) — 3 confirmed + 5 minor, all fixed before push:**
1. Closing the modal mid-upload left the file stranded in storage forever (`uploadedPath` wasn't set yet, so cleanup had nothing to act on).
2. Closing mid-extraction didn't clear the in-flight-guard ref, so a cancelled extraction could still apply its result or toast after the modal was gone.
3. The reused upload component showed a false "this tool has been submitted" message on every open while TAS context was still loading (borrowed copy from the Register's locked-document state, didn't fit this context).
4. Minor: malformed `allowedUnitCodes` failed open to "no restriction" instead of rejecting.
5. Minor: a toast blamed "no units found" even when nothing was extracted because the form was already filled in.
6. Minor: a failed context load silently sent an empty allowlist instead of blocking upload outright.
7. Minor: leftover raw `console.error` (converted to `logger`).
8. Minor: over-broad `try/catch` could reset the save-tracking ref even after a successful insert, if a post-save side effect threw.

**Cursor Bugbot (post-push) — 2 confirmed, both fixed, verified against HEAD before fixing (per `verify-bot-fix`):**
1. **High** — the document Clear/X button was only disabled during AI extraction, never during save. Clicking it while `handleSave` was mid-flight (e.g. during the `custom_id` sequence lookup) deleted the storage object while the in-flight insert still carried the old path — fixed by folding `saving` into the same `extracting`-based disable, plus a belt-and-suspenders guard in the handler itself.
2. **Medium** — `loadContext()` had no request-generation guard. Closing and reopening the modal while a slow call was still in flight could let a stale failure overwrite a newer success (or vice versa), wrongly blocking upload despite units being loaded — fixed with a monotonic generation counter; any call whose generation is no longer current is ignored on resolve.

A separate, unrelated Cursor Agent run (`cursor/assessment-tool-modal-issues-9d4a`, triggered from the same Bugbot comment before this session's fix landed) produced a parallel fix for the same two findings on its own branch. Confirmed via `gh pr list` that no PR was ever opened from it — harmless, doesn't touch `main`, safe to ignore/delete later.

## Blast radius

4 files: `AddAssessmentToolModal.tsx`, `useAssessmentToolFieldExtraction.ts`, `extract-assessment-tool-fields/index.ts`, `extract-assessment-tool-fields/helpers.ts`. The edge function change is additive and optional-param — confirmed the Register's two existing callers send no `allowedUnitCodes` field, so their unscoped behaviour is provably unchanged.

## Dave standard / DB impact

No migration. `assessment_tools.document_storage_path` (nullable `text`) already existed live — confirmed via `information_schema.columns` during the fresh-eyes review. INSERT RLS policies on `assessment_tools` are column-agnostic (role/tenant-based only), so adding this field to the payload can't violate them. The new storage path shape (`{tenantId}/assessment-tools/tas-builder/{tasBuildId}/{draftFolderId}/...`) was confirmed to satisfy `tenant_documents_role_grant_insert` the same way the Register's existing path shape does — that policy keys on tenant id + `'assessment-tools'` only, nothing deeper.

## Test plan / verification

- `npx eslint` on all 4 changed files — clean, both before and after the Bugbot fix commit.
- `npx prettier --check` — clean after one `--write` pass mid-session.
- `npx tsc --incremental --noEmit` reported clean, but flagged as **not trustworthy** — confirmed via `--listFiles` that this repo's root `tsconfig.json` (`files: []`, solution-style, referencing `tsconfig.app.json`/`tsconfig.node.json`) makes both `npm run type-check` and the repo's own pre-push hook check **zero files**. This is a pre-existing repo-wide issue, not something this branch caused or could fix — the real check (`tsc --build tsconfig.app.json --noEmit`) is confirmed elsewhere to hang 5+ minutes even on small diffs, so it wasn't run speculatively. Relied on lint + manual diff review instead, consistent with workspace policy; Vercel's build remains the real type-safety gate.
- `ci-gate` run before PR: lint ✅, `.single()` guard ✅, no migrations, security guards ✅ (no hardcoded project ID, no service-role key exposure, no dropped tests/migrations, `config.toml` unchanged), config.toml coverage N/A, role-casing/status-enum checks N/A (no such comparisons touched).
- Post-merge: confirmed `deploy-edge-functions.yml` fired and succeeded on the merge push; live `extract-assessment-tool-fields` (version 6) pulled via Supabase MCP and confirmed byte-for-byte identical to the merged git source. Confirmed the top Vercel deployment is `target: production`, `state: READY`, and its `githubCommitSha` matches the merge commit exactly.

---

## Files changed

`src/components/tas/builder-sandbox/AddAssessmentToolModal.tsx`, `src/hooks/useAssessmentToolFieldExtraction.ts`, `supabase/functions/extract-assessment-tool-fields/index.ts`, `supabase/functions/extract-assessment-tool-fields/helpers.ts` — no migration, edge function auto-deployed via CI on merge, no manual production step required.
