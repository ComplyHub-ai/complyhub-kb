# Bug 3 — Stale `profiles.tenant_id` Sweep (deferred from cross-tenant leak batch)

> Living doc per the workspace living-doc workflow (`CLAUDE.md` § Living-doc workflow). One source of
> truth for this body of work. A brand-new chat should be able to read this file cold and continue.
>
> Branch: `fix/cross-tenant-batch-2` (rto-compass-hub). Originates from `crosstenantleak.md` (now
> deleted after its own 13-table batch shipped in PR #310) — Bug 3 was deferred there as needing "a
> fresh whole-codebase Scout sweep before fixing, since the known 11 locations are not believed
> exhaustive." This file is that sweep, continued to full per-item diagnosis and fix planning.
>
> **This batch also includes:** Table #14 (`doc_review_actions`) and Bug 2 (`ai-router` `.single()`
> crash) — both fully scoped and confirmed safe to implement (see bottom of this file). Bug 3 is the
> only open, multi-item part of this batch — worked one item/group at a time below.

---

## Reality of the issue

`profiles.tenant_id` is a legacy "home organisation" column — set once (signup/invite) and never
updated again. `profiles.active_tenant_id` is the real session-routing column: every workspace switch
writes to `active_tenant_id`, not `tenant_id`. Both the DB side (`sec.current_tenant_id()`, all
RLS-relevant SQL functions checked in the baseline migration) and the frontend side
(`useEffectiveRole()` → `AppContext` → `activeTenantId`) read exclusively off `active_tenant_id`.
`profiles.tenant_id` isn't wired into either path — it's a fossil field old code still reads.

This bug class is already an **explicit, documented ban** in both `rto-compass-hub/CLAUDE.md` and
`AGENTS.md` ("❌ BANNED — stale home-org field after Enter Workspace / org switch"), with
`currentTenantId()` / `profiles.active_tenant_id` given as the fix. It was known before this
investigation — just never swept exhaustively.

**Who's exploitable:** multi-tenant roles only — Consultant (222 accounts), Administrator (3),
Trainer/Assessor (2), per the original cross-tenant-leak investigation's live count. Single-tenant
users are unaffected in practice (their `tenant_id` and `active_tenant_id` never diverge) — this
matters per-site below for prioritising.

**Side-find, not yet resolved:** `useActiveTenantId.ts` (marked `@deprecated`, kept only for
`TenantContext.tsx`'s impersonation branch) destructures `profile` from `useAuth()`, whose own code
comment types it as `{ id, email, role }` — no `tenant_id` field at all. Its `if (profile.tenant_id)`
fast-path may therefore always be `undefined`/falsy and permanently fall through to the real query.
Needs direct confirmation before assuming it's dead code, not yet done.

## Why the count jumped from 11 (original doc) to ~300+ (this sweep)

1. **Scope, not just thoroughness.** The original 11 were found incidentally, one at a time, only
   surfacing in files already under investigation for one of the 14 leak tables. This sweep grepped
   the entire codebase, not just those tables — picking up every register form, submission hook,
   dashboard, and settings page independently carrying the same pattern.
2. **Reads and writes were initially conflated.** Raw grep for `profile.tenant_id` / `profiles.tenant_id`
   returns ~1300+ raw hits; most are **insert/update stamps** (`tenant_id: profile.tenant_id` on a new
   row) — a data-integrity bug (new record mis-filed to the wrong org), not a leak. Only the **read/filter**
   subset (~240-260 sites, confirmed below) is the actual cross-tenant-read-leak shape this investigation
   is about. Write-stamp sites are explicitly OUT OF SCOPE for this file — logged as a separate,
   lower-priority cleanup, not tracked item-by-item here.
3. **Even within "read" sites, severity is not uniform** — see Category E note below. A query filter
   feeding a compliance register list is a real content leak; a query filter inside an ID-sequence
   generator (`generateCustomId`) only miscounts a display ID, no register content is exposed. Locked
   decision: **do not assume one fix shape or one severity across all hits** — each item/group below
   gets its own diagnosis before being marked fixed.

---

## Inventory — full sweep results (2 Scout passes, read-only, not yet fixed)

Grouped as Scout found them. Status column tracks per-item/group diagnosis, not just "found."

### Category A — High-traffic hook/component read filters (HIGH severity candidate — direct register/dashboard content)

| # | File | Lines | Table(s) scoped | Status |
|---|---|---|---|---|
| A1 | `src/hooks/useAssessmentValidation.ts` | 28,70,90,98,106,115,123,154,169,627 | assessment_validation + panel_members/sample/tool_review/findings/actions | ✅ diagnosed — **3 live hooks (useValidationEvents, useValidationEvent, useValidationActions), all reachable (consumed by 6+ assessment-validation components + unified-register.tsx)**. 10 reads/filters using `profile.tenant_id` (lines 28, 70, 90, 98, 106, 115, 123, 154, 627) + 4 ready-checks (lines 21, 61, 144, 617). **Fix:** use `useEffectiveRole().effectiveTenantId` (hook has ready state and access to AppContext) — swap every `.eq('tenant_id', profile.tenant_id)` to use the effective value; update ready-checks from `if (!profile?.tenant_id)` to `if (!ready || !effectiveTenantId)`. No server-side gaps, no incidental bugs. Same fix shape as Category A pattern. |
| A2 | `src/hooks/useQA4EvidenceExport.tsx` | 62,91,119,150,179,211,316 | qa4_evidence_register | ⬜ DEAD CODE — zero component consumers anywhere in `src/` (confirmed via grep). File has `@ts-nocheck` comment claiming tables are deprecated, but the tables (governing_persons, governance_delegations, conflict_of_interest, governance_meetings) actually exist in the baseline schema — misleading. This is a **Scout false positive**, not a live bug. Flag for cleanup/deletion in a separate housekeeping session, not part of Bug 3 fixes. |
| A3 | `src/hooks/useUnitValidationProgress.ts` | 49,69 | assessment_validation + tenant_members | ✅ diagnosed — **LIVE: 3 components (ScheduleTableTab, ValidationDashboardTab, UnifiedUnitScheduleTab).** 2 read filters using `profile.tenant_id` (lines 49 on assessment_validation, 69 on tenant_members) + 1 ready-check (line 35). **Fix:** same A1 pattern — swap to `useEffectiveRole().effectiveTenantId`, update ready-check to `if (!ready \|\| !effectiveTenantId)`. No server-side gaps, no incidental bugs. |
| A4 | `src/hooks/useUnitValidationSchedule.ts` | 79,87,99,265,306,319 | unit_validation_schedule, avr_register | ✅ diagnosed — **LIVE, heavily consumed** (18+ importers incl. UnifiedUnitScheduleTab, ValidationDashboardTab, ScheduleTableTab, `pages/assessment-validation/schedule.tsx`, plus many type-only imports). Read filters at lines 79 (tga_cache), 87 (assessment_validation), 99 (tenant_members), 265/306 (avr_register) + ready-checks at lines 71, 249. Line 319 is a write-stamp (`.insert()`) — out of scope per this doc's own write/read split, not fixed here. **Fix:** same A1/A3 pattern — swap all reads/ready-checks to `useEffectiveRole().effectiveTenantId`. No server-side gaps, no incidental bugs. |
| A5 | `src/hooks/useConsultationRecords.ts` | 38,129,178,205 | consultation_records | ✅ diagnosed — **LIVE**, consumed by `src/pages/registers/ien/index.tsx`. Read filter line 38 (fetch), lines 178/205 (update/delete filters) + ready-checks lines 26, 97, 149, 195. Line 129 is a write-stamp (`.insert()`), out of scope. **Fix:** same pattern — `useEffectiveRole().effectiveTenantId`. **Incidental bug found (not Bug 3, flag separately):** lines 134 and 180 use banned `.single()` instead of `.maybeSingle()` per this repo's own hard rule — should be fixed while in the file but tracked as its own item, not folded into the tenant-id swap. |
| A6 | `src/hooks/useConsultationPlans.ts` | 32,61,144,182,190,214 | consultation_plans | ✅ diagnosed — **LIVE**, consumed by `pages/registers/ien/index.tsx` and `ien/tabs/ConsultationSurveysTab.tsx`. Read filters lines 32, 61 (fetch) + 182, 214 (update/delete) + ready-checks lines 20, 51, 134, 169, 204. Line 144 is a write-stamp (`.insert()`), out of scope. **Cross-reference:** lines 155 and 190 pass `profile.tenant_id` as the `tenantId` arg into `syncTrainingProducts(...)` in this same file — this is the identical call site already tracked as **E14** in Category E. Fixing A6's `profile.tenant_id` at its source resolves E14 too — same root cause, one fix, not two. **Fix:** `useEffectiveRole().effectiveTenantId` throughout. **Incidental bug found (flag separately):** `.single()` at lines 149 and 184 — banned pattern, should be `.maybeSingle()`. |
| A7 | `src/components/dashboard/DashboardOverviewCards.tsx` | 47-51,60,66,72 | ci_register, risk_register, fpp_register, gov_register, marketing_register, tasks | ✅ diagnosed — **LIVE**, consumed by `pages/user/User_Dashboard.tsx`. All 6 tables confirmed to exist in baseline schema — the file's `@ts-nocheck "deprecated tables"` comment is misleading, same false-positive pattern as A2. Read filters at lines 47-51 (5 register counts), 58 (tenant_members count), 63-66 (risk_register), 69-72 (tasks) + ready-check line 34. **Fix:** `useEffectiveRole().effectiveTenantId`. **Incidental bug found (flag separately, not fixed here):** this component calls `supabase.from()` directly in the component body across 8+ queries — banned pattern per this repo's own rule that data fetching belongs in hooks, not components. Worth a follow-up refactor, out of scope for Bug 3. |
| A8 | `src/components/dashboard/ComplianceHeatmap.tsx` | 38-41 | ci_register, risk_register, gov_register, tasks | ⬜ DEAD CODE — zero imports of this component file anywhere in `src/` (confirmed via grep on the exact import path). Unrelated hits for the name `ComplianceHeatmap` elsewhere in the codebase are a completely different type/service in `src/types/register-system.ts` + `src/lib/register-service.ts` — different file, different shape, not this component. Same Scout false-positive pattern as A2. Flag for cleanup/deletion, not part of Bug 3 fixes. |
| A9 | `src/pages/Index.tsx` | 114,120,128,135,143,166 | multiple register reads (home dashboard) | ✅ diagnosed — **LIVE**, the app's home dashboard route (`AppRoutes.tsx:75`, lazy-loaded as `IndexPage`). Notable: file **already imports and calls `useEffectiveRole()`** (line 82) for `effectiveTenantId`, but only wires it to `TasHealthCard` (line 346) — `fetchDashboardData`/`generateAIInsight` still read stale `profile.tenant_id` at lines 101 (ready-check), 114, 120, 128, 135, 143, 166 (gov_register/risk_register/tenants reads), plus the page-level "No Tenant Access" gate at line 222. **Fix is trivial:** the correct value is already in scope in this file — swap every `profile.tenant_id` in the fetch functions and the access gate to the existing `effectiveTenantId`, and gate readiness on `roleReady` (also already destructured, currently unused for this purpose). Confirmed `tenants.tenant_id` (line 166 filter) is genuinely the table's own primary key per baseline schema — not a wrong-column bug, just the same stale-value issue. **Incidental bug found (flag separately):** `.single()` at line 167 — banned pattern, should be `.maybeSingle()`. |

### Category B — Form/component read filters (HIGH severity candidate)

| # | File | Lines | Table scoped | Status |
|---|---|---|---|---|
| B1 | `src/components/pfp/PFPRegisterForm.tsx` | 281,306 | pfp_register | ✅ diagnosed — **LIVE**, consumed by `pages/registers/pfp/index.tsx`. Stale reads: line 71 `useTenantMembers(profile?.tenant_id)` (populates the "Responsible Person" dropdown — if stale, leaks another tenant's member names/emails into this dropdown), ready-check line 182, `existingGovEntry` read filter lines 278-284, `createGovernanceEntry(profile.tenant_id, ...)` call line 306. Line 242's `generateCustomId(..., profile.tenant_id)` is already tracked separately in this doc's own E-id sub-group (lower severity) — not re-counted here. **Notable, checked, NOT exploitable:** the `pfp_register` UPDATE at line 233-236 has no app-level `tenant_id` filter at all (only `.eq('id', record.id)`) — but confirmed via baseline schema that RLS policy `pfp_reg_update` checks the row's actual `tenant_id` against the caller's real tenant role, so this is a missing defense-in-depth filter, not a leak. **Fix:** `useEffectiveRole().effectiveTenantId`. |
| B2 | `src/components/ci/ContinuousImprovementForm.tsx` | 103 | ci_register | ✅ diagnosed — **LIVE**, consumed by 5 files (`ComplaintsAppealsForm.tsx`, `AgendaRegistersTab.tsx`, `LiveMeetingTab.tsx`, `pages/registers/continuous-improvement/index.tsx`, `pages/registers/OFI.tsx`). `tenant_members` read filter line 103 (populates team-member dropdown) + ready-check line 98. **Also found:** line 489 passes `profile?.tenant_id` as the `tenantId` prop into `RegisterEvidenceUpload` — if stale, an uploaded evidence file could be scoped/stored against the wrong tenant. **Fix:** `useEffectiveRole().effectiveTenantId` at both sites. |
| B3 | `src/components/qi/QIRegisterForm.tsx` | 96,288 | qi_register | ⬜ DEAD CODE — zero imports of this component anywhere in `src/` (confirmed via grep). Same Scout false-positive pattern as A2/A8. Notable: this file also has the same "no app-level tenant_id filter on UPDATE" shape as B1 (line 231-234) — checked, RLS policy `qi_reg_update` backstops via the row's real `tenant_id`, not exploitable, and moot anyway since the component is unreachable. Flag for cleanup/deletion, not part of Bug 3 fixes. |
| B4 | `src/components/assessment-validation/SendToRiskModal.tsx` | 116 | risk_register (linking) | ⚠️ **CORRECTED 27 Jul 2026 — original diagnosis below was wrong, disproven by live data; see Decision 5 for the full corrected finding.** LIVE, consumed by `ValidationEventDrawer.tsx`. Stale-field reads: `tenant_members` filter line 116 (assignee dropdown) + ready-check line 112, plus `profile.tenant_id` passed into `generateCustomId` (line 127) and the `risk_register` insert (line 137) — standard Category A/B fix shape, `useEffectiveRole().effectiveTenantId`. **Corrected role-gate finding:** the `canCreateRisk` gate (line 57) checks `profile.role` against `RISK_ALLOWED_ROLES = ['Administrator', 'Compliance Manager', 'Consultant', 'Consultant Assistant']` (Proper Case — matches how `profiles.role` is actually stored, unlike G3/G6's lowercase bug, so **no casing bug here**). Live query confirms `profiles.role` commonly does hold `'Administrator'`/`'Compliance Manager'` for real users, so this gate works correctly most of the time. The real, narrower bug: `profiles.role` is a stale snapshot (same class as `profiles.tenant_id`) — confirmed 27 live users today have it diverged from their active tenant's true `tenant_members.role`, so for those users this gate can wrongly grant or wrongly deny access. **Fix:** replace `profile.role` with `useEffectiveRole().effectiveRole` (confirmed backed by `get_my_app_context()`, which sources role fresh from `tenant_members`, not `profiles`) — same fix family as the tenant-id swap, land together. **See B5 — identical bug, same file shape.** |
| B5 | `src/components/assessment-validation/SendToCIModal.tsx` | 111 | ci_register (linking) | ⚠️ **CORRECTED 27 Jul 2026 — identical correction to B4, same file shape, same parent component.** LIVE, consumed by `ValidationEventDrawer.tsx` (same parent as B4). Stale-field reads: `tenant_members` filter line 111 (assignee dropdown) + ready-check line 107, plus `profile.tenant_id` in `generateCustomId` (line 122) and `ci_register` insert (line 130). **Fix:** `useEffectiveRole().effectiveTenantId`, same as B4. **Same corrected permission-gate finding as B4:** `canCreateCI` (line 56) checks `profile.role` against `CI_ALLOWED_ROLES = ['Administrator', 'Compliance Manager', 'Consultant', 'Consultant Assistant']` (Proper Case, no casing bug) — works correctly for most users, but `profiles.role` is a stale snapshot that can diverge from the caller's true current tenant role (see B4/Decision 5 for the confirmed live evidence: 27 diverged users today). **Fix:** same as B4 — `useEffectiveRole().effectiveRole`, ideally in one shared place so B4 and B5 don't diverge again. |

### Category C — Register list pages — diagnosed individually 27 Jul 2026, NOT uniform (PDR is the exception)

**Locked finding before the per-file table: the header's "same pattern each" was itself an unverified
assumption — checked directly against live routing (`AppRoutes.tsx`) and each file's actual source,
same discipline as every other category.** Two real exceptions surfaced immediately:
- **PDR is not a Bug 3 site at all.** `src/pages/registers/pdr/index.tsx` already correctly uses
  `supabase.rpc('get_my_app_context')` → `ctx.active_tenant_id` throughout — zero `profile.tenant_id`
  reads anywhere in the file. Already fixed by someone previously (or never had the bug).
- **"ier" doesn't exist as a directory — two candidates, only one is live.** `src/pages/registers/ien/`
  (no acronym match but confirmed via `AppRoutes.tsx:359,950-953` to be the real, routed Industry
  Engagement Register, mounted at `/industry-engagement`) is live. `src/pages/registers/industry-consultation/index.tsx`
  is a separate, much larger built feature (tabs, stages, survey tooling) that is **imported but never
  rendered as a route anywhere** (confirmed: zero `<IndustryConsultation` usage in `AppRoutes.tsx`) —
  dead code, flagged for cleanup, not part of Bug 3.

The remaining 16 files (all confirmed live/routed via `AppRoutes.tsx`) share the same shape: a
`profile.tenant_id` ready-check, a `.eq('tenant_id', profile.tenant_id)` fetch filter, a
`generateCustomId`/insert write-stamp (out of scope, tracked separately), and a `<SelectTenantEmpty />`
no-tenant gate. **Fix for all 16:** `useEffectiveRole().effectiveTenantId`, same as every other category.

| # | File | Lines (stale reads/ready-checks, writes excluded) | Status |
|---|---|---|---|
| C1 | `src/pages/registers/adc/index.tsx` | 24 (ready-check/local var, passed to `useTenantMembers` + no-tenant gate) | ✅ diagnosed — LIVE (`AppRoutes.tsx:338,1154`). Single hit, low count because most of this page's actual data comes from `useADCRegister()` (an internal hook, not re-diagnosed here — out of this file's scope, would need its own item if swept). Fix: `useEffectiveRole().effectiveTenantId`. |
| C2 | `src/pages/registers/pdr/index.tsx` | — | ✅ **NOT A BUG 3 SITE** — already uses `get_my_app_context()`/`ctx.active_tenant_id` exclusively, zero `profile.tenant_id` reads. No fix needed. |
| C3 | `src/pages/registers/rpl/index.tsx` | 69,80,83,88,94,100,114,118,125,136,138,164,424 | ✅ diagnosed — LIVE (`AppRoutes.tsx:321,1134`). Standard shape: ready-checks, `rpl_register` fetch filter, `generateCustomId`/insert write-stamps (out of scope), `createGovernanceEntry(profile.tenant_id, ...)` call (line 138). Fix: `useEffectiveRole().effectiveTenantId`. |
| C4 | `src/pages/registers/tar/index.tsx` | 78,84,104,110,127,131,289 | ✅ diagnosed — LIVE, routed as Trainer Availability (`AppRoutes.tsx:444,1151`, path `registers/trainer-availability`). Standard shape, two fetch filters (lines 84, 110). Fix: `useEffectiveRole().effectiveTenantId`. |
| C5 | `src/pages/registers/mcn/index.tsx` | 48,61,73,127,133,316 | ✅ diagnosed — LIVE (`AppRoutes.tsx:346,1176`). Standard shape. Fix: `useEffectiveRole().effectiveTenantId`. |
| C6 | `src/pages/registers/ofi/index.tsx` | 54,69,74,80,113,116,162,206,211,236,240,251,265,294,495 | ✅ diagnosed — LIVE (`AppRoutes.tsx:347,1177`). Standard shape, largest hit-count in Category C (15). Line 162 passes `profile?.tenant_id` as `p_tenant_id` into `auto_create_governance_entry` — **this is the exact RPC already tracked as D6** (missing/never-shipped, deferred to its own separate session) — not a new finding, D6's own row already notes this call site. Fix (everything except the D6-blocked RPC call): `useEffectiveRole().effectiveTenantId`. |
| C7 | `src/pages/registers/str/index.tsx` | 41,48,59,65,85,88,272 | ✅ diagnosed — LIVE (`AppRoutes.tsx:443,1149-1150`, also mounted at `registers/staff-turnover`). Line 48 also passes stale value into `useTenantMembers(profile?.tenant_id)` (dropdown leak risk, same shape as B1/B2). Fix: `useEffectiveRole().effectiveTenantId`. |
| C8 | `src/pages/registers/tas/index.tsx` | 151,161,168,289,321,353,558 | ✅ diagnosed — LIVE (`AppRoutes.tsx:322,1135`). Standard shape plus line 353 builds a Storage file path directly from `profile.tenant_id` (`${profile.tenant_id}/${newRecord.id}/...`) — same defense-in-depth concern as B2's evidence-upload finding: if stale, a file could be written under the wrong tenant's storage prefix. Fix: `useEffectiveRole().effectiveTenantId` throughout, including the storage path. |
| C9 | `src/pages/registers/ien/index.tsx` (the real "ier" — see note above) | 236 | ✅ diagnosed — LIVE, low hit-count because most of this page's data flows through `useConsultationRecords`/`useConsultationPlans` (already diagnosed as A5/A6). Single remaining hit: line 236 passes `profile?.tenant_id` as a prop into `<LegacyEngagementsTab>` — same prop-drilling shape as B2's `RegisterEvidenceUpload` finding. Fix: `useEffectiveRole().effectiveTenantId`. |
| C10 | `src/pages/registers/suitability/index.tsx` | 88,95,100,123,231,243,258,270 | ✅ diagnosed — LIVE, mounted at `students-support/suitability` (`AppRoutes.tsx:329,1514`). Standard shape, two separate fetch filters (95, 100). Fix: `useEffectiveRole().effectiveTenantId`. |
| C11 | `src/pages/registers/adjustments/index.tsx` | 68,74,93,183,199 | ✅ diagnosed — LIVE, mounted at `students-support/adjustments` (`AppRoutes.tsx:330,1516`). Standard shape. Fix: `useEffectiveRole().effectiveTenantId`. |
| C12 | `src/pages/registers/fpp/index.tsx` | 70,82,86,90,96,100,107,114,127,213,219,226,275,541 | ✅ diagnosed — LIVE (`AppRoutes.tsx:340,1156`). Standard shape, three separate fetch filters (90,100,114/127). Fix: `useEffectiveRole().effectiveTenantId`. |
| C13 | `src/pages/registers/ssr/index.tsx` | 52,58,73,79,99,274 | ✅ diagnosed — LIVE (`AppRoutes.tsx:328,1141`). Standard shape. Fix: `useEffectiveRole().effectiveTenantId`. |
| C14 | `src/pages/registers/fre/index.tsx` | 69,75,78,84,98,105,112,125,154,157,189,205,217,464 | ✅ diagnosed — LIVE (`AppRoutes.tsx:319,1127`). Standard shape plus line 125 builds a Storage file path directly from `profile.tenant_id` — same concern as C8/tas. Also lines 157, 217 pass `profile.tenant_id` into what looks like a linking/governance call (same shape as B1/rpl's `createGovernanceEntry`). Fix: `useEffectiveRole().effectiveTenantId` throughout, including the storage path. |
| C15 | `src/pages/registers/audit/index.tsx` | 36,49,55,75,78,107,114,245 | ✅ diagnosed — LIVE (`AppRoutes.tsx:445,1185`). Standard shape, two fetch filters (55, 114). Fix: `useEffectiveRole().effectiveTenantId`. |
| C16 | `src/pages/registers/pli/index.tsx` | 34,52,63,86,89,220 | ✅ diagnosed — LIVE (`AppRoutes.tsx:349,1179`). Standard shape. Fix: `useEffectiveRole().effectiveTenantId`. |
| C17 | `src/pages/registers/whs/index.tsx` | 72,82,89,130,133,304 | ✅ diagnosed — LIVE (`AppRoutes.tsx:354,1187`). Standard shape. Fix: `useEffectiveRole().effectiveTenantId`. |
| C18 | `src/pages/registers/marketing/index.tsx` | 52,63,67,73,87,99,121,141,163,185,238,437 | ✅ diagnosed — LIVE, mounted at `registers/mktg` (`AppRoutes.tsx:324,1139`). Standard shape, two fetch filters (73, 141), plus lines 163/238 pass `profile.tenant_id` into what looks like a linking/governance call (same shape as C14/rpl). Fix: `useEffectiveRole().effectiveTenantId`. |

**Separately flagged, not a numbered C-item:** `src/pages/registers/industry-consultation/index.tsx` —
dead code (see note above), zero `profile.tenant_id` reads regardless, flag for cleanup/deletion
alongside the doc's other dead-code finds (A2, A8, B3), not part of Bug 3 fixes.

### Category D — RPC calls (`p_tenant_id: profile.tenant_id`) — mixed severity, needs per-RPC check (read vs write RPC)

| # | File:line | RPC | Status |
|---|---|---|---|
| D1 | `src/components/settings/RTOSettingsForm.tsx:150` | `get_rto_settings` | ⚠️ **ESCALATED — separate, more severe bug than Bug 3.** Read the RPC body directly (baseline migration line 43203): plain SQL function, **zero auth check at all** — trusts any `p_tenant_id` from any authenticated caller with no membership verification. This is the exact banned pattern in `AGENTS.md` ("trusting a client-supplied tenant_id for authorization"), not just a stale-field issue. Any authenticated user could call this RPC directly with an arbitrary tenant_id and read that tenant's RTO name/ABN/ACN/CEO name/contact email/phone/branding/onboarding progress. Confirmed live/reachable (`RTOSettingsForm.tsx`, consumed by `RTOSettings.tsx`, "Canonical Admin Settings page"). **Implementation plan (not yet written — this is the plan for the future implementation session):** one migration converts `get_rto_settings` from `LANGUAGE sql` to `plpgsql`, preserving the exact existing SELECT logic unchanged, adding a guard at the top requiring `auth.uid()` IS NOT NULL AND (`sec.is_super_admin()` OR an active `tenant_members` row for `auth.uid()` in `p_tenant_id`, any role — this is a read, broader membership is appropriate, matches `useCanViewTenantData`-style broad read access). Frontend: swap `profile.tenant_id` → `useEffectiveRole().effectiveTenantId` in both this file and D2's call site. |
| D2 | `src/pages/settings/RTOSettings.tsx:39` | `get_rto_settings` | Same RPC and same escalated finding as D1 — see D1 for full diagnosis and plan. Frontend fix: swap `profile.tenant_id` → `useEffectiveRole().effectiveTenantId` here too. |
| D3 | `src/components/settings/RTOSettingsForm.tsx:431-432` | `upsert_rto_settings` | ⚠️ **ESCALATED — same class as D1.** Read the full RPC body directly (baseline migration line 115596, all ~95 lines) — confirmed **zero auth check anywhere in the function**, writes tenant_settings/tenants/tenant_branding keyed purely by whatever `p_tenant_id` is passed. **Implementation plan:** same migration as D1, add a guard requiring `sec.is_super_admin()` OR an active `tenant_members` row for `auth.uid()` in `p_tenant_id` with role in the codebase's own `OPERATIONAL_WRITE_ROLES` set (`Administrator`, `Compliance Manager`, `Governing Person`, `Consultant`, `Consultant Assistant` — confirmed via `src/lib/permissions/roleGates.ts`, matches the existing client-side gate `useCanEditTenantSettings` exactly, so no behaviour change for legitimate users). Frontend: swap `profile.tenant_id` → `useEffectiveRole().effectiveTenantId` in `RTOSettingsForm.tsx`'s `saveSection`. |
| D4 | `src/components/settings/RTOSettingsForm.tsx:440-441` | `complete_onboarding_step` | ⚠️ **ESCALATED — same class as D1/D3.** Read the full RPC body directly (baseline migration line 24772, all 24 lines) — confirmed zero auth check, writes `onboarding_progress` keyed purely by `p_tenant_id`. Called immediately after `upsert_rto_settings` in the same `saveSection` function. **Implementation plan:** bundle into the same migration as D1/D3, same `OPERATIONAL_WRITE_ROLES` guard (matches the client-side gate this call site already sits behind). Frontend fix included in D3's swap (same function, same file). |
| D5 | `src/hooks/useTrainerQualifications.ts:146-147` | `import_usi_qualifications` | ✅ diagnosed — **RPC is already correctly gated**, not part of the escalated finding. Read the full RPC body (baseline migration line 49701): verifies caller has an active `tenant_members` row in `p_tenant_id` with role `Administrator` or `Compliance Manager`, or is `sec.is_super_admin()`/`profiles.role='super_admin'` — proper server-side check already exists. Real risk is narrower, same shape as G7/G8/G9/D8-D10: a stale `profile.tenant_id` can only make this act on the wrong one of the caller's own orgs (where they do hold that role), never someone else's org. **Implementation plan:** frontend-only fix — swap `profile.tenant_id` → `useEffectiveRole().effectiveTenantId` in `useImportUSIQualifications()`. No migration needed. |
| D6 | `src/hooks/useGovernanceLinks.tsx:37` | `auto_create_governance_entry` | ⏸ **DEFERRED — separate session, separate batch (Brian's call).** Not a Bug 3 issue at all — the RPC `auto_create_governance_entry` does not exist anywhere in the current schema (confirmed: zero matches across all of `supabase/migrations/*.sql`; it only ever existed in pre-baseline Lovable-era `_archive/` migrations, which are off-limits to reference per `supabase/migrations/CLAUDE.md`). Three live call sites depend on it with the identical parameter signature (`src/hooks/useGovernanceLinks.tsx:31`, `src/pages/registers/ofi/index.tsx:156`, `src/pages/registers/continuous-improvement/index.tsx:182`) — confirming this was one intended feature (auto-linking OFI/CI items into a governance record), never implemented in the current schema, not three separate breaks. All three fail silently today (RPC-not-found error caught locally, logged to console, returns `null`) — the parent OFI/CI record still saves fine, only the auto-linked governance entry silently never gets created, for every user, every time. Separately: `ofi/index.tsx`'s call site also has the Bug-3 stale-tenant_id shape (`profile?.tenant_id`); `continuous-improvement/index.tsx` already correctly uses `activeTenantId`. **Decision: rebuild the function from scratch against the current schema** (not resurrect archived code) — but as its own separate session and separate implementation batch, not part of this branch (`fix/cross-tenant-batch-2`). Tracked here so it isn't lost, not blocking anything in this file. |
| D7 | `src/hooks/user-management/useStoreTrainerCredential.ts:28-29` | `store_trainer_credential` | ⚠️ **ESCALATED — same class as D1/D3/D4, plus dead frontend code.** Read the full RPC body directly (baseline migration line 104419, including its `EXCEPTION WHEN OTHERS` block) — confirmed zero auth check, inserts into `trainer_credentials` and `audit_logs` keyed purely by `p_tenant_id`/`p_actor_id` with no verification either is real/authorized. Separately confirmed via grep: `useStoreTrainerCredential.ts` itself has **zero component consumers anywhere in `src/`** (same dead-code pattern as D8/D9/D10) — but this does NOT reduce the RPC's own exposure, since it's still directly callable by any authenticated user via the Supabase API regardless of whether the frontend hook is wired up. **Implementation plan:** same migration as D1/D3/D4, add a guard requiring `sec.is_super_admin()` OR active `tenant_members` membership for `auth.uid()` in `p_tenant_id` with a role in `OPERATIONAL_WRITE_ROLES`, PLUS bind `p_actor_id = auth.uid()` when `p_actor_id` is provided (matches the audit-forgery-prevention pattern already used in `20260722110641_harden_user_management_rpcs.sql`'s `p_performed_by` check). No frontend fix needed (hook is dead) — flag hook for cleanup/deletion alongside D8-D10, Brian's call. |
| D8 | `src/hooks/user-management/useInviteUser.ts:22-23` | `invite_user` | ✅ diagnosed — confirmed real: `profile.tenant_id` passed directly as `p_tenant_id`. A Consultant working in Client B's workspace who invites a user would have it land in home org A instead. Fix: swap to `useEffectiveRole().effectiveTenantId`. **Not yet checked:** whether the `invite_user` RPC itself independently re-verifies caller role/membership against the passed `p_tenant_id` — check RPC's SQL definition before shipping to know how much this fix alone closes vs needing a server-side check too. |
| D9 | `src/hooks/user-management/useUpdateUser.ts:24-26` | `admin_update_user` | ✅ diagnosed — **DEAD CODE, not a live bug.** Zero component consumers found anywhere in `src/` (confirmed via grep). Separately: the `admin_update_user` RPC itself has two overloaded baseline versions, both gated to Super Admin only (`assert_super_admin()`/`check_super_admin_user()`), one still referencing the banned legacy `organization_members`/`organisation_id` tables — neither was touched by the 22 Jul 2026 hardening migration that modernized sibling RPCs. Not fixed as part of Bug 3 — flagged for cleanup/deletion instead. |
| D10 | `src/hooks/user-management/useDeactivateUser.ts:21-22` | `deactivate_tenant_user` | ✅ diagnosed — confirmed real, identical shape to D8: `profile.tenant_id` passed directly as `p_tenant_id`. Fix: swap to `useEffectiveRole().effectiveTenantId`. Same open question as D8: whether `deactivate_tenant_user` RPC independently re-verifies caller authorization against the passed `p_tenant_id` — check before shipping. |

### Category E — Service/utility method calls — MIXED severity, do not batch-fix

**Sub-group E-content (real register/data service reads — HIGH severity candidate, same shape as Category A):**

| # | File:line | Call | Status |
|---|---|---|---|
| E1 | `src/components/UnifiedRegisterDashboard.tsx:99` | `registerService.getRegisterMetrics(profile.tenant_id)` | ⬜ **DEAD CODE** — traced the full consumer chain: this component is only used by `src/pages/enhanced-registers/index.tsx`, which has **zero route references anywhere** (`AppRoutes.tsx` has no `enhanced-registers` mount, confirmed via grep) and zero `from '@/pages/enhanced-registers'` imports elsewhere. Entire `enhanced-registers` page tree is unreachable. Flag for cleanup, not part of Bug 3. |
| E2 | `src/components/UnifiedRegisterDashboard.tsx:100` | `registerService.getComplianceHeatmap(profile.tenant_id)` | ⬜ **DEAD CODE** — same file/chain as E1, see E1 for full diagnosis. |
| E3 | `src/components/calendar/ComplianceTaskList.tsx:51` | `ComplianceCalendarService.getComplianceTasks(profile.tenant_id)` | ⬜ **DEAD CODE** — zero consumers of this component found anywhere in `src/` (confirmed via grep). Flag for cleanup, not part of Bug 3. |
| E4 | `src/hooks/useUpcomingAudits.ts:34` | `ComplianceCalendarService.getOverdueTasks(profile.tenant_id)` | ⬜ **DEAD CODE** — the hook's only consumer, `UpcomingAuditsWidget.tsx`, itself has zero consumers anywhere in `src/` — unreachable via a two-link chain. **Also notable if ever revived:** this hook doesn't use `useAuth()`'s `profile` at all — it re-fetches `profiles.tenant_id` directly via a fresh query with a banned `.single()` (line 28), a different/duplicate resolution path from every other site in this doc. Not added to the incidental-bugs tracker since the whole hook is unreachable. |
| E5 | `src/hooks/useUpcomingAudits.ts:35` | `ComplianceCalendarService.getTasksDueSoon(profile.tenant_id, 90)` | ⬜ **DEAD CODE** — same file/chain as E4, see E4 for full diagnosis. |
| E6 | `src/hooks/useSidebarBadges.ts:41` | `getSidebarBadges(profile.tenant_id, badgeSpecs)` | ✅ diagnosed — **LIVE, HIGH-TRAFFIC.** Consumed by `SidebarGroup.tsx`/`SidebarV3.tsx`, which is rendered via `SharedShell.tsx`, used by both `GeneralLayout.tsx` and `SuperAdminLayout.tsx` — the app's core authenticated-shell layout, so this runs on essentially every page load. If stale, sidebar badge counts (e.g. overdue-item indicators) would reflect the wrong tenant after a workspace switch. **Fix:** `useEffectiveRole().effectiveTenantId`. |
| E7 | `src/components/assessment-validation/unit-schedule/AssessorDetailsDrawer.tsx:53` | `fetchAssessorDetails(assessor.assessor_id, unitCode, profile.tenant_id)` | ✅ diagnosed — **LIVE.** Consumed by `AssessorCell.tsx` → `UnifiedUnitScheduleTable.tsx`, the same live table component already established as reachable in A4 (consumed by ScheduleTableTab/ValidationDashboardTab/UnifiedUnitScheduleTab). **Fix:** `useEffectiveRole().effectiveTenantId`. |
| E8 | `src/components/documents/BulkDocumentUploadStep3.tsx:363` | `validateBulkDocumentTitles(titlesToValidate, profile.tenant_id, {...})` | ✅ diagnosed — **LIVE.** Consumed by `BulkDocumentUploadWizard.tsx`, itself consumed by `src/pages/Documents.tsx` (routed, `AppRoutes.tsx:386`) and `src/pages/admin/DocumentsRegister.tsx`. **Fix:** `useEffectiveRole().effectiveTenantId`. |
| E9 | `src/pages/onboarding/OrganisationSetup.tsx:107` | `assertInviteAllowed({ tenantId: profile.tenant_id, count: invites.length })` | ⬜ **DEAD CODE** — this page file exists but has zero imports/references anywhere in `src/` (confirmed via grep on the exact import path) — not wired into `AppRoutes.tsx` or any other file. Flag for cleanup, not part of Bug 3. |

**Sub-group E-id (`generateCustomId(table, profile.tenant_id)`) — CONFIRMED lower severity, own fix shape:**

Confirmed via direct read of `src/lib/utils/customIdGenerator.ts:30-35` — internally runs
`.eq('tenant_id', tenantId).like('custom_id', prefix%)` to compute the next sequence number for a
display ID (`PREFIX0001`). If `tenantId` is stale: **no register content is exposed** — the only effect
is the new record's custom ID number is computed against the wrong tenant's existing sequence
(duplicate-looking or gap-y IDs, minor info leak of a count only). Real bug, wrong bucket — do not fix
with the same urgency/shape as Category A reads. ~20 call sites, one shared root cause
(`customIdGenerator.ts` itself, or every call site's `tenantId` argument) — likely fixable in the
utility's call sites as a batch once Category A/B/C pattern is locked, or even by fixing the argument
at each call site to pass the correct tenant. Sites: EscalateToAppealDialog.tsx:69, CIRegisterForm.tsx:111,
PFPRegisterForm.tsx:242, ComplaintsAppealsForm.tsx:276, CTRegisterForm.tsx:233,
CreateRiskFromValidationModal.tsx:128, SendToCIModal.tsx:122, SendToRiskModal.tsx:127,
AdjustmentPlanForm.tsx:205, IENRegisterForm.tsx:258, QIRegisterForm.tsx:240+253,
CreateCIFromValidationModal.tsx:96, SSRRegisterForm.tsx:258, WHSRegisterForm.tsx:238,
GovernanceActionModal.tsx:41, TrainerAvailabilityForm.tsx:272+294, WHSIncidentForm.tsx:255+340,
WellbeingRiskScanForm.tsx:202, WellbeingAssessmentWizard.tsx:239, WellbeingSupportPlanForm.tsx:234,
STRRegisterForm.tsx:328, IndependentReviewForm.tsx:232, InterventionPlanForm.tsx:247,
PlacementCheckInForm.tsx:221, marketing/index.tsx:99, tas/index.tsx:289, fre/index.tsx:105,
fpp/index.tsx:219, rpl/index.tsx:118, audit/AIRRegisterForm.tsx:228, LogAction.tsx:63.
Status: ⬜ not fixed, but severity/shape triaged — see above.

**Sub-group E-other (not yet classified — write-adjacent helper calls, need individual check):**

| # | File:line | Call | Status |
|---|---|---|---|
| E10 | `src/components/whs/WHSRegisterForm.tsx:250` | `createLinkedTask(profile.tenant_id, 'whs_register', recordId, {...})` | ✅ diagnosed — **LIVE.** Consumed by `pages/registers/whs/index.tsx` (already confirmed live as C17), `pages/registers/whs/NewWHS.tsx`, and two governance-meeting tabs (`LiveMeetingTab.tsx`, `AgendaRegistersTab.tsx`). **Fix:** `useEffectiveRole().effectiveTenantId`. |
| E11 | `src/components/whs/WHSRegisterForm.tsx:289` | `createGovernanceEntry(profile.tenant_id, ...)` | ✅ diagnosed — same file/consumers as E10, see E10. **Fix:** `useEffectiveRole().effectiveTenantId`. |
| E12 | `src/pages/registers/rpl/index.tsx:138` | `createGovernanceEntry(profile.tenant_id, ...)` | ✅ diagnosed — **duplicate of C3, not a separate fix.** This is the identical `profile.tenant_id` variable and identical line already counted in C3's Category C row (`rpl/index.tsx`'s own line list includes 138). Fixing C3's source assignment resolves this call site automatically — same pattern as E14/A6. No separate work item. |
| E13 | `src/pages/registers/audit/AIRRegisterForm.tsx:284` | `createLinkedTask(profile.tenant_id, ...)` | ✅ diagnosed — **LIVE.** Consumed by `pages/registers/audit/index.tsx` (already confirmed live as C15). **Fix:** `useEffectiveRole().effectiveTenantId`. |
| E14 | `src/hooks/useConsultationPlans.ts:155,190` | `syncTrainingProducts(id, profile.tenant_id, ...)` | ✅ diagnosed — **duplicate of A6, not a separate fix.** Same file, same `profile.tenant_id` variable — see A6's Category A row for full diagnosis. Fixing A6's source assignment (swap to `useEffectiveRole().effectiveTenantId`) resolves this call site automatically. No separate work item. |

### Category F — Conditional visibility/routing checks (mixed severity)

| # | File:line | Pattern | Status |
|---|---|---|---|
| F1 | `src/contexts/TrainerPortalContext.tsx:85,96` | ⚠️ **ESCALATED — much bigger than the doc's single-line categorization suggested.** Not just a ready-check: `orgId = profile?.tenant_id \|\| null` (line 85) is threaded through the **entire** context — the `tenant_members` role fetch (line 151), the `get_trainer_profile_for_user` RPC lookup (`p_tenant_id: orgId`, line 233), an email-fallback `tp_trainers` lookup (line 265), and even insert payloads (lines 309, 319). `orgId` is also exposed directly on the context value, so all 23 downstream consumers of `useTrainerPortal()` inherit whatever stale value this resolves to. **Confirmed HIGH-TRAFFIC:** `TrainerPortalProvider` is mounted via `TrainerRouteWrapper.tsx`/`TrainerRoute.tsx` — the guard wrapping the entire trainer-portal section of the app. If stale, a multi-tenant trainer/consultant could have their entire trainer-portal session (profile lookup, role, trainer-record matching) resolved against the wrong org. **Fix:** replace `orgId` with `useEffectiveRole().effectiveTenantId` as the single source for this context, propagated to every internal query/RPC call. Given the blast radius (23 consumers), this needs its own careful implementation + regression pass, not a quick swap. | ⚠️ diagnosed, escalated — see Decision 6 |
| F2 | `src/components/DemoBootstrapGuard.tsx:36` | `if (user && (!profile \|\| !profile.tenant_id))` | ⬜ **DEAD CODE** — zero consumers of this component found anywhere in `src/` (confirmed via grep). Flag for cleanup, not part of Bug 3. |
| F3 | `src/hooks/useActiveTenantId.ts:33-34` | `if (profile.tenant_id) { setTenantId(...) }` | ⬜ **DEAD CODE, side-find resolved.** Zero consumers anywhere in `src/` (confirmed via grep) — including `TenantContext.tsx`, which the file's own doc comment claims is its sole remaining consumer; that claim is itself stale, `TenantContext.tsx` does not reference this hook. The original side-find question (whether the `profile.tenant_id` fast-path at line 33 is reachable, given a code comment elsewhere types `profile` without a `tenant_id` field) is moot — the whole hook is unreachable. Flag for cleanup, not part of Bug 3. |
| F4 | `src/lib/auth/routeAfterLogin.ts:209` | `if (profile.tenant_id)` post-login routing | ✅ diagnosed — **lower severity than the doc's original flag suggested.** Read the full function: this is the *only* bare `profile.tenant_id` reference in the file, and it sits inside the "user has zero active `tenant_members` rows" branch (lines 205-216) where **both branches of the if/else return the identical `/tenant/select` destination** — it only changes a log message, not the actual routing outcome. Every real routing decision in this file (single-membership auto-select, multi-membership TenantSelect redirect, chosen-membership resolution) already correctly uses `profile.active_tenant_id` (lines 253, 268, 277-303). **Not** "could route a multi-tenant user to the wrong workspace" as originally flagged — this line is a dead-end, cosmetic-only branch. **Fix:** low priority, cosmetic — swap to `active_tenant_id` for consistency, no behavioural risk either way. |
| F5 | `src/components/tenant/TenantGuard.tsx:43,128,176` | ⚠️ **ESCALATED — likely the single highest-blast-radius Bug 3 site in this entire document.** `profile.tenant_id` is the primary "does this user have workspace access" check, used at three points: line 43 (clears a redirect-loop flag), line 128 (**the actual render gate** — children only render if `profile.tenant_id` is truthy, else the user sees loading/error/redirect screens instead), line 176 (loop-breaker check). Confirmed via `AppRoutes.tsx`: `<TenantGuard>` wraps **60+ individual routes** across virtually the entire authenticated app — this is not a page-level concern, it's the app-wide "do you have a workspace" gate. Per Decision 1's own live-data findings, `active_tenant_id` and `tenant_id` genuinely diverge for real accounts (8 diverged Consultant/Consultant Assistant accounts, 1 "portfolio view" Consultant with no `active_tenant_id` at all) — for those users, this gate can render the wrong verdict: e.g. a portfolio-view Consultant (correctly, intentionally, has no single active tenant) still has a legacy `tenant_id` from signup, so this gate would let them straight through to route content as if they had an active workspace, instead of showing a tenant-select prompt. **Separately confirmed: a duplicate, unused file exists** — `src/components/TenantGuard.tsx` (different path, same component name, 65 lines) has **zero importers anywhere** (confirmed via grep on its import path) — the live one is exclusively `src/components/tenant/TenantGuard.tsx`. Flag the orphan duplicate for deletion. **Fix:** replace all three `profile.tenant_id` checks with `useEffectiveRole()`'s `ready`/`effectiveTenantId` — given this wraps 60+ routes, this needs a full regression pass across representative routes before shipping, not a mechanical swap. | ⚠️ diagnosed, escalated — see Decision 6 |

### Category G — Edge functions (server-side, HIGH severity — same class as Category A)

| # | File:line | Detail | Status |
|---|---|---|---|
| G1 | `supabase/functions/fetch-unit-benchmarks/index.ts:142` | Auth comparison uses stale field (`bodyTenantId !== profile.tenant_id`) but this does NOT create a leak — worst case is one unnecessary extra membership-check query. Low priority. | ✅ diagnosed — fix while in file: compare against `active_tenant_id` instead, cosmetic |
| G2 | `supabase/functions/fetch-unit-benchmarks/index.ts:159` | `tenantId = profile.active_tenant_id \|\| profile.tenant_id`. Already prefers the correct field; a membership check runs on whatever is resolved, so real risk is narrow (only the "no active workspace picked" edge case defaults to the wrong org, not arbitrary access). | ✅ diagnosed — fix: drop `\|\| profile.tenant_id`, fail closed (403) if `active_tenant_id` is null |
| G3 | `supabase/functions/generate-audit-pack/index.ts:38,43,55,61` | ⚠️ **RE-DIAGNOSED 27 Jul 2026 — original premise below was wrong, disproven by live data.** Previously believed `profiles.role` is only ever `'super_admin'`/`NULL`. **Live query against the `profiles` table disproves this**: 183 real users currently hold Proper-Case tenant-role strings there (`Administrator`×115, `Compliance Manager`×19, `Trainer/Assessor`×39, `Governing Person`×6, `Student Support Officer`×4) — written by self-service signup, and correctable by a super-admin-only dev tool (`sa_dev_sync_role_mismatch`, confirmed in baseline migration). The function's real, confirmed bug is a **casing mismatch**: line 43 does `!['administrator', 'compliance_manager'].includes(profile.role || '')` — lowercase snake_case — against a field stored Proper Case (`'Administrator'`, `'Compliance Manager'`). A case-sensitive `.includes()` never matches, so this 403s every real Administrator/Compliance Manager caller, confirmed, not theoretical. **Separately, and still real:** `profiles.role` is also a stale snapshot — same bug class as `profiles.tenant_id` (this doc's own subject). Live query confirms **27 real users today** have `profiles.role` diverged from their active tenant's true, current `tenant_members.role` (set once at signup/manual-fix, never kept in sync afterward — `accept_tenant_invitation` RPC confirmed to not touch it). So a casing-only fix on this same field would still leave those 27 users with a wrong verdict. **Verified correct fix, already used elsewhere in this codebase** (`supabase/functions/tas-export-pdf/index.ts:78-94`): bypass when `profile.role === 'super_admin'` (that value is reliable — only ever set for Vivacity staff), else query `tenant_members.role` fresh for the caller's tenant, `status='active'`, against Proper Case `['Administrator', 'Compliance Manager']`. This single fix resolves both the casing bug and the staleness bug at once, since `tenant_members` is the live source of truth. Also read `profile.tenant_id` at line 38/55/61 — same Bug 3 shape, fix alongside. | ✅ diagnosed, unblocked — role-gate fix and `tenant_id`→`active_tenant_id`/membership-verified fix land together in the same PR, no longer sequenced |
| G4 | `supabase/functions/pre-release-check/index.ts:119` | Only ever selects/reads `tenant_id`, no `active_tenant_id` awareness at all. Standard case. | ✅ diagnosed — fix: select and use `active_tenant_id`, fail closed (400) if null, no fallback |
| G5 | `supabase/functions/tga-check-supersession/index.ts:254` | Verified: code already selects `active_tenant_id` only, no `tenant_id` fallback. Already correctly fixed by someone previously — comment describes intent accurately. | ✅ no action needed — already correct |
| G6 | `supabase/functions/generate-board-report/index.ts:29,36,40,49` | ⚠️ **RE-DIAGNOSED 27 Jul 2026 — twin of G3, identical evidence and fix.** Line 36 has the exact same lowercase-vs-Proper-Case bug as G3 (`!['administrator', 'compliance_manager'].includes(profile.role || '')`), confirmed via the same live-data evidence in G3's row: `profiles.role` does hold Proper Case tenant-role strings for real users, so the casing mismatch guarantees 403 for every real Administrator/Compliance Manager, and separately `profiles.role` is a stale snapshot that can diverge from the caller's true current tenant role (27 live examples, see G3). Also reads stale `profile.tenant_id` at lines 29, 40, 49. **Fix:** identical to G3 — bypass for `profile.role === 'super_admin'`, else query `tenant_members.role` fresh (`status='active'`) against Proper Case `['Administrator', 'Compliance Manager']`, matching `tas-export-pdf/index.ts:78-94`; swap `tenant_id` reads to `active_tenant_id`/membership-verified. | ✅ diagnosed, unblocked — same PR as G3 |
| G7 | `supabase/functions/trial-metrics/index.ts:56` | Same shape as G2 — already prefers `active_tenant_id`, membership check runs afterward, so risk is narrow (portfolio-view edge case only). | ✅ diagnosed — fix: drop `\|\| profile.tenant_id`, fail closed if null |
| G8 | `supabase/functions/upgrade-trial/index.ts:74` | Only reads `tenant_id`. No role/membership check on this endpoint at all (separate authorization gap, not fixed here unless asked). Risk is narrower than a true cross-tenant leak — it can only ever affect one of the caller's own tenant memberships (the stale one), not an arbitrary tenant. | ✅ diagnosed — fix: use `active_tenant_id`, fail closed if null; authorization gap flagged separately, not in this fix |
| G9 | `supabase/functions/seed-registers/index.ts:95` | Only used as a fallback when body doesn't supply `orgId`; a real authorization gate (super_admin OR active Administrator of the resolved org) runs afterward, so a stale fallback here only risks defaulting to the wrong one of the user's own orgs. | ✅ diagnosed — fix: use `active_tenant_id` for the fallback, fail closed if null |

---

## Incidental bugs surfaced while diagnosing (not Bug 3 itself — flagged, not silently fixed)

Found in-passing while reading each Category A file's actual current source. Each is a real, separate
defect against this repo's own hard rules (`CLAUDE.md`/`AGENTS.md`) — not folded into the tenant-id swap
fix for the file it was found in. Brian's call on whether/when to fix; listed here so they aren't lost.

| Found in | Location | Bug | Rule violated |
|---|---|---|---|
| A5 | `src/hooks/useConsultationRecords.ts:134,180` | `.single()` instead of `.maybeSingle()` | Banned pattern — throws on 0 rows |
| A6 | `src/hooks/useConsultationPlans.ts:149,184` | `.single()` instead of `.maybeSingle()` | Banned pattern — throws on 0 rows |
| A7 | `src/components/dashboard/DashboardOverviewCards.tsx` (8+ queries) | Direct `supabase.from()` calls inside the component body | Banned pattern — data fetching belongs in hooks, not components |
| A9 | `src/pages/Index.tsx:167` | `.single()` instead of `.maybeSingle()` | Banned pattern — throws on 0 rows |
| C8 | `src/pages/registers/tas/index.tsx:325` | `.single()` instead of `.maybeSingle()` | Banned pattern — throws on 0 rows |
| C9 | `src/pages/registers/ien/index.tsx:277` | `.single()` instead of `.maybeSingle()` | Banned pattern — throws on 0 rows |

This list grows as later categories (D-remainder, E, F, G) are worked — append rows here, don't
scatter them only inside each category table's Status cell.

## Explicitly out of scope for this file

- **~105 write/insert-stamp sites** (`tenant_id: profile.tenant_id` in `.insert()` payloads, not counting
  the `generateCustomId` sub-group above which is tracked). Logged as a separate, lower-priority
  data-integrity cleanup — not tracked item-by-item here.
- Confirming `useActiveTenantId.ts`'s `profile.tenant_id` typing question (side-find above) — small,
  standalone, fold into F3 when that item is worked.

---

## Locked decisions (populate one at a time as each item/group above is worked)

### Decision 1 — Implementation approach: route through existing resolution helpers, never a blind column swap

**Locked.** For every site in Categories A-G, the fix is NOT a find-and-replace of `profile.tenant_id` →
`profile.active_tenant_id`. Each site must be repointed to the codebase's existing, already-proven
tenant-resolution path instead:
- **Frontend (React hooks/components):** `useEffectiveRole().effectiveTenantId`
- **Frontend (non-hook utility/service code):** the `currentTenantId()` utility
- **Edge functions:** read `profiles.active_tenant_id` directly (no fallback to `profiles.tenant_id`),
  or better, require an explicit verified `tenant_id` from the caller and check it against
  `tenant_members` (`status='active'`) per the codebase's own standard edge-function pattern — do not
  invent new resolution logic per site.

**Why:** confirmed via live DB query (`profiles` table, `gdwhlstfguxarnxasrrs` project) that
`active_tenant_id` is not a simple 1:1 safe substitute for `tenant_id` in 100% of cases — there is at
least one live edge case (a multi-tenant Consultant account with no `active_tenant_id` set at all, i.e.
"portfolio view," 20 active memberships) where a naive column swap changes behaviour from "silently
shows the wrong tenant's data" to "shows nothing until a workspace is picked." That's the safer,
correct outcome (fail-closed, not fail-wrong) — but it's exactly the kind of edge case the existing
`useEffectiveRole()`/`currentTenantId()` helpers already handle correctly (including the "single
membership → auto-repair `active_tenant_id`" logic already observed in `AppContext`), because they're
already used successfully everywhere else in the app. A blind per-site column swap risks
re-introducing a different, undiscovered version of this same bug class 90 separate times, each with
its own chance of getting an edge case wrong. Routing every site through the same trusted helper avoids
that.

**Verified safe for the common case:** live query confirmed all 180 single-tenant-membership accounts
already have `active_tenant_id` populated identically to `tenant_id` (via existing auto-repair logic) —
so this fix causes zero behaviour change for the vast majority of users. 32 accounts with zero tenant
memberships are unaffected either way (no tenant data to show regardless of which field is read). Only
the 1 "portfolio view" account (and the 8 currently-diverged Consultant/Consultant Assistant accounts
described in the Reality-of-the-issue findings above) see any behaviour change, and in every case it's
a fix, not a regression.

**Sequencing:** this decision governs HOW every subsequent per-item fix in Categories A-G is
implemented. Per-item diagnosis (which exact call site needs which exact resolution helper, and
whether the surrounding code has hook access or needs the async utility) continues one group at a
time below, per the living-doc workflow — this decision does not itself close out any Category A-G
item's status, which stays ⬜ until worked individually.

### Decision 2 — Category G (edge functions) + D8/D9/D10 (invite/update/deactivate RPCs): diagnosed individually, confirmed non-uniform

**Locked.** Verified all 9 Category G edge functions and D8/D9/D10 directly against current source (not
Scout's summary alone). Confirms the "no uniform fix" call: severity and correct fix shape differ
site-by-site, not one pattern:

- **G5 already correct, no fix needed** — already reads `active_tenant_id` exclusively.
- **G2, G4, G7, G8, G9** — real, standard shape: read/prefer `active_tenant_id`, remove any fallback to
  stale `tenant_id`, fail closed (403/400) if `active_tenant_id` is null, rather than silently
  defaulting to a possibly-wrong tenant.
- **G1** — real but low severity (extra redundant query, not a leak) — fix opportunistically while in
  the file.
- **G3 and G6 — re-diagnosed 27 Jul 2026, see their own rows for full evidence.** Both have a
  casing-mismatch bug (`profile.role` compared lowercase against a field stored Proper Case) that
  guarantees 403 for every real Administrator/Compliance Manager, plus `profiles.role` is separately
  confirmed (via live query) to be a stale snapshot that can diverge from the caller's true current
  tenant role (27 live examples) — **not** "platform-level only," which was the original, disproven
  premise. Verified fix already exists elsewhere in this codebase (`tas-export-pdf/index.ts:78-94`):
  check `tenant_members.role` fresh, Proper Case. Both functions' role-gate fix and their own stale
  `tenant_id` fix now land together in the same PR — no longer sequenced/blocked on each other.
- **D8, D9, D10 — REVISED after deeper diagnosis: all three are dead code, not live bugs.** Confirmed
  via grep across all of `src/` that `useInviteUser.ts` (D8), `useUpdateUser.ts` (D9), and
  `useDeactivateUser.ts` (D10) have **zero component consumers** anywhere in the app — only
  self-references and a barrel re-export (`src/hooks/user-management/index.ts`) that nothing else
  imports from. The real, live user-management flow runs through a completely separate hook,
  `src/hooks/useUserManagementAdmin.ts` (consumed by `src/components/admin/people/UsersHubDrawersModals.tsx`),
  which **already correctly uses `useEffectiveRole().effectiveTenantId`** for every mutation —
  deactivate, reactivate, role updates, profile updates, invitations, audit log, all of it. Confirmed
  the RPC definitions too: `deactivate_tenant_user`/`reactivate_tenant_user` were hardened in
  `20260722110641_harden_user_management_rpcs.sql` (require `p_performed_by = auth.uid()` + active
  tenant-role membership in the passed `p_tenant_id`, not just any authenticated caller), and
  `invite_user`'s current definition (`20260618110500_fix_qi_ids_rollup_and_invite_role_ceiling.sql`)
  independently verifies the caller's `tenant_members` role against `p_tenant_id` with role-ceiling
  checks (only Administrators can invite Administrators, etc.) — so even where these RPCs are called
  from the dead D8/D9/D10 hooks, they wouldn't grant unauthorized cross-tenant access; worst case was
  always "acts on the wrong one of the caller's own orgs," never someone else's org, and moot anyway
  since nothing calls them. `admin_update_user` (D9's RPC) is separately notable: two overloaded
  baseline versions, both gated to Super Admin only, one still referencing the banned legacy
  `organization_members`/`organisation_id` tables — neither was touched by the 22 Jul 2026 hardening
  pass. **Conclusion: no fix needed for D8/D9/D10 as a security matter** — flagged instead as
  dead-code cleanup (delete the orphaned hooks, or fix them for consistency if there's a reason to keep
  them around) — Brian's call, not urgent.

**Next up:** remaining categories (A, B, C, D1-D7, E, F) still need the same per-item verification
before any fix is locked — do not batch-assume the same shape found here applies to those.

### Decision 3 — D1/D2/D3/D4/D7 are a separate, more severe bug class than Bug 3 — same branch, own migration, plan only (not yet implemented)

**Locked.** While diagnosing D1-D7, found that `get_rto_settings`, `upsert_rto_settings`,
`complete_onboarding_step`, and `store_trainer_credential` (D1/D2, D3, D4, D7) have **zero server-side
authorization on their `p_tenant_id` parameter at all** — not just "trusts the caller's own stale
tenant_id," but "trusts ANY tenant_id from ANY authenticated caller," matching the exact banned pattern
in `AGENTS.md` ("trusting a client-supplied tenant_id for authorization"). This is more severe than Bug
3 itself: today, any authenticated user with API access (not just a normal UI flow) could call these
RPCs directly with an arbitrary tenant_id and read another tenant's RTO settings/ABN/ACN/CEO details,
or write to another tenant's onboarding progress or trainer credentials.

**Brian's call (this session): stays in the same branch (`fix/cross-tenant-batch-2`) regardless of
severity** — not split into a separate branch/PR.

**Implementation plan locked (not yet written as an actual migration file — this happens in the
implementation session once every item in this doc is worked through):**
- One new migration hardens all four RPCs together:
  - `get_rto_settings` (read): guard requires `sec.is_super_admin()` OR any active `tenant_members` row
    for the caller in `p_tenant_id` (broad membership, no specific role — this is a read).
  - `upsert_rto_settings` + `complete_onboarding_step` (writes, called together from the same
    `saveSection` function): guard requires `sec.is_super_admin()` OR an active `tenant_members` role
    in `OPERATIONAL_WRITE_ROLES` (`Administrator`, `Compliance Manager`, `Governing Person`,
    `Consultant`, `Consultant Assistant` — confirmed via `src/lib/permissions/roleGates.ts`, exactly
    matches this call site's existing client-side gate `useCanEditTenantSettings`, so zero behaviour
    change for legitimate users).
  - `store_trainer_credential` (write): same `OPERATIONAL_WRITE_ROLES` guard, plus bind
    `p_actor_id = auth.uid()` when provided (audit-forgery prevention, matching the precedent already
    set in `20260722110641_harden_user_management_rpcs.sql`).
  - Each function's `CREATE OR REPLACE` must preserve 100% of its existing business logic — only adding
    the guard at the top, per this repo's own migration rule ("`CREATE OR REPLACE` must re-implement
    every guard the live function already has — read the current definition before replacing").
    `get_rto_settings` requires converting from `LANGUAGE sql` to `plpgsql` to hold the guard; its
    existing SELECT logic (tga_snapshot contact lookups, branding/onboarding joins) carries over
    unchanged.
- Frontend fixes (Bug 3's own scope, bundled into the same PR): swap `profile.tenant_id` →
  `useEffectiveRole().effectiveTenantId` in `RTOSettingsForm.tsx` (D1, D3, D4) and `RTOSettings.tsx`
  (D2). D7's frontend hook is dead code, no swap needed.
- This migration must go through the same branch-DB validation and idempotency requirements as any
  other migration in this repo (`supabase/migrations/CLAUDE.md`) — not written yet, this is the plan
  for whoever implements it.

### Decision 4 — D6 (`auto_create_governance_entry`): rebuild, but as a separate session/batch, not this branch

**Locked (Brian's call).** The missing `auto_create_governance_entry` RPC (see D6 row above for full
diagnosis) will be rebuilt from scratch against the current schema — not resurrected from the archived
Lovable-era version, which is off-limits to reference per `supabase/migrations/CLAUDE.md`. This is
explicitly deferred to its own separate session and its own separate implementation batch — it is a
missing-feature/functional bug, not a tenant-leak issue, and does not belong in `fix/cross-tenant-batch-2`.
No further work on D6 happens in this branch or this doc beyond what's already logged.

### Decision 5 — `profiles.role` is a stale snapshot field (same bug class as `profiles.tenant_id`), affects B4/B5/G3/G6 — corrected 27 Jul 2026 after an initial wrong diagnosis

**Locked, and this supersedes an earlier version of this decision that was wrong.** While diagnosing
B4/B5, the first pass concluded `profiles.role` is "never `'Administrator'`/`'Compliance Manager'`,"
based on migration-text grep alone. **That premise was disproven by a live query and is retracted.**
The corrected, verified picture:

- **Live query against `public.profiles`** (`gdwhlstfguxarnxasrrs` project) shows 183 real users
  currently hold Proper-Case tenant-role strings in `profiles.role`: `Administrator`×115, `Compliance
  Manager`×19, `Trainer/Assessor`×39, `Governing Person`×6, `Student Support Officer`×4 (plus
  `super_admin`×8, `Consultant`×8, `Consultant Assistant`×2, `NULL`×35). This directly contradicts both
  the retracted B4/B5 claim above **and** the separately-locked G3 finding's original premise
  ("`profiles.role` is platform-level only, ever `'super_admin'` or `NULL`") — G3 and G6 have been
  independently re-diagnosed and corrected in their own rows/Decision-2 note.
- **Code-level confirmation:** `AuthContext.tsx:293` shows `userProfile.role = profileData.role` is a
  direct, unmodified passthrough of the raw `profiles.role` column for any user with a profile row (the
  large majority) — no client-side enrichment from `tenant_members` happens for this value.
- **How it gets populated:** self-service signup writes a real tenant-role string directly to
  `profiles.role` at signup time. `accept_tenant_invitation` (the invite-acceptance RPC) does **not**
  touch `profiles.role` at all — confirmed by reading its full body. There is also a super-admin-only
  dev tool, `sa_dev_sync_role_mismatch(p_user_id, p_tenant_id, p_direction, p_role)`, whose sole purpose
  is manually patching divergence between `profiles.role` and `tenant_members.role` — its mere
  existence confirms this divergence is a known, anticipated failure mode of the schema, not a
  theoretical one.
- **Confirmed live and current, not just possible:** `SELECT count(*) FROM profiles p JOIN
  tenant_members tm ON tm.user_id = p.id AND tm.tenant_id = p.active_tenant_id WHERE p.role IS DISTINCT
  FROM tm.role` returns **27** — 27 real users today have `profiles.role` genuinely out of sync with
  their own active tenant's true, current `tenant_members.role`.

**Net conclusion:** `profiles.role` is the exact same "stale legacy snapshot, never kept in sync"
pattern as `profiles.tenant_id` — this whole document's subject — just for role instead of tenant. Any
frontend or edge-function code that authorizes off `profile.role` directly (rather than a live
`tenant_members`/`useEffectiveRole()` lookup) inherits this staleness risk. Three call sites in this
document are affected, with two distinct failure shapes:

- **B4/B5** (`SendToRiskModal.tsx:57`, `SendToCIModal.tsx:56`): `RISK_ALLOWED_ROLES`/`CI_ALLOWED_ROLES`
  are already Proper Case, matching how the field is actually stored — **no casing bug**. These gates
  work correctly for the ~156 users whose `profiles.role` happens to currently match their real tenant
  role, and give a **wrong verdict (grant or deny) for the 27 who've diverged**, with silent drift for
  any future user whose tenant role changes after signup.
- **G3/G6** (`generate-audit-pack`, `generate-board-report`): compare against **lowercase**
  `'administrator'/'compliance_manager'` against a field stored Proper Case — a guaranteed,
  100%-of-the-time rejection for every real Administrator/Compliance Manager, regardless of whether
  their `profiles.role` happens to be in sync or not. Casing bug **and** staleness bug, stacked.

**Not a security gap** in either shape (unlike D1-D7) — all four fail closed or incorrectly, never grant
unauthorized cross-tenant access. Functional-correctness bugs, not authorization bypasses. All four stay
in this same branch, since they were found while diagnosing Bug 3's own items and share the same files/PR.

**Verified correct fix pattern (already implemented once in this codebase — not a new pattern to
invent):** `supabase/functions/tas-export-pdf/index.ts:78-94` — bypass when `profile.role ===
'super_admin'` (that value **is** reliable; only ever set for Vivacity staff), else query
`tenant_members.role` fresh for the caller's tenant, `status='active'`, against Proper Case role
strings. Frontend equivalent: `useEffectiveRole().effectiveRole`, confirmed backed by the
`get_my_app_context()` RPC, which sources role fresh from `tenant_members` (`v_tenant_role ... FROM
public.tenant_members tm`) — never from `profiles.role`.

**Implementation plan (not yet written — for the future implementation session):**
- B4/B5: replace `profile.role` in `canCreateRisk`/`canCreateCI` with `useEffectiveRole().effectiveRole`.
  Fix in one shared place if practical (small shared hook/util both modals call), so the two files don't
  diverge again the way they already have (identical `ALLOWED_ROLES` arrays duplicated verbatim).
- G3/G6: replace the lowercase `.includes()` check with the `tas-export-pdf`-style
  super_admin-bypass-then-`tenant_members`-lookup pattern, Proper Case.
- Bundle all four into the same PR as their respective tenant-id swap fixes — same files, same session.
- Update the stale `project_generate_audit_pack_role_bug` memory file, which repeats the original wrong
  premise (`profiles.role` is "platform-level only... per `rto-compass-hub/CLAUDE.md`'s own documented
  role model") — that memory should be corrected or superseded so future sessions don't re-inherit the
  same wrong assumption from memory instead of from this doc.

### Decision 6 — F1/F5 (`TrainerPortalContext`, `TenantGuard`): the two highest-blast-radius sites in this entire document, both underestimated by the original Scout sweep

**Locked.** Category F's original one-line-per-item categorization badly understated both of these —
they aren't simple ready-checks, they're core app-gating logic with far larger reach than any Category
A-E site:

- **F1 (`TrainerPortalContext.tsx`)** — `orgId = profile?.tenant_id` isn't just a ready-check flag, it's
  threaded through the tenant role fetch, the trainer-profile RPC lookup, an email-fallback lookup, and
  insert payloads, then exposed directly on the context value to **23 downstream consumers**. Mounted via
  `TrainerRouteWrapper.tsx`/`TrainerRoute.tsx` — the guard for the entire trainer-portal section of the
  app.
- **F5 (`TenantGuard.tsx`)** — `profile.tenant_id` is the literal render gate (`if (isSuperAdmin ||
  profile?.tenant_id) return children`) wrapping **60+ individual routes** in `AppRoutes.tsx` — this is
  the closest thing this app has to a single global "does this user have workspace access" checkpoint.

**Why this matters more than severity alone:** every other site in this document is "this one query/page
might show stale data." These two are "this gate decides whether large sections of the app render at
all, for a stale-vs-live distinction that's already confirmed to diverge for real accounts" (Decision 1's
8 diverged Consultant/Consultant Assistant accounts + 1 portfolio-view account). Because `TenantGuard`
wraps so much surface area, a fix here interacts with the fix for every other site in this document — if
`TenantGuard` incorrectly lets a portfolio-view user through as "has an active tenant," but a
now-correctly-fixed child hook (using `effectiveTenantId`) correctly detects no active tenant and shows
its own empty/prompt state, that's an inconsistent-but-safe UX gap. If `TenantGuard` is fixed but a child
hook is *not yet* fixed (still reading `profile.tenant_id` directly), the two could disagree in the
other direction. **Sequencing implication: F1/F5 should not be treated as "just two more rows" — verify
against a representative sample of the routes each wraps/serves after the fix, not just a type-check.**

**Not a security gap** — both fail toward showing the wrong *own* workspace or a redirect/prompt, never
another tenant's actual data (RLS still applies underneath). Functional-correctness/UX-consistency bugs,
same category as F4/Decision 5, just far larger in reach.

**Implementation plan (not yet written — for the future implementation session):**
- F1: replace `orgId` with `useEffectiveRole().effectiveTenantId` as the single source for
  `TrainerPortalContext`, propagated into every internal query/RPC/insert that currently reads `orgId`.
  Because 23 files consume this context, smoke-test a representative sample (at minimum: the
  trainer-profile lookup flow and the tenant-role-derived `isTrainer`/`isAdminOrCM` gates) after the fix.
- F5: replace all three `profile.tenant_id` checks (lines 43, 128, 176) with `useEffectiveRole()`'s
  `ready`/`effectiveTenantId`. Given the 60+ routes wrapped, spot-check at least one route from each
  major section (dashboard, registers, governance, settings) post-fix rather than assuming uniform
  behaviour.
- Delete the orphaned duplicate `src/components/TenantGuard.tsx` (zero importers, confirmed) — separate,
  trivial cleanup, can bundle into the same PR.
- Both land in this same branch/PR as every other Bug 3 fix — no reason to split, but call out in the PR
  description that these two carry more regression risk than a typical single-file swap.

---

## Flagged for a future batch — NOT part of this branch (Brian's call, needs separate sign-off)

### `rto-compass-hub/CLAUDE.md` — "Roles and permissions" section has a factually wrong claim

Found while diagnosing Decision 5 above. The team-wide, checked-into-git `CLAUDE.md` file (Carl-owned,
authoritative for all contributors/AI tools) states `profiles.role` is "platform-level only" and "ever
`'super_admin'` or `NULL`." **This is disproven by a live query** — see Decision 5 for full evidence:
183 real users currently hold Proper-Case tenant-role strings in `profiles.role` (`Administrator`×115,
`Compliance Manager`×19, etc.), and 27 of them have that value diverged from their actual current
`tenant_members.role`.

**Why this is a separate task, not part of this branch:** `CLAUDE.md` is standing, team-wide guidance —
not a personal working doc or memory file. Editing it changes what every future contributor (human or
AI) is told is true about the role model, so it needs Brian's explicit sign-off before changing, per
this workspace's own guardrail on touching shared/authoritative docs. Not urgent enough to block this
branch's own PR.

**Proposed correction (not yet made — for a future small batch, possibly bundled with other doc
cleanup):**
- Remove or correct the claim that `profiles.role` is platform-level-only/`super_admin`-or-`NULL`.
- Add a note that `profiles.role` is a signup-time snapshot that is **not** kept in sync with
  `tenant_members.role` afterward, and should never be used directly for tenant-level authorization —
  point to `useEffectiveRole().effectiveRole` (frontend) / a fresh `tenant_members` lookup (edge
  functions) as the correct source, same as the existing guidance for `profiles.tenant_id`.
- Consider whether the existing `❌ BANNED — stale home-org field after Enter Workspace / org switch`
  example block should get a sibling example for the equivalent `profiles.role` staleness pattern, since
  it's the identical bug class and future contributors are as likely to repeat it as the `tenant_id` one.

---

## Separately confirmed safe to implement now (not blocked on Bug 3)

### Table #14 — `doc_review_actions`
Confirmed via Scout: one read call site (`src/components/documents/DocumentReviewPanel.tsx:56`, no
tenant filter — same defence-in-depth patch as other 13 tables). Both SECURITY DEFINER RPCs
(`reviewer_approve_document`, `reviewer_request_changes`, baseline migration ~line 63751/63870)
correctly derive `tenant_id` from the parent document record, not caller input. No UI writes exist.
Plan (from `crosstenantleak.md`, unchanged): `RESTRICTIVE FOR ALL` policy (not `FOR SELECT`-only, since
this table has no existing tenant-scoped UPDATE/DELETE policy at all) —
`USING (sec.is_super_admin() OR tenant_id = sec.current_tenant_id())`, idempotent. Plus the
`DocumentReviewPanel.tsx:56` app-layer filter as defence-in-depth.

### Bug 2 — `ai-router` tenant lookup crash
Confirmed via Scout, `supabase/functions/ai-router/index.ts:774-789`. `.single()` on a `tenant_members`
lookup (line 778) and a `profiles` role lookup (line 787) — throws for any user without exactly one row
(0 or 2+), silently swallowed by an enclosing try/catch (not a hard crash as originally described, a
silent degradation to `tenantId = null` / `userRole = null`). Fix: `.maybeSingle()` on both, plus require
an explicit verified tenant selector rather than assuming single membership (per `AGENTS.md`'s
"never assume `memberships.length === 1`" rule).

**Both ready to implement whenever — not waiting on Bug 3's per-item diagnosis.**
