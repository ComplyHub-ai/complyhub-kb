# ComplyHub — Round 5 Fix List
**Branch:** `fix/local-run`
**Branch DB:** `agcdvmrwzzgnlmfyrxtb`
**Created:** 2026-06-10
**Source:** Round 4 QA results (`seed-qa-findings.md`)
**Status:** ✅ All items fixed on branch — awaiting NEW-003 confirmation from RJ and production DB migration for NEW-004

---

## How to use this list

Work top to bottom. Mark each item ✅ when the fix is applied and deployed to Vercel. After all items are marked, run Round 5 retest using the Claude Chrome prompt (`seed-qa-claude-chrome-prompt.md`) targeting only the items in this list.

---

## RJ — 5 items

---

### RJ-1 — NEW-002 (P1)
**What:** Super Admin post-login lands on `/dashboard/admin` instead of `/superadmin/dashboard`

**Root cause:** `RoleLandingRedirect` checked `mode === 'superadmin'` for the post-login redirect, but `AppContext` returns `mode = 'tenant'` when the SA has an `active_tenant_id` set. So the SA fell through to the tenant branch and was sent to `/dashboard/admin`. The `AdminRoute` guard had a secondary redirect but was also unreliable because it read `profile?.role` (potentially null at evaluation time) instead of the async `fetchEffectiveRole()` result.

**Fix applied:**
- `src/routes/RoleLandingRedirect.tsx` — added `isSuperAdmin` check from AppContext before any mode check; SAs always land on `/superadmin/dashboard` regardless of active tenant
- `src/routes/guards/AdminRoute.tsx` — stored `globalRole` from `fetchEffectiveRole()` in state instead of reading `profile?.role` synchronously (defence-in-depth)

**Verified:** ✅ Fresh login as `superadmin@complyhub.ai` lands on `/superadmin/dashboard`

**Status:** ✅ Fixed — commits `3c04589ea`, `1b91bd316`

---

### RJ-2 — NEW-005 (P1)
**What:** Compliance Manager can see and interact with `/settings/rto` despite `AdminRoute` logging a denial

**Root cause:** The `/settings/rto` route was only wrapped in `<ProtectedRoute>` (login check only), not `<AdminRoute>`. The AdminRoute denial log was firing from a different route. Additionally, `rolePermissions.ts` explicitly listed `/settings/rto` as a CM-allowed page, and `UserAvatarMenuNew.tsx` showed the "RTO Settings" link to CM.

**Fix applied:**
- `src/AppRoutes.tsx` — wrapped `settings/rto` and `settings/rto/:tab` in `<AdminRoute>` instead of `<ProtectedRoute>`
- `src/lib/permissions/rolePermissions.ts` — removed `/settings/rto` from CM allowed pages
- `src/components/header/UserAvatarMenuNew.tsx` — removed CM from "RTO Settings" link condition

**Verified:** ✅ CM navigating to `/settings/rto` is redirected to `/access-denied`. Link no longer appears in header.

**Status:** ✅ Fixed — commit `1b91bd316`

---

### RJ-3 — F-013 (P1)
**What:** Trainer portal has no nav link for "Assigned Training Products" and no route for `/dashboard/trainer-portal/select-products`

**Root cause:** The trainer portal uses `EnhancedRoleSidebar` which reads from `src/config/roleMenuConfigs.ts` — not `RoleBasedSidebar.tsx`. The item was absent from the trainer `'My Training'` section in `roleMenuConfigs.ts`. The route and page component already existed.

**Fix applied:**
- `src/config/roleMenuConfigs.ts` — added "Assigned Training Products" to trainer "My Training" section

**Verified:** ✅ Item appears in trainer left nav and loads correctly.

**Status:** ✅ Fixed — commit `48e283a84`

---

### RJ-4 — F-014 (P1)
**What:** Trainer portal has no nav link for "Availability" and no route for `/dashboard/registers/trainer-availability`

**Root cause:** Same as F-013 — item absent from `roleMenuConfigs.ts` trainer section. Route and page component already existed.

**Fix applied:**
- `src/config/roleMenuConfigs.ts` — added "Availability" to trainer "My Training" section

**Verified:** ✅ Item appears in trainer left nav and loads correctly.

**Status:** ✅ Fixed — commit `48e283a84`

---

### RJ-5 — F-018 (P1)
**What:** Trainer portal has no nav link for "FRE Register" and no route for `/dashboard/trainer-portal/resources-equipment`

**Root cause:** Same as F-013, F-014 — item absent from `roleMenuConfigs.ts` trainer section. Route and page component already existed.

**Fix applied:**
- `src/config/roleMenuConfigs.ts` — added "FRE Register" to trainer "My Training" section

**Verified:** ✅ Item appears in trainer left nav and loads correctly.

**Status:** ✅ Fixed — commit `48e283a84`

---

## Dave — 1 item

---

### Dave-1 — NEW-004 (P2)
**What:** Console warning on governance meeting manager page: `Failed to fetch sso_reports_register: Could not find the table 'public.sso_reports_register' in the schema cache`

**Root cause (confirmed):** The table `sso_reports_register` was renamed to `_zz_deprecated_sso_reports_register` mid-development with 0 rows ever written. Two places hit this table:
1. `src/hooks/use-sso-register.ts` — direct `supabase.from('sso_reports_register')` query
2. `src/constants/governanceAgendaSections.ts` — `register: 'sso_reports_register'` key consumed by `useGovernanceAgenda` which iterates all sections and fetches from each register

The `sso_register_upsert` and `sso_register_link_governance` RPCs also write directly to `sso_reports_register` — meaning both read and write were broken end-to-end.

**Fix applied (branch):**
- Created `public.sso_reports_register` table on branch DB (`agcdvmrwzzgnlmfyrxtb`) with RLS enabled and `tenant_id` index
- `src/hooks/use-sso-register.ts` — restored `enabled: !!tenantId`
- `src/constants/governanceAgendaSections.ts` — restored `register: 'sso_reports_register'`

**⚠️ Production action required:** The same migration must be applied to the production DB (`gdwhlstfguxarnxasrrs`) before this branch merges. See RJ message below for context.

**Verified (branch):** ✅ No `sso_reports_register` console warning on `/dashboard/governance/meeting-manager`

**Status:** ✅ Fixed on branch — commit `acbdc62bf` | ⚠️ Production DB migration pending

---

## Carl — 2 items

---

### Carl-1 — SEED-001 (P2)
**What:** `dd_org_internal_roles` table was empty — "Responsible Role" dropdown in CT register form showed no options

**Fix applied:**
- `supabase/seed.sql` — 6 rows inserted into `dd_org_internal_roles` in Section 23
- Rows executed directly against branch DB (`agcdvmrwzzgnlmfyrxtb`)

**Verified:** ✅ "Responsible Role" dropdown shows 6 options in CT register form.

**Status:** ✅ Fixed — commit `bd22281cc`

---

### Carl-2 — SEED-002 (P2)
**What:** `gov_dd_status` table was empty — "Status" dropdown in CT register form showed no options

**Fix applied:**
- `supabase/seed.sql` — 6 rows inserted into `gov_dd_status` in Section 23
- Rows executed directly against branch DB (`agcdvmrwzzgnlmfyrxtb`)

**Verified:** ✅ "Status" dropdown shows 6 options in CT register form.

**Status:** ✅ Fixed — commit `bd22281cc`

---

## RJ — confirm or defer (1 item)

---

### RJ-6 — NEW-003 (P2)
**What:** `/superadmin/billing/revenue` → 404. The SA billing revenue page either doesn't exist or is at a different path.

**Action needed from RJ:** Confirm whether a revenue page exists and if so, what the correct route is. `/superadmin/billing/sales` works correctly.

**Options:**
- If a revenue route exists at a different path: update the checklist with the correct URL and add the nav link
- If the revenue page has not been built yet: close as deferred (same as F-020/F-022)

**Status:** ☐ Awaiting RJ confirmation

---

## Round 5 retest scope

Once all items above are marked done, retest only these routes/checks:

| Item | Role | What to check |
|---|---|---|
| NEW-002 | Super Admin | Post-login landing — must be `/superadmin/dashboard` |
| NEW-005 | CM | `/settings/rto` — must redirect or deny, not render |
| F-013 | Trainer | Click "Assigned Training Products" nav link — must load |
| F-014 | Trainer | Click "Availability" nav link — must load |
| F-018 | Trainer | Click "FRE Register" nav link — must load |
| NEW-004 | Governing Person | `/dashboard/governance/meeting-manager` — no `sso_reports_register` console warning |
| SEED-001 | Administrator | CT form "Responsible Role" dropdown — must show 6 options |
| SEED-002 | Administrator | CT form "Status" dropdown — must show 6 options |
| NEW-003 | Super Admin | Confirm correct SA billing revenue route with RJ |

No full role sweep needed for Round 5 — targeted checks only.
