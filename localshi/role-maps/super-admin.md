# Role Map — Super Administrator

> **Source files read:** `src/config/roleNavigation.ts`, `src/lib/rbac.ts`, `src/AppRoutes.tsx`,
> `docs/superadmin-dashboard-validation.md`, `docs/SUPER_ADMIN_SANITY_CHECK.md`,
> `docs/reports/superadmin_systems_check.md`, Supabase schema (live DB read).
>
> **Note on QA_PROTOCOL.md:** The file `docs/QA_PROTOCOL.md` does not exist in the repository.
> Section 3 and 4 below are derived from the closest available equivalent —
> `docs/superadmin-dashboard-validation.md` (the ops-dashboard QA reference) plus the edge
> function directory listing. If QA_PROTOCOL.md is created in future, this section should be
> reconciled against it.

---

## Routes & access

### How access is resolved

`roleNavigationConfigs['super_admin']` maps directly to `ADMIN_NAV` (same config as
`Administrator`). In `canAccessRoute()` the very first check short-circuits everything:

```ts
if (role === 'super_admin') return true;  // line 601 — bypasses all guards
```

`isReadOnlyForRole()` only returns `true` when a NavMenuItem carries `readOnly: true`. None of
the items in `ADMIN_NAV` carry that flag, so the super_admin has no read-only-only paths.

---

### Shared nav paths (ADMIN_NAV — same as Administrator)

| Section | Label | Path |
|---|---|---|
| Dashboard | Admin Dashboard | `/dashboard/admin` |
| Dashboard | Calendar | `/calendar` |
| Dashboard | Tasks | `/dashboard/tasks` |
| Training & Assessment | TAS Quality Engine | `/dashboard/tas-engine` |
| Training & Assessment | Assessment Validation | `/dashboard/assessment-validation` |
| Training & Assessment | Trainers Matrix | `/admin/trainer-matrix-engine` |
| Training & Assessment | Credit Transfer | `/dashboard/registers/ct` |
| Training & Assessment | Recognition of Prior Learning | `/dashboard/registers/rpl` |
| Training & Assessment | Industry Engagement | `/dashboard/registers/ien` |
| Training & Assessment | Facilities, Resources & Equipment | `/dashboard/registers/fre` |
| Students & Support | Student Support Register | `/dashboard/registers/ssr` |
| Students & Support | Wellbeing & Safety | `/student-support/reports/wellbeing` |
| Students & Support | Reasonable Adjustments | `/student-support/reports/reasonable-adjustment` |
| Students & Support | At-Risk Interventions | `/student-support/reports/at-risk` |
| Students & Support | Equity & Inclusion | `/student-support/reports/edi` |
| Students & Support | Placement Wellbeing | `/student-support/reports/placement` |
| Students & Support | Complaints & Appeals | `/dashboard/registers/caa` |
| VET Workforce | Trainer Credentials | `/dashboard/registers/tcr` |
| VET Workforce | Professional Development | `/dashboard/registers/pdr` |
| VET Workforce | Staff Turnover | `/dashboard/registers/staff-turnover` |
| VET Workforce | Trainer Availability | `/dashboard/registers/trainer-availability` |
| VET Workforce | Profile Management | `/dashboard/trainers` |
| Governance & Risk | Governance Meetings | `/dashboard/governance/meeting-manager` |
| Governance & Risk | Governance Register | `/dashboard/governance/register` |
| Governance & Risk | Material Change Notifications | `/dashboard/registers/mcn` |
| Governance & Risk | Fit & Proper Person | `/dashboard/registers/fpp` |
| Governance & Risk | Prepaid Fee Protection | `/dashboard/registers/pfp` |
| Governance & Risk | Public Liability Insurance | `/dashboard/registers/pli` |
| Governance & Risk | Quality Indicator Reporting | `/dashboard/registers/qi` |
| Governance & Risk | Audit & Internal Review | `/dashboard/registers/audit` |
| Governance & Risk | WHS & Third Party | `/dashboard/registers/whs` |
| Governance & Risk | Third Party Arrangements | `/dashboard/registers/thp` |
| Governance & Risk | Regulatory Intelligence | `/dashboard/regulatory-intelligence` |
| Documents & Compliance | Documents Register | `/documents-register` |
| Documents & Compliance | Document Repository | `/document-repository` |
| Documents & Compliance | Upload Minutes | `/student-support/uploads` |
| Documents & Compliance | Marketing & Information | `/dashboard/registers/mktg` |
| AI & Automation | Compliance Intelligence | `/complybot` |
| AI & Automation | Assessor Performance | `/dashboard/assessors/insights` |
| User Management | Users | `/admin/user-management` |
| User Management | Roles & Permissions | `/admin/user-management/roles` |
| User Management | View as User | `/admin/impersonate` |
| User Management | User Portals Hub | `/admin/user-portals` |
| Settings | Organisation Settings | `/settings` |
| Settings | RTO Settings | `/settings/rto` |
| Settings | Preferences | `/settings/preferences` |

---

### Super-admin-exclusive routes (`/superadmin/*`)

All gated by `SuperAdminGuard`. Non-super-admin roles receive 403/redirect before the page loads.

| Sub-area | Path | Platform permission key |
|---|---|---|
| **Dashboard & Analytics** | `/superadmin/dashboard` | `sa_dashboard` |
| | `/superadmin/analytics` | `sa_dashboard` |
| **Tenant Management** | `/superadmin/tenants` | `sa_tenants_hub` |
| | `/superadmin/tenants/:tenantId/subscription` | `sa_tenants_hub` |
| | `/superadmin/tenants/dormant` | `sa_tenants_hub` |
| **Users & Identity** | `/superadmin/users` | `sa_users_roles` |
| | `/superadmin/email-domains` | `sa_users_roles` |
| | `/superadmin/orphan-recovery` | `sa_users_roles` |
| | `/superadmin/my-memberships` | _(unrestricted within SA area)_ |
| | `/superadmin/system/access-audit` | `sa_manage_internal_users` |
| **Billing & Revenue** | `/superadmin/billing` | `sa_billing` |
| | `/superadmin/billing/sales` | `sa_sales` |
| | `/superadmin/billing/risk-monitor` | `sa_risk_monitor` |
| | `/superadmin/billing/test-console` | `sa_dev_tools` |
| | `/superadmin/billing/webhook-events` | `sa_dev_tools` |
| | `/superadmin/billing/enforcement-log` | `sa_dev_tools` |
| **Operations** | `/superadmin/ops/control-centre` | `sa_control_centre` |
| | `/superadmin/ops/support` | `sa_support_workflow` |
| | `/superadmin/ops/emails` | `sa_dev_tools` |
| **System Monitoring** | `/superadmin/system/logs` | `sa_system_logs` |
| | `/superadmin/system/error-monitor` | `sa_system_logs` |
| | `/superadmin/system/jobs` | `sa_failed_jobs` |
| | `/superadmin/system/tenant-health` | `sa_tenant_health` |
| | `/superadmin/system/security-events` | `sa_security_events` |
| | `/superadmin/system/audit` | `sa_audit_trail` |
| | `/superadmin/system/tenant-context` | `sa_dev_tools` |
| | `/superadmin/system/ops-suggestions` | `sa_platform_insights` |
| **Feature & Content** | `/superadmin/system/flags` | `sa_feature_flags` |
| | `/superadmin/feature-visibility` | _(RequireSuperAdmin)_ |
| | `/superadmin/system/settings` | `sa_system_settings` |
| | `/superadmin/content/templates` | `sa_dev_tools` |
| | `/superadmin/content/email-templates` | `sa_dev_tools` |
| | `/superadmin/content/help-centre` | `sa_help_centre` |
| | `/superadmin/release-notes` | `sa_release_notes` |
| | `/superadmin/notifications` | `sa_notifications` |
| **Intelligence & Regulatory** | `/superadmin/suggestions` | `sa_suggestions` |
| | `/superadmin/regulatory-intelligence` | `sa_dev_tools` |
| | `/superadmin/regulatory/sources` | `sa_dev_tools` |
| | `/superadmin/regulatory/updates` | `sa_dev_tools` |
| **Dev & Lab Tools** | `/superadmin/preview` | `sa_preview_as` |
| | `/superadmin/codes` | `sa_dev_tools` |
| | `/superadmin/ncver-upload` | `sa_dev_tools` |
| | `/superadmin/regression-monitor` | `sa_dev_tools` |
| | `/superadmin/work-packages` | `sa_dev_tools` |
| | `/superadmin/delivery-console` | `sa_dev_tools` |
| | `/superadmin/compliance-graph` | `sa_dev_tools` |
| | `/superadmin/optimisation` | `sa_dev_tools` |
| | `/superadmin/tas-portfolio` | `sa_dev_tools` |
| | `/superadmin/tas-lab` | `sa_dev_tools` |
| | `/superadmin/tas-health` | `sa_dev_tools` |
| | `/superadmin/knowledge-base` | `sa_dev_tools` |
| | `/superadmin/dev-interface` | `sa_dev_tools` |
| | `/superadmin/qa-testing` | `sa_qa_tracker` (+ QAAccessGuard) |

---

### Additional explicitly-listed routePermissions paths

Routes listed in `routePermissions` that include `super_admin` in the allowed-roles array (not
already listed above):

`/settings/rto`, `/dashboard/settings/subscription`, `/settings/roles`, `/settings/impersonate`,
`/dashboard/ceo-governance`, `/dashboard/registers/adc`, `/dashboard/audit-engine`,
`/dashboard/tas/builder`, `/dashboard/trainer`, `/trainer-portal`,
`/dashboard/student-support`, `/dashboard/sso`, `/student-support`, `/sso/monthly-reports`,
`/dashboard/student`, `/student`, `/dashboard/auditor`, `/surveys`,
`/admin/matrix-approvals`.

---

## Read-only vs read-write

| Category | Access level | Source |
|---|---|---|
| All shared nav routes | **Read-write** | No `readOnly` flag in `ADMIN_NAV`; `canEditRegister()` returns `true` for `super_admin` |
| All `/superadmin/*` routes | **Read-write** | `canAccessRoute()` returns `true` unconditionally; write-protected route list (`writeProtectedRoutes`) is only checked for other roles |
| All `routePermissions` entries | **Read-write** | Same short-circuit; super_admin is exempt from all write-protection guards |
| `writeProtectedRoutes` (`/settings`, `/admin/user-portals`, `/superadmin`) | **Readable AND writable** | Write-protection check is skipped entirely for `super_admin` (`isRegulatorRole` path; super_admin never hits it) |

**In summary: super_admin has unrestricted read-write access to every route in the application.**
There are no read-only restrictions imposed by the navigation or RBAC layer.

---

## Edge function categories triggered

> **Source:** `docs/superadmin-dashboard-validation.md` (dashboard RPCs) + edge function
> directory listing. `docs/QA_PROTOCOL.md` does not exist; these categories are the best
> available equivalent derived from source.

### Category 1 — Ops Dashboard RPCs (9 functions)

Triggered on load of `/superadmin/dashboard` (and `/superadmin/dashboard?qa=1` for QA mode).
All enforce `sec.is_super_admin()` and return `FORBIDDEN` to any non-super-admin caller.

| RPC / function name | Purpose |
|---|---|
| `sa_ops_platform_health` | Error rates, TAS jobs, email delivery, lockouts |
| `sa_ops_tenant_activity` | Active tenants, recent audit log activity |
| `sa_ops_tas_health` | TAS builder jobs and per-tenant state |
| `sa_ops_data_integrity` | Orphaned memberships, profile mismatches, RTO scope gaps |
| `sa_ops_security_signals` | Login anomalies, lockouts, security events |
| `sa_ops_suggestions_intelligence` | Unresolved suggestion backlog |
| `sa_ops_audit_feed` | Recent cross-tenant audit trail |
| `sa_ops_automation_status` | Automation rule health, job run recency |
| `ops_rpc_get_superadmin_dashboard` | Master RPC — aggregates all 8 above |

**Function count: 9**

---

### Category 2 — User & Identity Management (8 functions)

Triggered from `/superadmin/users`, impersonation flow, and invite workflows.

| Edge function | Trigger point |
|---|---|
| `sa-delete-invitee-data` | Revoking / deleting a pending invite |
| `delete-user-complete` | Full user deletion from user actions menu |
| `confirm-user-deletion` | Pre-deletion confirmation step |
| `cleanup-impersonation-metadata` | After ending an impersonation session |
| `impersonate-user` | Starting impersonation from `/admin/impersonate` |
| `rename-user-email` | Changing a user's email address |
| `check-user-exists` | Pre-invite duplicate check |
| `bulk-tenant-actions` | Bulk operations on users across tenants |

**Function count: 8**

---

### Category 3 — Tenant Lifecycle (5 functions)

Triggered from `/superadmin/tenants`, tenant drawer, trial management.

| Edge function | Trigger point |
|---|---|
| `sa-delete-tenant-complete` | Full tenant deletion from tenant hub |
| `tenant-lifecycle` | Status transitions (trial → active → suspended) |
| `admin-get-active-tenant` | Resolving active tenant context for impersonation |
| `admin-set-active-tenant` | Switching active tenant context |
| `create-demo-invitation` | Creating a demo tenant invite from SA panel |

**Function count: 5**

---

### Category 4 — Billing & Subscription (9 functions)

Triggered from `/superadmin/billing`, `/superadmin/billing/test-console`,
`/superadmin/billing/risk-monitor`, and tenant billing drawer.

| Edge function | Trigger point |
|---|---|
| `superadmin-billing` | SA billing console — plan overrides, discounts |
| `billing-gate` | Billing status check gate (tenant access enforcement) |
| `enforce-billing-compliance` | Triggered on billing-status-change events |
| `cancel-subscription` | Cancelling a tenant subscription |
| `change-plan` | Upgrading / downgrading a tenant plan |
| `refresh-from-stripe` | Syncing Stripe state back to tenant record |
| `stripe-sync-customer` | Stripe customer sync |
| `weekly-billing-health-report` | Cron — weekly billing health digest |
| `revenue-audit-daily` | Cron — daily revenue anomaly detection |

**Function count: 9**

---

### Category 5 — Notifications & Email (5 functions)

Triggered from `/superadmin/notifications`, email monitoring, and digest tools.

| Edge function | Trigger point |
|---|---|
| `send-superadmin-monthly-digest` | Monthly SA digest email |
| `send-admin-digest` | Admin-facing digest (can be triggered SA-side) |
| `check-mailgun-status` | Mailgun health check from email monitoring page |
| `send-mailgun` / `send-mailgun-email` | Direct email send from SA tools |

**Function count: 5**

---

### Category 6 — System / Dev Tools (variable, triggered on demand)

Triggered from dev tools, system pages, and QA testing tracker.

Notable functions: `ops-run-diagnostics`, `fix-storage-policies`, `audit-reprocess`,
`bulk-audit-reprocess`, `admin-audit-repair`, `regression-diagnosis`, `pre-release-check`.

**Approximate function count: 7+ (expands as dev tooling grows)**

---

## Data requirements per category

### Category 1 — Ops Dashboard RPCs

| Table | Minimum data required |
|---|---|
| `tenants` | At least 1 row with `status = 'active'` |
| `audit_logs` | At least 1 row within the RPC's time window (usually last 24–48 hours); columns: `id`, `actor_id`, `action`, `created_at`, `tenant_id` |
| `profiles` | At least 1 row for each `audit_logs.actor_id` referenced |
| `q1_tas_builder` | At least 1 row with a `tenant_id` FK to `tenants` |
| `tenant_members` (or `organization_members`) | At least 1 active membership row |
| `tenant_rto_scope` | At least 1 row per tenant (for data integrity check) |
| `account_lockouts` | Table must exist; may be empty |
| `security_event_log` / `ops.security_events` | Table must exist; may be empty |
| `ops.rpc_errors`, `ops.edge_errors`, `ops.job_runs` | Tables must exist; may be empty |
| `email_delivery_logs` | Table must exist; may be empty |
| `aligned_automation_rules` | Table must exist; may be empty |
| `suggestions` | Table must exist; at least 1 row preferred for non-zero signal |

**Key gotcha:** If `tenants` is empty, `sa_ops_tenant_activity` returns zeros — valid, but the
dashboard will show no useful signal. Seed at least 1 active tenant for a meaningful QA run.

---

### Category 2 — User & Identity Management

| Table | Minimum data required |
|---|---|
| `profiles` | Row for the target user: `id` (= auth.users.id), `email`, `role`, `user_status = 'ACTIVE'` |
| `organization_members` | Row linking `user_id` → `organization_id` (for tenant-scoped users being managed) |
| `user_invitations` | Row with `organization_id`, `email`, `role`, `status = 'pending'` (for invite/revoke flows) |
| `audit_logs` | Writable — actions are logged here |

---

### Category 3 — Tenant Lifecycle

| Table | Minimum data required |
|---|---|
| `tenants` | Row with `tenant_id`, `name`, `slug`, `status`, `subscription_status`, `account_type` |
| `organization_members` | At least 1 membership row for the tenant being managed |
| `profiles` | Profile row for the tenant owner (`owner_id` FK) |

---

### Category 4 — Billing & Subscription

| Table | Minimum data required |
|---|---|
| `tenants` | `stripe_customer_id` or `billing_customer_id`, `subscription_status`, `plan` / `current_plan` |
| `profiles` | Owner profile with `email` (for billing notifications) |
| Stripe | Sandbox Stripe customer + subscription must exist if running live Stripe flows |

---

### Category 5 — Notifications & Email

| Table | Minimum data required |
|---|---|
| `tenants` | Active row with `contact_email` or `main_contact_email` |
| `email_delivery_logs` | Must be writable; records outbound email events |
| Mailgun | Sandbox domain configured in environment variables (`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`) |

---

### Category 6 — System / Dev Tools

| Table | Minimum data required |
|---|---|
| `audit_logs` | Readable; used for audit trail and reprocessing |
| `ops.*` tables | Must exist and be readable |
| Storage buckets | `documents` bucket must exist for `fix-storage-policies` to run |

---

## Seed user template

Super_admin users are **platform-level** — they have no tenant assignment. They bypass all
tenant-scoped RLS via `sec.is_super_admin()`.

### auth.users entry (Supabase Auth)

```
email:      superadmin-seed@complyhub.ai
password:   [set via Supabase dashboard or invite flow]
```

**app_metadata (JWT claims — set via Supabase service role or `sa_invite_super_admin` function):**
```json
{
  "role": "super_admin",
  "tenant_id": null
}
```

---

### profiles row

```sql
INSERT INTO public.profiles (
  id,                   -- must match auth.users.id (UUID)
  email,                -- 'superadmin-seed@complyhub.ai'
  role,                 -- 'super_admin'
  global_role,          -- 'super_admin'
  full_name,            -- 'SA Seed User'
  first_name,           -- 'SA'
  last_name,            -- 'Seed'
  tenant_id,            -- NULL  (no tenant)
  active_tenant_id,     -- NULL
  is_internal_staff,    -- true
  user_status,          -- 'ACTIVE'
  email_verified,       -- true
  must_change_password, -- false
  must_reset_password,  -- false
  is_locked,            -- false
  mfa_enabled,          -- false (set true for production-like seed)
  job_title,            -- 'Platform Administrator'
  timezone              -- 'Australia/Sydney'
)
```

---

### organization_members row

**None required.** Super_admin does not belong to any tenant. The RLS helper
`sec.is_super_admin()` grants cross-tenant access at the DB layer. Adding an
`organization_members` row would cause the profile–membership consistency check in
`sa_ops_data_integrity` to flag the user as anomalous (non-super-admin profile with org
membership but no matching tenant).

---

### Email format convention

Internal ComplyHub super_admin accounts follow `[firstname]@complyhub.ai` (e.g.
`khian@complyhub.ai`). For seed/test accounts use a subdomain-style prefix:
`superadmin-test@complyhub.ai` or `sa-seed-[env]@complyhub.ai`.

---

### Minimum supporting data for a functional SA session

For the super_admin to see meaningful data on `/superadmin/dashboard` without all-zero panels:

1. At least 1 `tenants` row (`status = 'active'`, `subscription_status = 'active'` or `'trial'`)
2. At least 1 `profiles` row for a non-SA user belonging to that tenant
3. At least 1 `organization_members` row linking that user to the tenant
4. At least 1 `audit_logs` row created within the last 48 hours
5. At least 1 `q1_tas_builder` row for the tenant (so TAS Health shows data)
6. At least 1 `suggestions` row (so Suggestions Intelligence is non-zero)

Without items 1–4, the dashboard loads but all panels show zeros, which is valid but unhelpful
for QA validation purposes.
