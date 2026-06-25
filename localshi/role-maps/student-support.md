# Role Map — Student & Student Support Officer

**Generated:** 5 June 2026  
**Sources:** `src/config/roleNavigation.ts`, `src/lib/rbac.ts`, Supabase live schema (project `gdwhlstfguxarnxasrrs`)  
**Note:** `docs/QA_PROTOCOL.md` does not exist in the repository. Edge function categories in §3–4 are inferred from function names, table schemas, and register conventions. Update this document once QA_PROTOCOL.md is authored.

---

## 1. Routes & Access (per role)

### 1.1 Student Support Officer (`'Student Support Officer'`)

Defined in `SSO_NAV` (`roleNavigation.ts:263`).

| Section | Label | Path | readOnly? |
|---|---|---|---|
| Workspace | SSO Dashboard | `/student-support` | No |
| Workspace | Work Queue | `/dashboard/sso/work-queue` | No |
| Workspace | Students | `/dashboard/sso/students` | No |
| Workspace | At-Risk Monitor | `/dashboard/sso/at-risk` | No |
| Workspace | Interventions | `/dashboard/sso/interventions` | No |
| Registers | Student Support | `/dashboard/registers/ssr` | No |
| Registers | At-Risk | `/student-support/reports/at-risk` | No |
| Registers | Adjustments | `/student-support/reports/reasonable-adjustment` | No |
| Registers | Wellbeing & Safety | `/student-support/reports/wellbeing` | No |
| Registers | Complaints & Appeals | `/dashboard/registers/caa` | No |
| Registers | Diversity & Inclusion | `/student-support/reports/edi` | No |
| Registers | Surveys | `/surveys` | No |
| Reports | Monthly Pack | `/dashboard/sso/monthly-pack` | No |
| Reports | Submitted Packs | `/dashboard/sso/packs-history` | No |
| Reports | Document Repository | `/document-repository` | **Yes** |

**Route permission gaps identified:**  
- `/surveys` is listed in SSO nav but `routePermissions` at line 578 only allows `Administrator`, `Compliance Manager`, `Regulatory Officer`, `super_admin`. An SSO user navigating to `/surveys` will be denied by `canAccessRoute`.  
- `/document-repository` is listed (read-only) but `routePermissions` at line 558 does not include `Student Support Officer`. Same issue.

---

### 1.2 Student (`'Student'`)

Defined in `STUDENT_NAV` (`roleNavigation.ts:376`). No live users yet — role is provisioned but unoccupied.

| Section | Label | Path | readOnly? |
|---|---|---|---|
| My Learning | Student Dashboard | `/dashboard/student` | No |
| My Learning | My Courses | `/student/courses` | No |
| My Learning | Progress | `/student/progress` | No |
| Support | Get Support | `/student/support` | No |
| Support | Submit Feedback | `/student/feedback` | No |
| Support | Complaints & Appeals | `/student/complaints` | No |

`routePermissions` grants Student access to `/dashboard/student` and `/student` prefix; all student portal paths resolve via prefix match in `canAccessRoute`.

---

## 2. Read-Only vs Read-Write

### Student Support Officer

| Path / Area | Access |
|---|---|
| `/document-repository` | **Read-only** (explicit `readOnly: true` on nav item) |
| All other SSO nav paths | Implied read-write within the SSO domain |
| `useRegisterAccess().canEditRegister()` | Returns **false** for SSO — this helper only returns true for Admin/Compliance Manager (`rbac.ts:77–90`). SSO write access to its own registers depends on table-level RLS, not this helper. |
| `getRoleBasedPermissions('Student Support Officer')` | Returns **empty set** — SSO has no case in `rbac.ts:127`. Permission checks that call this function will deny SSO silently. |

**Implication:** SSO write access is entirely RLS-gated at the database level. The React permission helpers (`useRegisterAccess`, `getRoleBasedPermissions`) do not model SSO — they fall through to empty/false. Any component that gates its write UI via these helpers will incorrectly show SSO as read-only. This should be treated as a known gap when building SSO-facing forms.

### Student

| Path / Area | Access |
|---|---|
| `/dashboard/student`, `/student/courses`, `/student/progress` | Read — own data only |
| `/student/support` | Write — submit support requests (creates `ssr_register` rows) |
| `/student/feedback` | Write — submit feedback (creates `student_feedback` rows) |
| `/student/complaints` | Write — submit complaints (creates `caa_register` rows) |
| `getRoleBasedPermissions('Student')` | `submit.actions`, `view.documents` only |

---

## 3. Edge Function Categories Triggered

QA_PROTOCOL.md was not found. The categories below are inferred from edge function names, cron patterns, and the register schemas they operate on.

### Student Support Officer triggers

| Category | Function(s) | When triggered |
|---|---|---|
| Wellbeing reminders | `wellbeing-support-reminders` | `wellbeing_support_plans.next_review_date` approaching; `reminder_sent = false` |
| Placement follow-up | `placement-followup-reminders` | `placement_wellbeing_records.next_check_in_date` approaching |
| Monthly pack | `monthly-report-reminders` | SSO monthly pack cycle; notifies SSO to complete `sso_monthly_packs` |
| Escalation notification | `notify-compliance-manager` | `ssr_register.risk_flag = true` or `intervention_plans.escalation_required = true` |
| Feedback summary | `generate-feedback-summary` | Admin/compliance-triggered; reads `student_feedback` for the tenant |

### Student triggers

| Category | Function(s) | When triggered |
|---|---|---|
| (None directly) | — | Students submit data via form POSTs; no named edge functions are student-role-gated in the current function list |

---

## 4. Data Requirements per Category

### 4.1 Wellbeing — `wellbeing-support-reminders`

**Table:** `wellbeing_support_plans`  
**Minimum rows:** 1 row per plan being monitored

| Column | Minimum value |
|---|---|
| `tenant_id` | matches SSO user's tenant |
| `student_name` | non-null string |
| `status` | `'active'` |
| `severity` | `'low'` \| `'medium'` \| `'high'` \| `'critical'` |
| `next_review_date` | future date |
| `reminder_sent` | `false` |
| `assigned_sso_id` | SSO user's auth.users.id |
| `review_cycle` | `'weekly'` \| `'fortnightly'` \| `'monthly'` |

Optional but meaningful: `risk_scan_id` → `wellbeing_risk_scans.id`

---

### 4.2 Placement Wellbeing — `placement-followup-reminders`

**Table:** `placement_wellbeing_records`  
**Minimum rows:** 1 per student on placement

| Column | Minimum value |
|---|---|
| `tenant_id` | matches SSO tenant |
| `student_name` | non-null |
| `placement_site` | name of workplace/site |
| `check_in_date` | date of last check-in |
| `next_check_in_date` | future date |
| `status` | `'active'` |
| `risk_band` | `'low'` \| `'medium'` \| `'high'` \| `'critical'` |
| `risk_score` | integer ≥ 0 |

If escalation is needed: `escalation_flag = true`, `support_request_id` → a valid `ssr_register.id`

---

### 4.3 Student Support Cases — SSO Work Queue

**Table:** `ssr_register`  
**Minimum rows:** 1 per support case

| Column | Minimum value |
|---|---|
| `tenant_id` | matches SSO tenant |
| `student_name` | non-null |
| `date_of_support` | date |
| `support_type` | descriptive text |
| `status` | `'Pending'` (default) |
| `record_type` | one of: `Wellbeing` \| `Accessibility` \| `Academic` \| `Behavioural` \| `Enrolment` \| `Other` (USER-DEFINED enum) |
| `risk_flag` | `false` (default); set `true` to surface in at-risk monitor |
| `title` | display name for the case |

Downstream tables that need an `ssr_register` parent (via `support_request_id`):
- `adjustment_plans` (Reasonable Adjustments register)
- `intervention_plans` (At-Risk Interventions)
- `placement_wellbeing_records`

---

### 4.4 At-Risk Interventions

**Table:** `intervention_plans`  
**Minimum rows:** 1 per at-risk student

| Column | Minimum value |
|---|---|
| `tenant_id` | matches SSO tenant |
| `student_name` | non-null |
| `risk_trigger_type` | e.g. `'wellbeing_concern'` \| `'assessment_failure'` \| `'attendance_drop'` |
| `risk_category` | `'academic'` \| `'engagement'` \| `'wellbeing'` \| `'behaviour'` \| `'placement'` \| `'llnd'` |
| `severity_level` | `'low'` \| `'medium'` \| `'high'` |
| `status` | `'open'` |
| `summary` | plain text |
| `actions` | plain text |

Optional FK links (nullable): `support_request_id` → `ssr_register.id`, `llnd_assessment_id`, `suitability_result_id`, `placement_wellbeing_record_id`

---

### 4.5 SSO Work Queue Alerts — `sso_alert_thresholds`

**Table:** `sso_alert_thresholds`  
**Note:** PK is `tenant_id` — one row per tenant, not per record. This row MUST exist for the alert system to function; the edge function `monthly-report-reminders` and delta logic in `sso_monthly_packs` depend on it.

| Column | Minimum / Default |
|---|---|
| `tenant_id` | matches SSO tenant (PK) |
| `complaint_spike_delta` | 1 (default) |
| `at_risk_spike_pct` | 15.0 (default) |
| `support_drop_pct` | 25.0 (default) |
| `response_sla_days` | 3 (default) |

All other columns can stay at defaults. A missing row means no alerting thresholds are configured.

---

### 4.6 Monthly Packs — `sso_monthly_packs`

**Table:** `sso_monthly_packs`  
**Minimum rows:** 1 per reporting period

| Column | Minimum value |
|---|---|
| `tenant_id` | matches SSO tenant |
| `period_month` | first day of reporting month (e.g. `2026-06-01`) |
| `period_year` | smallint, e.g. `2026` |
| `status` | `'draft'` (SSO edits), `'submitted'` (locked after submission) |
| `generated_by` | auth.uid() of SSO user |
| `snapshot` | jsonb — typically populated by the generation edge function; can seed as `{}` |
| `commentary` | jsonb — SSO narrative input; can seed as `{}` |

The `delta_summary` and `delta_highlights` columns are computed from `previous_period`; leave as null for the first period.

---

### 4.7 Complaints & Appeals — `caa_register`

**Table:** `caa_register`  
**Minimum rows:** 1 per complaint/appeal

| Column | Minimum value |
|---|---|
| `tenant_id` | matches SSO tenant |
| `complaint_date` | date |
| `complainant_name` | non-null |
| `complaint_summary` | non-null |
| `complaint_status` | e.g. `'Open'` |
| `complaint_type` | lookup value from `caa_dd_complaint_type` |
| `title` | display label |
| `created_by` | defaults to `auth.uid()` |

---

### 4.8 Reasonable Adjustments — `adjustment_plans`

**Table:** `adjustment_plans`  
**Minimum rows:** 1 per student requiring adjustment

| Column | Minimum value |
|---|---|
| `tenant_id` | matches SSO tenant |
| `student_name` | non-null |
| `title` | non-null |
| `status` | `'draft'` (default) |
| `support_request_id` | FK → `ssr_register.id` (record_type = `'Accessibility'`) |
| `disability_disclosed` | `false` (default) |
| `adjustment_details` | text describing the adjustment |

---

### 4.9 Diversity & Inclusion — `diversity_inclusion_records`

**Table:** `diversity_inclusion_records`  
**Minimum rows:** 1 per cohort/period

| Column | Minimum value |
|---|---|
| `tenant_id` | matches SSO tenant |
| `inclusive_practice_status` | `'not_started'` \| `'in_progress'` \| `'completed'` |
| `cohort_name` | descriptive string |
| `qualification_code` | e.g. `'BSB50420'` |
| `observation_period_start` | date |
| `observation_period_end` | date |

---

### 4.10 Student Feedback — `student_feedback`

**Table:** `student_feedback`  
**Minimum rows:** 0 required to log in; 1+ for `generate-feedback-summary` to return data

| Column | Minimum value |
|---|---|
| `tenant_id` | matches tenant |
| `respondent_category` | `'Current Student'` \| `'Former Student'` \| `'Guest Learner'` |
| `course_unit` | string |
| `q_objectives` … `q_confidence` | integers 1–5 |
| `created_by` | auth.uid() of submitting user |

---

## 5. Seed User Templates

### 5.1 Student Support Officer — Seed Template

```sql
-- 1. Auth user (created via Supabase Auth or invite flow)
-- email: sso-seed@rto.example.com
-- password: set via invite

-- 2. profiles row (auto-created by trigger; update role fields)
UPDATE profiles SET
  role = 'Student Support Officer',
  full_name = 'Sam Support',
  first_name = 'Sam',
  last_name = 'Support',
  job_title = 'Student Support Officer',
  tenant_id = '<org_tenant_id>',
  active_tenant_id = '<org_tenant_id>',
  user_status = 'ACTIVE'
WHERE email = 'sso-seed@rto.example.com';

-- 3. user_roles row
INSERT INTO user_roles (role, tenant_id, user_id)
VALUES (
  'Student Support Officer',
  '<org_tenant_id>',
  '<auth_user_id>'
);

-- 4. sso_alert_thresholds (one per tenant — insert if missing)
INSERT INTO sso_alert_thresholds (tenant_id)
VALUES ('<org_tenant_id>')
ON CONFLICT (tenant_id) DO NOTHING;

-- 5. Seed SSO work queue — one open support case
INSERT INTO ssr_register (
  tenant_id, student_name, date_of_support, support_type,
  status, record_type, risk_flag, title, created_by
) VALUES (
  '<org_tenant_id>',
  'Alex Student',
  CURRENT_DATE,
  'Wellbeing check-in',
  'Pending',
  'Wellbeing',
  true,
  'Wellbeing: Alex Student — June 2026',
  '<sso_auth_user_id>'
);

-- 6. Seed draft monthly pack for current period
INSERT INTO sso_monthly_packs (
  tenant_id, period_month, period_year, status,
  generated_by, snapshot, commentary
) VALUES (
  '<org_tenant_id>',
  '2026-06-01',
  2026,
  'draft',
  '<sso_auth_user_id>',
  '{}',
  '{}'
);

-- 7. Seed one intervention plan
INSERT INTO intervention_plans (
  tenant_id, student_name, risk_trigger_type, risk_category,
  severity_level, status, summary, actions, created_by
) VALUES (
  '<org_tenant_id>',
  'Alex Student',
  'wellbeing_concern',
  'wellbeing',
  'medium',
  'open',
  'Student reported persistent anxiety affecting attendance.',
  'Weekly check-in scheduled. Referral to external counselling offered.',
  '<sso_auth_user_id>'
);
```

**Minimum state for a non-empty SSO dashboard:**
- 1× `sso_alert_thresholds` row for the tenant
- 1× `ssr_register` row (status=Pending, risk_flag=true)
- 1× `sso_monthly_packs` row (status=draft)
- 1× `intervention_plans` row (status=open)

---

### 5.2 Student — Seed Template

> **Note:** The Student role has no live users in the current system. The nav and routes are provisioned but unoccupied. The template below represents the minimum viable Student account for future testing.

```sql
-- 1. Auth user (invite or direct creation)
-- email: student-seed@rto.example.com

-- 2. profiles row (auto-created; update role)
UPDATE profiles SET
  role = 'Student',
  full_name = 'Alex Student',
  first_name = 'Alex',
  last_name = 'Student',
  job_title = NULL,
  tenant_id = '<org_tenant_id>',
  active_tenant_id = '<org_tenant_id>',
  user_status = 'ACTIVE'
WHERE email = 'student-seed@rto.example.com';

-- 3. user_roles row
INSERT INTO user_roles (role, tenant_id, user_id)
VALUES (
  'Student',
  '<org_tenant_id>',
  '<auth_user_id>'
);
```

**No register seed data is required** for the Student role to log in and see the dashboard. The student portal (`/student/courses`, `/student/progress`) will render empty states. For end-to-end testing of the Support and Complaints flows, the following additional rows are needed:

- `ssr_register` row created via `/student/support` form (student submits, SSO sees it in work queue)
- `student_feedback` row created via `/student/feedback` form
- `caa_register` row created via `/student/complaints` form

The Student role does not need any pre-existing data rows to work end-to-end — its write flows create the data.

---

## 6. Known Gaps & Action Items

| # | Gap | Location | Recommended fix |
|---|---|---|---|
| 1 | `QA_PROTOCOL.md` does not exist | `rto-compass-hub/docs/` | Author the file; update §3–4 of this document |
| 2 | SSO missing from `getRoleBasedPermissions` | `src/lib/rbac.ts:127` | Add SSO case with at minimum `view.registers`, `edit.registers`, `submit.actions`, `view.documents` |
| 3 | `/surveys` route not permissioned for SSO | `roleNavigation.ts:578` | Add `'Student Support Officer'` to `routePermissions['/surveys']` |
| 4 | `/document-repository` route not permissioned for SSO | `roleNavigation.ts:558` | Add `'Student Support Officer'` to `routePermissions['/document-repository']` |
| 5 | Student role has no live users | DB / provisioning | Stand up seed user per template in §5.2 before Student portal testing |
| 6 | `useRegisterAccess().canEditRegister()` returns false for SSO | `src/lib/rbac.ts:77` | SSO write access works via RLS but any UI gated on this helper shows SSO as read-only — audit SSO-facing form components for this check |
