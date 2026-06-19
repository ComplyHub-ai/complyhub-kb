> **Archived:** 19 June 2026 · **Event date:** 19 June 2026 · **Type:** Bug Fix — CAA cross-tenant data leak (super admin) + PD test data cleanup

# CAA Super Admin Data Leak Fix + PD Register Test Data Cleanup

**Date:** 19 June 2026  
**Developer:** Brian (with Claude Code)  
**Reported by:** Angela Connell-Richards (super_admin)  
**Branch:** `main` on `ComplyHub-ai/rto-compass-hub` (via Lovable)  
**Purpose:** Fix Complaints & Appeals register leaking cross-tenant data to super admin accounts; delete test PD records left in Vivacity Testing Tenant

---

## Context

Angela reported two issues while navigating as super admin:

1. While in the Triquetra tenant, she opened Complaints & Appeals and saw records belonging to Australian College — a separate tenant. She suspected a data breach.
2. While in Support Mode viewing the Vivacity Testing Tenant, she opened the PD Register and saw test entries ("kol", "Hef", "Testing444", "Testing4646", "Testererrrr") attributed to Brian Sismundo. She suspected the PD register was querying by user rather than by tenant.

---

## Investigation

### Bug A — Complaints & Appeals cross-tenant visibility

**Root cause — two compounding gaps:**

1. **RLS gap:** `caa_register` SELECT policy was `sec.is_super_admin() OR sec.is_tenant_member(tenant_id)` (PERMISSIVE only). No RESTRICTIVE gate existed. As a super admin, `sec.is_super_admin()` returned `true` for every row across every tenant — no tenant scoping applied.

2. **Frontend gap:** `fetchEntries` in `src/pages/registers/caa/index.tsx` queried `caa_register` with no `.eq('tenant_id', ...)` filter, relying entirely on RLS. Combined with the RLS gap above, Angela's session returned all tenant data.

**Confirmed via DB:** `pg_policies` query showed `appeals` table had the same PERMISSIVE-only pattern. Both tables were missing the RESTRICTIVE gate that `pdr_register` already carries (`restrict_sa_select_pdr_register` → `sec.superadmin_tenant_gate(tenant_id)`).

**Lovable's investigation also found** that `profile?.tenant_id` was used in three places in the CAA page (line 54 `useRegisterEditIdAutoOpen`, line 179 `handleFormSubmit`, line 226 insert payload). In Support Mode, `profile.tenant_id` points to the super admin's home tenant, not the client being supported — meaning inserts and the edit-auto-open hook would misfire for Angela in Support Mode.

### Bug B — PD Register test data

Angela was in Support Mode viewing **Vivacity Testing Tenant** when she saw the test records. All 5 records had `tenant_id = bc515b64-d24f-4e9d-811b-1f5c0f62a3f7` (Vivacity Testing Tenant) — correctly scoped to one tenant. This was not a data isolation failure.

`pdr_register` already had both the correct RESTRICTIVE RLS gate (`restrict_sa_select_pdr_register`) and a frontend `.eq('tenant_id', tid)` pin (added in a prior fix). Angela's query was correctly scoped to the Vivacity Testing Tenant — she was simply viewing a tenant that contained test data from development activity.

**Angela's "by user not by tenant" diagnosis was incorrect.** The data was correctly scoped by tenant.

---

## Fixes

### Bug A — CAA page (Lovable — `src/pages/registers/caa/index.tsx`)

No DB migration required — Lovable's own investigation confirmed the RESTRICTIVE policies on both `caa_register` and `appeals` were already deployed to production before the fix was shipped. The fix was frontend-only.

Changes to `src/pages/registers/caa/index.tsx`:

| Change | Detail |
|---|---|
| `AppContext` type added | Mirrors PDR page pattern |
| `ctx` + `ctxLoading` state | Drives tenant resolution |
| `get_my_app_context()` RPC on mount | Replaces `profile.tenant_id` as source of truth; correct in Support Mode |
| `activeTenantId` derived from ctx | `ctx?.active_tenant_id ?? null` |
| `fetchEntries` tenant pin | `.eq('tenant_id', tid)` added — defence-in-depth alongside RLS gate |
| Mount effect keyed on `[ctxLoading, activeTenantId]` | Guards fetch; sets empty array if no active tenant |
| `profile?.tenant_id` replaced (3 locations) | Lines 91, 226, `handleFormSubmit` — all now use `activeTenantId` |
| SA-in-SA-mode empty state | Renders `SelectTenantEmpty` when `!ctxLoading && !activeTenantId` |

`AppealsSection.tsx` was untouched — it already had a frontend tenant filter.  
No INSERT/UPDATE/DELETE policies changed. `billing_gate`, `write_lock_*`, `trainer_caa_select_own` all untouched.

### Bug B — PD test data (direct DB deletion)

Brian deleted 5 test records directly via Supabase SQL Editor on production (`gdwhlstfguxarnxasrrs`):

```sql
DELETE FROM pdr_register
WHERE id IN (
  '5f181268-c63c-413f-baa2-ace52f94a903',  -- kol
  'b5387900-986f-4299-8f83-d3ca404e38b4',  -- Hef
  '5ca84630-9eff-47a0-b6a3-909645ecf622',  -- Testererrrr
  '0f3c9cad-38c0-48c5-9476-8f98d9d850b6',  -- Testing4646
  '984d5d5e-f51f-4f89-8103-3185bb953063'   -- Testing444
);
```

Deletion verified — zero rows returned on post-delete `SELECT`. All records belonged to Vivacity Testing Tenant (`bc515b64-d24f-4e9d-811b-1f5c0f62a3f7`). No client tenant data was affected.

---

## Files Changed

| File | Change | Via |
|---|---|---|
| `src/pages/registers/caa/index.tsx` | Tenant context via RPC; tenant pin on fetch; `activeTenantId` throughout; SA empty state | Lovable |
| `pdr_register` (DB rows) | 5 test records deleted from Vivacity Testing Tenant | Direct SQL — Brian |

---

## Verification

- Pulled `main` post-Lovable commit (`924e2f117`) and confirmed all 8 plan checkpoints present in the file
- No `profile?.tenant_id` remaining in `caa/index.tsx`
- `.eq('tenant_id', tid)` confirmed at line 108
- SA-in-SA-mode empty state confirmed at line 585
- 5 deleted PD records confirmed absent via post-delete SELECT

---

## Notes

- The C&A issue was **not a data breach** — Angela's super admin role is intentionally granted cross-tenant visibility at the DB layer. The gap was that the RESTRICTIVE gate (which limits that visibility to the active tenant context) was missing on `caa_register` and `appeals`. `pdr_register` already had the correct pattern; this fix brings C&A into alignment.
- Angela's Support Mode session was working correctly throughout — the Triquetra C&A data she saw was because the frontend had no tenant pin, not because support mode was broken.
- Note for Carl: `caa_register` and `appeals` RLS gates were already deployed before Lovable shipped the frontend fix — no migration was needed, and Lovable correctly identified this in their own investigation.
