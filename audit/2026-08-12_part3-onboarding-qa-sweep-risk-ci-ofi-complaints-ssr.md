# Audit — Part 3 Onboarding QA Sweep (Risk / CI / OFI / Complaints / Assessment Validation / Student Support)

> **Date:** 12 August 2026 (demo day)
> **Scope:** Full consolidated sweep from `Part3ofOnboarding.md` — 10 items owned by worktree A
> (Risk Register / Continuous Improvement / OFI Register) and 6 items owned by worktree B
> (Complaints & Appeals / Assessment Validation / Student Support), plus two rounds of post-merge
> fresh-eyes/Bugbot findings and one data-only backfill.
> **Merge authority:** Brian (Khian)
> **Source:** Two parallel read-only Scout recon dispatches (worktree A, worktree B) against tenant
> "ComplyHub Demo" (`df5c0c9d-e4be-4f67-b454-1a7128b2fc01`), consolidated into a single living doc,
> worked through one locked decision at a time, then implemented same-day.

---

## Commits (all merged to `main`, `rto-compass-hub`)

| Commit | What it did |
|---|---|
| `291975841` | Part 3 onboarding QA sweep: OFI/CI/Risk register cleanup, case normalization, OFI→CI escalation (covers A-1 through A-10, B-2 through B-6) |
| `a418bd642` | Fixed live-blocking OFI schema gap (3 missing columns) + finished OFI evidence upload feature + added `in_progress` to `dd_status` |
| `2cfa9c562` | Fresh-eyes/Bugbot round 2: OFI evidence permissions, status-key normalization (`in_progress` vs `In Progress`), CI priority form fix, `@ts-nocheck` lint blocker |

Plus one data-only backfill (no branch/PR — see "Data backfill" below).

---

## Worktree A — Risk Register / Continuous Improvement / OFI Register

### A-1 — OFI "Type of Opportunity" dropdown empty (P0, fixed)
Wired the four mismatched OFI dropdowns (`category` → `ofi_dd_opportunity_type`, `source_of_ofi` →
`ofi_dd_source`, `monitoring_and_evaluation` → `ofi_dd_monitoring_evaluation`, `final_review_outcome`
→ `ofi_dd_final_outcome`) to their real tables in `OFIRegisterForm.tsx`, matching the explicit-`table=`
pattern already used elsewhere. No schema change, no rename.

**Follow-on discovered live during A-1 verification (`a418bd642`):** `ofi_register` was also missing
the three underlying **columns** (`source_of_ofi`, `monitoring_and_evaluation`, `final_review_outcome`)
that the now-fixed form was trying to write — every OFI creation was failing outright with
"column does not exist" even after the dropdown fix. Added the same three columns `ci_register` already
had (matching types). Confirmed live via `execute_sql`: all three columns now present on `ofi_register`.

### A-2 — Administrator sidebar missing Risk/CI/OFI (P0, fixed)
Added Risk Management Dashboard, Risk Register, Continuous Improvement, and Opportunities for
Improvement links to `adminSidebarConfig.ts`'s "Governance & Risk" section, mirroring Compliance
Manager's existing links. Config-only, no new routes/permissions.

### A-3 — Risk Management Dashboard wrong data / casing (P0, fixed)
Wired Quality Area and Status filter options from `dd_quality_area`/`dd_status` instead of hardcoded
Title Case / `Q1`-`Q4`. Added a case-insensitive normalize helper (`normalizeRiskKey`) used across
`calculateSummary`, `filterRisks`, `hasMitigation`. Dropped the non-existent "Mitigation Planned" UI
option, then **restored** "Mitigation Planned OR Mitigated" semantics for the mitigation-progress KPI
after the casing refactor narrowed it — caught during fresh-eyes review.

### A-4 — Risk Register status writes wrong casing (P1, fixed)
Wired both the live `RiskRegister.tsx` quick-status-change control and its filter options to
`dd_status` (lowercase value / human label), removing the Title Case write path. Added an
`in_progress` value to `dd_status` (shared table — see Backlog note below) since Risk's status
dropdown had no equivalent for the old hardcoded "In Progress" option.

**Follow-on found in fresh-eyes round 2 (`2cfa9c562`):** `normalizeRiskKey` didn't fold
underscore/space variants together, so the new `in_progress` value didn't match the 2 real
`risk_register` rows still stored as `"In Progress"` (with a space) from before this fix. Now
normalizes both to the same key.

### A-5 — Dead `src/pages/risk/index.tsx` (P1, fixed)
Deleted — confirmed unrouted, live path is `Risk.tsx` → `aligned/RiskRegister.tsx`.

### A-6 — `ci_register.priority` inconsistent casing (P1, fixed — one follow-up remains, see Backlog)
1. **Data backfill** — idempotent lowercase normalize on `ci_register.priority`. **Verified live
   12 Aug 2026:** all non-null `priority` values are lowercase (`high`/`medium`/`low`), and match
   `priority_level` wherever both are set.
2. **Writers** — `convert_ofis_to_ci` and CI CSV import now write lowercase; also keep `priority_level`
   in sync when they write `priority`.
3. **Readers** — `GovernanceExecutiveSummary`, `RegisterOverviewGrid`, `AuditReportGenerator` now
   compare case-insensitively.
4. **Fresh-eyes round 2 fix (`2cfa9c562`):** the main CI form (`ContinuousImprovementForm.tsx`)
   still had hardcoded Title Case `PRIORITY_OPTIONS` that didn't match the now-lowercase live data —
   every existing/escalated CI row showed a blank priority Select. Fixed to lowercase values with
   Title Case labels (comment left in place explaining why, citing Bugbot PR #413).
5. **Remaining follow-up** — the dual-column question (`priority` vs `priority_level`, no single
   source of truth) was explicitly deferred, not fixed. Promoted to `active-work.md` Backlog (see
   below).

### A-7 — OFI create missing null-guard (P1 preventive, fixed)
Added `if (!newOFI) throw new Error(...)` guard after insert-then-select, matching the pattern already
used on marketing/PDR/AIR registers.

### A-8 — Dead duplicate `src/pages/registers/OFI.tsx` (P2, fixed)
Deleted — Windows case-insensitive-filesystem shadow risk against the real `ofi/index.tsx`, zero
importers.

### A-9 — OFI list showed placeholder instead of table (P2, fixed)
Replaced the placeholder string with a real `RegisterTable`, cleaned up column defs (custom_id, Type,
Title, Priority, Status, Assigned to, Due/review date).

### A-10 — OFI does not auto-feed CI (reframed: not a bug, enhancement shipped)
Confirmed by-design two-step workflow (OFI → manual escalate → CI), matching the existing Risk →
manual Raise CI pattern. Shipped the permanent discoverable second step anyway:
`EscalateOfiToCiButton.tsx`, calling the existing `convert_ofis_to_ci` RPC.

**Fresh-eyes round 1 finding on this RPC (`291975841`'s own review pass):** `convert_ofis_to_ci`
resolved tenant via stale `profiles.tenant_id` — fixed to `COALESCE(active_tenant_id, tenant_id)` so
Consultants escalating from a client workspace resolve to the correct tenant.

---

## Worktree B — Complaints & Appeals / Assessment Validation / Student Support

### B-1 — SSR seeded rows: Responsible Person NULL (P1)
**Immediate fix (data backfill) — applied 12 Aug 2026, after the code sweep merged, separately from
this session's code changes:**

```sql
UPDATE ssr_register
SET responsible_person = '373da56c-70da-4234-9a72-8945394b4e35'::uuid
WHERE tenant_id = 'df5c0c9d-e4be-4f67-b454-1a7128b2fc01'
  AND responsible_person IS NULL;
```

Verified before: 10 nulls (SSR0001–SSR0010). Verified after: 0 nulls, all 10 rows now show Angela
Connell-Richards (`373da56c-70da-4234-9a72-8945394b4e35`) as Responsible Person. Data-only, no
migration, no branch/PR.

**Permanent fix (seed-path + NOT NULL decision) — not done, promoted to Backlog.**

### B-2 — Legacy Assessment Validation URLs / leftover page (P2, fixed)
Redirected `/dashboard/registers/av`, `/dashboard/registers/avr`, `/avr` to
`/dashboard/assessment-validation`; removed the competing duplicate route; deleted the leftover page
(`src/pages/registers/assessment-validation/index.tsx`, 483 lines) that queried `avr_register` with no
tenant filter. `avr_register` table itself untouched.

### B-3 — Duplicate `caa_register` sync triggers (P3, fixed)
Dropped the older insert-only trigger `caa_complaint_id_sync` via migration
(`20260811200100_part3_drop_caa_complaint_id_sync_trigger.sql`), kept
`caa_sync_complaint_id_trigger` (covers INSERT + UPDATE).

### B-4 — Orphan `useCAASubmission.ts` hook (P3, fixed)
Deleted (265 lines) — zero imports, zero live DB dependents (0 `smart_form_submissions` rows for
complaints).

### B-5 — `.single()` usages in AV + SSR (P3, fixed)
`SampleSelector.tsx`, `OutcomeStep.tsx`, `EditSSR.tsx` switched to `.maybeSingle()` + explicit null
handling, no behaviour change on the happy path.

### B-6 — Unused `admin` block in `roleMenuConfigs` (P3, fixed)
Deleted the dead `roleMenuConfigs.admin` section (153 lines) — Administrator's real sidebar is
`adminSidebarConfig`, confirmed via the cross-check finding below.

---

## Cross-check finding (resolved a conflict between the two Scout passes)

Worktree B's Scout had diagnosed a P0 "Complaints & Appeals / Student Support sidebar broken for
Administrator" bug by reading `roleMenuConfigs.ts`. Re-traced the actual render path
(`RootAppLayout.tsx` → `RoleSidebar.tsx` → `getSidebarType()`) and confirmed Administrator (also
Governing Person, Consultant, Consultant Assistant) renders `AdminSidebar` ← `adminSidebarConfig.ts` —
never `EnhancedRoleSidebar`/`roleMenuConfigs.ts`. Both routes were already correct for Administrator.
**Downgraded from P0 to P3 dead-config** (became B-6 above) — no live bug, but flagged that a third,
separate hardcoded `menuSections` list also exists inside `RoleBasedSidebar.tsx`
(`EnhancedRegisterHub.tsx` only) — three parallel sidebar-config systems total, not two. Not
consolidated in this sweep; not re-promoted to Backlog (informational only, no live symptom).

---

## Verification performed post-merge (12 Aug 2026, this session)

Live-DB checks via Supabase MCP against the production project (`gdwhlstfguxarnxasrrs`), not assumed
from the code:

- `ofi_register` has all three added columns (`source_of_ofi`, `monitoring_and_evaluation`,
  `final_review_outcome`) plus `evidence_files`.
- `dd_status` has `in_progress`.
- `ci_register.priority`/`priority_level`: all live values lowercase, matching where both set.
- Migration ledger (`list_migrations`) already carries all four Part 3 migration versions
  (`20260811200000`–`20260811200300`) under their correct filenames/names — no `migration repair`
  needed for this batch (the interim execute_sql-then-repair procedure had already been completed
  before this audit).
- SSR backfill (B-1 immediate fix) applied and re-verified same session (see above).

---

## Promoted to `active-work.md` Backlog

Two items carried forward as explicit "after demo" follow-ups (not fixed in this sweep, per the
locked decisions' own text):

1. **`ci_register` dual columns (`priority` vs `priority_level`)** — no single source of truth;
   decide which is canonical and migrate/deprecate the other (A-6 follow-up #1).
2. **SSR seed-path permanent fix** — demo/seed data creation must set `responsible_person`; decide
   whether `ssr_register.responsible_person` should become DB `NOT NULL`; decide fate of Direct
   Response's one remaining null row (B-1 permanent fix).

The Risk Register dedicated-status-table item (giving Risk its own `risk_dd_status` table instead of
sharing `dd_status`) was already logged in `active-work.md` Backlog on 11 Aug 2026 — not duplicated
here.

---

## Not touched / explicitly out of scope this sweep

- Three parallel sidebar-config systems (flagged, no owner).
- Alternate complaints UIs (`feedback-complaints/index.tsx`, `ComplaintsAppealsRegister.tsx`) — not
  investigated by either pass.
- OFI `id` int→uuid migration (`fbd7c9409`) — landed in the same recent batch, not investigated beyond
  noting it exists.
- Whether `submit_trainer_monthly_report()`'s `risk_register`/`whs_register` default-value inserts have
  the same generated/trigger-owned-column bug class as the `caa_register` fix — flagged only, not
  confirmed as a bug, not investigated this sweep.
- `fix_qi_campaign_billing_gate_restrictive` migration — unrelated, already parked separately in
  `active-work.md`.
