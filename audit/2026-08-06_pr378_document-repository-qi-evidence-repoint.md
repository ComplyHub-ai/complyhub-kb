# Audit — PR #378

> **Date:** 6 August 2026 (audit written); **Merged:** 5 August 2026
> **Scope:** Document Repository Consolidation — Phase 3 bucket #5 (`qi-evidence` → `tenant-documents`)
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Migrated next-smallest active bucket (`qi-evidence`, 1 object) to `tenant-documents`. Object copied and hash-verified byte-identical via temporary edge function (same disposable pattern as prior buckets). Added `qi-` path carve-out to `tenant-documents` PERMISSIVE policies matching intentional tighter access (Administrator + Compliance Manager insert/update, Administrator-only delete).

## PR #378 — Repoint qi-evidence bucket to tenant-documents + fix silent orphan-on-replace bug

**Branch:** `fix/repoint-qi-evidence-bucket` (deleted post-merge) · **Merge commit:** `cd360c2d6` · **Merged:** 5 Aug 2026 · **Files:** 2

### RLS carve-out

Confirmed intentional against `registers/qi/index.tsx` `canManageQiAdmin` gate — same `[Administrator, Compliance Manager]` role set. Required converting existing policies from single-expression to OR-form.

### Orphan-on-replace bug

Evidence file replace left old object in storage when new upload succeeded — fixed in same PR.

### Production apply

RLS migration applied. Temp copy function deleted.

### Soak status

✅ Soak started 5 Aug 2026 on source `qi-evidence` — completes ~19 Aug 2026.

### Follow-up

Manual QA found display bugs unrelated to repoint → PR #379.
