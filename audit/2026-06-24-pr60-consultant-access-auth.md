# Audit — PR #60: Fix consultant access sync privilege escalation

**Date:** 24 June 2026
**PR:** #60
**Branch:** cursor/critical-bug-investigation-955c → main
**Merged by:** KhianBrian at 05:47 UTC
**Merge commit:** f4ecf647e

---

## What was fixed

The `sync-consultant-tenant-access` edge function was callable by any authenticated user with a valid JWT. Because the function uses the service role key, this allowed any user to add or remove Consultant tenant memberships across tenants — a cross-tenant privilege escalation.

## Root cause

The function validated only that the JWT was valid, then proceeded directly to service-role operations without checking whether the caller was a platform super admin.

## Fix

- Added `isPlatformAdminProfile()` helper (`auth.ts`) checking both `profiles.role === 'super_admin'` AND `profiles.global_role === 'platform_owner'`
- Admin check enforced immediately after JWT validation, before request body is read or any service-role query runs
- Added Deno unit tests for the auth helper (`auth.test.ts`)
- Converted all logging to shared structured edge logger (`_shared/log.ts`)

## Files changed

- `supabase/functions/sync-consultant-tenant-access/auth.ts` — NEW (auth helper)
- `supabase/functions/sync-consultant-tenant-access/auth.test.ts` — NEW (unit tests)
- `supabase/functions/sync-consultant-tenant-access/index.ts` — MODIFIED (admin check added, logging updated)

## Superseded PR

PR #53 (cursor/critical-bug-investigation-48a8) covered the same vulnerability but only checked `profiles.role` and did not cover `global_role`. Closed in favour of this PR.

## Callers

- `src/pages/superadmin/DevInterface.tsx` (lines 87, 138)
- `src/components/SuperAdmin/AffiliateEditPanel.tsx` (lines 1550, 1580, 1615)

All callers use `supabase.functions.invoke()` which passes the user JWT automatically. Non-platform-admin callers now receive a clean 403.

## No migrations required. No Lovable deploy action needed (edge function only).
