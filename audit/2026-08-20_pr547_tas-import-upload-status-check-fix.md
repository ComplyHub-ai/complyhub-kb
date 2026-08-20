# Audit — PR #547: TAS import upload fails on tas_import_documents status check (20 August 2026)

**Date:** 20 August 2026
**Branch:** `fix/tas-import-document-status-check`
**PR:** [#547](https://github.com/ComplyHub-ai/rto-compass-hub/pull/547)
**Merged:** 20 August 2026
**Purpose:** RJ hit an upload failure testing PR #545 (Market Need/Learners/AOT import extension) — surfaced a pre-existing, unrelated bug in Step 1 (Upload) of the Import Existing TAS wizard, present before PR #545 and untouched by it.

---

## Root cause

`useTasImport.ts`'s `uploadFile()` inserted `status: 'ready'` into `tas_import_documents`. Confirmed live via the actual Postgres constraint (`pg_get_constraintdef`) rather than assumed from the TypeScript type:

```sql
CHECK ((status = ANY (ARRAY['pending'::text, 'parsing'::text, 'parsed'::text, 'failed'::text])))
```

`'ready'` was never a legal value for this column — every document upload through this path failed with a `23514` check-constraint violation. The mistake: `'ready'` is a valid value of the *local* `UploadedFile.status` enum (client-side upload-progress tracking: `uploading → uploaded → tagging → ready → error`), a different concept from the DB row's own `status` column (server-side processing state), which happen to share a field name. The code used the wrong enum's value.

## Fix

Changed the insert to `status: 'pending'` — the correct not-yet-parsed initial state. Confirmed safe before shipping: `parse-tas-document` looks the document up by `id` + `tenant_id` only (no status filter anywhere) and unconditionally transitions it to `'parsing'`, so nothing downstream depended on the old (always-erroring) value.

## Blast radius

One file, one line changed (`src/hooks/useTasImport.ts`). No other file reads or filters on `tas_import_documents.status` expecting `'ready'`.

## DB/RLS impact

None — no migration, no schema change. The constraint itself was already correct; only the application's insert value was wrong.

## Test plan

- `npx tsc --incremental --noEmit` clean.
- CI: all required checks passed; this path isn't CODEOWNERS-protected, so it merged immediately once green.
- RJ to confirm upload now succeeds in the wizard.

## Files changed

`src/hooks/useTasImport.ts`.
