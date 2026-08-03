# Audit — Pending Invitations / Pending Requests 400 Fix

**Date:** 3 August 2026
**Branch:** `fix/pending-invitations-invite-type-filter` (deleted post-merge, local + remote)
**PR:** [#346](https://github.com/ComplyHub-ai/rto-compass-hub/pull/346) — merged to `main`
**Source:** RJ's daily ticket batch, Item 17 — "Pending Invitations tab 400"

## What was fixed

Both the **Pending invitations** tab and the **Pending requests** modal in Affiliate management
(`/superadmin/consultant-hub`) filtered `user_invitations` on `invite_type = 'consulting_org'`.
`consulting_org` was never a valid value of the `invite_type` enum (`demo`, `standard`, `super_admin`,
`trial` — confirmed via the generated Supabase types) — PostgREST rejected the query outright, so both
views 400'd and always rendered empty regardless of underlying data.

Consultant invitations are already distinguishable by `role = 'Consultant'` (same role vocabulary used
elsewhere in this module — `useAffiliateHubTypes.ts`, `useAddConsultantToOrg.ts`), so both queries now
filter on `role` instead. Dropped the `as any` cast on the original hook — `role` is a plain `string`
column in the generated types, so no cast was needed once the enum mismatch was gone.

Root cause and fix were identical in both files; found the second occurrence (`useAffiliateRequests.ts`,
feeding "Pending requests") while diagnosing the one RJ named, and fixed both in the same PR as two
separate commits so either is easy to isolate/revert independently.

## Blast radius

- `src/hooks/superadmin/useAffiliateInvites.ts` — consumed only by `AffiliatePendingInvitesTab.tsx`
- `src/hooks/superadmin/useAffiliateRequests.ts` — consumed by `SuperAdminConsultantHub.tsx` (header
  count badge) and `PendingRequestsModal.tsx`
- No other consumers of either hook found. No shared components, routes, or role guards touched.

## DB/RLS impact

None. No schema change, no migration, no RLS involved — pure query-filter correction against columns
already selected/returned by both queries.

## Files changed

- `src/hooks/superadmin/useAffiliateInvites.ts`
- `src/hooks/superadmin/useAffiliateRequests.ts`

## Commits

- `eea7acdd9` — fix Pending Invitations tab query
- `64b8d6fbe` — same fix applied to Pending requests query

## Not yet tested

No browser/DevTools access in this session — verified via source trace (enum values, RPC/query
consumers, role vocabulary) and via the pre-commit `eslint --fix --max-warnings=0` hook passing clean on
both files, not via a live click-through. Note: this repo's `npm run type-check` (`tsc --noEmit`) is a
known no-op — checks zero files due to a solution-style root `tsconfig.json` — so it was not used as
verification here; see `active-work-sync/memory/feedback_vacuous_typecheck_command.md`.

RJ to confirm live: `/superadmin/consultant-hub` → **Pending invitations** tab loads without a 400 and
lists consultant invitations; **Pending requests** header button opens the modal without a 400; expected
invites/requests actually appear (i.e. their underlying `role` value is exactly `'Consultant'`).
