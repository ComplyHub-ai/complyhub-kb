# Audit — PR #371

> **Date:** 6 August 2026 (audit written); **Merged:** 5 August 2026
> **Scope:** Document Repository Consolidation — buckets #3/#4 data repoint (DB layer)
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Data-layer repoint completing buckets #3/#4 after code repoint (PR #367). Fixed stale bucket pointers in `evidence_documents` and `resolve_evidence_url()` that would have silently sent ~451 downloads to the wrong bucket even after frontend repoint.

## PR #371 — Repoint trainer evidence bucket + fix evidence-link trigger gap

**Branch:** `fix/repoint-trainer-evidence-bucket` (deleted post-merge) · **Merge commit:** `13cbbfe20` · **Merged:** 5 Aug 2026 · **Files:** 4 migrations

### Changes

- `evidence_documents.storage_bucket` default `'trainer-evidence'` → `'tenant-documents'` + backfill 297 rows
- `resolve_evidence_url()` — removed hardcoded `'trainer-evidence'` in 5 places including legacy branches that never read `storage_bucket`
- Bonus: `validate_evidence_document_link_tenant()` trigger missing `pd`/`currency` record types (found during Bulk Upload Evidence QA)

### Production apply

All 4 migrations applied via `execute_sql`. Ledger verified (version/name match all 4 files). Temp copy edge function `temp-copy-trainer-buckets` deleted, confirmed gone.

### Soak status

Continues on source `trainer-credentials` / `trainer-evidence` (started PR #367, ~18 Aug 2026).
