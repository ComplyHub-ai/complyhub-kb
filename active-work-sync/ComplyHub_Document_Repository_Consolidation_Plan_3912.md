# ComplyHub Document Repository Consolidation Plan
**Prepared:** 31 July 2026
**Project:** gdwhlstfguxarnxasrrs (rto.complyhub.ai)

---

## 1. Audit findings

You already have external file storage (Supabase Storage) with tenant scoping attempted — it's just been built **54 separate times** instead of once.

**Bucket inventory:**
- 54 storage buckets exist in total
- Only **26 actually contain files** — the other **28 are empty shells** with no objects, safe to drop with zero data risk
- Of the 26 active buckets, usage is heavily concentrated:

| Bucket | Objects | Size |
|---|---|---|
| `documents` | 3,880 | 910 MB |
| `evidence-private` | 1,177 | 1000 MB |
| `trainer-credentials` | 645 | 307 MB |
| `trainer-evidence` | 275 | 126 MB |
| `suggestion-attachments` | 110 | 19 MB |
| `tas-imports` | 77 | 74 MB |
| *(20 more buckets, each under 50 objects)* | | |

Over 95% of stored files sit in the top 6 buckets. The other ~20 active buckets hold a handful of files each — largely one-off features that were never folded back into a shared pattern.

**Metadata tables:**
- `documents_register` is the closest thing to a canonical repository already — 3,789 rows, tenant-scoped, versioned, with lifecycle status, category, approvals. It backs the `documents` bucket.
- At least 7 other tables duplicate this job for specific features: `evidence_documents` (290 rows), `trainer_document_uploads` (49), `tas_import_documents` (76), `register_evidence_documents` (28), `fpp_declaration_documents` (16), `meeting_documents` (14), plus several `_zz_deprecated_*` tables already flagged dead.

**RLS reality:**
- `storage.objects` carries one enormous PERMISSIVE `SELECT` policy with ~30 separate `OR` branches, one per bucket, each using a different convention:
  - Some check `(storage.foldername(name))[1] = tenant_id`
  - Some check `[2]` instead of `[1]`
  - Some check `auth.uid()` as the folder name instead of tenant
  - Some use `get_user_organization_id()` (a legacy concept) instead of `tenant_id`
  - Some rely on a `current_org_id()` helper that isn't used anywhere else
- A handful of buckets (`trainer-evidence`, `branding_logos`) do have a proper RESTRICTIVE policy closing them off — that pattern works and should be the template for everything else.

**Bottom line:** the "external repository, tenant-invisible, referenced from the database" architecture you're picturing is right — you're just not getting it consistently, because every feature built its own bucket and its own access rule instead of using one shared one. That's exactly the kind of drift that produces a cross-tenant leak nobody notices until an ASQA file review or a client complaint.

---

## 2. Target architecture

**One bucket per sensitivity tier, not one per feature.** Realistically:
- `tenant-documents` — general compliance documents, evidence, registers (replaces `documents`, `evidence-private`, `compliance-evidence`, `register-evidence`, `fpp-evidence`, `pli-evidence`, `ofi-evidence`, `qi-evidence`, `industry-evidence`, `dap-documents`, `tas-imports`, `tas-exports`, `meeting-documents`, `governance-meeting-artefacts`, `suggestion-attachments`, `rpl-attachments`, `third_party_files`, `trainer-credentials`, `trainer-evidence`, `evidence-trainers`, `trainer-docs`, `TAS-attachments`, `TP-attachments`, `audit-reports`, `audit-packs`, `evidence-adc`, `evidence-complybot`, `complybot-uploads`, `evidence`, `fre-reports`, `tenant-evidence-private`, `evidence-private`)
- `tenant-branding` — logos and brand assets, mostly public read (replaces `branding`, `branding_logos`, `organisation-assets`, `organization-assets`, `organization-logos`, `branding-logos`)
- `user-avatars` — user profile images, public (replaces `avatars`, `user-avatars`)
- `system-templates` — SuperAdmin-managed, read-only to tenants (replaces `document-templates`)

**Canonical path convention, enforced everywhere:**
```
{tenant_id}/{category}/{filename}
```
No exceptions, no `auth.uid()` as folder name, no double-nested tenant_id (currently happening in some `documents_register` rows — a bug to fix in the same pass).

**One metadata table:** `documents_register` becomes canonical for every document type. Feature-specific tables (`evidence_documents`, `trainer_document_uploads`, `tas_import_documents`, etc.) either get folded into it via `document_type` + `linked_register_id`/`linked_register_type` (columns that already exist for exactly this purpose) or kept as thin feature tables that FK to `documents_register.id` rather than storing their own `file_path`.

**One RLS pattern:** a single RESTRICTIVE policy set on `storage.objects`, keyed off `tenant_id` via `sec.has_tenant_role()`, applied per new bucket — replacing the 30-branch PERMISSIVE mega-policy. `sec.superadmin_tenant_gate(tenant_id)` handles the SuperAdmin case per your existing pattern.

**Frontend never talks to storage directly.** All reads/writes go through `documents_register` + short-lived signed URLs generated server-side. A tenant genuinely cannot construct a path into another tenant's files, because the frontend never has raw bucket/path access — it only ever gets a row from its own tenant's `documents_register` rows, which RLS already scopes.

---

## 3. Phased migration plan

**Phase 0 — Zero-risk cleanup (do first, do immediately)**
- Drop the 28 empty buckets. No data, no risk, immediate reduction from 54 → 26.
- Drop the confirmed `_zz_deprecated_*` document tables (already flagged dead elsewhere in the platform notes).

**Phase 1 — Canonical schema hardening**
- Fix the double-nested `tenant_id/tenant_id/...` path bug in `documents_register`
- Add any missing FK/constraint linking feature tables to `documents_register.id`
- Confirm `document_type` + `linked_register_type` enum values cover every current use case before folding tables in

**Phase 2 — New bucket + RLS pattern**
- Create the 4 target buckets
- Write the single RESTRICTIVE policy set (SELECT/INSERT/UPDATE/DELETE) for `tenant-documents`, modelled on the existing `trainer_evidence_tenant_scope_*` policies that already work correctly
- Apply to `tenant-branding`, `user-avatars`, `system-templates` with tier-appropriate rules (public read where relevant)

**Phase 3 — Data migration, by tier (largest buckets first, since they're already closest to correct)**
1. `documents` (3,880 objects) → `tenant-documents` — mostly a rename, since path convention already matches
2. `evidence-private` (1,177) → `tenant-documents`
3. `trainer-credentials` (645) → `tenant-documents`
4. `trainer-evidence` (275) → `tenant-documents`
5. Remaining 22 active buckets, smallest first — each is a small, low-risk copy-and-repoint

Each bucket migration: copy objects → insert/update `documents_register` rows → verify signed-URL access from a **non-SuperAdmin tenant-scoped test user** (per your existing SuperAdmin-testing-hides-RLS-bugs discipline) → repoint frontend reads → leave old bucket read-only for a grace period → drop.

**Phase 4 — Decommission**
- Drop the old buckets once frontend fully repointed and verified
- Drop the old mega-policy on `storage.objects`
- Update `get_advisors` baseline

---

## 4. Non-negotiables for this project

- Audit-before-author on every step — column names and current policy bodies confirmed live before writing, not assumed from this document
- DDL and DML in separate migrations, ~50-object batches per migration, per standing discipline
- Test every RLS change as a tenant-scoped Trainer/Assessor or Administrator user, never SuperAdmin only
- Announce each `apply_migration` in the team channel before running (Dave, RJ, Khian, Carl all hold MCP access)
- `NOTIFY pgrst, 'reload schema'` after every bucket/table change
- Nothing gets dropped until the replacement is verified working end-to-end from a real tenant login

---

## 5. Immediate next action

Phase 0 is genuinely zero-risk and can run today: drop the 28 empty buckets and the confirmed deprecated tables. Say the word and I'll draft that migration first, then move to the Phase 1/2 Cursor prompt for the new bucket + RLS pattern.
