# Audit — PR #353

> **Date:** 6 August 2026 (audit written); **Merged:** 3 August 2026
> **Scope:** Document Repository Consolidation — Phase 3 bucket #1 (`documents` → `tenant-documents`)
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Code repoint for bucket #1 after object copy was already verified complete (3,885/3,885 objects, 0 missing, 0 size/eTag mismatches). Made the app read/write `tenant-documents` instead of `documents`. Fixed two Direct Response orphaned-file bugs: upload-without-register-row when connection dropped between separate client calls, and a path-shape mismatch.

## PR #353 — Repoint documents bucket to tenant-documents + fix upload atomicity/path bugs

**Branch:** `feat/phase3-bucket1-repoint-and-upload-fix` (deleted post-merge) · **Merge commit:** `cf6ef9ed4` · **Merged:** 3 Aug 2026 · **Files:** 11

### Key changes

- `document-file-manager` edge function: `BUCKET` → `'tenant-documents'`; optional server-side `documents_register` insert in same request (closes upload-then-insert orphan gap)
- Frontend repoint across Documents Register upload/download/delete paths
- Direct Response double-nested path repair (36 rows, one tenant)

### Production apply

Merged and deployed. Temp copy edge functions deleted post-verification.

### Soak status

✅ Soak started 3 Aug 2026 on source `documents` bucket — completes ~17 Aug 2026 (`storage_soak_buckets`).

### Follow-up

Manual testing found 3 more bugs → PR #357. Missing PERMISSIVE grants discovered during bucket #2 work → PR #365.
