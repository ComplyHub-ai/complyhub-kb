# Audit — PR #352

> **Date:** 6 August 2026 (audit written); **Merged:** 3 August 2026
> **Scope:** Document Repository Consolidation — Phase 3 prerequisite: `tenant-documents` bucket + RESTRICTIVE RLS
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Captured in git the `tenant-documents` bucket and RESTRICTIVE tenant-scope RLS policies that had been created directly against production via `execute_sql` during prerequisite work. Added `documents_register.storage_bucket` column (DDL) plus backfill (DML) so each register row records which bucket its file lives in.

**Critical later discovery (PR #365):** RESTRICTIVE-only policies narrow access but never grant it — with zero PERMISSIVE policies, every direct client-side call against `tenant-documents` was denied for all users from creation until PR #365.

## PR #352 — Reconcile tenant-documents bucket + RLS policies + storage_bucket column

**Branch:** `fix/tenant-documents-bucket-reconciliation` (deleted post-merge) · **Merge commit:** `22688ceaf` · **Merged:** 3 Aug 2026 · **Files:** 4 (migrations + types)

### RLS model

4 RESTRICTIVE policies (`select`/`insert`/`update`/`delete`), modelled on `trainer_evidence_tenant_scope_*` — **not** `branding_logos` (confirmed to have no real RESTRICTIVE template).

### Production apply

Applied to production. Ledger verified.

### Soak status

N/A (target bucket creation, not source decommission).
