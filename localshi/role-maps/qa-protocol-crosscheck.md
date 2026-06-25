# QA Protocol Cross-Check — Role Maps vs Carl's 17 Categories

**Generated:** 5 June 2026
**Branch:** `fix/local-run`
**Sources:** `docs/QA_PROTOCOL.md` (17 categories, 329 functions) + 7 role-map files in this folder
**Purpose:** Step 3 of the seed data plan. Identifies which QA categories each role triggers, what secrets block them, and what's missing from Carl's minimal seed spec.

---

## Category → Role mapping

| # | Category | Functions | Roles that trigger it | Secrets needed |
|---|---|---|---|---|
| 1 | Auth | 21 | **All roles** | None |
| 2 | User Management | 25 | `super_admin`, `Administrator` | None |
| 3 | Billing | 37 | `super_admin`, `Administrator` | ⛔ Stripe test keys |
| 4 | AI Generation | 57 | `super_admin`, `Administrator`, `Compliance Manager`, `Trainer/Assessor`, `Governing Person` | ⛔ Anthropic key |
| 5 | TGA Integration | 34 | `super_admin`, `Administrator`, `Compliance Manager` | None (public API) |
| 6 | TAS Builder | 11 | `super_admin`, `Administrator`, `Compliance Manager`, `Governing Person` | Partial (needs TGA + AI) |
| 7 | Email | 27 | `super_admin`, `Administrator` (system-level) | ⛔ Mailgun sandbox |
| 8 | Governance | 8 | `super_admin`, `Administrator`, `Compliance Manager`, `Governing Person` | Partial (AI) |
| 9 | Compliance / Audit | 9 | `super_admin`, `Administrator`, `Compliance Manager`, `Governing Person` | None |
| 10 | Storage / Documents | 17 | `super_admin`, `Administrator`, `Compliance Manager`, `Trainer/Assessor` | Partial (AI) |
| 11 | Regulatory | 4 | `super_admin` only (cron) | ⛔ Perplexity key |
| 12 | Connector | 4 | `super_admin`, `Administrator` | ⛔ aXcelerate/VETtrak sandbox |
| 13 | Superadmin | 28 | `super_admin` only | None |
| 14 | Cron / Background | 6 | System — manual invocation via SA tools | Partial |
| 15 | Demo / Seed | 5 | `super_admin` | None |
| 16 | Webhook | 1 | System (Stripe) | ⛔ Stripe webhook secret |
| 17 | Health / Utility | 3 | `super_admin` | None |
| — | Unclassified | 32 | Mixed | Mixed |

---

## Gap table — what QA_PROTOCOL's seed spec is missing

Carl's minimal seed spec (`docs/QA_PROTOCOL.md`) lists:
- 2 tenants (demo-tenant-1 active, demo-tenant-2 trial)
- 4 users: `super_admin`, `Administrator`, `Trainer`, `Student`
- 1 TAS with 3 units, 1 qualification, 1 pending invitation, 1 governance meeting, 1 Stripe customer_id

The role maps identify the following gaps:

| Missing item | Needed by | Why it matters |
|---|---|---|
| `Compliance Manager` user | Categories 5, 6, 8, 9 | CM triggers the most edge functions of any non-admin role — not in Carl's seed list at all |
| `Governing Person` user + `governing_persons` table row | Categories 6, 8, 9 | `generate-board-report` and governance pack functions require a GP row; feature flag also needed |
| `Student Support Officer` user | Category 7 reminders, SSO flows | 5th most common live role in production; entirely absent from seed |
| `Consultant` user + `tenant_members` row (`role = 'Consultant'`) | Portal dashboard | 6 live users in production; `useConsultantClients` flows untested without one |
| `sso_alert_thresholds` row | SSO monthly pack, alert system | PK is `tenant_id` — one row per tenant; missing row silently breaks the SSO dashboard |
| `ssr_register` row | SSO work queue, Student support flows | Parent table for `adjustment_plans`, `intervention_plans`, `placement_wellbeing_records` |
| `sso_monthly_packs` row | Category 14 cron reminders | Required by `monthly-report-reminders` cron to function |
| `compliance_clauses` full clause set | Categories 9, 6 | `run-adversarial-auditor`, TAS audit simulate, and ComplyBot all query this — must be seeded by migration |
| `ci_register` + `ci_items` row | Category 9 | `auto-capture-ci` and overdue check need at least one CI item to write/read |
| `audit_cycle` + `audit_templates` row | Category 9 | `generate-audit-pack` requires a cycle; without it the pack returns empty, not an error |
| `trainer_profiles` + `trainer_credentials` row | Categories 6, 10 | QA_PROTOCOL mentions a trainer user but not these tables — `trainer-register-cron` flags the trainer as non-compliant without a TAE credential row |
| `feature_visibility` row (`feature_governance_portal = 'live'`) | Governing Person | CEO Governance Portal is feature-flagged — without this row GP sees a Coming Soon screen |
| `tenant_rto_profile` row | Categories 5, 6, 8 | RTO name + ASQA number — TGA functions return 400 without it; governance pack also reads it |
| `tenant_scope_items` row (≥1 qualification) | Categories 5, 6 | `tas-create` returns 400 if `tenant_scope_items` is empty; TGA sync needs a scope to resolve |

---

## Roles that are placeholder-only

These roles should be seeded with a user account so auth works, but their portal routes should be covered with a Coming Soon screen. There are no live edge functions to test.

| Role | Reason | Action for seed |
|---|---|---|
| `Regulatory Officer` | Auditor dashboard is entirely hardcoded integers; `/auditor/*` sub-routes are unregistered (404) | Seed user only; all routes Coming Soon |
| `Employer` | No `/employer/*` route components exist — nav paths are defined but page files are absent | Seed user only; portal is unbuilt |
| `Third Party` | No `/third-party/*` route components; `thp_register` data exists (7 rows) but no `user_id` linkage on the table | Seed user only; flag for Dave (`portal_user_id` FK needed on `thp_register`) |

---

## P0 category readiness (must pass before DNS cutover)

| Category | Blocked by secrets? | Seed data gap | Status |
|---|---|---|---|
| 1 — Auth | No | None — covered by QA_PROTOCOL's 4 users | ✅ Ready to test |
| 2 — User Management | No | Covered once seed users + invitation row exist | ✅ Ready to test |
| 3 — Billing | ⛔ Stripe test keys | Partially covered — Stripe `customer_id` in seed, but no test subscription row | ⚠️ Needs secrets + subscription seed |
| 4 — AI Generation | ⛔ Anthropic key | Covered by seed data if key is in vault | ⚠️ Needs Anthropic key in vault |
| 5 — TGA Integration | No | ⚠️ `tenant_rto_profile` + `tenant_scope_items` missing from QA_PROTOCOL seed | ⚠️ Needs seed data additions |
| 6 — TAS Builder | Partial (AI + TGA) | ⚠️ `trainer_profiles`, `trainer_unit_map`, `tenant_scope_items` missing | ⚠️ Needs seed data additions |

---

## What this means for seed.sql

Carl's minimal seed spec is a starting point, not a complete QA seed. The role maps have identified:
- **5 missing users** (`Compliance Manager`, `Governing Person`, `Student Support Officer`, `Consultant`, and `Regulatory Officer` as a placeholder)
- **13 additional tables** that need at least one seed row for core flows to work
- **3 roles** whose portals are entirely unbuilt and should be covered with Coming Soon screens

Step 4 (production data shapes via read-only DB query) will confirm exact column names and required values before seed.sql is written in Step 5.

---

## Next step

> Step 4 — query production DB (read-only) to get real data shapes for each entity in the gap list above.
> Come back to the main chat and say: **"Ready for Step 4."**
