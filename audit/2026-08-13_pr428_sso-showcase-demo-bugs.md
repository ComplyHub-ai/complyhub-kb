# Audit — PR #428

> **Date:** 13 August 2026 (audit written); **Merged:** 13 August 2026 08:18 UTC
> **Scope:** SSO showcase demo path — Quick Log, Monthly Pack, governance meeting integration, trainer
> report keying, and a large body of pre-demo static-audit findings consolidated in
> `showcase-bugs-2026-08-14.md`
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** `showcase-bugs-2026-08-14.md` (workspace root;
> disposable session doc — not deleted yet; several items remain open as product calls)

---

## Summary

Pre-demo static audit (ChatGPT + Claude passes, 13–14 Aug 2026) identified a broken SSO showcase path:
sidebar/deep links pointing at non-existent routes, Quick Log writing to registers with wrong casing and
stale RLS gates, Monthly Pack tiles not counting logged records, trainer panels showing zero trainers
because live data uses `Trainer/Assessor` not `Trainer`, governance pack generator keying trainer reports
on the wrong column, and eight fully-built but disconnected periodic SSO report pages with no backing
routes.

PR #428 addressed the demo-critical subset in **11 substantive commits** across **55 files**
(+6,306 / −2,612 lines), **6 migrations**, and a substantial `supabase/seed.sql` expansion so the Vercel
preview / branch DB could actually be QA'd. A fresh-eyes adversarial review mid-branch surfaced
additional RLS/RPC hardening gaps; Cursor Bugbot ran on an earlier commit; the final commit (Cursor
desktop) fixed an At-Risk white-page crash from legacy `risk_snapshots.drivers = {}` rows and wired the
previously dead `SsoReportSummaryPanel` onto Live Meeting.

**Branch:** `fix/showcase-bugs-2026-08-14` (merged; remote may still exist) · **Merge commit:**
`8e1708d51` · **Merged:** 13 Aug 2026 08:18 UTC · **Migrations:** 6 (see below) · **Edge functions:**
none

---

## Problem statement (what was broken)

### P1 demo-path bugs (from `showcase-bugs-2026-08-14.md`)

| # | Area | Symptom | Root cause (confirmed) |
|---|---|---|---|
| 1 | SSO sidebar / `SsoHome` | 7 of 9 nav items 404 | Bare `/student-support/...` paths; most targets had no `AppRoutes.tsx` entry |
| 2 | Monthly Pack / Quick Log | Tile links 404 | Same prefix problem; some targets still missing routes |
| 3 | Live Meeting trainer panel | "No trainers" / incomplete badge | `useTrainerReportsPanel` filtered `role = 'Trainer'` only; live data is `Trainer/Assessor` |
| 4 | Governance Overview | Clause drill-down 404 | `ClauseSignalsDrawer` navigated to bare `/governance` |
| 5 | Report Monitoring | "Coming soon" for SSO | Placeholder copy; real SSO workflow existed elsewhere |
| 6 | Pack Generator | All trainers `not_started` | Joined `trainer_monthly_reports` on `tp_trainers.id` instead of `user_id` |
| 7+ | SSO periodic reports | Orphan pages | Eight standalone pages with deprecated/missing backing tables |

### Runtime bugs found during implementation / QA

| Symptom | Root cause |
|---|---|
| Quick Log RLS errors for SSO | `adjustment_plans`, `caa_register`, `risk_snapshots`, `ssr_register` INSERT/SELECT policies gated on stale `profiles.role` / `profiles.tenant_id` instead of `sec.has_tenant_role` |
| Quick Log records invisible in Monthly Pack | Writer used Title Case / wrong enum values (`Pending`, `High`) while registers and pack seed RPC filter on lowercase/snake_case (`open`, `high`) |
| `sso_push_to_governance` uuid cast error | Empty string `''` sent for optional `p_meeting_id` instead of `null` |
| Push appeared to succeed but UI never showed "linked" | RPC only wrote `governance_audit_log`; never updated `sso_monthly_reports.governance_meeting_id` |
| At-Risk Monitor white page after Quick Log → View record | `risk_snapshots.drivers` jsonb sometimes `{}` (object); readers did `(drivers \|\| []).slice()` — `{}` is truthy, `.slice` throws; ErrorBoundary in `AppRoutes.tsx` |
| Pack history View always opened current month | `SsoReportsHub` navigated to `/monthly-pack` with no `?period=` |
| Dashboard "Open Monthly Report" went to pack hub | Fallback route was `/dashboard/sso/reports` (pack history) not governance form |
| Live Meeting missing pack content | `SsoReportSummaryPanel` existed but was never mounted; only `SsoReportStatusPanel` (governance **report** table) showed |
| Status panel lied about close gate | Copy claimed missing SSO submit blocked meeting close; actual close gate is `sso_reports_reviewed` tick (auto-marked on close) |
| `get_trainer_report_meeting_summary` required count = 0 | RPC counted only `role = 'Trainer'`; 44 live `Trainer/Assessor` rows, zero plain `Trainer` (confirmed 13 Aug 2026) |

---

## Commit history (chronological, substantive only)

| Commit | Summary |
|---|---|
| `64033186d` | **Foundation.** Fix dead SSO nav links; fold 8 orphaned periodic report pages into Monthly Pack as `periodic_sections` + new section components; add `periodic_sections` column migration; extract `useSsoMonthlyPack` / mutations hooks; fix commentary never reloading on refetch; remove `@ts-nocheck` from touched files; fix setState-in-effect patterns in `ReportMonitoringTab` / `SsoReportDetail`; fix clause drawer route, trainer role filter, pack generator table join, `.maybeSingle()` crashes, Report Monitoring placeholder. |
| `5b840b073` | Harden SSO showcase workflows (wizard/report detail paths, report status wiring). |
| `eb0ac78ba` | Avoid throwing when trainer report row missing (panel graceful empty state). |
| `1fdf0d298` | **RLS + RPC hardening pass** (fresh-eyes 13 Aug). Migration `20260813150000` widens Quick Log RLS; casing fixes in Quick Log + pack seed RPC; `sso_push_to_governance` null meeting id + honest toast; pack generator `user_id` join; `MonthlyReport.tsx` tenant via `active_tenant_id`; migration `20260813120000` hardens SSO/trainer RPCs, drops unsafe 2-arg `save_sso_monthly_pack_draft` overload, server-side pack commentary guard. |
| `a994bbb2f` | **Seed fixtures** for branch-DB QA: fix bad-casing `ssr_register` row; add `adjustment_plans` / `caa_register` / `risk_snapshots` / `trainer_monthly_reports` fixtures; fixed governance meeting id; second scheduled meeting for Push-to-Governance picker; second monthly pack for submit happy-path. |
| `ed38366e3` | Bugbot findings + migration drift reconciliation on branch. |
| `c29305a0f` | `responsible_person` is uuid column — Quick Log was writing display name string. |
| `7b0e9f528` | At-Risk writer `drivers: []` fix + wrong View-record routes in Quick Log modal. |
| `d296a2a5d` | Migration `20260813160000` — `get_trainer_report_meeting_summary` counts `Trainer/Assessor`; seed date consistency. |
| `56001f456` | Wire dead code into app: `GovernancePackGenerator` route + nav; `PushToGovernanceDialog` on `SsoReportDetail`; fix RPC to persist `governance_meeting_id`; scheduled meeting seed fixture. |
| `22e5f5366` | **Final polish (Cursor).** Reader guards for `{}` drivers; invalidate `risk_snapshots` on Quick Log success; pack history `?period=`; dashboard/report reminder routing to governance form; mount `SsoReportSummaryPanel` on Live Meeting with AI summary via `useMeetingSectionNotes`; correct status-panel close-gate copy; lint fixes in `SsoAtRisk` / `SsoReportsHub` / `SsoStudents`. |

Merge commits (`27fac470f`, `64fe07c2a`, `321c11856`) brought branch up to date with `main` (incl. PR #430 Google Ads tag).

---

## Fixes shipped

### Database — 6 migrations

Applied to production 13 Aug 2026 via interim procedure: MCP `execute_sql` (schema change) + Brian
`supabase migration repair --status applied` (ledger). All six `version`/`name` pairs verified in
`supabase_migrations.schema_migrations` after repair.

| Version | File | What it does |
|---|---|---|
| `20260813024800` | `sso_monthly_pack_periodic_sections.sql` | Adds `sso_monthly_packs.periodic_sections jsonb`; updates `get_sso_monthly_pack_seed` to return `commentary` + `periodic_sections` on both code paths; extends `save_sso_monthly_pack_draft` with optional `p_periodic_sections` (3-arg). |
| `20260813025709` | `help_centre_session7_placeholder_wording_dml.sql` | Help centre copy DML (incidental to branch; already in ledger before PR merge). |
| `20260813032331` | `help_centre_media_bucket_and_default_thumbnail.sql` | Help centre media bucket + default thumbnail (incidental; already in ledger). |
| `20260813120000` | `harden_sso_and_trainer_rpc_authorization.sql` | Hardens `sso_push_to_governance`, `dismiss_sso_report_suggestion`, `submit_sso_monthly_report`, `get_trainer_report_readiness`, `validate_trainer_reports_for_meeting`, `save_sso_monthly_pack_draft`, `submit_sso_monthly_pack` with `sec.has_tenant_role` / `auth.uid()` checks; **drops** legacy 2-arg `save_sso_monthly_pack_draft(uuid, jsonb)` overload; persists `governance_meeting_id` on push. Rollback note: `docs/migrations/20260813120000_harden_sso_and_trainer_rpc_authorization_rollback.md`. |
| `20260813150000` | `widen_sso_quick_log_rls.sql` | Replaces INSERT/SELECT/UPDATE policies on `adjustment_plans`, `caa_register`, `risk_snapshots`, `ssr_register` to use `sec.has_tenant_role` (SSO included where appropriate). |
| `20260813160000` | `fix_trainer_report_meeting_summary_required_role.sql` | `get_trainer_report_meeting_summary`: count `Trainer` **and** `Trainer/Assessor`; missing-trainer list uses same role filter; submitted statuses include `reviewed`/`approved`/`committed`. |

**Live verification after apply:** `periodic_sections` column exists; `get_trainer_report_meeting_summary` body contains `Trainer/Assessor`; `sso_insert_ssr` policy present.

### Frontend — major surface areas

**SSO Quick Log (`useSsoQuickLogMutation.ts`, `SsoQuickLogModal.tsx`)**
- Centralised all register writes in one mutation hook (removed inline Supabase from modal).
- Maps UI labels to lowercase/snake_case values the registers actually store.
- Uses typed inserts; complaint category/type from shared constants.
- `responsible_person` writes uuid not display name.
- `drivers: []` on at-risk snapshot insert (writer fix); reader normalization in `useStudentRiskScores.ts` for legacy `{}` rows.
- Invalidates `risk_snapshots` query on success.

**SSO Monthly Pack (`SsoMonthlyPack.tsx`, hooks, section components)**
- Eight deleted standalone pages replaced by `src/components/sso/monthly-pack-sections/*` + `PeriodicSectionsPanel` with cadence scheduling (`ssoPeriodicSectionSchedule.ts`).
- `useSsoMonthlyPack` / `useSsoMonthlyPackMutations` call seed/save/submit RPCs.
- Pack history and deep links honour `?period=yyyy-MM`.
- Commentary loads back from server on pack_id change (pre-existing bug fixed).

**SSO Dashboard / Reports (`SsoDashboard.tsx`, `SsoReportsHub.tsx`, `SsoReportDetail.tsx`)**
- `ssoMonthlyReportPath()` helper: report id → detail; else meeting id → governance wizard; else pack hub.
- Report detail uses live `sso_monthly_reports` + RPCs; `.maybeSingle()` + not-found UI.
- Push to Governance button when submitted and not yet linked.

**Governance integration**
- `LiveMeetingTab.tsx`: mounts `SsoReportSummaryPanel` (pack snapshot by period) **below** `SsoReportStatusPanel` (governance report submit/view); AI summary saved to `governance_meeting_minutes.section_notes.sso_report`.
- `SsoReportStatusPanel`: accurate close-gate copy; routes View/Submit correctly.
- `GovernancePackGenerator.tsx`: route `/dashboard/governance/pack-generator`, nav entry, correct trainer join.
- `ReportMonitoringTab` / `useReportMonitoringData`: real SSO status instead of placeholder.
- `ClauseSignalsDrawer`: `/dashboard/governance/register`.
- `useTrainerReportsPanel.ts`: `Trainer` + `Trainer/Assessor` role filter.

**At-Risk (`SsoAtRisk.tsx`, `SsoStudents.tsx`, `useStudentRiskScores.ts`)**
- `asDriverArray()` / `normalizeSnapshot()` harden jsonb `drivers` and band/trend/score fields.
- Safe `.slice()` guards; `formatUpdatedAt()` with `isValid` date check.

**Navigation (`navigation.ts`, `roleNavigation.ts`, `SsoHome.tsx`, `AppRoutes.tsx`)**
- Removed or retargeted dead `/student-support/...` links; consolidated periodic reports under Monthly Pack.
- Pack generator route registered.

**Trainer (`MonthlyReport.tsx`)**
- Tenant resolution via `active_tenant_id` + active membership, not arbitrary `tenant_members` row.

**Seed (`supabase/seed.sql`)**
- QA fixtures for ComplyHub Demo / branch DB: corrected casing, cross-register rows, trainer report on `user_id`, two governance meetings (completed + scheduled), two monthly packs (June draft + July submitted pattern).

### Files added (high signal)

- `src/hooks/sso/useSsoQuickLogMutation.ts`
- `src/hooks/sso/useSsoMonthlyPack.ts`, `useSsoMonthlyPackMutations.ts`
- `src/types/sso-monthly-pack.ts`
- `src/lib/constants/ssoPeriodicSectionSchedule.ts`
- `src/components/sso/monthly-pack-sections/*` (8 section components + panel + index)

### Files deleted

- `SsoAnnualSupportReview.tsx`, `SsoAtRiskInterventions.tsx`, `SsoEquityInclusion.tsx`, `SsoPlacementWellbeing.tsx`, `SsoQuarterlyExperience.tsx`, `SsoReasonableAdjustmentSummary.tsx`, `SsoTrainingSupportUtilisation.tsx`, `SsoWellbeingSafeguarding.tsx` — logic folded into Monthly Pack periodic sections.

---

## Review rounds

1. **Static showcase audit** (`showcase-bugs-2026-08-14.md`) — scoped P1 demo path before coding.
2. **Fresh-eyes adversarial review** (13 Aug 2026, mid-branch) — drove migration `20260813150000` + `20260813120000` and casing/RLS fixes in commit `1fdf0d298`.
3. **Cursor Bugbot** (commit `a994bbb2f` era) — findings addressed in `ed38366e3` and related commits.
4. **ci-gate / pre-push lint** — branch CI green at merge (lint, type-check, migration guards, security guards, edge function type-check). Pre-commit hook caught `toggleSelect` ternary, fetch-before-declare, and `setState-in-effect` patterns in final commit — fixed before push.
5. **Post-merge ledger verify** (13 Aug 2026) — all six migration versions + names confirmed in production `schema_migrations`.

**Supabase Preview** check failed on the PR (preview project) — does not affect production apply; prod schema verified manually post-merge.

---

## Production rollout (post-merge)

1. **Vercel production** auto-deployed on merge to `main` — GitHub deployment `8e1708d` (Production), 13 Aug 2026 08:19 UTC. Serves `rto.complyhub.ai`.
2. **Worktree B** pulled to `8e1708d51` on `main`. Worktree A still holds stale local checkout of merged feature branch (git interlock — only one worktree can hold `main`).
3. **Migrations:** four applied via MCP `execute_sql` on 13 Aug (`20260813024800`, `20260813120000`, `20260813150000`, `20260813160000`); two help-centre migrations were already in ledger. Brian ran four `migration repair` commands from `rto-compass-hub-worktree-b`; all succeeded (exit 0). Orchestrator verified all six ledger entries match git filenames.
4. **No edge functions** — no deploy step beyond frontend + SQL.
5. **`supabase db push` still not usable** workspace-wide (Lovable-era drift) — interim `execute_sql` + `migration repair` procedure remains mandatory for new migrations.

---

## Deliberately NOT fixed (parked — product / separate FRAME)

From `showcase-bugs-2026-08-14.md` and mid-implementation audit — **out of PR #428 scope:**

| Item | Notes |
|---|---|
| Agenda `sso_report` still points at `ssr_register` / `/dashboard/registers/ssr` | Product call: retarget vs rename (caseload vs governance report) |
| Admin sidebar has no Monthly Pack link | Convenience only; SSO sidebar has Reports + Monthly Pack |
| `sso_monthly_reports` count = 0 on ComplyHub Demo | Live Meeting "Pending" until someone submits a real governance report on preview/prod — not a code defect |
| Pack history vs governance report naming confusion | Two products: `sso_monthly_packs` (SSO pack) vs `sso_monthly_reports` (governance form) — partially clarified in UI routing, not fully renamed |
| Close meeting requiring SSO **submission** | Not a product rule; close gate is review tick only |
| Full platform status-casing normalization | Same class of bug as PR #427 but across other registers — not bundled here |

---

## Manual QA checklist (post-merge — Brian-gated)

On **ComplyHub Demo** or **Vivacity Testing Tenant** as `sso@complyhub-seed.com` on production (`rto.complyhub.ai`):

- [ ] Quick Log → At-Risk Flag → Save → **View record** — At-Risk Monitor loads, no white page
- [ ] Quick Log → Adjustment Plan / Complaint / Support Case — no RLS error; records appear in registers / pack tiles
- [ ] Monthly Pack — period picker and pack history `?period=` open correct month
- [ ] Submit May pack (commentary filled) succeeds; June pack without commentary blocked (`commentary_required`)
- [ ] SSO Dashboard → Open Monthly Report — governance wizard when no report id; report detail when submitted
- [ ] Governance → Live Meeting — SSO status card **and** pack summary panel visible; AI summary generates/saves
- [ ] Governance → Pack Generator — Jane Trainer shows submitted, not `not_started`
- [ ] Push to Governance from report detail — meeting link persists after refresh
- [ ] Trainer Reports tab — non-zero required trainer count for tenants with `Trainer/Assessor` members

---

## Still open / follow-up

- **Manual QA** — checklist above not yet signed off in this audit session.
- **Worktree A cleanup** — delete local `fix/showcase-bugs-2026-08-14` branch when convenient; remote branch may still exist on GitHub.
- **`showcase-bugs-2026-08-14.md`** — living doc still at workspace root with parked agenda/sidebar items; delete per living-doc workflow once QA complete and decisions locked.
- **Legacy `risk_snapshots.drivers = {}` rows** — readers now tolerate; optional one-time data cleanup DML not shipped (not required for correctness).
- **Rollback doc** — if `20260813120000` causes incident, follow `docs/migrations/20260813120000_harden_sso_and_trainer_rpc_authorization_rollback.md` (capture `pg_get_functiondef` before revert; new forward migration, not ledger delete).

---

## Soak status

No feature flag. Schema + RLS + RPC changes are live for all tenants as of 13 Aug 2026. Highest-risk
surfaces: SSO Quick Log writes (widened RLS), hardened SECURITY DEFINER RPCs (authorization path
changed), and trainer meeting summary counts (behaviour change for `Trainer/Assessor` tenants). Watch
for SSO RLS denials, pack submit `commentary_required` regressions, and governance meeting trainer
readiness badges over the next few days. Frontend-only routing fixes are low risk once Vercel prod is
READY.

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/428
- Merge commit: `8e1708d51da462a2a8e968dcc2bfef81385e934c`
- Living worklist: `showcase-bugs-2026-08-14.md` (workspace root)
- PR queue ledger: `pr-review-open-prs.md` (updated post-merge)
- Rollback: `rto-compass-hub/docs/migrations/20260813120000_harden_sso_and_trainer_rpc_authorization_rollback.md`
