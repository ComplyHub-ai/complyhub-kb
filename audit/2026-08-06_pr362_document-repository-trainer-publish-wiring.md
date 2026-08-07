# Audit — PR #362

> **Date:** 6 August 2026 (audit written); **Merged:** 4 August 2026
> **Scope:** Document Repository Consolidation — Phase 1(c) app wiring: trainer approval → documents_register
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Phase 1(c) follow-up: `TrainerDocumentApprovalQueue.tsx` approve action now creates a `documents_register` row for the approved trainer document and sets `trainer_document_items.published_to_register_id`. The FK existed but nothing ever populated it (0/100 rows at audit time).

## PR #362 — Wire trainer document approval to publish into documents_register

**Branch:** `fix/trainer-document-publish-register-link` (deleted post-merge) · **Merge commit:** `68e977885` · **Merged:** 4 Aug 2026 · **Files:** 2

### Diagnosis-driven fixes (same PR)

- **`documents_register` INSERT RLS** widened to include Consultant/Consultant Assistant — without it, approvals by those roles would 403 the moment publish shipped (approval screen already allowed them).
- Retry-duplicate-row bug fixed.
- Consultant/Consultant Assistant read-back RLS bug fixed (PR review bots).

### Production apply

Merged and applied. Ledger verified.

### Soak status

N/A. Lessons in `complyhub-kb/reference/diagnosis-discipline.md` § "Learned from PR #362 review".
