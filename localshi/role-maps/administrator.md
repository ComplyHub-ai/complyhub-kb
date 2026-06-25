# Role Map — Administrator

> **Source files**: `src/config/roleNavigation.ts`, `src/lib/rbac.ts`
> **QA_PROTOCOL.md note**: The file `docs/QA_PROTOCOL.md` does not exist in the repository. Section 3–4 below are derived from the live edge function directory (`supabase/functions/`) grouped by functional area.
> **Date mapped**: 5 June 2026

---

## Routes & access

The `Administrator` role resolves to `ADMIN_NAV` in `roleNavigationConfigs` (same config as `super_admin`). All nine nav sections are included with **no** `readOnly` flags on any item.

### Nav sections and paths

#### Dashboard
| Label | Path |
|---|---|
| Admin Dashboard | `/dashboard/admin` |
| Calendar | `/calendar` |
| Tasks | `/dashboard/tasks` |

#### Training & Assessment
| Label | Path |
|---|---|
| TAS Quality Engine | `/dashboard/tas-engine` |
| Assessment Validation | `/dashboard/assessment-validation` |
| Trainers Matrix | `/admin/trainer-matrix-engine` |
| Credit Transfer | `/dashboard/registers/ct` |
| Recognition of Prior Learning | `/dashboard/registers/rpl` |
| Industry Engagement | `/dashboard/registers/ien` |
| Facilities, Resources & Equipment | `/dashboard/registers/fre` |

#### Students & Support
| Label | Path |
|---|---|
| Student Support Register | `/dashboard/registers/ssr` |
| Wellbeing & Safety | `/student-support/reports/wellbeing` |
| Reasonable Adjustments | `/student-support/reports/reasonable-adjustment` |
| At-Risk Interventions | `/student-support/reports/at-risk` |
| Equity & Inclusion | `/student-support/reports/edi` |
| Placement Wellbeing | `/student-support/reports/placement` |
| Complaints & Appeals | `/dashboard/registers/caa` |

#### VET Workforce
| Label | Path |
|---|---|
| Trainer Credentials | `/dashboard/registers/tcr` |
| Professional Development | `/dashboard/registers/pdr` |
| Staff Turnover | `/dashboard/registers/staff-turnover` |
| Trainer Availability | `/dashboard/registers/trainer-availability` |
| Profile Management | `/dashboard/trainers` |

#### Governance & Risk
| Label | Path |
|---|---|
| Governance Meetings | `/dashboard/governance/meeting-manager` |
| Governance Register | `/dashboard/governance/register` |
| Material Change Notifications | `/dashboard/registers/mcn` |
| Fit & Proper Person | `/dashboard/registers/fpp` |
| Prepaid Fee Protection | `/dashboard/registers/pfp` |
| Public Liability Insurance | `/dashboard/registers/pli` |
| Quality Indicator Reporting | `/dashboard/registers/qi` |
| Audit & Internal Review | `/dashboard/registers/audit` |
| WHS & Third Party | `/dashboard/registers/whs` |
| Third Party Arrangements | `/dashboard/registers/thp` |
| Regulatory Intelligence | `/dashboard/regulatory-intelligence` |

#### Documents & Compliance
| Label | Path |
|---|---|
| Documents Register | `/documents-register` |
| Document Repository | `/document-repository` |
| Upload Minutes | `/student-support/uploads` |
| Marketing & Information | `/dashboard/registers/mktg` |

#### AI & Automation
| Label | Path |
|---|---|
| Compliance Intelligence | `/complybot` |
| Assessor Performance | `/dashboard/assessors/insights` |

#### User Management
| Label | Path |
|---|---|
| Users | `/admin/user-management` |
| Roles & Permissions | `/admin/user-management/roles` |
| View as User | `/admin/impersonate` |
| User Portals Hub | `/admin/user-portals` |

#### Settings
| Label | Path |
|---|---|
| Organisation Settings | `/settings` |
| RTO Settings | `/settings/rto` |
| Preferences | `/settings/preferences` |

### Additional permitted paths (from `routePermissions`, not in nav)

These routes are gated by `routePermissions` and permit `Administrator` explicitly:

- `/dashboard/settings/subscription`
- `/settings/roles`
- `/settings/impersonate`
- `/dashboard/ceo-governance`
- `/dashboard/registers/adc`
- `/dashboard/audit-engine`
- `/dashboard/tas/builder`
- `/dashboard/trainer`
- `/trainer-portal`
- `/dashboard/student-support`
- `/dashboard/sso`
- `/student-support` (prefix covers all SSO sub-routes)
- `/sso/monthly-reports`
- `/dashboard/student`
- `/student`
- `/dashboard/auditor`
- `/surveys`
- `/admin/matrix-approvals`

---

## Read-only vs read-write

**All nav items are read-write.** No `readOnly: true` is set on any item in `ADMIN_NAV`.

From `rbac.ts`:

| Permission | Administrator |
|---|---|
| `manage.users` | Yes |
| `manage.roles` | Yes |
| `view.settings` | Yes |
| `edit.registers` | Yes |
| `delete.registers` | Yes |
| `edit.documents` | Yes |
| `delete.documents` | Yes |
| `approve.actions` | Yes |
| `view.analytics` | Yes |
| `view.governance` | Yes |
| `view.compbot` | Yes |
| `view.qa1–qa4` | Yes (all four) |
| `view.trainer.portal` | Yes |

`canAccessRegister()` → always `true` for Administrator.  
`canEditRegister()` → always `true` for Administrator.  
`hasAdminAccess()` → `true` (short-circuits all further checks).  
`canUserAccessRoute()` → `true` for every route (admin bypass at line 256 of `rbac.ts`).

The only restriction the codebase applies to Administrator is that `writeProtectedRoutes` (`/settings`, `/admin/user-portals`, `/superadmin`) blocks **Regulatory Officers** — Administrator is unaffected.

---

## Edge function categories triggered

> `docs/QA_PROTOCOL.md` is absent. The following categories are derived from the `supabase/functions/` directory, grouped by the feature area an Administrator user exercises. Functions that fire only on system cron or webhooks (not user-initiated) are noted.

| Category | Functions | Count |
|---|---|---|
| AI & Automation | `ai-build-generator`, `ai-register-summary`, `ai-router`, `ai-unit-risk-scorer`, `audit-ai-processor`, `audit-reprocess`, `bulk-ai-document-tagging`, `bulk-audit-reprocess`, `clause-matcher`, `complybot-trending`, `compute-unit-complexity`, `consultation-prompt-pack`, `dap-ai-draft`, `derive-assessment-tasks`, `derive-unit-content`, `suggest-dap-risks`, `suggestion-diagnose`, `suggestion-triage`, `summarise-assessment-conditions` | 19 |
| TAS (Training & Assessment Strategy) | `tas-ai-engine`, `tas-audit-simulate`, `tas-create`, `tas-export-data`, `tas-export-pdf`, `tas-fetch-labour-market`, `tas-goal-prefill`, `tas-redteam-simulate` | 8 |
| TGA Integration | `tga-check-supersession`, `tga-check-updates`, `tga-competitor-count`, `tga-extract-licensing`, `tga-extract-packaging-rules`, `tga-fetch-qualdetails`, `tga-fetch-scope`, `tga-fetch-tas-details`, `tga-integration`, `tga-process-import-jobs`, `tga-resolve-product`, `tga-rto-preview`, `tga-rto-sync`, `tga-rto-validate`, `tga-sync-nightly-local`*, `tga-sync-products`, `tga-unit-grid`, `tga-unit-lookup`, `tga-verify-external-unit`, `training-product-check`, `tp-product-integrity-scan`, `tp-transition-engine-run` | 22 |
| Documents & Evidence | `analyze-document-fields`, `analyze-documents-batch`, `bulk-trainer-document-upload`, `document-file-manager`, `documents-delete`, `documents-upload`, `evidence-manager`, `verify-evidence` | 8 |
| Trainer & VET Workforce | `analyze-credential-certificate`, `analyze-resume`, `analyze-trainer-evidence`, `approve-trainer-product-request`, `backfill-benchmark-evidence`, `trainer-register-cron`*, `trainer-report-reminders`* | 7 |
| Governance & Compliance | `analyse-regulatory-update`, `auto-capture-ci`, `ci-overdue-check`*, `connector-sync`, `connector-test`, `extract-industry-themes`, `tenant-analyse-regulatory-impact`, `tmr-create-for-meeting` | 8 |
| User & Auth Management | `admin-audit-repair`, `admin-get-active-tenant`, `admin-set-active-tenant`, `auth-event-capture`, `bulk-tenant-actions`, `check-user-exists`, `cleanup-impersonation-metadata`, `confirm-user-deletion`, `cron-expire-invites`*, `delete-user-complete`, `echo-auth`, `support-mode-issue-token`, `sync-jwt-tenant`, `tenant-lifecycle`, `user-activation`, `user-create-from-invitation` | 16 |
| Billing & Subscription | `billing-gate`, `cancel-subscription`, `change-plan`, `enforce-billing-compliance`, `export-health-report`, `superadmin-billing`, `weekly-billing-health-report`* | 7 |
| Student Support | `wellbeing-support-reminders`* | 1 |
| API / Webhooks | `api-v1-router`, `api-v1-webhook-dispatch`, `stripe-webhook` | 3 |
| Onboarding & Trials | `create-demo-invitation`, `demo_signup_admin`, `trial-email-automation`*, `trial-expiry-scanner`*, `trial-metrics`*, `trial-offer-emails`*, `trial-reminders`*, `trial-request-reminders`*, `unsubscribe-orphan-recovery`*, `validate-trial-offer` | 10 |
| Misc / Branding | `branding-logo-manager`, `sync-axcelerate`, `sync-generic-provider`, `check-mailgun-status`, `test-mailgun` | 5 |

\* Cron/system-initiated — Administrator actions can trigger these indirectly but not by direct UI call.

**Total user-triggerable functions for Administrator: ~100+**

---

## Data requirements per category

Minimum DB state required for each category to run without errors. Table names are derived from edge function code patterns and register slugs in `roleNavigation.ts`.

### AI & Automation
**Tables**: `tenants`, `profiles`, `tenant_members`, `documents`, `ai_sessions` (or equivalent audit log), `register_entries` (any populated register for context)  
**Minimum data**: Active tenant with at least one document or register entry to analyse; valid JWT with `Administrator` role claim.

### TAS (Training & Assessment Strategy)
**Tables**: `tas_documents` (or `training_plans`), `training_products`, `tenants`, `qualifications`, `units_of_competency`  
**Minimum data**: At least one qualification scoped to the tenant; TGA data synced (via `tga-sync-products`); tenant's RTO scope populated.

### TGA Integration
**Tables**: `tga_products`, `tga_units`, `training_products`, `tenants`, `rto_scope`  
**Minimum data**: Tenant's RTO code stored in settings; at least one product in `tga_products`; internet-accessible TGA API endpoint (external dependency).

### Documents & Evidence
**Tables**: `documents`, `document_versions`, `storage.objects` (Supabase Storage bucket), `tenants`, `profiles`  
**Minimum data**: Storage bucket provisioned; at least one document row for delete/download tests; RLS policies must permit tenant_id match.

### Trainer & VET Workforce
**Tables**: `trainers` or `profiles` (trainer type), `trainer_credentials`, `professional_development_records`, `trainer_units`, `tenants`  
**Minimum data**: At least one profile with Trainer/Trainer-Assessor role in the same tenant; at least one credential record for validation tests.

### Governance & Compliance
**Tables**: `governance_meetings`, `governance_register`, `ci_risk_items` (or unified register), `material_change_notifications`, `tenants`  
**Minimum data**: At least one governance meeting record; tenant row with RTO details populated (legal name, ASQA code).

### User & Auth Management
**Tables**: `profiles`, `tenant_members`, `tenants`, `invitations`, `auth.users` (Supabase Auth)  
**Minimum data**: At minimum the seed admin's own `auth.users` row, `profiles` row, and `tenant_members` row with `role = 'Administrator'` and `status = 'active'`. Invitation functions also require an `invitations` table with `status = 'pending'`.

### Billing & Subscription
**Tables**: `subscriptions`, `billing_events` (or `subscription_history`), `tenants`, `stripe_customers`  
**Minimum data**: Active Stripe customer ID on the tenant; at least one subscription row with `status = 'active'` or `trialing`; Stripe webhook secret configured in Edge Function env.

### Student Support
**Tables**: `student_support_records`, `wellbeing_records`, `profiles` (student type), `tenants`  
**Minimum data**: At least one student profile in the tenant; at least one wellbeing record for reminder functions to query.

### API / Webhooks
**Tables**: `api_keys` (if key-gated), `tenants`, `audit_log`  
**Minimum data**: Valid Stripe webhook secret (env var); API key row if API v1 is key-authenticated.

---

## Seed user template

```json
{
  "auth.users": {
    "email": "admin@[tenantslug].edu.au",
    "email_confirmed_at": "2025-01-01T00:00:00Z",
    "raw_user_meta_data": {
      "full_name": "Admin User",
      "role": "Administrator"
    }
  },

  "profiles": {
    "id": "<uuid — matches auth.users.id>",
    "email": "admin@[tenantslug].edu.au",
    "first_name": "Admin",
    "last_name": "User",
    "role": "Administrator",
    "tenant_id": "<target tenant uuid>",
    "avatar_url": null,
    "created_at": "2025-01-01T00:00:00Z"
  },

  "tenant_members": {
    "user_id": "<uuid>",
    "tenant_id": "<target tenant uuid>",
    "role": "Administrator",
    "status": "active",
    "invited_by": null,
    "joined_at": "2025-01-01T00:00:00Z"
  },

  "tenants": {
    "id": "<target tenant uuid>",
    "name": "Test RTO Pty Ltd",
    "slug": "test-rto",
    "rto_code": "99999",
    "abn": "12 345 678 901",
    "status": "active",
    "tier": "professional",
    "trial_ends_at": null
  },

  "subscriptions": {
    "tenant_id": "<target tenant uuid>",
    "stripe_customer_id": "cus_test_xxxx",
    "stripe_subscription_id": "sub_test_xxxx",
    "status": "active",
    "plan": "professional",
    "current_period_end": "2026-12-31T00:00:00Z"
  }
}
```

**Notes**:
- `role` in `profiles` and `tenant_members` must both be `'Administrator'` (exact string match — `roleNavigationConfigs` lookup is case-sensitive).
- `subscriptions.status = 'active'` is required; `billing-gate` and `enforce-billing-compliance` functions will short-circuit or error for expired/trialing tenants depending on their guard logic.
- `tenants.rto_code` must be populated for any TGA integration function to resolve the RTO's scope.
- No `readOnly` constraints exist for this role, so the seed user does not need any special feature-flag rows to unlock write access.
- For impersonation testing (`/admin/impersonate`), at least one additional profile with a different role must exist in the same tenant.
