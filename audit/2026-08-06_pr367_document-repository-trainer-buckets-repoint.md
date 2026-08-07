# Audit — PR #367

> **Date:** 6 August 2026 (audit written); **Merged:** 4 August 2026
> **Scope:** Document Repository Consolidation — Phase 3 buckets #3/#4 (`trainer-credentials` + `trainer-evidence` → `tenant-documents`)
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Code repoint for buckets #3 and #4 after object copy verified (920/920 objects, 0 failures). Repointed 10 originally-scoped files plus `TrainerDocumentsTab.tsx`, `useFileHealth.ts`, `useEvidenceUrl.ts` fallback chain, and `register-evidence-manager` edge function (canonical server-side bucket mapping — found during live double-check, not in original scope).

## PR #367 — Repoint bucket #3/#4 code to tenant-documents

**Branch:** `fix/bucket-3-4-code-repoint` (deleted post-merge) · **Merge commit:** `fe2239255` · **Merged:** 4 Aug 2026 · **Files:** 17

### Prerequisite RLS migration

`20260804072745_widen_tenant_documents_trainers_path_role_grant.sql` — widens PERMISSIVE grant for `{tenant_id}/trainers/{trainer_id}/...` path shape to any active tenant member. Without it, Trainer self-uploads (`SmartDocumentVault.tsx`, `MyCredentialsTab.tsx`) would 403 against new bucket.

### Bot findings fixed (5 Cursor Bugbot + 1 Vercel)

All confirmed and fixed before merge.

### Production apply

Prerequisite migration applied via `execute_sql`. Ledger verified.

### Soak status

✅ Soak started 4 Aug 2026 on `trainer-credentials` and `trainer-evidence` — completes ~18 Aug 2026.

### Follow-up

Manual testing → PR #369. Data repoint → PR #371.
