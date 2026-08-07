# Audit — Document Repository Consolidation (index)

> **Date:** 6 August 2026
> **Scope:** Full audit trail for the Document Repository Consolidation project (31 Jul – 6 Aug 2026)
> **Project:** `gdwhlstfguxarnxasrrs`
> **Soak watch (living doc):** `document-repository-consolidation.md` (workspace root) — soak schedule + cron runbook only; full history is here
> **Source plan:** `ComplyHub_Document_Repository_Consolidation_Plan_3912.md`

---

## Project summary

Consolidated 55 Supabase storage buckets toward a tiered model centred on `tenant-documents`, `tenant-branding`, and `user-avatars`. Work spanned Phase 0 audit through Phase 4 decommission, delivered across **19 merged PRs** over six days. All code repoints and migrations are production-applied; **soak timers are now running on all 21 watched source buckets** (earliest completion ~17 Aug, latest ~20 Aug 2026). Source bucket object deletion remains gated on soak completion + explicit approval.

### Outcome at a glance

| Metric | Before | After (6 Aug 2026) |
|---|---|---|
| Live buckets | 55 | ~26 (41 post-PR #350, minus further decommissions) |
| Target buckets | — | `tenant-documents`, `tenant-branding`, `user-avatars`, `document-templates` (+ specialised buckets still in soak) |
| `organization-logos` | 4 orphan objects | ✅ Decommissioned (PR #386) |
| Soak monitor | — | ✅ Live nightly cron + `storage_soak_buckets` watch list |
| Frontend direct `.storage.from()` | 23 files / 17 buckets | Wave 1 repointed (PR #386); Wave 2 helper rewrite still open |

---

## PR audit entries (1 PR = 1 file)

| PR | Merged | Audit file |
|---|---|---|
| #350 | 3 Aug 2026 | [`2026-08-06_pr350_document-repository-dead-bucket-decommission.md`](./2026-08-06_pr350_document-repository-dead-bucket-decommission.md) |
| #351 | 3 Aug 2026 | [`2026-08-06_pr351_document-repository-dead-policy-branch.md`](./2026-08-06_pr351_document-repository-dead-policy-branch.md) |
| #352 | 3 Aug 2026 | [`2026-08-06_pr352_document-repository-tenant-documents-bucket.md`](./2026-08-06_pr352_document-repository-tenant-documents-bucket.md) |
| #353 | 3 Aug 2026 | [`2026-08-06_pr353_document-repository-documents-bucket-repoint.md`](./2026-08-06_pr353_document-repository-documents-bucket-repoint.md) |
| #357 | 4 Aug 2026 | [`2026-08-06_pr357_document-repository-bucket1-manual-testing-bugs.md`](./2026-08-06_pr357_document-repository-bucket1-manual-testing-bugs.md) |
| #359 | 4 Aug 2026 | [`2026-08-06_pr359_document-repository-schema-hardening.md`](./2026-08-06_pr359_document-repository-schema-hardening.md) |
| #362 | 4 Aug 2026 | [`2026-08-06_pr362_document-repository-trainer-publish-wiring.md`](./2026-08-06_pr362_document-repository-trainer-publish-wiring.md) |
| #364 | 4 Aug 2026 | [`2026-08-06_pr364_document-repository-evidence-private-repoint.md`](./2026-08-06_pr364_document-repository-evidence-private-repoint.md) |
| #365 | 4 Aug 2026 | [`2026-08-06_pr365_document-repository-tenant-documents-permissive-rls.md`](./2026-08-06_pr365_document-repository-tenant-documents-permissive-rls.md) |
| #366 | 4 Aug 2026 | [`2026-08-06_pr366_document-repository-tas-upload-and-dead-code-cleanup.md`](./2026-08-06_pr366_document-repository-tas-upload-and-dead-code-cleanup.md) |
| #367 | 4 Aug 2026 | [`2026-08-06_pr367_document-repository-trainer-buckets-repoint.md`](./2026-08-06_pr367_document-repository-trainer-buckets-repoint.md) |
| #369 | 5 Aug 2026 | [`2026-08-06_pr369_document-repository-trainer-credential-qa-bugs.md`](./2026-08-06_pr369_document-repository-trainer-credential-qa-bugs.md) |
| #371 | 5 Aug 2026 | [`2026-08-06_pr371_document-repository-trainer-evidence-data-repoint.md`](./2026-08-06_pr371_document-repository-trainer-evidence-data-repoint.md) |
| #377 | 5 Aug 2026 | [`2026-08-06_pr377_document-repository-meeting-artefacts-tenant-path.md`](./2026-08-06_pr377_document-repository-meeting-artefacts-tenant-path.md) |
| #378 | 5 Aug 2026 | [`2026-08-06_pr378_document-repository-qi-evidence-repoint.md`](./2026-08-06_pr378_document-repository-qi-evidence-repoint.md) |
| #379 | 5 Aug 2026 | [`2026-08-06_pr379_document-repository-qi-register-qa-bugs.md`](./2026-08-06_pr379_document-repository-qi-register-qa-bugs.md) |
| #384 | 6 Aug 2026 | [`2026-08-06_pr384_document-repository-buckets-6-24-batch.md`](./2026-08-06_pr384_document-repository-buckets-6-24-batch.md) |
| #385 | 6 Aug 2026 | [`2026-08-06_pr385_document-repository-branding-consolidation.md`](./2026-08-06_pr385_document-repository-branding-consolidation.md) |
| #386 | 6 Aug 2026 | [`2026-08-06_pr386_document-repository-consolidation-finish.md`](./2026-08-06_pr386_document-repository-consolidation-finish.md) |

**Related but not consolidation-core:** PR #355 (branch-DB fix for #350 migration), PR #377 bundled into consolidation narrative as `meeting-documents` bucket fix.

---

## Soak status (verified 6 Aug 2026)

All 21 rows in `storage_soak_buckets` now have `soak_started_at` set. PR #384's 11 buckets were started this session at `2026-08-06 07:20:29 UTC` (complete ~20 Aug 2026).

Check soak monitor logs:

```sql
SELECT action, target, payload, created_at
FROM public.admin_audit
WHERE action IN ('storage_soak_violation', 'storage_soak_check_clean')
ORDER BY created_at DESC LIMIT 20;
```

---

## What's still open

1. **Soak period** — wait until ~17–20 Aug 2026; nightly monitor watches for new writes to legacy buckets
2. **Source bucket decommission** — delete objects + drop buckets after soak + explicit Brian approval
3. **Non-SuperAdmin branding QA** — logo/avatar uploads (PR #385 scope)
4. **Wave 2 frontend refactor** — centralised `tenant-documents` helper (parked)
5. **Parked bugs** — `TrainerCredentialForm` storage scoping, ComplyBot file attachments, `register-evidence-manager` REGISTERS map (see `active-work.md`)

---

## Production apply discipline

All migrations applied via interim procedure: `execute_sql` (never `apply_migration` for existing migration files; never `supabase db push` while ledger drift unresolved) + `supabase migration repair --status applied` per file, run by Brian.
