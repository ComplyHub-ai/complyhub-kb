# Audit — PR #365

> **Date:** 6 August 2026 (audit written); **Merged:** 4 August 2026
> **Scope:** Document Repository Consolidation — critical `tenant-documents` PERMISSIVE RLS gap
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

**Root cause:** `tenant-documents` (PR #352) had only RESTRICTIVE tenant-scope policies. RESTRICTIVE policies narrow access but never grant it — with zero PERMISSIVE policies, every direct client-side storage call was denied for every user since bucket creation. Surfaced during manual testing of PR #364 (assessment tool upload RLS violation).

Full codebase audit confirmed blast radius far beyond bucket #2.

## PR #365 — Fix missing PERMISSIVE role grants for tenant-documents bucket

**Branch:** `fix/tenant-documents-permissive-rls-grant` (deleted post-merge) · **Merge commit:** `02ec12cb2` · **Merged:** 4 Aug 2026 · **Migration:** `20260804044222`

### PERMISSIVE grant (path-category-aware)

- `assessment-tools/` → Administrator, Compliance Manager, Governing Person
- `pd/`, `tas/`, `tas-exports/` → any active tenant member
- everything else → Administrator, CM, Governing Person, Consultant, Consultant Assistant
- SELECT (all categories) → any active tenant member

### Silent delete bugs fixed (same PR)

- `Documents.tsx` delete — no error check, quietly orphaned files
- `TenantDocuments.tsx` single + bulk delete — same pattern

### Production apply

Applied via `execute_sql`. Ledger verified (version/name match file exactly). All 4 original RESTRICTIVE policies confirmed untouched.

### Soak status

N/A (target bucket access fix).

### Still open at merge

`EditDocumentModal`, `TASUploadDialog`, `useTASExport` — fixed in PR #366.
