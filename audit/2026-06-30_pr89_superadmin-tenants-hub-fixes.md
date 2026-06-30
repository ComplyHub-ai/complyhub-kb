# Audit — PR #89: SuperAdmin Tenants Hub — Select Crashes, Missing Fields, Save No-Op

**Date:** 30 June 2026
**Branch:** `fix/superadmin-select-placeholders-june30`
**PR:** #89
**Merged by:** Brian (Khian)
**Merge commit:** `56b277deb`
**Source register:** `ISSUE-BATCH-2026-06-30.md`
**Migration applied to production:** Yes — `20260630100000_fix_sa_update_tenant.sql`, applied via MCP, recorded in `schema_migrations` as version `20260630030538` with name `fix_sa_update_tenant`. Function definition verified correct in production post-apply.

---

## What was fixed

### Issue 1 — Details tab crashed the entire page (reported by Dave)

- Dave reported: "In superadmin tenants hub if you click on Details you get an error that there is an issue."
- Root cause: the Subscription Plan dropdown rendered a loading placeholder with a blank value (`value=""`). The dropdown component treats blank as a hard error and throws immediately on render. No error boundary on the superadmin route, so the throw reached the top-level catch-all and replaced the entire page with a grey "We hit a loading snag" screen.
- Fix: replaced the blank-value `<SelectItem>` with a plain text `<div>` node. Added a defensive `.filter()` on the options list to prevent any blank value from real data causing the same crash.
- File: `src/components/superadmin/TenantDetailsTab.tsx`

### Issue 2 — Save Changes was a complete no-op

- Found during root-cause trace of Issue 1. No user report — the form showed a green "Tenant updated successfully" toast but nothing was written to the database.
- Root cause: three compounding bugs in the `sa_update_tenant` database function:
  - **Wrong WHERE clause** — used `WHERE id = p_tenant_id` but the primary key column is `tenant_id`. The nullable `id` column almost never matches, so 0 rows were updated.
  - **Wrong field key for name** — the function read `p_updates->>'tenant_name'` but the form sends the key as `name`.
  - **Missing columns in SET clause** — only `tenant_name` and `logo_url` were included. Billing email, website, RTO ID, ABN, status, and plan were all ignored.
- Fix: rewrote `sa_update_tenant`. Corrected the WHERE clause, fixed the field key, added `billing_email`, `website`, `rto_id`, and `abn` to the SET clause.
- Status and plan excluded intentionally — each has a dedicated controlled flow (offboard modal for archiving, `admin_suspend_tenant` for suspension, separate plan controls). Writing to these fields freely bypasses audit trails.
- Also fixed: the frontend mutation only checked the network-level error, not the `success: false` payload the function returns when it catches an internal error. A failing save still showed a green toast. Now throws correctly when `success === false`.
- Files: `supabase/migrations/20260630100000_fix_sa_update_tenant.sql`, `src/hooks/useTenantManagement.ts`

### Issue 3 — Billing Email and Website Address always blank

- Found during root-cause trace of Issue 2.
- Root cause: `useTenant` hook fetched 10 columns from the `tenants` table — `billing_email` and `website` were not in the list. Both were hardcoded as empty strings in the return object.
- Additional finding: the database column is `website`, not `website_url` (the form field name). Fixed by fetching `website` and mapping it to `website_url` in the hook return.
- Fix: added `billing_email` and `website` to the select query; returned real values.
- File: `src/hooks/useTenantManagement.ts`

### Issue 4 — DdAutoSelect shared component: risky placeholder entries and console spam

- Found during codebase audit.
- Root cause: `DdAutoSelect` (used across many screens for data-dictionary dropdowns) rendered `<SelectItem value="__loading">` while fetching and `<SelectItem value="__empty">` when no options returned. Non-empty placeholder values don't cause an immediate crash but are one typo away from Issue 1, and a stale controlled value matching the placeholder string would permanently display "Loading..." as the selected text.
- Three `console.log` statements also present (banned by CLAUDE.md).
- Fix: replaced both placeholder `<SelectItem>` nodes with `<div>` text nodes. Removed all three console.logs. Removed the now-unused `usedTable` destructure.
- File: `src/components/shared/DdAutoSelect.tsx`

### Issue 5 — WHSIncidentForm: three loading placeholder SelectItems

- Found during codebase audit.
- Root cause: same pattern as Issue 4. Three dropdowns (Hazard/Incident Type, Location, Follow-up Action Category) each used `<SelectItem value="loading">` as a loading placeholder. None of the three `<Select>` wrappers were disabled during loading — so the dropdown appeared interactive but showed only an unclickable "Loading..." entry.
- Fix: added `disabled={isLoading}` to all three `<Select>` wrappers (using the appropriate loading variable for each). Replaced all three placeholder `<SelectItem>` nodes with `<div>` text nodes.
- File: `src/components/forms/WHSIncidentForm.tsx`

### Issue 6 — TGAUnitSelector: loading and empty placeholder SelectItems

- Found during codebase audit.
- Root cause: same pattern as Issues 4 and 5. The Select Qualification dropdown in the Trainer Matrix TGA picker used `<SelectItem value="_loading">` and `<SelectItem value="_empty">`. The `<Select>` was not disabled during loading. This is the first step of the Add Qualification & Units workflow — a crash here would block the entire TGA unit assignment flow for trainers.
- Fix: added `disabled={isLoading}` to the `<Select>` wrapper. Replaced both placeholder `<SelectItem>` nodes with `<div>` text nodes.
- File: `src/components/trainer-matrix/TGAUnitSelector.tsx`

### Issue 7 — ConvertToTenantDialog: `value="none"` placeholder

- Found during codebase audit.
- Root cause: the empty-state placeholder in the Convert to Tenant dialog used `<SelectItem value="none">`. Non-empty so no crash, but if the network call to fetch tenants failed, the user was left with a permanent "No tenants available" message and no error feedback. The `isFormValid()` check also passed for `"none"` (length > 0), leaving one guard removal away from a bad API call.
- Fix: replaced `<SelectItem value="none">` with a `<div>` text node. Added `selectedTenantId !== 'none'` to `isFormValid()` as an extra guard.
- File: `src/components/admin/people/ConvertToTenantDialog.tsx`

---

## Additional fix — Cursor/Vercel bot finding (pre-merge)

Cursor's Vercel bot flagged that `updateTenant` mutation reported success even when the DB function returned `{ success: false }`. Verified and confirmed real — addressed in the same PR (see Issue 2 above).

---

## Files changed

| Area | File |
|---|---|
| Details tab crash + plan dropdown | `src/components/superadmin/TenantDetailsTab.tsx` |
| Tenant hook — billing email, website fetch | `src/hooks/useTenantManagement.ts` |
| Shared DD dropdown cleanup | `src/components/shared/DdAutoSelect.tsx` |
| WHS Incident form dropdowns | `src/components/forms/WHSIncidentForm.tsx` |
| TGA unit selector | `src/components/trainer-matrix/TGAUnitSelector.tsx` |
| Convert to Tenant dialog | `src/components/admin/people/ConvertToTenantDialog.tsx` |
| DB function rewrite | `supabase/migrations/20260630100000_fix_sa_update_tenant.sql` |

---

## Decisions recorded

| Decision | Outcome |
|---|---|
| Status field in sa_update_tenant | Excluded — status changes go through offboard modal (audit trail) and `admin_suspend_tenant`. `lifecycle_status` is the canonical source of truth, auto-synced by triggers. |
| Plan field in sa_update_tenant | Excluded — plan lives in `tenant_plans`, not `tenants`. Already has dedicated controls elsewhere in the drawer. Needs separate RPC; deferred. |

---

## Notes / follow-up

- Issue 2 (Save Changes) is now fixed for 5 fields: Company Name, Billing Email, Website, RTO ID, ABN. Plan field save is still not wired — needs a separate decision on which RPC to call for `tenant_plans` updates (deferred, no user report yet).
- Supabase had an active project creation outage on 30 June 2026 (02:38–02:43 UTC) which prevented the branch DB from completing before the PR was merged. Migration was verified by checking the live function definition in production post-apply.
- Pattern rule confirmed: never render `<SelectItem>` as a loading or empty-state placeholder. Use `<div>` text nodes. Set `disabled={isLoading}` on the `<Select>` wrapper. Only render real `<SelectItem>` nodes when actual data is available.
