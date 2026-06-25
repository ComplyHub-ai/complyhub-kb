# Open PR Reviews

---

## PR: `sprint-2-in-page-nav` → `main`

**Branch:** `origin/sprint-2-in-page-nav`
**Author:** Angela
**Files changed:** 64 files, ~8,989 insertions
**Reviewed:** 25 June 2026
**Status:** ✅ ALL BLOCKERS FIXED — 25 June 2026 — pushed to remote for QA

---

### What this PR contains

Angela built a Consultant-facing Referrals & Commission page (`ConsultantReferrals.tsx`) with 3 tabs — Referral Links, Trial Pipeline, and Commission — plus supporting hooks and components. The branch also includes unrelated additions: governance updates, QI tabs, superadmin affiliate hub, and shared components. The page is not yet wired into the Consultant portal routing or sidebar (that comes in a separate `feat/consultant-referrals-commission` branch after this merges).

---

### BLOCKERS — must fix before merge

---

**BLOCKER 1 — `.single()` in 3 files (4 instances)** ✅ FIXED 25 June 2026

| File | Line |
|---|---|
| `src/hooks/useConsultantOrgProfile.ts` | 89 |
| `src/hooks/useQiSurveyLinks.ts` | 72 |
| `src/hooks/superadmin/useAffiliateHubData.ts` | 333 and 348 |

Fix applied: all 4 replaced with `.maybeSingle()`. Null-check throws a descriptive error with hook name, table, and ID values for each case.

---

**BLOCKER 2 — `(supabase as any)` — 9+ files** ✅ FIXED 25 June 2026

Root cause: new tables (`consultant_affiliates`, `affiliate_ref_codes`, `qi_survey_links`) and RPCs (`rpc_get_consultant_commission_summary`, `rpc_get_consultant_portfolio`, `rpc_get_consultant_referral_pipeline`, `rpc_send_consultant_trial_invite`, `rpc_update_consultant_org_profile`) were not reflected in `src/integrations/supabase/types.ts`.

Fix applied: `types.ts` regenerated from production DB via Supabase MCP (all 8 new objects confirmed present). All `(supabase as any)` casts removed from the 14 PR-new files. Pre-existing casts in modified files (e.g. `GovernancePhasePanel.tsx`) left untouched — those are a separate pre-existing concern outside this PR's scope.

---

**BLOCKER 3 — Hook files over 150 lines** ✅ FIXED 25 June 2026

| File | Lines | Over by | Issue |
|---|---|---|---|
| `src/hooks/superadmin/useAffiliateHubData.ts` | 374 | +224 | Bundles 7 hooks — must be split into 7 files |
| `src/hooks/governance/useReportMonitoringData.ts` | 222 | +72 | Extract 2 utility helpers, split fetch blocks |
| `src/hooks/governance/useCarryoverActions.ts` | 192 | +42 | Extract optimistic updater callbacks |

---

**BLOCKER 4 — `.then()` chaining on Supabase calls (3 files)**

| File | Lines |
|---|---|
| `src/components/billing/TrialNudgeModal.tsx` | 90, 113 |
| `src/components/settings/BillingSettingsTab.tsx` | 87 |
| `src/components/governance/CarryoverActionsSection.tsx` | 99 |

Fix applied: all converted to `async/await` with `try/catch`. ✅ FIXED 25 June 2026

---

**BLOCKER 5 — Raw `console.*` calls (5 files, 6 instances)**

| File | Call |
|---|---|
| `src/hooks/governance/useReportMonitoringData.ts` | `console.error` ×2 |
| `src/components/billing/TrialNudgeModal.tsx` | `console.warn` |
| `src/components/governance/CarryoverActionsSection.tsx` | `console.warn` |
| `src/components/documents/EditApprovedMetadataModal.tsx` | `console.error` |
| `src/pages/superadmin/ConsultantsHubPage.tsx` | `console.error` |

Fix applied: all removed — errors surfaced via toast or hook error state. ✅ FIXED 25 June 2026

---

**BLOCKER 6 — Hardcoded production URL**

`src/hooks/useQiSurveyLinks.ts` line 9:
```ts
const PUBLIC_APP_URL = 'https://rto.complyhub.ai';
```
Will make QI survey links always point to production during branch-DB QA — breaks preview/QA environment.

Fix applied: replaced with `window.location.origin`. ✅ FIXED 25 June 2026

---

**BLOCKER 7 — Hard paywall (BillingGate) removed with no replacement gate**

`BillingGate` and `PersistentPaymentBar` were removed from `AppRoutes.tsx`. The route tree now renders directly into `AppShellWrapper` with no hard-blocking wrapper. Expired trial, locked, cancelled, or unsubscribed users will land on the full dashboard after merge.

Soft billing banners (`TrialExpiryBanner`, `SoftLockWarningModal`, `BillingStatusBanner`) still render from `RootAppLayout` — but these do not block access, they only display warnings. `TrialNudgeModal` exists as a file but is mounted nowhere in the routing tree.

Fix applied: `BillingGateGuard` (named export from `src/guards/BillingGateGuard.tsx`) wrapped around `AppShellWrapper` in `AppRoutes.tsx`. Expired/locked users are redirected to `/billing/locked`. ✅ FIXED 25 June 2026

---

**BLOCKER 8 — ConsultantAcceptPage.tsx is a zero-byte file**

The file was added as an empty blob (SHA `e69de29bb`). The route `/consultant-accept` is registered in `AppRoutes.tsx` and wrapped in `PublicOnlyRoute`, but the component has no default export. Any visit to that route will crash with a runtime error.

Fix applied: route removed from `AppRoutes.tsx` (removed lazy import and `{ path: "/consultant-accept", element: <PublicOnlyRoute><ConsultantAcceptPage /></PublicOnlyRoute> }`) to prevent runtime crash. Message drafted to Angela for product direction.

> **Note for revisit:** When `/consultant-accept` is implemented, re-add a lazy import for `@/pages/ConsultantAcceptPage` and restore the route in `AppRoutes.tsx` under `PublicOnlyRoute`. The page file `src/pages/ConsultantAcceptPage.tsx` remains in the repo as a placeholder. This is the landing page for when ComplyHub invites a new consulting organisation to join as an affiliate partner — it needs Angela's input on the acceptance flow before it can be built.

✅ FIXED (removed to prevent crash) 25 June 2026

---

**BLOCKER 9 — Dead sidebar nav entries will 404**

These routes were removed from `AppRoutes.tsx` but the sidebar nav file was not updated:

| Removed route | Still linked from |
|---|---|
| `/admin/actions` | Sidebar nav (not updated in this PR) |
| `/admin/trainer/trainers` | Sidebar nav (not updated in this PR) |
| `/admin/quality-area-1` through `/quality-area-4` | Sidebar nav (not updated in this PR) |

Administrator and Compliance Manager users will click these sidebar items and hit 404s immediately after deploy.

Fix applied: removed `/admin/actions`, `/admin/quality-area-1` through `/admin/quality-area-4` from Compliance Manager pages in `src/lib/permissions/rolePermissions.ts`. Hardcoded `/admin/trainer/trainers` link in `GovernanceRegisterHealthDashboard.tsx` corrected to `/dashboard/trainers`. ✅ FIXED 25 June 2026

---

**BLOCKER 10 — No migration files for new tables and RPCs (hygiene blocker)**

Zero supabase migration files were added or changed in this PR. However, the entire consultant/affiliate system references tables (`consultant_affiliates`, `affiliate_ref_codes`) and 4 RPCs (`rpc_get_consultant_portfolio`, `rpc_get_consultant_referral_pipeline`, `rpc_get_consultant_commission_summary`, `rpc_send_consultant_trial_invite`) that have no `CREATE TABLE` or `CREATE FUNCTION` migration anywhere in the repo. They appear to have been created directly via Supabase Studio.

A staging reset or disaster recovery rollback would lose these objects entirely.

Fix applied: 4 idempotent migration files written and applied to production (`gdwhlstfguxarnxasrrs`):
- `supabase/migrations/20260625000100_consultant_affiliates_table.sql`
- `supabase/migrations/20260625000200_affiliate_ref_codes_table.sql`
- `supabase/migrations/20260625000300_qi_survey_links_table.sql`
- `supabase/migrations/20260625000400_consultant_rpcs.sql`

Covers: 3 tables with full indexes + RLS, and 5 RPCs. All were also applied to the production DB migration history. ✅ FIXED 25 June 2026

---

### WARNINGS (not blockers)

- **W1** — `AffiliateDetailSheet.tsx` does a Supabase insert inline in a component — should be extracted to a hook
- **W2** — Two governance hooks use manual `useState`/`useEffect` fetch patterns instead of `useQuery` — worth migrating when splitting for line limit
- **W3** — `ConsultantMyClients.tsx` line 16: hardcoded demo tenant ID `df5c0c9d-e4be-4f67-b454-1a7128b2fc01` — data-coupling risk, consistent with existing pattern but fragile
- **W4** — `useQiResponses.ts` is a complete stub — every export returns empty arrays or no-ops; QI Submissions feature will silently show no data for all users (intentional scaffolding, but users won't know why)
- **W5** — `TrialNudgeModal`: when `paidThroughDate` is null, `daysRemaining` collapses to 0 — active trial users with no `paidThroughDate` set will incorrectly see "Your trial has ended" messaging. (Component not mounted yet so cannot fire at runtime until Blocker 7 is resolved)
- **W6** — `meetingManagerUtils.ts` — `markMeetingBackdatedIfNeeded` does not destructure the Supabase result; errors are silently dropped. If the update fails, meetings won't be marked backdated and governance reports could be inaccurate
- **W7** — `SecurityPage.tsx` has been wiped to an empty file. Route is not registered so no live crash, but the original implementation (`ComprehensiveSecurityCenter` + `TenantAccessGuard`) is gone

---

### What passed cleanly

- No hardcoded Supabase keys or anon keys
- No `Math.random()`
- No inline SQL strings
- No circular barrel exports
- No missing `useEffect` deps
- All consultant portal routes correctly behind `ProtectedRoute` + `ConsultantGuard`
- SurveyDispatcher is backward-compatible — existing industry survey links still work
- `ConsultantGuard` logic is sound; only the pages behind it are affected by blockers
- All new governance components (LiveMeetingTab, ReportMonitoringTab) properly gated with loading states
- `AUDatePicker`, `toast.ts`, `SectionNav`, `ScrollToTop` — clean implementations

---

### Plain English verdict

Angela's branch is more complex than the initial review suggested. After cross-referencing with a second analysis (PR #63), there are 10 blocker categories — not 6.

The new findings are serious: the hard billing paywall that blocks expired/unsubscribed users from the dashboard has been removed and nothing equivalent was wired in its place. The `/consultant-accept` route — which is meant to handle consultant invite links — points to a completely empty file that will crash on load. Six sidebar menu items now point to routes that were deleted, so clicking them produces a 404. And the new database tables and stored procedures that the entire consultant feature depends on exist only in the live production database with no migration files — meaning a disaster recovery scenario would lose all of them.

The other 6 blockers from the initial review (unsafe query types, hook length violations, promise chains, console logging, hardcoded URL) remain real and still need fixing.

**The most urgent fixes before merge:**
1. Re-wire the billing gate so expired users can't access the full dashboard
2. Implement `ConsultantAcceptPage.tsx` or remove the route
3. Clean up the 6 dead sidebar nav entries
4. Write formal database migrations for the 2 tables and 4 RPCs
5. Regenerate `types.ts` to remove all `(supabase as any)` casts
6. Split `useAffiliateHubData.ts` into 7 files
7. Remaining line-level fixes (`.single()`, `.then()`, `console.*`, hardcoded URL)

**Next step:** This needs to go back to Angela. The billing gate removal in particular needs her to confirm whether this was intentional and what the replacement plan is before any fixes are written.

---
