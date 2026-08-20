# Audit — PR #465 + PR #466: SSO monthly report gaps & role checkbox fix

> **Date:** 17 August 2026 (audit written); **Merged:** 17 August 2026 (same day, sequential)
> **Scope:** User Management role checkbox toggle; SSO monthly report support ticket (Australian
> College); governance SSO status panel; production RLS + RPC fixes; Bugbot follow-up backfill +
> duplicate-submit guard
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:**
> `sso-monthly-report-support-ticket-investigation.md` (workspace root — disposable; decisions
> captured here)

---

## Summary

Two connected PRs shipped the same day. **PR #465** fixed a User Management UI bug (role checkboxes
not toggling) and three production SSO monthly report defects surfaced by Australian College’s support
ticket: SSO staff could not see governance meetings, wizard submissions never showed as submitted, and
Monthly Pack tenants showed **Pending** in governance. **PR #466** followed immediately after merge
when Cursor Bugbot flagged that PR #465’s stricter `get_sso_report_status` filter would ignore legacy
wizard rows left as `draft` with null `submitted_at`, and that `submit_sso_monthly_report_full` still
had no `already_submitted` guard.

Both migrations were applied to production via the interim procedure (`execute_sql` / `supabase db
query --linked` + `migration repair`). Brian confirmed ledger repair for **#465** (`20260817043644`);
**#466** (`20260817050444`) repair handed in session.

| PR | Branch | Merge commit | Migration |
|---|---|---|---|
| [#465](https://github.com/ComplyHub-ai/rto-compass-hub/pull/465) | `fix/user-role-checkbox-not-activating` | `5667983d5` | `20260817043644_fix_sso_monthly_report_rls_and_submitted_status.sql` |
| [#466](https://github.com/ComplyHub-ai/rto-compass-hub/pull/466) | `fix/sso-monthly-report-wizard-backfill` | `a952ebca8` | `20260817050444_sso_monthly_report_wizard_backfill.sql` |

---

## Problem statement (what was broken)

| # | Symptom | Root cause (confirmed live) |
|---|---|---|
| 1 | Role assignment checkboxes in User Management did not toggle | Parent row `onClick` and `Checkbox` `onCheckedChange` both fired — conflicting handlers |
| 2 | SSO wizard Step 1 meeting dropdown always empty for Student Support Officers | Migration `20260711110300` (add SSO to `gov_meetings_select_tenant_read`) merged to git but **never applied to production** — RLS silently returned zero rows |
| 3 | SSO wizard “completed” but submission history / status still **Draft** | Live `submit_sso_monthly_report_full` inserted into `sso_monthly_reports` without `status='submitted'` or `submitted_at` |
| 4 | Australian College governance showed **Pending** despite Monthly Pack submitted | `get_sso_report_status` only read `sso_monthly_reports`; pack flow uses `sso_monthly_packs` |
| 5 | (Bugbot, post-#465) Legacy wizard rows would flip to **Pending** after #465 deploy | #465 filter required `status='submitted'` OR `submitted_at IS NOT NULL`; old submit path left `draft` + null timestamp |
| 6 | (Bugbot, post-#465) Resubmit could duplicate register side-effects | `submit_sso_monthly_report_full` had no `already_submitted` guard on `sso_monthly_reports` |

**Ruled out:** Trainer Monthly Reports (`trainer_monthly_reports`) — working normally for the tenant;
ticket was SSO path only.

**Trigger:** Support email from Australian College Administrator (`hasitha@australiancollege.edu.au`) —
SSO team had not “received” the monthly report; investigation showed platform-wide SSO wizard never
reached real `submitted` state for any tenant before this fix.

---

## PR #465 — fixes shipped

### Frontend

- **`UserManagementDrawer.tsx`** — `pointer-events-none` on role `Checkbox`; parent row owns click
  (removes dual-handler conflict).
- **`SsoReportStatusPanel.tsx`** — reads `report_source` + `reporting_period_month` from RPC;
  Monthly Pack **View Report** navigates to `/dashboard/sso/monthly-pack?period=YYYY-MM`; pack UUIDs
  no longer routed to wizard detail page.

### Migration `20260817043644`

1. **`gov_meetings_select_tenant_read`** — idempotent DROP/CREATE; adds `Student Support Officer`
   (mirrors never-applied `20260711110300`).
2. **`submit_sso_monthly_report_full`** — reinstall from live `20260811201000` body plus
   `status='submitted'`, `submitted_at=now()` on INSERT; adds role gate (SSO, Admin, CM, Governing
   Person) from `20260805023000` (also never live).
3. **`get_sso_report_status`** — recognises submitted `sso_monthly_packs` for reporting month;
   returns `report_source` + `reporting_period_month`; wizard rows counted as submitted only when
   `status='submitted'` OR `submitted_at IS NOT NULL` (so stray drafts do not block pack detection).

### Review notes (#465)

- **Fresh-eyes** pass before merge caught Monthly Pack navigation missing `?period=` — fixed in-branch.
- Same pass added role gate, draft-row filter, and `reporting_period_month` on RPC responses.

---

## PR #466 — follow-up shipped

### Migration `20260817050444`

1. **Backfill DML** — `UPDATE sso_monthly_reports` SET `status='submitted'`,
   `submitted_at=COALESCE(submitted_at, created_at)` for legacy wizard-completed rows only:
   - Excludes `status='pending'` placeholders from `create_sso_reports_for_meeting` (empty payload).
   - Idempotent — safe to run twice.
2. **`submit_sso_monthly_report_full`** — reinstall from #465 body plus `already_submitted` guard
   checking `sso_monthly_reports` and `_zz_deprecated_sso_monthly_reports` **before** register
   insert loops.

---

## Production apply (interim procedure)

`supabase db push` remains unusable (Lovable-era drift). Applied manually:

| Migration | Applied | Ledger repair |
|---|---|---|
| `20260817043644` | 17 Aug 2026 — RLS policy + both RPCs | Brian confirmed `migration repair --status applied 20260817043644` |
| `20260817050444` | 17 Aug 2026 — backfill DML + submit RPC | Brian to run `migration repair --status applied 20260817050444` |

**Verify ledger:**

```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version IN ('20260817043644', '20260817050444')
ORDER BY version;
```

**Post-apply verification (17 Aug 2026):**

- `gov_meetings_select_tenant_read` includes `Student Support Officer` in `pg_policy`.
- `submit_sso_monthly_report_full` body contains `has_tenant_role`, `'submitted', now()`, and
  (after #466) `already_submitted`.
- `get_sso_report_status` 2-arg signature live; returns pack fallback + `report_source`.
- `sso_monthly_reports` after #466 backfill: **1** row `submitted` (legacy wizard QA row
  `a99b5032-…`); **2** rows remain `pending` placeholders (untouched).

### Edge functions

**None.** No edge function changes in either PR.

---

## Files changed (git)

### PR #465

- `src/components/admin/user-management/UserManagementDrawer.tsx`
- `src/components/governance/SsoReportStatusPanel.tsx`
- `supabase/migrations/20260817043644_fix_sso_monthly_report_rls_and_submitted_status.sql`

### PR #466

- `supabase/migrations/20260817050444_sso_monthly_report_wizard_backfill.sql`

---

## Plain-English changelog (user-facing)

**PR #465**

- Role checkboxes in User Management work again.
- SSO staff can see governance meetings in the monthly report wizard.
- Wizard submissions show as **Submitted** with a timestamp.
- Governance recognises Monthly Pack submissions (not just wizard table).
- **View Report** opens the correct Monthly Pack month.
- Submit RPC restricted to appropriate roles.

**PR #466**

- One legacy wizard report backfilled to **Submitted** so governance does not show **Pending**.
- Admin-created empty **pending** placeholders left unchanged.
- Duplicate submit for the same meeting/month blocked before duplicating register data.

---

## QA / follow-up

- [ ] **Australian College** — confirm governance meeting SSO panel shows **Submitted** for their
  Monthly Pack month; SSO staff can open wizard Step 1 and see meetings (post-migration).
- [ ] **Vivacity / QA tenant** — smoke User Management role toggle; attempt double wizard submit for
  same meeting → expect `already_submitted`.
- [ ] **No backfill** of the two `pending` placeholder rows — intentional; SSO still needs to complete
  or admin clears placeholders separately.

---

## Related

- Investigation living doc: `sso-monthly-report-support-ticket-investigation.md` (workspace root —
  delete after audit absorbed).
- Prior SSO list/history work: `complyhub-kb/audit/2026-08-14_pr433_sso-monthly-reports-list.md`,
  `2026-08-14_pr432_sso-monthly-report-default-meeting.md`.
- Never-applied git migrations this work effectively landed: `20260711110300`,
  `20260805023000` (role gate only — table target differed in git chain).
