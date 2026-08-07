# Audit — PR #351

> **Date:** 6 August 2026 (audit written); **Merged:** 3 August 2026
> **Scope:** Document Repository Consolidation — Phase 2 dead RLS branch removal
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Removed the dead `evidence-attachments` OR-branch from all four legacy `storage.objects` mega-policies (`select`/`insert`/`update`/`delete`). The `evidence-attachments` bucket does not exist in `storage.buckets` — the branch could never match anything. Discovered during Phase 0 audit.

## PR #351 — Strip dead evidence-attachments branch from storage mega-policies

**Branch:** `fix/strip-dead-evidence-attachments-policy-branch` (deleted post-merge) · **Merge commit:** `0e9bfae78` · **Merged:** 3 Aug 2026 · **Files:** 1 migration

### Approach

Migration locates the exact known branch text at runtime via `position()`, asserts it was found, asserts removal produced the expected result (no remaining `evidence-attachments` reference, exact length delta) before applying via `ALTER POLICY`. Safer than hand-transcribing nested mega-policy expressions.

### Production apply

Applied to production. Ledger verified.

### Soak status

N/A (policy cleanup only).
