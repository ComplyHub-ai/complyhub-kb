# Role Audit — Compliance Manager (`Compliance Manager`)

**Date:** 4 June 2026
**Branch:** `main` (read-only)
**Auditor scope:** Compliance dashboards, CI engine, audit engine, risk management/simulator, self-assurance, policy drift, executive snapshot, registers.
**Method:** Walked the role's navigation surface (`roleNavigation.ts` → `COMPLIANCE_MANAGER_NAV`), traced each route in `AppRoutes.tsx`, read each page/component, and verified RPC/table existence against the live database (`gdwhlstfguxarnxasrrs`, read-only `SELECT` on `pg_proc` / `information_schema`).

Builds on `AUDIT-REPORT.md` + Opus addendum; references existing findings by ID where they touch this role and focuses on the role-scoped lens.

---

## Surface map

The DB role string is **`Compliance Manager`** (PascalCase `ComplianceManager` is the deprecated legacy alias — `config/roles.ts:1-8`).

**Landing:** `getLandingPath('Compliance Manager')` → **`/dashboard/compliance`** (`config/landingRoutes.ts:8-9`) → `ComplianceDashboard` (`pages/dashboard/ComplianceDashboard.tsx`), **bare** (no guard). Note `DashboardRouter.tsx:13` maps the legacy `ComplianceManager` → `/dashboard/compliance` too.

**Navigation (`COMPLIANCE_MANAGER_NAV`, `roleNavigation.ts:192-214`)** — identical to the Administrator nav minus RTO Settings, with a trimmed User Management section. Sections: Dashboard, Training & Assessment, Students & Support, VET Workforce, Governance & Risk, Documents & Compliance, AI & Automation, User Management (Users + User Portals Hub).

**CM-reachable routes relevant to this audit (route → component → guard):**

| Route | Component | Guard |
|---|---|---|
| `/dashboard/compliance` | `ComplianceDashboard` | **none** |
| `/dashboard/manager` | `ManagerDashboard` | `ManagerRoute` |
| `/dashboard/executive` | `ExecutiveDashboard` | **none** |
| `/dashboard/audit-engine` | `AuditEnginePage` | **none** |
| `/dashboard/audit-engine/manual/:auditId` | `ManualAuditPage` | **none** |
| `/dashboard/ci-engine` | `pages/ci` (CIRegisterPage) | **none** |
| `/dashboard/ci` | `CI.tsx` → continuous-improvement register | **none** |
| `/dashboard/self-assurance` | `SelfAssurancePage` | **none** |
| `/dashboard/self-assurance/simulation` | `SelfAssuranceSimulationPage` | **none** |
| `/dashboard/compliance-digest` | `ComplianceDigestPage` | **none** |
| `/dashboard/heatmap` | `HeatmapPage` | **none** |
| `/dashboard/risk` | `Risk` (`pages/risk`) | **none** |
| `/dashboard/risk-management-dashboard` | `RiskManagementDashboard` | **none** |
| `/dashboard/governance/register` | `unified-register` (`GovernanceRegisterPage`) | `TenantGuard` |
| `/dashboard/compliance/controls` | `ComplianceControlsPage` | `TenantGuard` |
| `/dashboard/compliance/audits/mock` | `MockAuditPage` | `TenantGuard` |
| `/dashboard/compliance/executive-snapshot` | `ExecutiveSnapshotPage` | `TenantGuard` |
| `/dashboard/compliance/policies/drift` | `PolicyDriftPage` | `TenantGuard` |
| `/dashboard/compliance/simulator` | `RiskSimulatorPage` | `TenantGuard` |

**Guarding reality:** `RoleRouteGuard` and the `routePermissions`/`canAccessRoute` map (`roleNavigation.ts:517-620`) exist but are **never wired into `AppRoutes.tsx`** — confirmed not imported. Role gating for `/dashboard/*` happens only via the five element-level guards (`AdminRoute`, `ManagerRoute`, `TrainerRoute`, `StudentRoute`, `AuditorRoute`). The CM's feature pages above are reached purely because they are bare. (`ManagerRoute` itself, `routes/guards/ManagerRoute.tsx:31`, grants CM/Admin/super_admin/Consultant and emits a `console.log` of role data on every check — line 29.)

---

## Findings

### 1. Phase-6 "Virtual Compliance Officer" pages call RPCs in non-`public` schemas (bare) — all fail at runtime
- Role(s): Compliance Manager (primary intended user of these pages)
- Page/route: `/dashboard/compliance/simulator`, `/dashboard/compliance/policies/drift`, `/dashboard/compliance/executive-snapshot`
- File:line:
  - `pages/compliance/RiskSimulatorPage.tsx:50` — `supabase.rpc("simulate_risk", …)`
  - `pages/compliance/PolicyDriftPage.tsx:60` — `supabase.rpc("run_policy_drift_check", …)`
  - `pages/compliance/ExecutiveSnapshotPage.tsx:42,59` — `generate_executive_snapshot_list`, `generate_executive_snapshot`
- Issue: Verified against the live DB — `simulate_risk` lives in schema **`compliance`**, `run_policy_drift_check` and `generate_executive_snapshot` in **`ai`**, and `generate_executive_snapshot_list` **does not exist at all**. All are called bare via `supabase.rpc(...)`, which PostgREST resolves against `public` only. Every primary action ("Run Simulation", "Run Drift Check", "Generate Snapshot") therefore errors. This corrects the original audit's "RPC not found in migrations" framing — the functions exist, but in unexposed schemas (matches addendum §2E).
- Severity: High
- Classification: **COMING SOON**
- Recommended action: Cover all three routes with a `<ComingSoon />` element in `AppRoutes.tsx:930-932`. Real fix (Carl/Dave): add `public` wrapper functions or expose the `ai`/`compliance` schemas and call `.schema('…').rpc(...)`.
- Relates to existing AUDIT-REPORT finding: COMING SOON candidates (ExecutiveSnapshotPage, PolicyDriftPage, RiskSimulatorPage); addendum §2E.

### 2. PolicyDriftPage also queries a table that does not exist
- Role(s): Compliance Manager
- Page/route: `/dashboard/compliance/policies/drift`
- File:line: `pages/compliance/PolicyDriftPage.tsx:51` — `supabase.from("documents" as any)`
- Issue: DB check confirms there is **no `documents` table** (only `public.documents_register`). The document picker is always empty, so the user cannot select a document to check even before the broken RPC is reached. Two independent defects on one page.
- Severity: High
- Classification: **COMING SOON** (folds into Finding 1's cover). The table swap alone is a one-line FIX (`documents` → `documents_register`), but the page is non-functional without the schema fix too, so cover it.
- Relates to existing AUDIT-REPORT finding: BREAKING BUGS — `PolicyDriftPage.tsx:52`; addendum §2E.

### 3. ExecutiveSnapshot fallback table is also non-`public`
- Role(s): Compliance Manager
- Page/route: `/dashboard/compliance/executive-snapshot`
- File:line: `pages/compliance/ExecutiveSnapshotPage.tsx:45-51` — `from("executive_snapshots" as any)`
- Issue: When the (broken) list RPC errors, the page falls back to querying `executive_snapshots` directly — but that table exists only in schemas **`ai`** and **`governance`**, not `public`. Both the RPC path and the fallback fail, so the page permanently shows "No snapshots generated yet" and "Generate Snapshot" throws a toast error.
- Severity: High
- Classification: **COMING SOON** (same cover as Finding 1).
- Relates to existing AUDIT-REPORT finding: COMING SOON candidates (ExecutiveSnapshotPage).

### 4. Mock Audit Simulation page — all action RPCs are in the `compliance` schema (bare)
- Role(s): Compliance Manager
- Page/route: `/dashboard/compliance/audits/mock`
- File:line: `pages/compliance/MockAuditPage.tsx:80,92,109,126`
- Issue: `get_mock_audit_run`, `start_mock_audit`, `complete_mock_audit`, `create_actions_from_findings` are all in schema **`compliance`** (DB-verified) but called bare → resolve to `public` → fail. Starting, completing, and loading a mock audit run all error.
- Severity: High
- Classification: **COMING SOON**
- Recommended action: Cover `/dashboard/compliance/audits/mock` (`AppRoutes.tsx:927`) with `<ComingSoon />`. Real fix is schema exposure / public wrappers (Carl/Dave).
- Relates to existing AUDIT-REPORT finding: new (Phase-4 page not individually listed; same schema-exposure class as §2E).

### 5. Compliance Controls — "Recalculate" RPC is in the `compliance` schema (bare)
- Role(s): Compliance Manager
- Page/route: `/dashboard/compliance/controls`
- File:line: `pages/compliance/ComplianceControlsPage.tsx:59` — `supabase.rpc("refresh_evidence_strength")`
- Issue: `refresh_evidence_strength` is in schema **`compliance`** (DB-verified), called bare → fails. The control list read (`from('controls')`) may render, but the page's core action (recompute evidence strength) errors. Partially wired only.
- Severity: Med
- Classification: **COMING SOON**
- Recommended action: Cover `/dashboard/compliance/controls` (`AppRoutes.tsx:924`), or — if the `controls` read works and the team wants a read-only view — hide just the Recalculate action. Real fix: schema exposure (Carl/Dave).
- Relates to existing AUDIT-REPORT finding: new.

### 6. Self-Assurance Scorecard shows a fake "100 / Strong compliance posture" before any data exists
- Role(s): Compliance Manager
- Page/route: `/dashboard/self-assurance`
- File:line: `hooks/useSelfAssurance.ts:60` (`return { overall: 100, byArea: {} }`) and `pages/self-assurance/index.tsx:67-75,84` (`byArea[key] ?? 100`)
- Issue: This page **works** (the `compute_self_assurance` RPC and `self_assurance_scores` table are both in `public` — DB-verified). But before any scores are computed, the overall ring renders **100** with the message "Strong compliance posture", and every quality-area card renders **100**. An unconfigured tenant sees a perfect green scorecard that is actually "no data" — a misleading false-positive on a compliance-critical screen.
- Severity: Med
- Classification: **FIX**
- Recommended action: When `scores.length === 0`, render an explicit empty state ("No scores yet — click Recalculate") instead of defaulting to 100; do not default area scores to 100.
- Relates to existing AUDIT-REPORT finding: new.

### 7. CM landing dashboard shows hardcoded fake "Priority Alerts" and a dead "Audit Pack" link
- Role(s): Compliance Manager (this is the CM's landing page)
- Page/route: `/dashboard/compliance`
- File:line: `pages/dashboard/ComplianceDashboard.tsx:64-68` (hardcoded `<li>` list), `:73` (placeholder "Governance Feed"), `:99` (`<a href="/audit">Audit Pack</a>`)
- Issue: The "Priority Alerts" card always shows the literal text "2 Overdue OFIs / 1 Critical Risk awaiting treatment plan / Complaints aging: 1 pending > 14 days" regardless of the tenant's real data — fabricated compliance figures on the primary CM screen. The "Governance Feed" is placeholder copy. The "Audit Pack" quick action links to `/audit`, which has **no route** (resolves to the catch-all 404). The other quick actions use raw `<a href>` (full page reload) and point at `/registers/risk` / `/registers/ci`, which redirect to the registers hub rather than the risk/CI pages. *(The widgets above this — `ComplianceScoreWidget`, `GovernanceHealthWidget`, `TrainerCredentialAlerts` — are real: `rpc_compliance_readiness_score` is in `public`, DB-verified.)*
- Severity: Med
- Classification: **FIX**
- Recommended action: Remove/replace the hardcoded Priority Alerts and Governance Feed with real queries (or hide the cards); fix the `/audit` link to `/dashboard/audit-engine`; convert `<a>` quick actions to router navigation.
- Relates to existing AUDIT-REPORT finding: new (role-specific landing).

### 8. `/dashboard/ci` silently fails to create its governance link (missing RPC)
- Role(s): Compliance Manager
- Page/route: `/dashboard/ci` (the CI register the Governance Register links to via `?new=true`/`?edit=`)
- File:line: `pages/registers/continuous-improvement/index.tsx:138` — `supabase.rpc('auto_create_governance_entry', …)`
- Issue: DB check finds **no function named `auto_create_governance_entry` in any schema**. The call is wrapped in try/catch that logs and returns `null` (`:152-155`), so the CI entry itself still saves, but the intended auto-creation of a linked Governance Register entry never happens — a silent feature failure. The unified Governance Register will not surface the auto-linked governance action.
- Severity: Med
- Classification: **FIX**
- Recommended action: Confirm with Dave whether the function was renamed/dropped; either restore it (correct schema + public exposure) or remove the dead call.
- Relates to existing AUDIT-REPORT finding: new.

### 9. RiskManagementDashboard "View Details" navigates to a non-existent route
- Role(s): Compliance Manager
- Page/route: `/dashboard/risk-management-dashboard`
- File:line: `pages/RiskManagementDashboard.tsx:430` — `navigate(`/risk/${risk.id}`)`
- Issue: No `/risk/:id` route exists (`/risk` is only an exact redirect to `/dashboard/risk`; there is `risk/new` and `risk/edit/:id` but no detail route). Clicking "View Details" on any risk lands on the catch-all/404. The rest of the page loads real data from `risk_register` and works.
- Severity: Med
- Classification: **FIX**
- Recommended action: Point to an existing detail/edit route, e.g. `/dashboard/risk-management/edit/${risk.id}` (which exists at `AppRoutes.tsx:844`).
- Relates to existing AUDIT-REPORT finding: new.

### 10. Audit Engine "Risk Analysis" tab renders a deprecated-table panel
- Role(s): Compliance Manager
- Page/route: `/dashboard/audit-engine` → Risk Analysis tab
- File:line: `components/audit-engine/PredictiveRiskPanel.tsx:1-2` (`// @ts-nocheck`, comment "References deprecated tables (risk_predictions)")
- Issue: The Audit Engine page is otherwise fully wired (reports/findings/tasks/stats all load real data). But the Risk Analysis tab uses `useRiskPredictions()` against the deprecated `risk_predictions` table — likely empty in production, presenting as "no risk predictions" with no explanation.
- Severity: Low
- Classification: **COMING SOON** (tab-level — hide the "Risk Analysis" `TabsTrigger`/`TabsContent` at `pages/audit-engine/index.tsx:84-87,114-116` until repointed)
- Recommended action: Comment out the Risk Analysis tab (consistent with the already-disabled "Manual Audits" tab at `:76-79,106-108`) until the panel is repointed to a live source.
- Relates to existing AUDIT-REPORT finding: new.

### 11. Duplicate, divergent CI register implementations
- Role(s): Compliance Manager
- Page/route: `/dashboard/ci-engine` vs `/dashboard/ci`
- File:line: `AppRoutes.tsx:380` (`CIEnginePage` → `pages/ci`) and `:836` (`<CI />` → `pages/CI.tsx` → `pages/registers/continuous-improvement`)
- Issue: Two separate Continuous Improvement register pages are routed. `pages/ci/index.tsx` carries `// @ts-nocheck` and resolves responsible-person names from a hardcoded `MOCK_USERS` array (`pages/ci/index.tsx:168`, importing `MOCK_USERS` from `@/types/ci`), so the "Responsible" column shows mock-mapped names. The continuous-improvement page (the one the Governance Register actually links to) is the fuller implementation. Maintaining both invites drift and confuses the CM about which is canonical.
- Severity: Low
- Classification: **FIX** (consolidate to one; redirect `/dashboard/ci-engine` to `/dashboard/ci`, or vice versa) — alternatively REMOVE the lesser page if confirmed unused by other roles.
- Relates to existing AUDIT-REPORT finding: new.

### 12. CM feature routes have no `TenantGuard` and no role guard
- Role(s): Compliance Manager (and every other authenticated role, which is the problem)
- Page/route: `/dashboard/compliance`, `/dashboard/executive`, `/dashboard/audit-engine`, `/dashboard/ci-engine`, `/dashboard/ci`, `/dashboard/self-assurance`, `/dashboard/risk`, `/dashboard/risk-management-dashboard`, `/dashboard/compliance-digest`, `/dashboard/heatmap`
- File:line: `AppRoutes.tsx:809-810,835-836,842,913,917-921` (all bare elements)
- Issue: Two role-lens consequences. (a) The CM's own landing (`/dashboard/compliance`) and several feature pages have **no `TenantGuard`**, so an orphan/no-tenant user (or a CM mid-tenant-switch) reaches them and their hooks fire RPCs/queries with a null tenant. (b) The `routePermissions` map *intends* these to be Governance-role-restricted, but since it is never enforced, any authenticated role reaches CM executive dashboards. The CM is correctly *permitted* everything it needs — but nothing is actually gated.
- Severity: High (for the platform); Med (CM-specific — null-tenant render on landing)
- Classification: **FIX**
- Recommended action: Wrap these route groups in `<TenantGuard>` (and apply role gating via the existing-but-unused `routePermissions`/`RoleRouteGuard`). This is RJ's route-architecture domain.
- Relates to existing AUDIT-REPORT finding: RBAC GAPS / Cluster 4 (TenantGuard gaps); addendum §2D.

### 13. Unrouted placeholder "Compliance Manager Dashboard" with dead nav targets
- Role(s): Compliance Manager
- Page/route: none (file is `pages/compliance-manager/Dashboard.tsx`, not imported in `AppRoutes.tsx`)
- File:line: `pages/compliance-manager/Dashboard.tsx:31-73` (all KPIs are `value="—"` / "No data available"), `:38,49,60,71,108-111` (navigates to `/compliance-manager/reports|actions|evidence|audit-prep|incidents|validation|standards`)
- Issue: A complete placeholder CM dashboard exists but is **not routed** — the CM actually lands on `/dashboard/compliance`. Every KPI is a dash, and all seven Quick-Action / card targets point at `/compliance-manager/*` routes that do not exist in the router. Dead code that will mislead any future maintainer into thinking it is the CM home.
- Severity: Low
- Classification: **REMOVE**
- Recommended action: Delete `src/pages/compliance-manager/Dashboard.tsx` (grep confirms no import in `AppRoutes.tsx`; only self-references). 
- Relates to existing AUDIT-REPORT finding: new (a CM-specific dead file beyond the addendum's list).

### 14. Legacy hardcoded-mock Governance Register is imported but never routed
- Role(s): Compliance Manager
- Page/route: none (imported as `LegacyGovernanceRegisterPage`, `AppRoutes.tsx:365`)
- File:line: `pages/governance/register.tsx` (initialises state from `sampleGovernanceData`, no Supabase calls); imported at `AppRoutes.tsx:365` but the live `/dashboard/governance/register` route (`:820`) uses `@/pages/governance/unified-register` instead.
- Issue: The unified register (`unified-register.tsx`) is real and works (`useGovernanceRegister` hook, real CI+Risk data). The legacy `register.tsx` is fully hardcoded sample data and is dead — only the unused `lazy()` import keeps it referenced.
- Severity: Low
- Classification: **REMOVE**
- Recommended action: Delete `src/pages/governance/register.tsx` and remove the `LegacyGovernanceRegisterPage` import at `AppRoutes.tsx:365`. Confirm no other reference first.
- Relates to existing AUDIT-REPORT finding: new.

---

## Pages confirmed healthy for this role (no action)

- `/dashboard/governance/register` — `unified-register.tsx`, real data via `useGovernanceRegister`, working CSV/XLSX/PDF export.
- `/dashboard/audit-engine` — reports/findings/tasks/stats all real (`AuditDashboardStats`, real tables); only the Risk Analysis tab is stale (Finding 10).
- `/dashboard/ci-engine` & `/dashboard/ci` — both read real `ci_register` data (duplication is Finding 11; the silent governance-link RPC is Finding 8).
- `/dashboard/risk` and `/dashboard/risk-management-dashboard` — real `risk_register` data (broken detail link is Finding 9).
- `/dashboard/self-assurance` — RPC + table both in `public`; works once recalculated (misleading empty state is Finding 6).
- `/dashboard/heatmap` — `generate_heatmap` is in `public` (DB-verified); works.
- `/dashboard/compliance-digest` — driven by hooks/edge function; renders real digests.
- CM landing widgets `ComplianceScoreWidget` / `GovernanceHealthWidget` / `TrainerCredentialAlerts` — real (`rpc_compliance_readiness_score` in `public`).

---

## Summary table

| # | Title | Severity | Classification |
|---|---|---|---|
| 1 | Phase-6 RPCs in `ai`/`compliance` schemas called bare (simulator, drift, snapshot) | High | COMING SOON |
| 2 | PolicyDrift queries non-existent `documents` table | High | COMING SOON |
| 3 | ExecutiveSnapshot fallback table not in `public` | High | COMING SOON |
| 4 | Mock Audit action RPCs in `compliance` schema (bare) | High | COMING SOON |
| 5 | Compliance Controls "Recalculate" RPC in `compliance` schema (bare) | Med | COMING SOON |
| 6 | Self-Assurance shows fake "100 / Strong" before any data | Med | FIX |
| 7 | CM landing: hardcoded Priority Alerts + dead `/audit` link | Med | FIX |
| 8 | `/dashboard/ci` governance auto-link RPC missing (silent fail) | Med | FIX |
| 9 | RiskManagementDashboard "View Details" → non-existent `/risk/:id` | Med | FIX |
| 10 | Audit Engine "Risk Analysis" tab uses deprecated table | Low | COMING SOON (tab) |
| 11 | Duplicate CI register pages (`ci-engine` vs `ci`); MOCK_USERS | Low | FIX |
| 12 | CM feature routes have no TenantGuard / role guard | High | FIX |
| 13 | Unrouted placeholder `compliance-manager/Dashboard.tsx` | Low | REMOVE |
| 14 | Dead hardcoded-mock `governance/register.tsx` (legacy) | Low | REMOVE |

---

## Coming Soon cover list

Wrap each route element below in a `<ComingSoon />` cover in `src/AppRoutes.tsx` (keep the route registered so deep links resolve to the cover, not a 404):

- `/dashboard/compliance/simulator` — `AppRoutes.tsx:932` (RiskSimulatorPage) — RPC in `compliance` schema.
- `/dashboard/compliance/policies/drift` — `AppRoutes.tsx:931` (PolicyDriftPage) — RPC in `ai` schema **and** non-existent `documents` table.
- `/dashboard/compliance/executive-snapshot` — `AppRoutes.tsx:930` (ExecutiveSnapshotPage) — RPC in `ai` schema, fallback table not in `public`.
- `/dashboard/compliance/audits/mock` — `AppRoutes.tsx:927` (MockAuditPage) — four RPCs in `compliance` schema.
- `/dashboard/compliance/controls` — `AppRoutes.tsx:924` (ComplianceControlsPage) — `refresh_evidence_strength` in `compliance` schema (or hide only the Recalculate action if the read view is wanted).

Tab-level cover (not a whole route):
- Audit Engine **Risk Analysis** tab — `pages/audit-engine/index.tsx:84-87` and `:114-116` — comment out the trigger + content (matches the already-disabled "Manual Audits" tab).

Removals (delete, do not cover):
- `src/pages/compliance-manager/Dashboard.tsx` — unrouted placeholder.
- `src/pages/governance/register.tsx` + its `LegacyGovernanceRegisterPage` import (`AppRoutes.tsx:365`) — dead hardcoded mock.

> All Coming Soon covers and removals touch `AppRoutes.tsx` and page files. Per workspace rules these are RJ's (routing) / Carl's domain — flag before branching; the schema-exposure fixes behind Findings 1–5/8 are Dave's. This audit made no code or database writes (DB access was `SELECT`/catalogue only).
