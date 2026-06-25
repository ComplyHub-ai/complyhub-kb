# Audit — PR #65: Branch DB seed config

**Date:** 25 June 2026
**Branch:** `feat/branch-db-seed-config`
**PR:** #65
**Merged by:** Brian (Khian)
**Merge commit:** `672dbc53c`

---

## What was fixed / delivered

Set up Supabase branch DB isolation so that PR preview deployments use a dedicated branch database seeded with test accounts, rather than pointing at the production database.

## Root cause of the problem

1. **No seed file existed.** Branch DBs start empty — without a `seed.sql`, there were no test accounts for role-based QA.
2. **`MIGRATIONS_FAILED` on all branch DBs.** Migration `20260624011731` creates a function referencing `tenants.parent_consultant_org_id`, but that column was never in any migration file. It had been applied directly to production via Lovable, bypassing the migration system. All 10 of these "ghost columns" caused branch DB migrations to crash before a single table could be seeded.

## What changed

| File | Change |
|---|---|
| `supabase/seed.sql` | New — 27-section seed file covering all 10 user roles, 2 tenants, billing, entitlements, DD tables, platform permissions. Password: `Seed1234!` |
| `supabase/config.toml` | Added `[db.seed]` block pointing at `seed.sql`; registered `detect-regulatory-overlays` and `send-trainer-report-reminder` edge functions |
| `supabase/migrations/20260624000100_gap_fill_tenants_schema_drift.sql` | New — adds 10 missing `tenants` columns with `ADD COLUMN IF NOT EXISTS`: `cricos_provider_code`, `lms_name`, `llnd_provider`, `llnd_assessment_instrument`, `english_evidence_policy`, `acsf_defaults`, `delivery_sites`, `funding_streams`, `trainer_pd_review_cadence`, `parent_consultant_org_id` |
| `supabase/migrations/CLAUDE.md` | Updated — branch DB testing requirement, schema drift documentation, known gap-fill inventory |
| `src/AppRoutes.tsx`, `src/lib/*`, `src/features/*` | Routing and client fixes included in PR |

## Result

- Branch DB `uvrwgcfycoqdrqodjpmc` status: `MIGRATIONS_PASSED` / `ACTIVE_HEALTHY`
- Seed confirmed running (branch preview showed seed UUIDs and 2-tenant data)
- Gap-fill migration now on `main` — future branches will inherit it

## Known follow-up

- Additional schema drift may exist in other tables beyond `tenants`. Address gap-fill migrations as future branch DB failures surface them.
- Vercel-Supabase integration (env var swapping per preview) not yet confirmed — needs Carl to verify the integration is active in Vercel project settings.
- Remote branch `feat/branch-db-seed-config` may still exist on GitHub — delete manually if not auto-removed.
