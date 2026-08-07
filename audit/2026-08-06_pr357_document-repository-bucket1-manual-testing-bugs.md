# Audit — PR #357

> **Date:** 6 August 2026 (audit written); **Merged:** 4 August 2026
> **Scope:** Document Repository Consolidation — bugs found during Phase 3 bucket #1 manual testing
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Three bugs surfaced during real-tenant manual QA of bucket #1 repoint (PR #353). None were caused by the repoint itself — all were pre-existing gaps exposed once uploads actually worked end-to-end.

## PR #357 — Fix 3 bugs found during Phase 3 bucket #1 manual testing

**Branch:** `fix/documents-register-upload-automation-bugs` (deleted post-merge) · **Merge commit:** `6f3dfa9e8` · **Merged:** 4 Aug 2026 · **Files:** 3

### Bugs fixed

1. **`document_notifications` RLS** — only super_admin policies existed; every ordinary tenant user's in-app upload notification silently 403'd. Added tenant-scoped INSERT + own-row SELECT/UPDATE/DELETE.
2. **`gov_register.linked_document_id` missing** — `auto_create_governance_entry_from_document()` assumed column existed; every post-upload governance automation failed with "column does not exist". Gap-filled column + index.
3. **`storage_bucket` never set on upload** — `DocumentsRegister.tsx` inserts left `storage_bucket` NULL instead of `'tenant-documents'`.

### Production apply

Merged and applied. Ledger verified.

### Soak status

N/A (application/RLS fixes on target bucket).
