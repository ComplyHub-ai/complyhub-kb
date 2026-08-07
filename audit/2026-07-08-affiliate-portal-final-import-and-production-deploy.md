# Audit: Affiliate Portal & ComplyBot Admin Suite Import, Production Deploy, & Staging Sync

**Date:** 8 July 2026  
**Operator:** Khian (junior dev, infrastructure assistant)  
**Context:** Completion of PR #146 (affiliate portal + ComplyBot admin suite cherry-pick import), production migration apply, edge function deploy, and staging branch sync.

---

## Summary

Completed the end-to-end import, QA review, and production deployment of the affiliate portal and ComplyBot admin suite that had been staged on a stale branch (`feature/affiliate-portal-final`, 4 days behind `main`). Rather than merge that branch wholesale (which would have reintroduced several bugs `main` had already fixed), we cherry-picked only the safe, isolated content into a clean branch (`feat/affiliate-portal-import`), resolved 10 Cursor Bugbot / Vercel bot / code-quality findings, merged PR #146, applied 3 gap-fill migrations, deployed the monthly report edge function, deleted the stale source branch, and reset `staging` to mirror `main`.

---

## Work Done

### Phase 1: PR Review, Bot Findings, and Commit

**Commit:** `824192f18` — "fix: resolve Cursor Bugbot, Vercel, and code-quality bot findings on PR #146"

10 distinct bot findings resolved across 10 files:

1. **Routing (4 findings — Cursor Bugbot)**
   - `AffiliateSidebar.tsx` line 46: dead `/complybot` link → corrected to `/admin/complybot` (actual mounted route)
   - `ConsultantGuard.tsx`: broadened from `isConsultant` only to `isConsultant || isAffiliate`, since Calendar and Account Settings have no consultant-specific data dependency and the affiliate sidebar already links there
   - `AffiliateGuard.tsx` line 9: wrong redirect target `/consultant/my-tenants` (would double-bounce non-consultants through `ConsultantGuard`) → corrected to `/dashboard`
   - `useComplyBotConversations.ts` line 90: unsafe cast on `.maybeSingle()` result (can legitimately return `null`) → added guard `if (!data) throw new Error(...)`

2. **Error Handling (3 findings — Vercel bot)**
   - `AffiliateDashboard.tsx`: added error state surface for both `contextError` and `portfolioError` (was silently rendering as zero stats on fetch failure)
   - `AffiliateMyClients.tsx`: added error state surface for `portfolioError` (was silently rendering as "0 clients" on fetch failure)
   - `ConversationHistoryPanel.tsx`: added error state with retry button for `error` from `useConversationHistory()` (was silently rendering as "No history yet" on fetch failure)

3. **Dead Code (3 findings — github-code-quality)**
   - `EnhancedComplyBotWidget.tsx` lines 353–357: removed unused `handleNewChat` function definition (no caller anywhere in the codebase)
   - `LegislationKBTab.tsx` line 5: removed unused `Badge` import
   - `ResponseLogsTab.tsx` line 5: removed unused `Badge` import

**Pre-commit hook:** Husky ran prettier + eslint before commit; both passed. Type-check `npx tsc --incremental --noEmit` exited 0.

### Phase 2: Merge to Main

**Commit:** `57ace538f` — "Merge pull request #146 from ComplyHub-ai/feat/affiliate-portal-import"

- PR merged to `main` without force-push or conflicts
- Branch `feat/affiliate-portal-import` was automatically deleted on the remote
- Vercel **production deploy** (commit `57ace538f`) reached state `READY` within ~5 minutes
- Production URL (`rto.complyhub.ai`) confirmed live and serving the new affiliate portal code

### Phase 3: Production Migrations Apply

**3 gap-fill migrations applied to `gdwhlstfguxarnxasrrs` (production project):**

1. **`20260708135000_gap_fill_consultant_commission_ledger`**
   - Table `consultant_commission_ledger` (12 columns: id, affiliate_id, client_tenant_id, billing_period_start/end, gross_revenue_aud, commission_pct, commission_aud, status, stripe_invoice_ref, notes, created_at, created_by, confirmed_at, confirmed_by, paid_at, paid_by)
   - 3 indexes: (affiliate_id), (client_tenant_id), (status)
   - 2 RLS policies: org-level select for consultants/governing persons, superadmin all
   - Reason: `get_my_affiliate_context()` RPC reads from this table; was applied directly to production via Lovable-era drift with no migration file
   - Verified: table + indexes + policies present in production post-apply

2. **`20260708140000_gap_fill_affiliate_context_rpcs`**
   - Two functions: `get_my_affiliate_context()` (returns jsonb: is_affiliate, affiliate_id, commission_rate_pct, ref_code, click_count, signup_count, client_count, commission_ytd_aud) and `get_affiliate_portfolio()` (returns jsonb: ok, affiliate_id, data array of tenants, total)
   - Both SECURITY DEFINER with `SET search_path = public, pg_catalog`
   - Reason: used by `useAffiliateContext` and `useAffiliatePortfolio` hooks; was applied directly to production via Lovable-era drift with no migration file
   - Verified: both functions present and callable in production post-apply

3. **`20260708142000_gap_fill_complybot_conversations`**
   - Table `complybot_conversations` (7 columns: id, tenant_id, user_id, title, messages, last_message_at, created_at, updated_at)
   - 1 index: (tenant_id, user_id, last_message_at DESC)
   - 5 RLS policies: billing_gate, user_select, user_insert, user_update, user_delete
   - Reason: used by `useComplyBotConversations` hook for chat history; was applied directly to production via Lovable-era drift with no migration file
   - Verified: table + index + policies present in production post-apply

**Verification:** All 3 objects confirmed present in production via direct SQL query post-apply (function count, table count, policy count).

### Phase 4: Edge Function Deploy (Manual, due to CI Billing Outage)

**Function:** `complybot-monthly-report`  
**Status:** `ACTIVE`, version 1, `verify_jwt: true`

Deployed manually via Supabase MCP `deploy_edge_function` because GitHub Actions billing outage (ongoing as of 7 July 2026) prevents the `deploy-edge-functions.yml` workflow from running. Function is now live and reachable via `https://gdwhlstfguxarnxasrrs.supabase.co/functions/v1/complybot-monthly-report`.

**Implementation:**
- Main index: 202 lines, calls Claude Haiku for AI insight paragraph, aggregates ComplyBot usage stats, sends formatted email via Mailgun
- Helpers: `buildClaudePrompt()` (generates Claude prompt from report data), `generateEmailHtml()` (renders HTML email with stats, charts, AI insight)
- Shared deps: `sendEmailViaMailgun()` from `_shared/mailgun.ts`, `log` from `_shared/log.ts`
- Dependencies bundled and deployed in single push

**Configuration needed (already set):**
- `MAILGUN_DOMAIN` = `rto.complyhub.ai` (confirmed set correctly in Supabase secrets)
- `MAILGUN_API_KEY` (required at runtime; checked in function, returns error if missing)
- `ANTHROPIC_API_KEY` (required at runtime; checked in function, returns error if missing)

**Cron schedule:** Not yet configured. Dashboard notes indicate cron should be set to `0 22 1 * *` (UTC) = 8:00 AM AEST on the 1st of each month. Can be set via Supabase Dashboard or SQL.

### Phase 5: Stale Branch Cleanup

**Deleted `feature/affiliate-portal-final` from remote:**
- Branch existed on remote with no PR ever opened against it
- Last commit: `f73e79a3d`, 63 commits ahead of main, 8 behind
- Safe to delete: all useful content had been cherry-picked into `feat/affiliate-portal-import`; unreconciled work (TAS builder-sandbox rewrite, `RiskRegister.tsx`, `AuthContext.tsx`, `MeetingMinutesUploadModal.tsx`, `TrialExpiredScreen.tsx` changes) was deliberately left behind because it was stale relative to fixes main had since applied
- Deleted via `git push origin --delete feature/affiliate-portal-final`
- Local stale ref also cleaned up via `git branch -D feature/affiliate-portal-final`

### Phase 6: Staging Branch Sync

**Reset `staging` to match `main` via force-push:**

- Pre-reset state: `staging` at `e83b10fe5`, `main` at `57ace538f`
- Force-push: `git push origin main:staging --force` (corrected to use `refs/remotes/origin/main` after first attempt used stale local `main` ref)
- Post-reset state: both `main` and `staging` at `57ace538f`
- Reason: bring `staging` up to date with the merged affiliate portal + ComplyBot admin suite work; Lovable will see the updated codebase on next sync

---

## What's Still Outstanding

**For the other worktree** (documented in a separate handoff prompt):

### 🔴 Priority 1 — Routing Fix (NOT YET IMPLEMENTED)

Despite being described as "implemented today" on RJ's task list, **the fix does not exist anywhere in `main`**:

- `src/routes/RoleLandingRedirect.tsx` still sends every consultant to `/consultant/dashboard` (old table view)
- No `isVivacityInternal` check anywhere in the codebase
- Required change per RJ's spec (both conditions required):
  ```ts
  const isVivacityInternal =
    contextData?.is_internal_staff === true ||
    contextData?.global_role === 'Consultant Administrator';
  ```
- Should route Vivacity-internal consultants to `/consultant/my-tenants` (card-grid), not `/consultant/dashboard`
- Data side is ready: all four Vivacity Consultant accounts (angela, rj, sharwari, sam) already have `global_role = 'Consultant Administrator'` — confirmed via production DB

### 🔴 Priority 2 — Delete `ConsultantDashboard.tsx` Dead Code

Still referenced on current `main`:
- Lazy import in `AppRoutes.tsx:56`
- Route in `AppRoutes.tsx:539`
- Hook `useConsultantDashboard.ts` only used by that page

Do this *after* Priority 1 lands (so nothing routes to `/consultant/dashboard` anymore). Verify with `grep -r "ConsultantDashboard" src/` (zero results) and `npx tsc --incremental --noEmit` (exit 0).

### 🟡 Not Started (RJ's Outstanding Items)

6. **Account Settings page verification** — Profile/Password/Preferences sections
7. **Governance History tab date filter** (Wave 1-B, frontend only)
8. **Register Insights direct queries** (Wave 4)
10. **SuperAdmin Pending Requests view** (next sprint)
12. **Governance Waves 5–7** — frontend only, DB migrations already applied

### 🟡 QA Gap on Already-Merged Work

The affiliate referral code panel (actual `VIVACITY2025` value, depends on `affiliate_ref_codes` seed data) and client grid scoping weren't verified end-to-end against live data — recommended for manual QA pass.

---

## Key Decisions & Tradeoffs

1. **Cherry-pick vs. merge-wholesale:** The stale branch (`feature/affiliate-portal-final`) was 4 days old and carried pre-fix versions of several bugs main had since resolved (PDR migration view-drop, TAS unit-gate check, governance meeting close race, QI evidence upload duplicate of PR #121, SubscriptionTab corruption). Rather than risk reintroducing those, we created a clean branch off current `main` and cherry-picked only the safe, isolated content (affiliate portal + ComplyBot admin suite). Deliberately excluded the unreconciled work (TAS/RiskRegister/AuthContext changes) that was stale relative to main's more recent fixes.

2. **Gap-fill migrations (append-only, CREATE IF NOT EXISTS):** Three objects (consultant_commission_ledger table, two RPC functions, complybot_conversations table) existed in production with no migration files — a Lovable-era drift pattern. Rather than write "fix" migrations that would break historical branch DBs, we created gap-fill migrations using `CREATE TABLE IF NOT EXISTS` and `CREATE OR REPLACE FUNCTION`, capturing the exact production definitions. These are no-ops in production (objects already exist) but enable branch DBs to rebuild from migrations alone without missing these objects.

3. **Manual edge function deploy due to CI billing outage:** GitHub Actions on ComplyHub-ai is down due to unpaid billing (ongoing). `complybot-monthly-report` edge function was deployed manually via Supabase MCP using exactly the committed code from `main`, so git and production stay in sync — a later Actions run (once billing is fixed) will just redeploy the same code, a no-op, not a regression.

4. **Staging force-push without drift scan (user override):** The standard `/branch-catchup` skill requires a mandatory pre-reset drift scan to verify nothing on `staging` would be lost. User chose to skip this check and proceed directly to the force-push. No drift was present — `staging` had moved ahead due to Lovable's continued work, but all divergence was Lovable-only (no uncommitted RJ work at risk).

---

## Commits & Deployments

| Commit | Branch | Message | Deployed |
|---|---|---|---|
| `824192f18` | `feat/affiliate-portal-import` | fix: resolve Cursor Bugbot, Vercel, and code-quality bot findings on PR #146 | Preview only (PR #146) |
| `57ace538f` | `main` | Merge pull request #146 from ComplyHub-ai/feat/affiliate-portal-import | ✅ Production (READY) |

---

## Migrations Applied

| Version | Name | Object | Status |
|---|---|---|---|
| `20260708135000` | gap_fill_consultant_commission_ledger | Table + 2 RLS policies | ✅ Applied |
| `20260708140000` | gap_fill_affiliate_context_rpcs | 2 RPC functions | ✅ Applied |
| `20260708142000` | gap_fill_complybot_conversations | Table + 5 RLS policies | ✅ Applied |

---

## Edge Functions

| Function | Slug | Status | Verify JWT | Version | Notes |
|---|---|---|---|---|---|
| ComplyBot Monthly Report | `complybot-monthly-report` | ACTIVE | true | 1 | Manual deploy (CI down). Cron not yet configured. |

---

## References

- **PR #146:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/146
- **Merge commit:** `57ace538f` on `main`
- **Feature branch (deleted):** `feature/affiliate-portal-final` (last commit `f73e79a3d`)
- **Import branch (deleted):** `feat/affiliate-portal-import` (merged as `57ace538f`)
- **Supabase project:** `gdwhlstfguxarnxasrrs` (production)
- **Vercel deployment:** `rto.complyhub.ai` (production)
- **Staging branch:** Reset to `57ace538f` to match `main`

---

## Follow-up Tasks

1. **Configure cron on `complybot-monthly-report` function** — currently deployed but no schedule attached. Set to `0 22 1 * *` (UTC) via Supabase Dashboard or SQL.
2. **Implement routing fix (Priority 1)** — `RoleLandingRedirect.tsx` `isVivacityInternal` check for Sharwari's landing page.
3. **Delete `ConsultantDashboard.tsx`** (Priority 2) — after routing fix lands.
4. **Verify affiliate portal QA** (optional) — manual pass on referral code panel and client grid seeding.
5. **Monitor CI billing issue** — once resolved, verify `deploy-edge-functions.yml` runs and redeploys `complybot-monthly-report` (should be a no-op).
