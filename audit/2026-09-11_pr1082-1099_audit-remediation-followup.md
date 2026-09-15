# Audit — September 2026 remediation follow-up (PRs #1082, #1087, #1093, #1097, and #1099)

> **Date:** 2026-09-11
> **Merged:** 2026-09-10 through 2026-09-11 UTC
> **Scope:** Follow-up remediation from the September platform audit: AI model compatibility, Intelligence deep links, obsolete debug-function removal, invitation/type drift, and missing inactive-tenant billing gates.
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `audit-remediation-followup-sep2026.md` (deleted after this audit entry was written)

---

## Summary

This follow-up closed the code and database remediation items identified in the September audit. PR #1082 updated four deployed AI functions to the supported Claude model. PR #1087 corrected assessment-review Intelligence deep links and verified the rule-key contract against live data. PR #1093 removed the obsolete `echo-auth` debug function from Git and the live Supabase project.

PR #1097 regenerated the database TypeScript definitions, reconciled nine ANZSCO production migration rows, and repaired the Super Admin invitation flow after the retired invitations table was found still referenced by the UI. PR #1099 added the canonical restrictive active-tenant billing gate to four Intelligence/TAS tables. The two migration apply workflows succeeded, and the live ledger and policies were rechecked directly.

The seven duplicate legacy scheduled jobs remain unresolved. Dashboard and SQL deletion attempts failed with `42501: permission denied for table job` because the jobs are owned by Supabase's internal `supabase_read_only_user` role. A Supabase support request was sent asking for removal/reassignment and a permanent ownership fix; no ticket number was captured, and the response remains pending.

**PRs:** [#1082](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1082), [#1087](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1087), [#1093](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1093), [#1097](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1097), [#1099](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1099)

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| AI functions | Four AI-assisted workflows used a deprecated Claude model identifier and could fail when the provider removed that snapshot. | The functions had not been moved to the supported `claude-sonnet-4-6` model. |
| Assessment Intelligence navigation | Assessment-review insights could lack a usable source record and deep-link to the wrong or generic destination. | The frontend resolver needed the assessment-review rule key and metadata/tool fallbacks to identify the correct tool. |
| `echo-auth` | An unauthenticated debug endpoint remained deployed even though it had no production purpose. | Removing a repository folder does not itself undeploy an existing Supabase Edge Function. |
| Invitation administration | The Super Admin Invite tab still queried the retired invitations table and could silently return no usable data. | The table had been removed, but the UI had not been moved to the current invitation RPCs and table. |
| Generated database definitions | The generated TypeScript definitions still contained the dropped `create_invite` function and other stale schema entries. | They had not been regenerated after the schema cleanup and subsequent additions. |
| Migration drift | Nine ANZSCO production-only migration rows had no matching files in the branch. | Production changes had been applied without their original version/name files being present in Git. |
| Inactive-tenant access | Four tenant-scoped Intelligence/TAS tables allowed membership/role policies without the platform-wide active-tenant restriction. | The tables were created with permissive tenant/member policies but missed the canonical restrictive billing gate. |
| Duplicate scheduled jobs | Seven legacy jobs ran alongside working `-fixed` replacements and generated failures/noise. | They are owned by Supabase's internal `supabase_read_only_user`, which the project sessions cannot manage. |

## Commit and PR history

| PR | Merge commit | Substantive change |
|---|---|---|
| #1082 | `a78b5436330a296b9d05241b8720f1f892f9e5f8` | Updated four AI Edge Functions to `claude-sonnet-4-6`. |
| #1087 | `d33d9be90903f829f0ba7c64aa779a99787ed9ac` | Added assessment-review Intelligence route resolution and regression coverage. |
| #1093 | `7deccf236b71d1746bd8b8c521b7425b5a96782c` | Removed `echo-auth` and its repository/config/document references. |
| #1097 | `72a59a89edba86432602ee49171c3066efbb598f` | Regenerated types, removed unit-test CI jobs, reconciled ANZSCO migrations, and repaired the Super Admin invitation flow. |
| #1099 | `f5b32fbe9762a7a225c8e97aa297f436d2e7a807` | Added the active-tenant billing gate to four Intelligence/TAS tables. |

## Fixes shipped

### Edge Functions and Intelligence

- **PR #1082** — updated `register-ai-triage`, `classify-governance-action`, `forms-campaign-ai-draft`, and `ai-tool-review-insights` to the supported Claude model. The production Edge Function deployment workflow completed successfully for merge SHA `a78b5436330a296b9d05241b8720f1f892f9e5f8`.
- **PR #1087** — centralised assessment-review insight navigation, added metadata/tool fallback handling, and verified `ASS_REVIEW_QUEUE_RULE_KEY = 'ASS_REVIEW_QUEUE_V1'` against live Intelligence rows.
- **PR #1093** — removed the obsolete `echo-auth` function from the repository/configuration and undeployed it. The current Supabase function list and direct function lookup both show it absent.

### Frontend and generated definitions

- **PR #1097** — regenerated the Supabase TypeScript definitions against the live schema, removing stale dropped-invitation entries and incorporating later schema objects.
- **PR #1097** — replaced the retired Invite-tab data path with the current invitation RPCs, required organisation selection, removed the invalid Admin Staff option, and made the canonical `send-invite` call the delivery step before success is shown.
- **PR #1097** — removed the stale `@ts-nocheck` and corrected the resulting hook dependency issues rather than suppressing them.

### Database

- **PR #1097** — reconciled the nine ANZSCO production migration rows using their original version/name files. The production migration workflow succeeded for merge SHA `72a59a89edba86432602ee49171c3066efbb598f`.
- **PR #1099** — migration `20260911044601_add_billing_gate_to_intelligence_tables.sql` added the canonical `billing_gate_active_tenant` restriction to `intelligence_evidence_items`, `intelligence_memory_snapshots`, `intelligence_trust_config`, and `tas_propagation_events`.
- **Live verification** — `supabase_migrations.schema_migrations` contains both `20260911044601` and `20260911050000`; direct `pg_policies` inspection confirms all four new policies are `RESTRICTIVE`, apply to `authenticated`, preserve Super Admin access, and require active tenant membership.

### Operational remediation

- The earlier September remediation also removed orphaned governance schedules, removed duplicate indexes, added high-traffic foreign-key indexes, and corrected the RLS init-plan warnings in two batches. Those changes were applied through the normal migration workflow and are recorded in the preceding billing/reactivation audit where applicable.
- Seven duplicate legacy cron jobs remain pending Supabase support action. The working `-fixed` replacement is retained for each job.

## Review rounds

1. **Audit and Scout recon** — each item was checked against current GitHub, repository, live Supabase function/schema state, and migration ledger before work proceeded; stale handover claims were corrected.
2. **PR #1082 review and CI** — changed-function scope and the supported model string were checked; the Edge Function deployment workflow succeeded.
3. **PR #1087 review and contract check** — the deep-link resolver, source/metadata fallback, tests, and exact live rule-key match were verified.
4. **PR #1093 review and deployment check** — the deletion was confirmed isolated; the Edge Function deployment workflow succeeded; the live function list and direct lookup confirm `echo-auth` is absent.
5. **PR #1097 review** — invitation RPC signatures, grants/revokes, active membership lookup, generated definitions, migration idempotency, and delivery ordering were checked. The migration workflow succeeded.
6. **PR #1099 RLS review** — the canonical live gate expression was copied, explicit idempotent policy replacement statements were used, and the migration workflow succeeded. Live policy inspection confirmed the resulting enforcement.
7. **Mechanical checks** — incremental TypeScript check, migration-list reconciliation, migration guard structure, and whitespace checks passed for the new migration.

## Production rollout

1. **Vercel production** — direct Vercel MCP verification was unavailable because the Vercel connector was not connected. No production deployment is claimed here on that basis.
2. **Edge Functions** — the GitHub Edge Function deployment workflow succeeded for PR #1082 (`[run 34447323619](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34447323619)`) and PR #1093 (`[run 34552020424](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34552020424)`). `echo-auth` is absent from the current live function list.
3. **Migrations** — the automatic migration workflow succeeded for PR #1097 (`[run 34559942960](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34559942960)`) and PR #1099 (`[run 34563778680](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/34563778680)`). The live ledger and four live policies were independently verified.
4. **Worktrees** — worktree A was returned to clean, up-to-date `main` and released in `active-work.md`.

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Click 2–3 assessment-review queue Review/Open links and the `risk_review_due` link in the demo tenant; confirm each reaches the correct distinct tool.
- [ ] Click through the Super Admin Invite flow on a preview and confirm organisation selection, invitation creation, delivery, and recent-invitation display.
- [ ] Seat-test the four billing-gated tables as a Compliance Manager in the demo tenant, not as Super Admin, including the inactive-tenant denial path if a safe test state is available.

These checks were intentionally excluded from the remediation session and are not represented as complete.

## Still open / follow-up

- **Supabase support ticket:** remove or reassign jobs 12, 13, 14, 16, 20, 21, and 22, and explain/prevent creation under `supabase_read_only_user`. The initial Dashboard/SQL attempts failed with `42501: permission denied for table job`; no ticket number was captured, so this remains externally blocked.
- **`trial_intent_survey_responses`:** remains ungated as an owner-scoped table pending an explicit team/product decision and documentation as a deliberate exception.
- **Manual QA:** the assessment-review deep-link and Super Admin invitation click-throughs remain outstanding by Brian's scope decision.
- **Pilot widening:** no technical action is recorded in this audit; any decision to expand the demo-only Intelligence pilot is a separate product decision.

## Soak status

No new feature flag was introduced. The billing restriction is a high-sensitivity access-control change and should be watched through the manual Compliance Manager seat test and normal tenant billing transitions. The cron cleanup has no code dependency and remains blocked only by Supabase ownership permissions.

## References

- PRs: [#1082](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1082), [#1087](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1087), [#1093](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1093), [#1097](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1097), [#1099](https://github.com/ComplyHub-ai/rto-compass-hub/pull/1099)
- Merge commits: `a78b5436330a296b9d05241b8720f1f892f9e5f8`, `d33d9be90903f829f0ba7c64aa779a99787ed9ac`, `7deccf236b71d1746bd8b8c521b7425b5a96782c`, `72a59a89edba86432602ee49171c3066efbb598f`, `f5b32fbe9762a7a225c8e97aa297f436d2e7a807`
- Source living doc: `audit-remediation-followup-sep2026.md` (deleted after this record was written)
- Active work ledger: `active-work.md`
