# Audit — PR #359

> **Date:** 6 August 2026 (audit written); **Merged:** 4 August 2026
> **Scope:** Document Repository Consolidation — Phase 1 schema hardening on `documents_register`
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Phase 1 decisions locked in the living doc: canonicalise `document_type` values, restrict `linked_register_type` to values actually used in code, and add nullable `documents_register_id` FK to 5 feature tables so documents can be linked bidirectionally.

## PR #359 — Phase 1: documents_register schema hardening

**Branch:** `fix/phase1-documents-register-hardening` (deleted post-merge) · **Merge commit:** `8f179a1c5` · **Merged:** 4 Aug 2026 · **Files:** 4 migrations

### Changes

- **`document_type` CHECK** — backfilled inconsistencies, then locked to 22 approved values (original 20 + `Tool` + `Workforce Plan`). Allows comma-separated multi-label (one live row is genuinely both Policy and Procedure).
- **`linked_register_type` CHECK** — restricted to `assessment_tool`, `adc_register`, `third_parties` (zero production rows populated at time of migration).
- **Feature-table FKs** — nullable `documents_register_id` + index on `evidence_documents`, `fpp_declaration_documents`, `meeting_documents`, `register_evidence`, `trainer_document_items`.

### Production apply

Applied via `execute_sql` + ledger repair. (b1) constraint SQL fixed post-merge for illegal subquery (Cursor Bugbot) — rewritten with array containment operator.

### Soak status

N/A (schema only). (b2) `linked_register_type` burn-in monitor still open per living doc.

### Follow-up

App-code wiring for trainer approval publish → PR #362.
