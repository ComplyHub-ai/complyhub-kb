> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** high — role hierarchy is stable; verify guard file paths against current codebase before citing.

# User Roles & Personas

Understanding who's logged in is fundamental — to QA, to access control, and to any feature that shows data.

---

## Role Hierarchy

```
┌─────────────────────────────────────┐
│ super_admin (ComplyHub internal)    │  ← Platform-level, sees all tenants
├─────────────────────────────────────┤
│ Tenant roles (per-tenant)           │  ← Scoped to one tenant
│  ├── admin                          │
│  ├── manager                        │
│  ├── compliance_officer             │
│  ├── trainer                        │
│  ├── assessor                       │
│  ├── student                        │
│  └── auditor (external auditor)     │
├─────────────────────────────────────┤
│ Consultant (cross-tenant)           │  ← Multiple tenants, often external
└─────────────────────────────────────┘
```

> Exact role names are defined in the `user_roles` table and route guards under `src/routes/guards/`. Verify before relying on this list.

---

## Personas

### Super Admin (ComplyHub staff)
- **Who:** Internal ComplyHub employees (support, ops, engineers)
- **Routes:** `/superadmin/*`
- **Guards:** `SuperAdminGuard`, `RequireSuperAdmin`
- **Can:** Manage all tenants, impersonate users via support mode, see platform analytics
- **Key concern:** Must never accidentally see super admin UI as a regular user. Must have an audit trail when impersonating. Must never be billed.

### Consultant
- **Who:** External compliance consultants serving multiple RTOs
- **Routes:** `/consultant/*`
- **Guards:** `useConsultantClients` hook determines access
- **Can:** Switch between assigned tenants, see tenant data for tenants they serve
- **Key concern:** Must see ONLY their assigned tenants. Workspace switcher is critical here.

### Admin (tenant-level)
- **Who:** Compliance officer, training manager, or CEO at the RTO
- **Routes:** `/dashboard/admin/*`
- **Guards:** `AdminRoute`
- **Can:** Full access within their tenant — users, billing, all registers, settings
- **Key concern:** Cannot see other tenants. Cannot access super admin features. Can invite users.

### Manager
- **Who:** Mid-level management within an RTO
- **Guards:** `ManagerRoute`
- **Can:** Most admin capabilities, typically minus billing/user management
- **Key concern:** Boundary between manager and admin permissions.

### Trainer / Assessor
- **Who:** People who deliver training and assess students
- **Routes:** `/dashboard/trainer-portal/*` and `/dashboard/trainer/*`
- **Guards:** `TrainerRoute`
- **Can:** Their own PD records, credentials, monthly reports, supervision records
- **Key concern:** Cannot see other trainers' data (unless supervisor). Cannot see admin-only registers.

### Auditor (external)
- **Who:** External auditor brought in to audit the RTO's self-assurance
- **Guards:** `AuditorRoute`
- **Can:** Read-only access to specific evidence/registers
- **Key concern:** Must be read-only. Must have limited scope.

### Student
- **Who:** Learners enrolled at the RTO
- **Guards:** `StudentRoute`
- **Can:** Limited — likely their own records and support tools
- **Key concern:** Lowest permissions. Most likely to be tested for lockdown/isolation.

---

## Support Mode — A Special Case

- ComplyHub super admins can impersonate a tenant to help customers
- When in support mode, they see the tenant's view **read-only**
- Audit logged (see `CHANGELOG-support-mode-isolation.md` in codebase)
- **Key concern:** Must never allow writes while in support mode. Must always be logged. Must have a visible banner indicating support mode is active.

---

## Multi-Role Users

A single user account can have roles in multiple tenants:
- `brian@complyhub.ai` might be a super_admin AND an admin at a test tenant
- A consultant might be `admin` at 3 different RTOs

This is a known complexity in the login flow — see `reference/known-issues.md` BUG-001.

---

## How Roles Are Resolved (technical)

1. User logs in → Supabase returns a session JWT
2. JWT contains `active_tenant_id` claim (which tenant they're currently "in")
3. Frontend calls `get_app_context` RPC → returns: `{mode, active_tenant_id, tenant_name, tenant_role, tenant_roles[], platform_role, is_superadmin}`
4. `AppContext` (`src/contexts/AppContext.tsx`) stores this
5. Route guards (`AdminRoute`, `TrainerRoute`, etc.) read from `AppContext` to decide render or redirect

**Key files:**
- `src/contexts/AppContext.tsx`
- `src/contexts/AuthContext.tsx`
- `src/routes/guards/*`
