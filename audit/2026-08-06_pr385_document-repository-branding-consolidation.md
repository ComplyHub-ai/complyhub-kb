# Audit — PR #385

> **Date:** 6 August 2026 (audit written); **Merged:** 6 August 2026
> **Scope:** Document Repository Consolidation — Phase 3 buckets #25–#30 (Option B tenant-branding)
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `document-repository-consolidation.md`

---

## Summary

"Option B" branding consolidation: created `tenant-branding` (public) and reconciled `user-avatars` buckets with proper RLS. Copied 110 objects from five legacy buckets, repointed all upload/read paths, hardened branding RPCs with role + write-lock guards.

## PR #385 — Option B tenant-branding consolidation

**Branch:** `feat/storage-migration-remaining-6-buckets-and-refactor` (deleted post-merge) · **Merge commit:** `9b7d9aaae` · **Merged:** 6 Aug 2026 · **Files:** 33

### Source → target

| Source | Objects | Target | Method |
|---|---|---|---|
| `branding` | 31 | `tenant-branding` | copy_rewrite (`{tid}/logo.{ext}` → `{tid}/logo/logo.{ext}`) |
| `organisation-assets` | 11 | `tenant-branding` | copy (flat legacy paths) |
| `avatars` | 44 | `user-avatars` | copy (identical paths) |
| `dap-documents` | 12 | `tenant-documents` | copy (identical paths) |
| `industry-evidence` | 12 | `tenant-documents` | copy_rewrite → `{tid}/consultation/{file}` |

### Also done

- `tenant-branding` bucket + RESTRICTIVE/PERMISSIVE RLS
- `user-avatars` reconciled + RLS
- `update_branding_settings_rpc` role + write-lock guards
- `is_tenant_write_locked_check` public RPC
- DML backfills: `tenant_branding.logo_url` (26 rows), `profiles.avatar_url` (16 rows)
- Code: `branding-logo-manager`, `OrgIdentityCard`, `ClientOnboardingWizard`, `ProfileSettings`, `BrandingUploader`
- `document-templates` delete-orphan bug fixed (stays on own bucket)
- Dead settings UI removed; `branding-logo-manager` edge function deployed
- 9 migrations applied + ledger synced (`20260806031500` → `20260806120600`)

### Production apply

All migrations applied 6 Aug 2026. Edge function deployed. Temp copy tooling deleted.

### Soak status

✅ Soak started 6 Aug 2026 on `branding`, `organisation-assets`, `avatars`, `dap-documents`, `industry-evidence` — completes ~20 Aug 2026.

### Still open

Manual QA as non-SuperAdmin tenant user (logo + avatar uploads). Source bucket decommission after soak + explicit approval.
