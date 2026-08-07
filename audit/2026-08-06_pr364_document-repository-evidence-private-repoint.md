# Audit — PR #364

> **Date:** 6 August 2026 (audit written); **Merged:** 4 August 2026
> **Scope:** Document Repository Consolidation — Phase 3 bucket #2 (`evidence-private` → `tenant-documents`)
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Code repoint for bucket #2 after object copy verified byte-identical (1,193/1,193 objects, 10 spot-checked via SHA-256). No DML needed — `assessment_tools`, `assessment_tool_versions`, and `trainer_industry_currency` do not track `storage_bucket`. Bundled three audit-found bugs into same PR by design.

## PR #364 — Repoint evidence-private to tenant-documents (bucket #2)

**Branch:** `fix/evidence-private-repoint-tenant-documents` (deleted post-merge) · **Merge commit:** `f3e83ff3b` · **Merged:** 4 Aug 2026 · **Files:** 9

### Repointed surfaces

Assessment tools upload/download/delete, PD evidence, `extract-assessment-tool-fields` edge function, `useFileHealth` existence check.

### Bundled bug fixes

1. **Orphaned uploads on abandoned drafts** — `AssessmentToolForm.tsx` / `AssessmentToolBulkUploadDialog.tsx` uploaded before save; cancel left files in storage.
2. **Dead `useFileHealth` counter** — hardcoded `evidence-private` bucket, always reported healthy.
3. **`listTrainerPD` resolver** — hardcoded bucket in PD query path.

### Production apply

Deployed to production (Vercel `dpl_55ELXaSTGpFdiYH1JDRV24dWXobS`, commit `f3e83ff3b`). Temp copy edge function deleted 4 Aug 2026.

### Soak status

✅ Soak started 4 Aug 2026 on source `evidence-private` — completes ~18 Aug 2026.

### Follow-up

Manual QA surfaced RESTRICTIVE-only `tenant-documents` gap → PR #365.
