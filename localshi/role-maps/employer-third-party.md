# Role Map — Employer & Third Party

> **Created:** 5 June 2026  
> **Author:** Brian (Khian) via Claude Code mapping exercise  
> **Purpose:** Feature and data readiness map for the Employer and Third Party roles. Neither role has live users in the DB. This doc establishes the baseline before any portal build begins.  
> **Note:** `docs/QA_PROTOCOL.md` does not exist in the codebase. Edge function categories below are inferred from the edge function inventory and the QA Handbook (`complyhub-kb/reference/qa-handbook.md`).

---

## Routes & Access (per role)

### Employer

**Role key stored in DB:** `'Employer'`  
**Nav config:** `EMPLOYER_NAV` in `src/config/roleNavigation.ts:403`  
**Default home path:** `/employer/dashboard` (set in `PreviewRoleContext.tsx`)

| Label | Path | Read-only? |
|---|---|---|
| Employer Dashboard | `/employer/dashboard` | No flag set |
| Trainee Progress | `/employer/trainees` | No flag set |
| Workplace Assessments | `/employer/assessments` | No flag set |
| Feedback | `/employer/feedback` | No flag set |

**Section:** "Portal" (single section, no sub-sections).

**Route permission gates:** None. The `routePermissions` map in `roleNavigation.ts:517` does **not** include any `/employer/*` path. Access falls through to the `isPathAllowedForRole` nav-config check only. There is no `canAccessRoute` guard specifically blocking or allowing these paths for other roles.

**RBAC:** `getRoleBasedPermissions('Employer')` in `src/lib/rbac.ts` returns an **empty Set** — the role is not handled in any branch of the permission switch. No `view.*` permissions are granted.

**Admin preview path:** `/admin/user-portals/employer` → `EmployerPortalPage.tsx` (registered in `AppRoutes.tsx:1211`).

---

### Third Party

**Role key stored in DB:** `'Third Party'`  
**Nav config:** `THIRD_PARTY_NAV` in `src/config/roleNavigation.ts:421`  
**Default home path:** `/third-party/dashboard` (set in `PreviewRoleContext.tsx`)

| Label | Path | Read-only? |
|---|---|---|
| Partner Dashboard | `/third-party/dashboard` | No flag set |
| Agreements | `/third-party/agreements` | No flag set |
| Reports | `/third-party/reports` | No flag set |

**Section:** "Portal" (single section, no sub-sections).

**Route permission gates:** None. Same situation as Employer — `/third-party/*` paths are absent from `routePermissions`. No dedicated route guard exists.

**RBAC:** `getRoleBasedPermissions('Third Party')` also returns an **empty Set** — not handled in `rbac.ts`.

**Admin preview path:** `/admin/user-portals/third-party` → `ThirdPartyPortalPage.tsx` (registered in `AppRoutes.tsx:1212`).

---

## Live vs Placeholder Assessment

### Employer portal pages

| Route | Component | Status | Evidence |
|---|---|---|---|
| `/employer/dashboard` | `EmployerPortalPage.tsx` (admin-preview version) | **Placeholder** | All four stat cards show hardcoded values (12, 3, 28, 94%). All four feature cards say "coming soon." Zero DB queries. |
| `/employer/trainees` | No component found | **Not implemented** | No file under `src/pages/employer/` or equivalent. No route registered in `AppRoutes.tsx` for this path. |
| `/employer/assessments` | No component found | **Not implemented** | Same — path exists only in nav config. |
| `/employer/feedback` | No component found | **Not implemented** | Same. Survey route `surveys/EmployerNPS` (`AppRoutes.tsx:1064`) exists but is a standalone NPS survey, not a feedback portal page. |

**Summary:** The only rendered component is the admin-preview portal page at `/admin/user-portals/employer`. The four nav paths that an Employer-role user would actually land on (`/employer/*`) have **no registered routes** and **no page components**. A real Employer login would hit a 404/redirect.

---

### Third Party portal pages

| Route | Component | Status | Evidence |
|---|---|---|---|
| `/third-party/dashboard` | `ThirdPartyPortalPage.tsx` (admin-preview version) | **Placeholder** | All four stat cards hardcoded (5, 2, 1, 98%). All four feature cards say "coming soon." Zero DB queries. |
| `/third-party/agreements` | No component found | **Not implemented** | No file. No route in `AppRoutes.tsx`. |
| `/third-party/reports` | No component found | **Not implemented** | Same. |

**DB data that does exist (admin-side, not surfaced to Third Party role):**  
`thp_register` (7 rows) and 8 supporting dropdown tables (`thp_dd_*`) are live and populated. This data is accessed exclusively through admin-side registers (`/dashboard/registers/thp`). No page component bridges this data to the Third Party portal.

---

## Edge Function Categories Triggered

Based on a grep of `supabase/functions/` for references to `employer`, `third.party`, `thp`, and `placement`, and cross-referencing with the QA Handbook's Common Bug Categories:

### Employer role — edge functions triggered
**None directly.** No edge function currently references an employer portal action, employer user context, or `/employer/*` route. The closest existing function is:
- `extract-industry-themes` — references `industry_engagement` data; conceptually adjacent to employer engagement but does not act on behalf of an Employer-role user.
- `register-evidence-manager` — has a `thp` bucket entry (`third_party_files`), but this is for admin-side file uploads, not for Employer-role users.

### Third Party role — edge functions triggered
**None directly.** No edge function operates in a Third Party user context. The `register-evidence-manager` `thp` bucket (`third_party_files`) is the only THP-related edge function entry, and it is called from the admin THP register, not from a Third Party portal.

### What would be triggered if the portals went live
If either portal were built against real DB queries, the following edge function categories would likely be relevant:

| Category | Applicable function(s) | Applies to |
|---|---|---|
| File uploads / document storage | `register-evidence-manager` (thp bucket) | Third Party agreements |
| AI document tagging | `bulk-ai-document-tagging` | Both — placement agreements, THP docs |
| Industry engagement analysis | `extract-industry-themes`, `consultation-prompt-pack` | Employer (industry feedback) |
| Audit trail capture | `auto-capture-ci` | Both — any write action |

---

## Data Requirements (if Live) or Placeholder Note

### Current state: all Employer and Third Party portal data is placeholder (hardcoded)

### Employer — minimum data model if live

| Table | Purpose | Exists? |
|---|---|---|
| `profiles` (with role = 'Employer') | Employer user identity | Exists; role column presence unconfirmed (column DDL not available via list_tables) |
| `tenant_members` | Link employer user to tenant | Exists (193 rows) |
| `user_roles` | Role assignment | Exists (60 rows; no Employer entries confirmed) |
| `placements` or `trainee_placements` | Trainee placement records | **Not found.** Naming convention suggests it should exist; `placement_supervisor_feedback` and `placement_wellbeing_records` tables exist (0 rows) but no parent placement entity table was found. |
| `placement_supervisor_feedback` | Employer feedback on trainees | Exists, 0 rows |
| `placement_wellbeing_records` | Wellbeing monitoring during placement | Exists, 0 rows |
| `employer_organisations` | Employer org profile | **Not found.** No table matching this pattern in DB. |

**Gap:** There is no placement parent table to hang `placement_supervisor_feedback` from. Before the Employer portal can go live, a `placements` (or equivalent) table with `tenant_id`, `employer_id`, `student_id`, `course_id`, `start_date`, `end_date`, `status` is the minimum missing entity.

### Third Party — minimum data model if live

| Table | Purpose | Exists? |
|---|---|---|
| `profiles` (with role = 'Third Party') | Third Party user identity | Exists (column confirmation needed) |
| `tenant_members` | Link third-party user to tenant | Exists |
| `user_roles` | Role assignment | Exists |
| `thp_register` | Third party agreement records | **Exists, 7 rows** — this is the core data |
| `thp_dd_*` (8 tables) | Agreement status, type, monitoring, service type, etc. | **All exist and populated** |
| `third_party_files` (storage bucket) | Agreement documents | Referenced in `register-evidence-manager`; bucket existence not confirmed |

**Key finding for Third Party:** The data model is substantially more mature than Employer. `thp_register` and all its dropdowns are live. The missing piece is the **linkage between a Third Party-role user account and a specific `thp_register` row** — there is no `thp_register.user_id` or equivalent foreign key in the type definition (`src/types/thirdparty.ts`). A Third Party user logging in currently has no way to know which THP record is "theirs."

**Minimum addition needed:** A `thp_register.portal_user_id` (or a join table `thp_register_access`) linking a `user_id` to a `thp_register.id`.

---

## Seed User Templates

These are the minimum records needed to create a testable Employer or Third Party login, even with placeholder UI.

### Employer seed user

```sql
-- Step 1: Create auth user (done via Supabase Auth invite — do not INSERT directly into auth.users)
-- Invite email: employer-test@example.com

-- Step 2: Assign role after user accepts invite
-- In user_roles table:
INSERT INTO user_roles (user_id, tenant_id, role)
VALUES ('<new_user_id>', '<target_tenant_id>', 'Employer');

-- Step 3: Confirm tenant_members entry exists (auto-created on invite in most flows)
-- Verify: SELECT * FROM tenant_members WHERE user_id = '<new_user_id>';

-- Step 4: Confirm profile exists
-- Verify: SELECT * FROM profiles WHERE id = '<new_user_id>';
```

**What this user sees on login:** The nav renders the 4-item Employer portal menu (`/employer/*`). All 4 routes currently have no registered page component — they will 404 or redirect. The admin-preview page at `/admin/user-portals/employer` is accessible only to admins and cannot be reached by this user.

**RBAC gap to fix before seeding is useful:** Add `'Employer'` to `getRoleBasedPermissions()` in `rbac.ts` with at minimum `view.dashboard` so the role resolves to something.

---

### Third Party seed user

```sql
-- Step 1: Invite email: thirdparty-test@example.com

-- Step 2: Assign role
INSERT INTO user_roles (user_id, tenant_id, role)
VALUES ('<new_user_id>', '<target_tenant_id>', 'Third Party');

-- Step 3: Link user to a thp_register row (pending schema addition)
-- Currently no column to do this — requires schema change first.
-- Once added:
UPDATE thp_register
SET portal_user_id = '<new_user_id>'
WHERE id = '<target_thp_row_id>';

-- Step 4: Verify tenant_members and profiles as above
```

**What this user sees on login:** The nav renders the 3-item Third Party portal menu (`/third-party/*`). Same situation as Employer — the 3 routes have no registered page components. The admin-preview page at `/admin/user-portals/third-party` is admin-only.

**Advantage over Employer:** Once the `portal_user_id` linkage and route components exist, the Third Party role has real data (`thp_register`, 7 rows) to display immediately. Employer would need `placements` data created as well.

---

## Summary of Gaps (priority order)

| # | Gap | Affects | Effort estimate |
|---|---|---|---|
| 1 | No `/employer/*` or `/third-party/*` route components exist | Both | High — 4+3 page components to build |
| 2 | `rbac.ts` returns empty permissions for both roles | Both | Low — add 2 branches to `getRoleBasedPermissions` |
| 3 | No `routePermissions` entries guard or declare these paths | Both | Low — add entries once components exist |
| 4 | No linkage from Third Party user → `thp_register` row | Third Party | Medium — schema change + RLS policy |
| 5 | No `placements` parent table for Employer trainee data | Employer | High — new table + migrations + RLS |
| 6 | Employer portal stat cards all hardcoded | Employer | Low (cosmetic until routes exist) |
| 7 | `docs/QA_PROTOCOL.md` referenced in session brief does not exist | Both (QA) | Low — draft from QA Handbook |
