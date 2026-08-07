# Audit — PR #369

> **Date:** 6 August 2026 (audit written); **Merged:** 5 August 2026
> **Scope:** Document Repository Consolidation — bugs found during buckets #3/#4 manual testing
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

Manual QA on Vivacity Testing Tenant during bucket #3/#4 repoint (PR #367). Two pre-existing bugs found — unrelated to the storage migration itself. Tested as Administrator (Trainer Credentials register) and directly as Trainer (`trainer-portal/profile.tsx`).

## PR #369 — Fix trainer credential status-check crash + add self-service edit/delete

**Branch:** `fix/trainer-credential-status-check-and-self-edit` (deleted post-merge) · **Merge commit:** `3e2ed4bb0` · **Merged:** 5 Aug 2026 · **Files:** 2 · **No migrations**

### Bugs fixed

1. **Status CHECK violation** — v2 register form bound governance `DdSelect` values to `trainer_matrix_credentials.status` column whose CHECK only allows `pending`/`verified`/`expired`/`superseded`. Every submission crashed.
2. **Self-service edit/delete missing** — added Download/Edit/Delete to `MyCredentialsTab.tsx`.

### Post-push bot fixes (3 findings)

- Edit/delete never called `compute_trainer_classification` (stale compliance classification)
- Self-edit of verified credential kept `status = 'verified'` without re-review
- Delete orphaned evidence file in storage (now calls `deleteRegisterEvidence` first)

### Production apply

Deployed (Vercel `dpl_8BSp7EC3GbWTZwCfpQB5GuP5Rhim`, `READY`). No DB step.

### Soak status

N/A (application fixes during bucket #3/#4 soak window).
