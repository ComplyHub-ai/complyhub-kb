# Cross-Tenant Data Leak — P0

> Living doc per the workspace living-doc workflow (`CLAUDE.md` § Living-doc workflow). One source of
> truth for this body of work. A brand-new chat should be able to read this file cold and go straight to
> fix planning.
>
> Originating ticket: `f0452ccd-eb14-44f0-a7dc-1c02f65c9989` (Triquetra, "Confidentiality issue",
> reported by Sharwari Rajurkar, 8 Jul 2026). See `support-tickets-triage.md` for the full ticket list
> this was pulled from.

## ✅ IMPLEMENTATION STATUS — 24 Jul 2026

**The 13-table batch (+ Bugs 1, 4, 5, 6) is fully shipped and verified in production.**

- ✅ PR [#310](https://github.com/ComplyHub-ai/rto-compass-hub/pull/310) merged to `main` (24 Jul 2026)
- ✅ Migration `20260723233725_restrict_select_current_tenant_registers.sql` applied to production —
  all 13 `RESTRICTIVE FOR SELECT` policies verified live via `pg_policies` (correct `qual`, correct table
  set)
- ✅ Migration ledger repaired and verified — `supabase_migrations.schema_migrations` row confirmed
  matching (`version=20260723233725`, `name=restrict_select_current_tenant_registers`)
- ✅ All 7 edge functions deployed to production and spot-verified (`tenant-documents-list`,
  `clause-matcher`, `generate-meeting-pack`, `ci-overdue-check`, `generate-task-suggestions`,
  `bulk-ai-document-tagging`, `tas-export-pdf`) — auto-deployed on merge via `deploy-edge-functions.yml`
- ✅ Security advisors re-run post-migration — no new findings tied to any of the 13 tables/policies
- ⬜ **Still outstanding:** the live-session browser checks from the verification plan (real multi-tenant
  consultant session showing only active-workspace rows; `TenantDocuments.tsx` still rendering for a
  genuinely-permitted client tenant; NULL-workspace user seeing zero rows) — these need an actual logged-in
  session and haven't been run yet.

**Deferred to a second, later batch:** Table #14 (`doc_review_actions`), Bug 2 (`ai-router` crash), Bug 3
(stale-tenant_id sweep) — not started.

---

## REALITY OF THE ISSUE

- **The reported symptom:** a consultant logged into the Triquetra workspace was shown documents
  belonging to other tenants (including TTS and NewCastle) in the Document Repository screen —
  reported as a confidentiality issue.

- **Two separate, stacked root causes — not one:**
  1. **App-layer:** `src/components/documents/AdminDocumentRepository.tsx`, `fetchDocuments()`
     (~lines 226-244) queries the `documents_register` table with no `.eq('tenant_id', tenantId)`
     filter — unlike the other two queries in the same file (`tenants`, `billing_subscriptions`,
     ~lines 201/211), which do filter by `tenantId`. This query relies entirely on the database's RLS
     to scope the result.
  2. **Database-layer (the real, deeper problem):** a shared Postgres RLS policy named `billing_gate`
     is attached to every one of the 14 tables below. Its condition is:
     ```sql
     sec.user_in_tenant(tenant_id) AND sec.tenant_is_active(tenant_id)
     ```
     `sec.user_in_tenant()` was read directly from the live database (`pg_get_functiondef`):
     ```sql
     SELECT sec.is_super_admin()
         OR EXISTS (SELECT 1 FROM public.tenant_members tm
                    WHERE tm.tenant_id = p_tenant_id AND tm.user_id = auth.uid())
     ```
     It checks **"does a `tenant_members` row exist for this user in this tenant, at all"** — it never
     checks which workspace the user currently has selected (that's a separate function,
     `sec.current_tenant_id()`, which correctly resolves the active workspace via JWT claim or
     `profiles.active_tenant_id`), and it never checks whether the membership `status` is still
     `active`.

- **Why this is a real leak and not just a missing app-side filter:** Postgres evaluates multiple
  `PERMISSIVE` RLS policies on the same table with logical OR — if any one of them says yes, the row
  is returned. `billing_gate` is present on all 14 tables as a `PERMISSIVE`/`ALL` policy, so it grants
  access independent of every other policy on the table, including on the two tables
  (`llnd_assessments`, `suitability_results`) whose own dedicated policy is written correctly
  (`tenant_id = sec.current_tenant_id()`). Verified directly against `pg_policies` for all 14 tables —
  this is not the "screen forgot to filter but RLS would have caught it anyway" case; the database
  itself will hand back another tenant's rows regardless of what the screen asks for.

- **Confirmed against a real account, not just the policy logic in the abstract:** queried a live
  consultant account (`user_id 27931eb7…`) with 20 tenant memberships, currently working in workspace
  `b262c789…`. For 17 of their other 19 tenants — including Triquetra (`f5850faf…`) itself — both
  `billing_gate` conditions (membership exists + tenant billing active) evaluated `true`, entirely
  independent of which workspace was actually selected. This proves the leak is live and exploitable
  today by a real account, not theoretical.

- **14 confirmed affected tables** (verified live via `pg_policies`; a 15th candidate,
  `document_notification_service`, was checked and does not exist — dropped as a false positive):

  | Table | What it holds |
  |---|---|
  | `documents_register` | Compliance documents (the originating ticket) |
  | `document_standards_mapping` | Which documents satisfy which regulatory Standard |
  | `audit_findings` (public schema) | Internal/external audit findings |
  | `audit_reports` | Audit report records |
  | `audit_tasks` | Action items from audits |
  | `caa_register` | Complaints & Appeals |
  | `appeals` | Student appeals — leakiest policy found, doesn't check membership `status` at all |
  | `adc_register` | Annual Declarations (CEO/governance sign-off) |
  | `ci_register` | Continuous Improvement (risk assessments, improvement plans) |
  | `ien_register` | Industry Engagement |
  | `llnd_assessments` | Student Language/Literacy/Numeracy/Digital assessments |
  | `suitability_results` | Student suitability assessment outcomes |
  | `air_register` | Audit Implementation (tracks whether findings were fixed) |
  | `doc_review_actions` | Document review workflow actions |

  Note: a separate `compliance.audit_findings` table exists with correct RLS
  (`sec.current_tenant_id()`-scoped), but it is dead code from the frontend's perspective — no client
  code sets `db.schema`, so the app never queries it. Not a mitigating factor.

- **Who can actually exploit this today (live data, not estimated):**

  | Role | Accounts with multi-tenant membership |
  |---|---|
  | Consultant | 222 |
  | Administrator | 3 |
  | Trainer/Assessor | 2 |

  All 227 of these accounts' multi-tenant membership rows are currently `status = 'active'` — the
  additional "even a removed/deactivated member could still see it" gap (from `user_in_tenant()` and
  the inline `appeals` policy not checking `status`) is a real, latent hole in the code but is not
  currently being triggered by any live inactive row in production.

- **What's supposed to happen vs. what's happening (plain English):** A consultant opens Triquetra's
  workspace and the screen should ask the database "only give me documents that belong to Triquetra."
  Only Triquetra's documents should come back. Instead, the screen never asks that question — it just
  asks for "documents," trusting the database's safety net. That safety net doesn't check "which
  organisation is this person currently working in" — it checks "has this person ever had membership
  in any organisation that owns this document." Since consultants legitimately belong to many
  organisations at once, the safety net waves through every organisation they belong to, not just the
  one they're currently viewing. The same shared safety-net rule sits on 13 other types of records
  beyond documents — including student assessments, complaints, audit findings, and governance
  declarations — so the same exposure applies there too, confirmed directly against the live database
  rather than assumed from the pattern.

- **Scope note:** this was expanded from the single-ticket symptom into a full P0 investigation at
  Brian's direction, given the systemic nature of the finding.

---

## PLAN OF ACTION — Table #1 (`documents_register`) — ✅ SHIPPED

> Scope: this plan covers **`documents_register` only** — the first of the 14 confirmed tables, and
> the one behind the originating ticket. The other 13 tables are separate, later items (each may have
> different call sites/screens depending on it — not assumed to be identical to this one). The shared
> `billing_gate`/`sec.user_in_tenant()` platform-wide fix stays a separate, later project — not solved
> per-table.
>
> **Locked sequencing for the remaining 13 tables:** investigate and lock a decision + concrete fix
> plan for each of the 13 one at a time (same depth as `documents_register` above — Scout sweep for
> call sites, confirm intentional-vs-accidental cross-tenant reads, verify workspace-definition parity
> where relevant to that table's screens). **No implementation starts until all 13 are locked.** Once
> every table has a locked plan in this file, all 14 fixes (this one included) are implemented together
> in one pass. Tracker below.

### 14-table tracker

| # | Table | Status |
|---|---|---|
| 1 | `documents_register` | ✅ **SHIPPED** — migration applied + verified in production |
| 2 | `document_standards_mapping` | ✅ **SHIPPED** — migration applied + verified in production |
| 3 | `audit_findings` (public) | ✅ **SHIPPED** — migration applied + verified in production |
| 4 | `audit_reports` | ✅ **SHIPPED** — migration applied + verified in production |
| 5 | `audit_tasks` | ✅ **SHIPPED** — migration applied + verified in production |
| 6 | `caa_register` | ✅ **SHIPPED** — migration applied + verified in production |
| 7 | `appeals` | ✅ **SHIPPED** — migration applied + verified in production |
| 8 | `adc_register` | ✅ **SHIPPED** — migration applied + verified in production |
| 9 | `ci_register` | ✅ **SHIPPED** — migration applied + verified in production |
| 10 | `ien_register` | ✅ **SHIPPED** — migration applied + verified in production |
| 11 | `llnd_assessments` | ✅ **SHIPPED** — migration applied + verified in production |
| 12 | `suitability_results` | ✅ **SHIPPED** — migration applied + verified in production |
| 13 | `air_register` | ✅ **SHIPPED** — migration applied + verified in production |
| 14 | `doc_review_actions` | ⬜ **DEFERRED — second batch** (see below; Brian's call, 24 Jul 2026) |

**13 of 14 tables shipped as one pass (PR #310, merged + migration applied + verified 24 Jul 2026).**
Table #14 is deliberately excluded from this batch — see below.

### Locked decisions

1. **Scope: read-only fix now, writes deferred.** This pass locks down *who can see* documents
   cross-tenant, not *who can edit/delete* them. Editing/deleting relies on separate, role-gated write
   policies not yet investigated for this same leak shape — bundling that in now would require also
   reworking `TenantDocuments.tsx`'s bulk write/delete paths, a bigger, riskier change. Reserved as a
   later, separate batch.
2. **Super-admin access: leave untouched.** The new DB rule will include an explicit
   `sec.is_super_admin() OR …` carve-out so Vivacity staff (super_admin) access continues to be
   governed solely by the existing `restrict_sa_select_documents_register` policy — no change to SA
   behaviour in this pass.
3. **`TenantDocuments.tsx` fix approach: Option A (new secure edge function)**, not a database-function
   shortcut. Matches this codebase's own documented pattern for elevated cross-tenant reads
   (`document-file-manager/index.ts` is the reference example) — explicit membership/role check first,
   then a read via an elevated connection that bypasses RLS entirely for this one deliberate case.
4. **Bundle in the related bug found in the same file**: `AdminDocumentRepository.tsx`'s refresh effect
   doesn't re-run when the active workspace changes (missing `tenantId` in its dependency array, unlike
   the sibling effect that correctly includes it) — fix this alongside the missing filter, same PR.

### Concrete plan (pending #5/#6 below before this is final)

1. **Migration** — new `RESTRICTIVE`, `FOR SELECT`-only policy on `documents_register`:
   `USING (sec.is_super_admin() OR tenant_id = sec.current_tenant_id())`. Idempotent
   (`DROP POLICY IF EXISTS` + `CREATE`). Leaves `billing_gate`, `docs_reg_select`, and all write
   policies untouched. Verified: `sec.current_tenant_id()` resolves to JWT `tenant_id` claim →
   `profiles.active_tenant_id` → `NULL` (fails closed, safe). Verified: `sec.superadmin_tenant_gate()`
   already governs SA visibility independently, so the `is_super_admin()` prefix here causes no
   duplication or regression.
2. **App patch** — `AdminDocumentRepository.tsx` `fetchDocuments()` (~lines 226-244): add
   `.eq('tenant_id', tenantId)` + a null-tenant guard; add `tenantId` to the refresh effect's
   dependency array (locked decision #4).
3. **`tas-goal-prefill` — no change needed.** Verified: already reads via a service-role connection
   (client instantiated with `SUPABASE_SERVICE_ROLE_KEY`), with its own membership check (lines
   265-278) running before the `documents_register` read (line ~751). Architecturally already correct
   for this fix. (Optional, separate, non-P0 hardening noted: `.single()` → `.maybeSingle()`, add
   `status='active'` to its membership check — not part of this branch.)
4. **`TenantDocuments.tsx` redesign** — new edge function `supabase/functions/tenant-documents-list/`:
   verifies JWT → checks `tenant_members` membership (`status='active'`, + super_admin fallback) for
   the requested `tenant_id` → 403 if neither → only then reads `documents_register` via service-role,
   filtered by the validated `tenant_id`. Component's `useQuery` swaps its direct
   `supabase.from('documents_register')` call for a `callEdge` call to this function, wrapped in a new
   `src/hooks/useTenantDocumentsRegister.ts` hook (fixes the existing "fetch inside a component" ban
   violation as a side effect). Writes (`handleDelete`/bulk actions) stay as-is — unaffected by a
   `SELECT`-only policy.
5. **Sequencing** — all of the above ships in **one branch/PR**. The DB policy and the
   `TenantDocuments` redesign are mutually dependent: shipping the policy first breaks the consultant
   document view in production until the redesign lands; shipping the redesign first just delays
   closing the leak with no benefit. If migration-apply and edge-function-deploy can't happen
   simultaneously post-merge, deploy the edge function first (harmless while the old read path still
   works), then apply the policy — never the reverse.
6. **Verification plan** — status as of 24 Jul 2026 post-merge:
   - ✅ `cichecker` clean (lint, type-check, `.single()` guard, migration guards, security guards all pass)
   - ✅ Branch DB showed no `MIGRATIONS_FAILED`
   - ✅ Migration applied to production + verified live via `pg_policies` (all 13 tables)
   - ✅ Migration ledger repaired + verified matching
   - ✅ All edge functions deployed to production + verified (2 spot-checked directly against live source)
   - ✅ Super_admin visibility unchanged — confirmed by policy `qual` inspection (`is_super_admin()` OR
     branch present, unconditional on workspace state)
   - ✅ NULL-workspace user sees zero rows — confirmed by policy logic (`tenant_id = NULL` never matches)
   - ⬜ **Not yet run (needs a live logged-in session):** leak closed for a real multi-tenant consultant
     session (only active-workspace rows returned); `member of A supplying B → 403` on the new edge
     function; consultant portfolio view (`TenantDocuments.tsx` via `TenantControlDrawerEnhanced`) still
     renders for a genuinely-permitted client tenant; `tas-goal-prefill` cross-client prefill still works;
     ordinary same-workspace reads (~40 other hooks/pages) unaffected.

### #5 and #6 — resolved, plan confirmed sound (no redesign needed)

**#5 — Residual sweep (done):** 105 total `documents_register` call sites checked across `src/` and 8
edge functions. Only the one already-known exception (`TenantDocuments.tsx`) reads a tenant other than
the active workspace. No consultant "multi-tenant dashboard" pattern found querying this table. Plan
stands as written.

Two unrelated bugs surfaced during the sweep — **not part of this fix, tracked as separate follow-ups**:
- `supabase/functions/bulk-ai-document-tagging/index.ts` (~lines 386-401) accepts a client-supplied
  `tenant_id` and queries `documents_register` without its own membership check — currently only "safe"
  because it's incidentally covered by the same broken `billing_gate`/RLS this whole investigation is
  about. Once the new RESTRICTIVE policy lands, this will silently no-op for a mismatched tenant rather
  than error — safe, but the missing membership check itself should still be added properly. Separate,
  small follow-up.
- `supabase/functions/ai-router/index.ts` (~line 778) uses `.single()` on a `tenant_members` lookup,
  which errors for any consultant with 2+ tenant memberships. Unrelated functional bug, separate
  follow-up.
- `useComplianceSummary.ts:51` and `useOrgSettings.ts:358` read `profile?.tenant_id` (stale home org)
  instead of `active_tenant_id` — pre-existing, lower-priority cleanup, not part of this fix.

**#6 — Workspace-definition parity (done):** confirmed the frontend (`effectiveTenantId` via
`useEffectiveRole()` → `get_my_app_context()` → `profiles.active_tenant_id`) and the backend
(`sec.current_tenant_id()`, same fallback column) read the same underlying source, and a full page
reload after a workspace switch closes any normal staleness window.

One real risk was surfaced and verified against the live DB: the SuperAdmin admin console
(`TenantControlDrawerEnhanced.tsx` → `TenantDocuments.tsx`) operates with **no active tenant set at
all** (`current_tenant_id()` is NULL in that mode) — a bare `tenant_id = sec.current_tenant_id()` rule
would return zero rows for every SuperAdmin, always, breaking that console entirely. **Confirmed this
does NOT affect our locked plan**: `sec.is_super_admin()` (verified via `pg_get_functiondef`) checks
only `profiles.role = 'super_admin'`, with no dependency on active tenant — so the `sec.is_super_admin()
OR tenant_id = sec.current_tenant_id()` shape already locked in Item 1 lets SuperAdmins through
regardless of workspace state, exactly as today. This is a direct confirmation that locked decision #2
(leave super-admin access untouched via this carve-out) was necessary, not just cautious.

A smaller, low-probability risk was also noted: `sync-jwt-tenant` (the step that keeps the JWT's
workspace claim in sync after a switch) is explicitly best-effort and could silently fail, leaving the
JWT briefly pointed at the old workspace. Today (pre-fix) this is a real, if rare, cross-tenant read
risk in `AdminDocumentRepository.tsx` because it has no app-layer filter at all. **Already resolved by
this plan**: once the app-layer filter (Item 2) is added, the same rare failure mode changes from
"shows the wrong tenant's documents" to "shows a blank screen" — a safe failure, not a leak. No
additional work needed beyond what's already planned.

The support-session (impersonation) mechanism referenced in `sec.current_tenant_id()` was confirmed
**dead code in practice** — zero live rows, no frontend caller — not a current divergence risk.

**Conclusion: plan is final as written above. Ready for implementation in a fresh session/branch.**

---

## Table #2 — `document_standards_mapping` — ✅ SHIPPED

**What it holds:** which documents satisfy which regulatory Standard clause.

**Reality of the issue:** same shared `billing_gate` leak as `documents_register`, but simpler —
verified only **3 call sites, all in `AdminDocumentRepository.tsx`**, no edge functions touch this
table, and **no intentional cross-tenant screen exists** for it (unlike `TenantDocuments.tsx` for
table #1).

- **Line 253-256 (read):** `.from('document_standards_mapping').select(...).in('document_id', docIds)`
  — no `tenant_id` filter. Lower real-world exposure than table #1's bug because `docIds` already come
  from a tenant-filtered document list (once table #1's fix lands) — but the query itself has nothing
  stopping a direct request for another tenant's document IDs from returning their mappings; the
  database-level fix is what actually closes this.
- **Line 472-475 (delete):** `.eq('document_id', selectedDocument.id)` — also no `tenant_id` filter.
  This is a **write** — out of scope per locked decision #1 (writes deferred to a later batch) —
  logged here, not fixed now.
- **Line 492-501 (insert):** correctly stamps `tenant_id: tenantId` (active workspace). Safe, no
  change needed.

**Not an intentional feature** — confirmed no design intent here, unlike table #1's two exceptions.
Purely the same forgotten filter, in a second location.

**Super-admin/workspace-parity double-check: not re-run, and confirmed not needed.** Reasoning: (1)
the `sec.is_super_admin()` carve-out already verified workspace-independent for table #1 is a property
of the rule itself, reused as-is — doesn't need re-verifying per table; (2) Scout confirmed no
screen/context beyond `AdminDocumentRepository.tsx` (already parity-checked for table #1) touches this
table — no new admin console or cross-tenant view introduced here that would need fresh verification.

**Locked plan:**
1. **Migration** — new `RESTRICTIVE`, `FOR SELECT`-only policy on `document_standards_mapping`, same
   shape as table #1: `USING (sec.is_super_admin() OR tenant_id = sec.current_tenant_id())`.
   Idempotent. Leaves `billing_gate`, `admin_manage_document_mappings`, `tenant_read_document_mappings`,
   and the write-lock policies untouched.
2. **App patch** — add `.eq('tenant_id', tenantId)` to the read at line 253-256, as defence-in-depth
   (matches the approach taken for table #1's app-layer patch).
3. **No new edge function needed** — no intentional cross-tenant read exists for this table.
4. **Delete bug (line 472)** — logged as a write-side issue, deferred to the same later "writes" batch
   as table #1's deferred write scope. Not fixed in this pass.

**Sequencing:** ships together with all 14 tables' fixes in one implementation pass, per the locked
sequencing rule above — no separate branch for this table alone.

---

## Table #3 — `audit_findings` (public schema) — ✅ SHIPPED

**What it holds:** internal/external audit findings.

**Reality of the issue:** same `billing_gate` leak, plus a second any-membership rule
(`audit_find_select` uses `sec.is_tenant_member()`) stacked on top — same "any organisation you've
ever belonged to" shape as tables #1 and #2.

**No live intentional cross-tenant screen exists for this table.** One candidate was investigated in
depth — a "Regulator Mode" page meant to let an external auditor view a client's findings via a link —
and confirmed **dead code**: the database table it depends on (`regulator_tokens`) was renamed to
`_zz_deprecated_regulator_tokens` outside of any tracked migration, and the app code (the page, a
"generate access link" settings panel that isn't rendered anywhere in the live app, and a supporting
hook) was never updated to match. Every visit to that page fails immediately today, independent of
anything in this fix. Not logged as a tracked bug (per Brian's call) — a product/UX gap, not a security
one, and out of scope here.

A handful of reads/updates rely on RLS alone with no explicit filter (defence-in-depth candidates, same
treatment as table #2):
- `src/hooks/useAuditEngine.ts:274, 310` (updates, id-only, no tenant filter)
- `src/hooks/useManualAudit.ts:500, 525` (reads, id/clause-reference only, no tenant filter)

Three edge functions (`audit-reprocess`, `audit-ai-processor`, `bulk-audit-reprocess`) use service-role
connections with a proper JWT+membership check against the *audit report's* tenant, then read/update
`audit_findings` without an explicit `tenant_id` filter of their own — safe today because the
relationship to the report is correct, but fragile (a future refactor decoupling findings from their
audit could silently reintroduce a leak). Flagged as hardening, not required for this fix.

**Separately found and deliberately queued, not broken out:** `supabase/functions/clause-matcher/index.ts`
requires login but performs **zero tenant/membership check** before returning any finding's full detail
by ID — any authenticated user on the platform, regardless of tenant, can pull any other tenant's
finding data. More severe than the `billing_gate` shape (no membership needed at all, just any account).
Brian's call: keep this queued with the rest rather than fixing standalone — **tracked as its own item
below**, not silently folded into "no action needed."

**Locked plan:**
1. **Migration** — new `RESTRICTIVE`, `FOR SELECT`-only policy on `audit_findings`, same shape as
   tables #1/#2: `USING (sec.is_super_admin() OR tenant_id = sec.current_tenant_id())`. Idempotent.
   Leaves `billing_gate`, `audit_find_select`, and all write-lock/write policies untouched.
2. **App patch** — add explicit `.eq('tenant_id', tenantId)` (or equivalent) as defence-in-depth to the
   4 loose read/update call sites listed above.
3. **No new edge function needed** — no live intentional cross-tenant read exists for this table.
4. **`clause-matcher` fix** — add an explicit membership check (`tenant_members`, `status='active'`,
   + super_admin fallback) for the finding's own `tenant_id` before returning any data, following the
   same pattern used elsewhere in this codebase. Queued with the rest of the 14-table implementation
   pass per Brian's decision, not fixed standalone.

---

## Table #4 — `audit_reports` — ✅ SHIPPED

**What it holds:** audit report records.

**Reality of the issue:** same `billing_gate` leak. Simplest table so far: **no live intentional
cross-tenant screen** (the only exception-shaped code is the already-confirmed-dead regulator page,
which also reads this table — not re-investigated, same dead-code verdict applies), **no weak-auth edge
function** like `clause-matcher` (all three edge functions touching this table — `audit-reprocess`,
`audit-ai-processor`, `bulk-audit-reprocess` — properly verify membership before any access). Only one
loose spot: `useUpdateAuditReport` in `useAuditEngine.ts:164` filters by report ID only, no explicit
tenant check — defence-in-depth candidate, same treatment as prior tables.

**Locked plan:**
1. **Migration** — same `RESTRICTIVE`, `FOR SELECT`-only policy shape as tables #1-3:
   `USING (sec.is_super_admin() OR tenant_id = sec.current_tenant_id())`.
2. **App patch** — add explicit tenant check to `useUpdateAuditReport` (`useAuditEngine.ts:164`) as
   defence-in-depth.
3. **No new edge function needed.**

---

## Table #6 — `caa_register` — ✅ SHIPPED

**What it holds:** Complaints & Appeals.

**Reality of the issue:** same `billing_gate` leak, plus `caa_select` (`sec.is_tenant_member()`, also
any-membership). One loose read (`src/pages/caa/EditCAA.tsx:28`, id-only, no tenant filter) — defence-
in-depth candidate, same treatment as prior tables. `useCAASubmission.ts` (lines ~50, 96, 115) uses the
stale `profile.tenant_id` field on writes — added as new locations to Bug 3 below, not a cross-tenant
RLS issue itself.

**Investigation initially over-claimed 4 "weak-auth" edge functions — independently verified, corrected
to 1 real + 3 likely-inert:**

- **`generate-meeting-pack` — CONFIRMED real, live, critical.** Verified directly: uses the
  service-role connection (bypasses RLS entirely) with **zero caller identity check anywhere in the
  function** — no JWT verification, no membership check. Confirmed **live and reachable** from 3
  real call sites (`MeetingPackManager.tsx`, `useMeetingDetail.ts`, `useGovernanceMeetingSystem.ts`).
  Any authenticated user on the platform, any tenant, can call it with any `meetingId` and receive that
  meeting's `caa_register`, `gov_register`, and CI data — same severity class as the `clause-matcher`
  bug found on table #3. **Queued with the rest of the implementation batch**, same treatment as
  `clause-matcher` — not fixed standalone.
- **`export-meeting-report`, `generate-meeting-summary`, `complybot-meeting-insights` — likely NOT
  live leaks, likely just broken.** Verified directly: none of the three ever check caller identity,
  but critically, none of them forward the caller's login token to the database either — they connect
  using only the anon key. Given every RLS policy on these tables depends on resolving a real
  logged-in user, an anonymous connection gets zero rows back regardless of leak or no leak — meaning
  these three most likely silently return empty data today rather than expose anything. Not confirmed
  via a live test (only via reading the logic), so flagged as **needs a quick live-test confirmation**,
  not treated as a security risk pending that. Low priority either way — either it's already
  non-functional (a product bug, not P0) or a fast version of the same fix as `generate-meeting-pack`.

**Locked plan:**
1. **Migration** — same `RESTRICTIVE`, `FOR SELECT`-only policy shape as prior tables.
2. **App patch** — add explicit tenant filter to `EditCAA.tsx:28` as defence-in-depth.
3. **`generate-meeting-pack` fix** — add explicit membership check before the service-role read,
   queued with the batch (same as `clause-matcher`).
4. **`export-meeting-report` / `generate-meeting-summary` / `complybot-meeting-insights`** — flagged for
   a live-test confirmation (are they actually returning empty today, or is there a forwarding path not
   yet found); not treated as urgent pending that check.

---

## Table #12 — `suitability_results` — ✅ SHIPPED

**What it holds:** student suitability assessment outcomes.

**Reality of the issue:** simplest shape — same `billing_gate` leak stacked on top of an already-correct
table-local policy (`suitability_results_tenant_isolation`, `tenant_id = sec.current_tenant_id()`), same
"correct policy defeated by billing_gate's OR" pattern as `llnd_assessments` from the original 14-table
investigation. All 5 call sites (`pages/registers/suitability/index.tsx`, `SuitabilityResultForm.tsx`)
already filter/stamp `tenant_id` correctly. No live exceptions, no edge functions touch this table at
all, no weak-auth functions found.

**Locked plan:**
1. **Migration** — same `RESTRICTIVE`, `FOR SELECT`-only policy shape as prior tables. Leaves the
   existing correct `suitability_results_tenant_isolation` policy untouched — the new RESTRICTIVE rule
   is what actually closes the gap `billing_gate` opens back up.
2. **No app patch needed** — all call sites already correct.
3. **No new edge function needed.**

---

## Table #5 — `audit_tasks` — ✅ SHIPPED

**What it holds:** action items from audits.

**Reality of the issue:** same `billing_gate` leak, stacked on `audit_tasks_select`
(`sec.is_tenant_member(tenant_id)` — same any-membership shape as tables #3/#6, not
workspace-scoped). Verified live via `pg_policies`: `audit_tasks_select`, `_insert`, `_update`,
`_delete` plus `billing_gate` (`ALL`) plus 3 `RESTRICTIVE` write-lock policies. No table-local policy
here is already-correct like `suitability_results`' — closing `billing_gate`'s OR is what fixes this
one, same as tables #1-#4/#6.

**Call sites swept** (`src/hooks/useAuditEngine.ts`, `src/hooks/useManualAudit.ts`,
`supabase/functions/{generate-governance-pack,audit-reprocess,audit-ai-processor}/index.ts`):

- **Correctly tenant-scoped, no change needed:** `useAuditEngine.ts` `useAuditTasks` (line 344, explicit
  `.eq('tenant_id', tenantId)`), `useCreateTask` (line 386, stamps `tenant_id`), the dashboard stats
  block (lines 570/586, both `.eq('tenant_id', tenantId)`); `useManualAudit.ts:463` (stamps
  `tenant_id`); all 3 edge functions insert with `tenant_id: report.tenant_id` after their own
  membership check against the *report's* tenant (`audit-reprocess`/`audit-ai-processor`, same
  gold-standard pattern as table #3/#4's edge functions) or a direct `tenant_members` + super_admin
  check against the caller-supplied `tenant_id` (`generate-governance-pack`, lines 101-153) —
  no exception, no weak-auth function found for this table.
- **Loose reads/updates — RLS-only, no explicit tenant filter (defence-in-depth candidates, same
  treatment as prior tables' loose spots):**
  - `useAuditEngine.ts:209-217` — two `count`-only queries scoped by `finding_id` only (task-count
    rollup per finding).
  - `useAuditEngine.ts:299-302` — `useCloseFinding`'s incomplete-tasks check, scoped by `finding_id`
    only.
  - `useAuditEngine.ts:418-421` — `useUpdateTask`, scoped by task `id` only.

**No live intentional cross-tenant screen, no weak-auth edge function** — simplest shape found so far
alongside table #4.

**Locked plan:**
1. **Migration** — same `RESTRICTIVE`, `FOR SELECT`-only policy shape as prior tables:
   `USING (sec.is_super_admin() OR tenant_id = sec.current_tenant_id())`. Idempotent. Leaves
   `billing_gate`, `audit_tasks_select/_insert/_update/_delete`, and the 3 write-lock policies
   untouched.
2. **App patch** — add explicit `.eq('tenant_id', tenantId)` (or equivalent join-through-finding scope)
   to the 4 loose call sites above, as defence-in-depth, same treatment as prior tables.
3. **No new edge function needed** — all 3 existing edge functions already gate correctly.

---

## Table #7 — `appeals` — ✅ SHIPPED

**What it holds:** student appeals. Already flagged in the original REALITY OF THE ISSUE section as
"leakiest policy found" — confirmed still accurate.

**Reality of the issue:** worse than the standard shape — **two** separate any-membership PERMISSIVE
SELECT policies stacked, neither checking membership `status`:
- `"Tenant members can view appeals"` — inline `tenant_id IN (SELECT tm.tenant_id FROM tenant_members tm
  WHERE tm.user_id = current_user_id())`, no status check.
- `appeals_tenant_select` — `is_super_admin() OR is_tenant_member(tenant_id)`.
- Plus `billing_gate` on top. Three independent ORs granting any-tenant-ever-membership reads.

**Call sites — verified directly, only 4 real DB operations across 4 files** (no edge function queries
`appeals` directly — confirmed against all 9 initial candidate functions, all references there are
keyword arrays/labels/prompt text, not real queries):
- Correctly scoped: `AppealsSection.tsx` read (line 60, `.eq('tenant_id', profile.tenant_id)`) and insert
  (line 72, stamps `tenant_id`); `useQA2EvidenceSignals.ts:497`; `students-support/Dashboard.tsx:122`.
- **Confirmed loose write:** `AppealsSection.tsx:136-147` — `handleSubmitReview` UPDATE filtered by
  `.eq('id', selectedAppeal.id)` only, no tenant check. Verified directly by reading the file.

**Locked plan:**
1. **Migration** — same `RESTRICTIVE`, `FOR SELECT`-only policy shape as prior tables:
   `USING (sec.is_super_admin() OR tenant_id = sec.current_tenant_id())`. Idempotent. Leaves
   `billing_gate`, both any-membership SELECT policies, and the write policies untouched.
2. **App patch** — add `.eq('tenant_id', profile.tenant_id)` to `AppealsSection.tsx:136-147`'s update, as
   defence-in-depth.
3. **No new edge function needed** — no live intentional cross-tenant read, no weak-auth function found.

---

## Table #8 — `adc_register` — ✅ SHIPPED

**What it holds:** Annual Declarations (CEO/governance sign-off).

**Reality of the issue:** same `billing_gate` + `adc_reg_select` (`is_tenant_member`, any-membership)
leak. Unusually well-layered RESTRICTIVE structure otherwise (role-gated + SA-gated RESTRICTIVE
policies already exist for insert/update/delete) — good defence generally, but doesn't stop
`billing_gate`'s PERMISSIVE OR from leaking reads.

**Call sites — verified directly, 3 confirmed loose writes, all id-only with no tenant check:**
- `src/pages/registers/ADC.tsx:89` (`handleDelete`, `.eq('id', recordToDelete)`)
- `src/pages/registers/ADC.tsx:118` (`handleSubmit` update, `.eq('id', selectedRecord.id)`)
- `src/hooks/useADCSubmission.ts:167` (post-insert governance-note update, `.eq('id', adcData.id)`)

All other call sites correctly filter by `tenant_id`, though several source that value from the stale
`profiles.tenant_id` field rather than `active_tenant_id` — these are additional confirmed locations for
the already-tracked **Bug 3** below (not re-reported as new), specifically: `useADCSubmission.ts`,
`useADCRegister.ts`, `ADC.tsx`'s own fetch/insert, and `generate-audit-pack/index.ts`'s profile lookup
(line ~38, alongside its already-tracked `.single()` crash bug). `ai-router/index.ts`'s tenant lookup
(line ~779) also lacks `.eq('status', 'active')` — same root cause as the already-tracked Bug 2
(`.single()` crash), not a new bug, just confirming `adc_register` is one of the tables its output
touches.

**Locked plan:**
1. **Migration** — same `RESTRICTIVE`, `FOR SELECT`-only policy shape as prior tables. Leaves the
   existing layered RESTRICTIVE role/SA policies untouched.
2. **App patch** — add `.eq('tenant_id', ...)` to the 3 confirmed loose writes above, as
   defence-in-depth.
3. **No new edge function needed.**

---

## Table #9 — `ci_register` — ✅ SHIPPED

**What it holds:** Continuous Improvement (risk assessments, improvement plans). By far the largest
surface of the 14 tables — ~50 files reference it; ~35+ call sites are already correctly tenant-scoped
(explicit `.eq('tenant_id', ...)` or verified-membership edge functions) and are not itemised here.

**Reality of the issue:** same `billing_gate` + `ci_register_tenant_select` (any-membership) leak, plus
a legitimate `regulator_select_ci_register` carve-out (not a bug — scoped to the regulator's own
memberships).

**New weak-auth bug found and confirmed directly (real, not over-claimed) — same severity class as the
already-tracked `clause-matcher`/`generate-meeting-pack` bugs:**
- **`supabase/functions/ci-overdue-check/index.ts`** — verified by reading the full function: creates
  its Supabase client with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS entirely) with **zero caller
  identity check** — no `Authorization` header check at all before the DB call. Line 19-24 reads *every
  tenant's* overdue `ci_register` rows with no `tenant_id` filter; line 57-64 updates any of them to
  `lifecycle_state: 'overdue'` by `id` alone; line 75-92 inserts a `gov_register` escalation row stamped
  with the *victim* row's own `tenant_id` (so that part is at least tenant-consistent, just reachable by
  anyone). Confirmed this is intended to be a scheduled/internal-only job (cron-style overdue sweep) but,
  unlike the codebase's own documented internal-credential pattern (`isScheduledInvocation`), it has no
  cron-secret or service-role-bearer check gating **external HTTP callers** — it is invokable by any
  request, not just cron. **Queued with the rest of the batch**, not fixed standalone, per the same
  treatment as `clause-matcher`/`generate-meeting-pack`.
- **`supabase/functions/generate-task-suggestions/index.ts`** — verified: unlike the bug above, this
  function connects with the **anon key + the caller's forwarded `Authorization` header** (not
  service-role), so its `ci_register`/`gov_register` reads still go through RLS as the calling user —
  it is **not** a raw RLS-bypass leak, just a loose read that trusts a client-supplied `tenant_id` with
  no membership check of its own. Once the standard RESTRICTIVE fix lands, a mismatched `tenant_id` will
  simply return nothing (same "safe no-op" shape as the already-tracked Bug 1,
  `bulk-ai-document-tagging`). Logged as a smaller follow-up — add a membership check before trusting the
  body's `tenant_id`, not urgent.
- **`src/hooks/useRiskTrendAnalysis.ts:106-125`** — verified directly: both the `ci_register` and
  `risk_register` reads here filter only by `.ilike(...)` text-match and date range, with **no
  `.eq('tenant_id', ...)`** at all, despite `tenantId` being available in scope. Confirmed real loose
  read — defence-in-depth candidate.
- **`src/pages/ci/index.tsx`** — verified this is a live, routed page (`AppRoutes.tsx:451/1266`,
  `/ci-engine` route), not dead code. `fetchEntries()` (line 55-59) reads `ci_register` with **no tenant
  filter whatsoever**; `handleMarkAsClosed()` (line 91-94) updates by `id` alone. Confirmed real loose
  read+write. (Separately, this file also violates the "no `supabase.from()` in a page body" rule — a
  pre-existing architecture-cleanup item, not itself a security bug, not tracked here as its own item.)

**Locked plan:**
1. **Migration** — same `RESTRICTIVE`, `FOR SELECT`-only policy shape as prior tables.
2. **App patch** — add `.eq('tenant_id', ...)` to `useRiskTrendAnalysis.ts`'s two loose reads and
   `pages/ci/index.tsx`'s read+update.
3. **`ci-overdue-check` fix** — add an internal-credential check (cron-secret or service-role-bearer,
   per the codebase's own `isScheduledInvocation` pattern) before any DB access, plus keep the
   per-row `tenant_id` already present in the row data (no change needed there). Queued with the batch.
4. **`generate-task-suggestions` fix** — add a `tenant_members` membership check for the caller against
   the supplied `tenant_id` before querying. Smaller follow-up, queued with the batch.

---

## Table #10 — `ien_register` — ✅ SHIPPED

**What it holds:** Industry Engagement. Structurally different from the other 13 — its own policy uses
`sec.claim_tenant_id()`, not `sec.current_tenant_id()` or `sec.is_tenant_member()`.

**Verified directly via `pg_get_functiondef`:** `sec.claim_tenant_id()` is a pure one-line wrapper —
`SELECT sec.current_tenant_id();` — nothing more. So `ien_register`'s own policy
(`ien_register_tenant_access`: `is_super_admin() OR tenant_id = sec.claim_tenant_id()`) is **already
correctly workspace-scoped**, same shape and same correctness as `llnd_assessments`/`suitability_results`
— it is neutered by `billing_gate`'s OR, not broken itself. The additional RESTRICTIVE
`restrict_select_ien_register` policy's `created_by = auth.uid()` clause only narrows further (RESTRICTIVE
policies can't grant on their own), so it introduces no new gap.

**Call sites:** all real call sites checked already filter by `tenant_id`; no loose reads found. Two
locations use the stale `profiles.tenant_id` field instead of `active_tenant_id` — added as new confirmed
locations to the already-tracked **Bug 3** (not re-reported as new): `IENRegisterForm.tsx` (lines 237,
271) and `useTrainingStaffSummary.ts` (line ~25).

**New low-priority hardening item found:** `supabase/functions/tas-export-pdf/index.ts` connects with
the anon key + forwarded JWT (RLS-cascaded, not a raw bypass) and reads `ien_register` scoped to the
already-RLS-checked parent TAS record's `tenant_id` — but has **no explicit role gate** of its own,
unlike `generate-audit-pack`'s pattern (administrator/compliance-manager check). Not a cross-tenant leak
(reads are scoped correctly), just looser RBAC than the codebase's own documented pattern. Logged as a
hardening follow-up, not P0.

**Locked plan:**
1. **Migration** — same `RESTRICTIVE`, `FOR SELECT`-only policy shape as prior tables. Leaves
   `ien_register_tenant_access` and `restrict_select_ien_register` untouched — they're already correct.
2. **No app patch needed** — all real call sites already correctly tenant-scoped (the 2 stale-field
   locations are tracked under Bug 3, a separate non-P0 follow-up, not part of this fix).
3. **No new edge function needed.**

---

## Table #11 — `llnd_assessments` — ✅ SHIPPED

**What it holds:** student Language/Literacy/Numeracy/Digital assessments. Simplest table alongside
`suitability_results` — already has a correct table-local policy (`llnd_assessments_tenant_isolation`:
`tenant_id = sec.current_tenant_id()`), only neutered by `billing_gate`'s OR, same pattern as
`suitability_results`.

**Confirmed no edge function touches this table** (re-grepped directly to confirm, not just trusted the
initial broad grep).

**Call sites:** `LLNDAssessmentForm.tsx` and `pages/registers/suitability/index.tsx` (a unified
"Suitability & LLND Register" screen — legitimately reads both tables together by design, not a leak)
are correctly tenant-scoped. Two confirmed loose reads, both scoped by `trainer_id` only (not
`tenant_id`) — real exposure since Trainer/Assessor accounts can hold multiple tenant memberships (2 such
accounts exist per the original 227-account count):
- `trainer-portal/lln-assessments.tsx:71-76` — read filtered by `.eq('trainer_id', user.id)` only
  (its own insert at line 89 correctly stamps `tenant_id`, just the read is loose). Verified directly.
- `trainer-portal/monthly-report.tsx:990-995` — count query filtered by `.eq('trainer_id', trainerId)`
  only. Verified directly.
- `useTrainerStudentSupport.ts` — has an explicit code comment (lines 18-21) acknowledging "the
  llnd_assessments query applies an explicit `.eq('trainer_id', userId)` at the app layer because that
  table's RLS is tenant-wide" — i.e. this one is a deliberate, documented app-layer compromise, already
  combined with `.eq('tenant_id', tenantId)` too (line ~61-65), so it's actually correctly scoped on both
  axes. Not a bug — noted for contrast with the two loose ones above that only have the `trainer_id` half.

**Locked plan:**
1. **Migration** — same `RESTRICTIVE`, `FOR SELECT`-only policy shape as prior tables. Leaves
   `llnd_assessments_tenant_isolation` untouched — already correct.
2. **App patch** — add `.eq('tenant_id', ...)` to the 2 confirmed loose reads above, as defence-in-depth
   (matching the pattern already used correctly in `useTrainerStudentSupport.ts`).
3. **No new edge function needed.**

---

## Table #13 — `air_register` — ✅ SHIPPED

**What it holds:** Audit Implementation Register (tracks whether audit findings were fixed).

**Reality of the issue:** same `billing_gate` + `air_reg_select` (any-membership) leak, plus a
legitimate `regulator_select_air_register` carve-out (same shape as `ci_register`'s, not a bug).

**Call sites — 2 confirmed critical writes, both id-only with no tenant check, verified directly:**
- `src/pages/registers/audit/index.tsx:109` (`handleDeleteEntry`, `.delete().eq('id', id)`)
- `src/pages/registers/audit/AIRRegisterForm.tsx:210-215` (update, `.update(payload).eq('id',
  record.id)`)

Several reads use the stale `profiles.tenant_id` field — added as new confirmed locations to the
already-tracked **Bug 3** (not re-reported as new): `useComplianceSummary.ts` (already tracked, confirmed
it also touches `air_register`), `registers/audit/index.tsx` (lines 36/55), and `AIRRegisterForm.tsx`'s
insert payload (line 189).

The one edge function touching this table, `tenant-analyse-regulatory-impact`, was verified directly:
JWT verified, membership + role checked against the caller-supplied `tenant_id` before any
`air_register` access — correctly gated, no change needed.

**Locked plan:**
1. **Migration** — same `RESTRICTIVE`, `FOR SELECT`-only policy shape as prior tables.
2. **App patch** — add `.eq('tenant_id', ...)` to the 2 confirmed loose writes above, as
   defence-in-depth.
3. **No new edge function needed** — the one edge function already gates correctly.

---

## Table #14 — `doc_review_actions` — ⬜ DEFERRED, excluded from this implementation batch

> **Brian's call (24 Jul 2026): disregard this table for now.** Fixing it properly requires a broader
> policy shape than the other 13 (see below) and Brian judged that extra shape of change isn't worth the
> disruption to bundle into an otherwise clean, uniform 13-table batch. **Also lower real urgency than it
> first sounded:** no live screen in the app ever issues an UPDATE or DELETE against this table — the
> only real call sites are one read (`DocumentReviewPanel.tsx`) and two backend functions that only
> INSERT, both already correctly scoped. So the UPDATE/DELETE gap described below is real but not
> currently exploitable via any existing screen. Investigation kept below, unchanged, so a future session
> can pick this up as its own small, separate piece of work without re-investigating.

**What it holds:** document review workflow actions — an audit trail of who submitted a compliance
document for review and who approved it or requested changes (shows up as the review-history panel on a
document). Not consultant-specific — used by any RTO staff member reviewing a document. Columns: `id`,
`tenant_id`, `document_id`, `submitter_id`, `reviewer_id`, `action_type`, `notes`, `created_at`.

Smallest footprint of the 14 — confirmed only ONE
real app call site (`DocumentReviewPanel.tsx:56`, a `SELECT`, RLS-only, no tenant filter — the standard
defence-in-depth patch applies here too) and no edge functions touch it. Two `SECURITY DEFINER` RPCs
(`reviewer_approve_document`, `reviewer_request_changes`) also insert into this table, both verified
correctly scoped (they derive `tenant_id` from the parent document record before inserting, not from
caller input).

**Important structural difference from all 13 other tables, confirmed via `pg_policies` comparison
against `audit_tasks`/`adc_register`:** every other table has its own dedicated **PERMISSIVE**,
role-gated UPDATE/DELETE policy (e.g. `audit_tasks_update`/`_delete`, `adc_reg_update`/`_delete`) whose
`qual` calls `has_tenant_role(tenant_id, [...])` — and because that check is keyed to the row's own
`tenant_id`, it's already safe from the `billing_gate` any-tenant-membership shape even without a new
RESTRICTIVE policy covering those commands. `doc_review_actions` has **no such policy at all** for
UPDATE or DELETE — only the "Tenant members can insert/view" pair (INSERT/SELECT only, also
any-membership) and `billing_gate` (`ALL`) plus the write-lock RESTRICTIVE policies (which only check
write-lock status, not tenant). That means **`billing_gate` is currently the sole gate for UPDATE and
DELETE** on this table. A **SELECT-only** RESTRICTIVE fix (the shape used for all 13 other tables) would
close the read leak here but leave UPDATE/DELETE still wide open to any-tenant-ever-membership — verified
this is a genuine structural gap, not a misreading of the standard pattern.

**Locked plan (different shape from the other 13):**
1. **Migration** — a `RESTRICTIVE`, `FOR ALL`-only policy (not `FOR SELECT`-only):
   `USING (sec.is_super_admin() OR tenant_id = sec.current_tenant_id())`. Idempotent. Leaves the existing
   INSERT/SELECT PERMISSIVE policies, `billing_gate`, and the write-lock RESTRICTIVE policies untouched
   — this new policy is what actually closes SELECT **and** UPDATE **and** DELETE for cross-tenant access
   in one policy, since none of the other three commands have any table-local tenant check to lean on.
2. **App patch** — add `.eq('tenant_id', ...)` to `DocumentReviewPanel.tsx:56`'s read, as
   defence-in-depth.
3. **No new edge function needed.**
4. **Flag for Dave/Carl at implementation time:** confirm `sec.current_tenant_id()` is the intended
   workspace-scoping function here (same one used everywhere else) before applying — this table's gap is
   structurally different enough from the rest that it's worth a second pair of eyes on the exact policy
   shape before it ships in the batch.

---

## CONFIRMED BUGS FOUND OUTSIDE THIS FIX'S SCOPE

Everything below was surfaced incidentally while investigating the `documents_register` leak. None of
these blocked or were blocked by the 14-table plan above — logged here so they aren't lost when this
file is deleted post-implementation.

> **Re-scoped 24 Jul 2026 (Brian's call, on Checker review of the implemented branch):** Bugs 1, 5, and 6
> are small/isolated (one file each, no migration) and have been **folded into the current
> `fix/cross-tenant-select-restrict` branch** alongside the 14-table batch — see "Status" lines below.
> Bug 2 (`ai-router` `.single()` crash) and Bug 3 (11 stale-field locations, itself flagged as needing a
> fresh whole-codebase Scout sweep before fixing) are **held together with Table #14
> (`doc_review_actions`, deferred `FOR ALL` policy shape) as a second, later batch** — bigger/riskier
> scope than is worth bundling into this P0 branch.

### Bug 1 — `bulk-ai-document-tagging` trusts a caller-supplied tenant with no membership check — ✅ SHIPPED

- **File:** `supabase/functions/bulk-ai-document-tagging/index.ts` (~lines 386-401)
- **What's wrong:** accepts `tenant_id` from the request body and queries `documents_register`
  without first verifying the caller actually belongs to that tenant. Currently only "safe" because
  it's incidentally shielded by the same broken `billing_gate` RLS this whole investigation is about —
  once `documents_register`'s new RESTRICTIVE policy lands, this becomes a silent no-op for a
  mismatched tenant rather than an error (safe, but the missing check should still be added properly).
- **Fix plan:** add an explicit membership check before the query, following this codebase's own
  documented pattern (`AGENTS.md` "✅ CORRECT" edge-function example): after `auth.getUser()` confirms
  identity, query `tenant_members` for `user_id` + the supplied `tenant_id` with
  `.eq('status', 'active').maybeSingle()` (never `.single()`), plus a super_admin fallback; return
  **403** if neither passes. Only then proceed to the `documents_register` query. Small, isolated
  change — single file, no migration needed.
- **Status:** implemented in `fix/cross-tenant-select-restrict` — added `auth.getUser()` identity check
  plus a `profiles.role='super_admin'` / `tenant_members` (`status='active'`) membership gate before the
  `documents_register` query, following the standard pattern used elsewhere in this batch.

### Bug 2 — `ai-router` crashes for any consultant (multi-tenant user) — **DEFERRED, second batch (with Bug 3 and Table #14)**

- **File:** `supabase/functions/ai-router/index.ts` (~line 778)
- **What's wrong:** looks up the caller's tenant membership with `.single()`, which throws an error
  the moment a user has more than one `tenant_members` row — i.e. every Consultant, Administrator, or
  Trainer/Assessor account identified earlier as multi-tenant (227 real accounts). Falls back to
  `profile.tenant_id` afterward, which is itself the stale-home-org bug described below.
- **Fix plan:** change `.single()` to `.maybeSingle()`; require an explicit, verified `tenant_id`
  selector from the caller (per `AGENTS.md`'s "never assume `memberships.length === 1`" rule) instead
  of assuming exactly one membership row exists; verify that selector against `tenant_members` with
  `.eq('status', 'active')` before using it. Single file, no migration needed.

### Bug 3 — stale `profile.tenant_id` used instead of the active workspace (11 confirmed locations) — **DEFERRED, second batch (with Bug 2 and Table #14)**

- **What's wrong:** `profiles.tenant_id` is a legacy "home organisation" field that does not update
  when a user switches workspace. The correct field is `profiles.active_tenant_id` (frontend:
  `currentTenantId()` / `useEffectiveRole().effectiveTenantId`). Using the stale field means a
  multi-tenant user (again, primarily Consultants) can be shown or have actions taken against their
  *original* organisation instead of the one they're currently working in — the same shape of bug as
  the original `documents_register` ticket, on different data.
- **Confirmed locations:**
  - `src/hooks/useComplianceSummary.ts:51` (confirmed during tables #8/#13 sweeps to also affect
    `adc_register` and `air_register` reads specifically — same one location, just now confirmed to
    touch more tables)
  - `src/hooks/useOrgSettings.ts:358`
  - `supabase/functions/generate-board-report/index.ts:144`
  - `supabase/functions/generate-audit-pack/index.ts:368` (same pattern as board-report; also confirmed
    at line ~38, a second stale-field read in the same function, feeding its `adc_register`/`ien_register`
    queries)
  - `supabase/functions/generate-lln-strategy/index.ts:129` (same pattern as board-report)
  - `src/hooks/useCAASubmission.ts:50, 96, 115` (found while investigating table #6, `caa_register`)
  - `src/pages/registers/ADC.tsx` (fetch + insert, found investigating table #8)
  - `src/hooks/useADCSubmission.ts` and `src/hooks/useADCRegister.ts` (found investigating table #8)
  - `src/pages/registers/audit/index.tsx:36,55` and `AIRRegisterForm.tsx:189` (found investigating
    table #13)
  - `src/components/ien/IENRegisterForm.tsx:237,271` (found investigating table #10)
  - `src/hooks/useTrainingStaffSummary.ts:~25` (found investigating table #10)
  - `supabase/functions/ai-router/index.ts:~779` (tenant lookup missing `.eq('status','active')` —
    same root cause as the already-tracked Bug 2 crash, confirmed to also feed `adc_register` reads;
    not a new bug, just a new confirmed downstream effect)
- **Already fixed as a side effect of the 14-table batch — remove from the future sweep's target list:**
  `src/pages/ci/index.tsx` (this batch's own defence-in-depth patch initially introduced a **new**
  `profile?.tenant_id` read here — caught on Checker review since it was fresh code, not an inherited
  pattern; switched to `useEffectiveRole().effectiveTenantId`) and
  `src/pages/trainer-portal/lln-assessments.tsx` (this batch's patch destructured `effectiveTenantId`
  from `useAppContext()`, which doesn't expose that property — always `undefined` under `@ts-nocheck`,
  silently breaking the whole page's read and insert; fixed by switching to `useEffectiveRole()`, the
  hook that actually computes it).
- **Fix plan:** in each location, replace the `profiles.tenant_id` read with `profiles.active_tenant_id`
  (frontend hooks: use the shared `currentTenantId()` utility per `AGENTS.md`'s banned-pattern example
  rather than querying `profiles` directly). Independent, small changes — no migration needed, but each
  should be verified against its own call site rather than assumed identical. This list has grown from
  6 to 11 locations purely as a side effect of the per-table leak investigation (tables #6, #8, #10,
  #13) — worth a single dedicated Scout pass across the whole codebase before fixing, since it clearly
  wasn't an exhaustive sweep for this specific bug shape and more instances likely exist in
  as-yet-uninvestigated files.

### Bug 4 — `ci-overdue-check` has no caller-identity check at all (service-role, cross-tenant read+write) — ✅ SHIPPED

- **File:** `supabase/functions/ci-overdue-check/index.ts`
- **What's wrong:** connects with `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS entirely) with **zero
  identity check** — no `Authorization` header requirement, no cron-secret gate. Verified directly:
  lines 19-24 read every tenant's overdue `ci_register` rows with no filter; lines 57-64 update any of
  them to `lifecycle_state: 'overdue'` by `id` alone; lines 75-92 insert a `gov_register` escalation
  stamped with the victim row's own `tenant_id` (internally consistent, but reachable by anyone). Same
  severity class as the already-tracked `clause-matcher` (table #3) and `generate-meeting-pack`
  (table #6) bugs — any authenticated *or unauthenticated* caller can trigger this today.
- **Fix plan:** add an internal-credential check before any DB access, following this codebase's own
  documented pattern (`isScheduledInvocation` in `complybot-monthly-report/auth.ts`) — accept a
  dedicated cron secret or the exact service-role bearer, reject everything else. Small, isolated change,
  single file. **Queued with the rest of the 14-table implementation batch**, per the same treatment as
  `clause-matcher`/`generate-meeting-pack` — not fixed standalone.

### Bug 5 — `generate-task-suggestions` trusts a caller-supplied `tenant_id` with no membership check — ✅ SHIPPED

- **File:** `supabase/functions/generate-task-suggestions/index.ts`
- **What's wrong:** unlike Bug 4, this function connects with the anon key + the caller's forwarded JWT
  (RLS still applies as the calling user), so it is **not** a raw RLS bypass — but it trusts the request
  body's `tenant_id` with no membership check of its own before querying `ci_register`/`gov_register`.
  Currently only "safe" the same way Bug 1 is: shielded by the same `billing_gate` leak this whole
  investigation is about. Once the RESTRICTIVE fix for `ci_register` lands, a mismatched `tenant_id`
  becomes a silent no-op rather than a leak — the missing check should still be added properly.
- **Fix plan:** add a `tenant_members` membership check (`.eq('status','active')`, + super_admin
  fallback) for the caller against the supplied `tenant_id` before querying, same pattern as Bug 1's fix.
- **Status:** implemented in `fix/cross-tenant-select-restrict` as part of table #9 (`ci_register`)'s own
  app-patch item 4 — the membership gate landed alongside the RESTRICTIVE policy work, so this was
  already done before the Bugs 1/5/6 re-scope decision below; confirmed present, no further action
  needed.

### Bug 6 — `tas-export-pdf` has no explicit role gate before reading `ien_register` — ✅ SHIPPED

- **File:** `supabase/functions/tas-export-pdf/index.ts`
- **What's wrong:** connects with anon key + forwarded JWT and reads `ien_register` scoped to the
  already-RLS-checked parent TAS record's `tenant_id` — not a cross-tenant leak (correctly scoped), but
  unlike `generate-audit-pack`'s pattern, it has no explicit Administrator/Compliance-Manager role check
  before returning consultation data. Any authenticated user who can read a given TAS record can also
  read all of its IEN consultations, regardless of their role in that tenant.
- **Fix plan:** add the same role-gate pattern used in `generate-audit-pack`.
- **Status:** implemented in `fix/cross-tenant-select-restrict` — added a `profiles.role='super_admin'`
  fallback / `tenant_members.role` check (`administrator` or `compliance_manager`, `status='active'`)
  against the TAS record's own `tenant_id`, right after the TAS fetch and before any `ien_register` read.

**Priority note (updated 24 Jul 2026):** Bugs 1, 5, and 6 have shipped in this branch alongside the
14-table batch. **Bugs 2 and 3 are deferred to a second batch together with Table #14
(`doc_review_actions`)** — Bug 2 is a standalone crash fix (unrelated to cross-tenant exposure, needs its
own care around the `.single()` → `.maybeSingle()` change), and Bug 3 was already flagged as needing a
fresh, dedicated Scout sweep across the whole codebase before fixing (the known 11 locations are not
believed to be exhaustive) — both are a larger, riskier scope than was worth bundling into this P0
branch. **Bug 4 (`ci-overdue-check`) was never part of this deferred set** — like `clause-matcher` and
`generate-meeting-pack`, it's a live, real, exploitable-today cross-tenant leak independent of
`billing_gate`, and was queued directly with the 14-table implementation batch from the start (see
table #9 above, already confirmed implemented on this branch).
