# Support Tickets Triage — Under Review / In Progress

> Living doc per the workspace living-doc workflow (`CLAUDE.md` § Living-doc workflow). One source of
> truth for this body of work. Work through items **one at a time** with Brian — investigate/discuss
> already done for all 16 below via one diagnostic agent pass (23 Jul 2026), cross-checked against
> `rto-compass-hub` code and live DB. Each item still needs Brian's **decision** locked in before any
> fix is implemented. A brand-new chat should be able to read this file cold and go straight to
> implementation once an item is marked `LOCKED`.
>
> Source: `suggestions` table, tenant tickets with `status` in (`under_review`, `in_progress`) as of
> 23 Jul 2026. Schema reference: `complyhub-kb/reference/support-tickets-schema.md`.
>
> **Status key:** `OPEN` — diagnosed, awaiting Brian's decision · `LOCKED` — decision made, plan below
> is authoritative · `DONE` — implemented, ready to remove from this file.

---

## ✅ Triquetra Document Repository shows TTS and NewCastle data

- **Ticket:** `f0452ccd-eb14-44f0-a7dc-1c02f65c9989` · ux_improvement · High urgency · under_review
- **Tenant:** Triquetra (`f5850faf-deb6-4de0-bd06-8060c97ca423`)
- **Reported:** Sharwari Rajurkar, 8 Jul 2026 — "Confidentiality issue"
- **Status: ✅ DONE — verified fixed in `rto-compass-hub` main, 28 Jul 2026.**
  `fetchDocuments()` in `AdminDocumentRepository.tsx` now has `.eq('tenant_id', tenantId)` on the
  `documents_register` query (line 238), matching the `tenants`/`billing_subscriptions` queries
  elsewhere in the same file.

**Diagnosis:** Real cross-tenant data leak, verified directly (not just agent-reported). In
`src/components/documents/AdminDocumentRepository.tsx`, `fetchDocuments()` (~line 226-244) queries
`documents_register` with **no `.eq('tenant_id', tenantId)` filter**, unlike the same file's other two
queries (`tenants`, `billing_subscriptions` — both filter by `tenantId`, lines 201/211). It relies
entirely on RLS, and the live `sec.is_tenant_member()` check grants access to **every tenant the signed-in
user has an active `tenant_members` row in** — not just the currently selected workspace. Any user with
membership in more than one tenant (e.g. a Consultant) would see the union of all their tenants'
documents through this screen.

**Proposed fix:** add `.eq('tenant_id', tenantId)` to the `documents_register` query in
`fetchDocuments()`, matching the pattern already used elsewhere in the same file. Also grep the
document/register codebase for the same "no explicit tenant filter, relying solely on RLS" pattern —
this file was internally inconsistent, so the same mistake may exist elsewhere.

**Decision needed from Brian:** confirm fix scope (just this query, or a wider sweep) before branching.

---

## Cannot access reasonable adjustment register

- **Ticket:** `8d3bcb36-22ef-4e90-b350-9217dc58d2b8` · question · Medium urgency · in_progress
- **Tenant:** `91ffcbdc-c932-4b4c-b0e0-8a208a27abb4` (Australian College)
- **Reported:** hasitha, 16 Jun 2026 — error accessing the reasonable adjustment register.
- **Status: OPEN — likely transient/already resolved, needs confirmation only**

**Diagnosis:** `adjustment_plans` table exists and its RLS SELECT policy is broad and role-agnostic
(`sec.is_super_admin() OR sec.is_tenant_member(tenant_id)`) — nothing that would hard-block a normal
tenant member. Register loads fine now per the 22 Jun investigation note (0 records, no error). A stale
`// @ts-nocheck` comment in `src/pages/registers/adjustments/index.tsx` looks like leftover tech debt,
not evidence of a live bug.

**Proposed action:** move to ready for retest / close. Separately flag the stale `@ts-nocheck` comment
as an unrelated tech-debt cleanup item.

**Decision needed from Brian:** confirm-and-close; decide if the `@ts-nocheck` cleanup is worth a
follow-up ticket.

---

## ✅ Last Updated TAS is not correct

- **Ticket:** `1b715384-91ad-43e1-a530-60953ba75ff9` · bug · High urgency/severity · in_progress
- **Tenant:** none set on the ticket
- **Reported:** Angela, 8 May 2026 — editing a TAS doesn't update its "Last Updated" date on the
  dashboard.
- **Status: ✅ DONE — shipped and verified in production, 29 Jul 2026 (PR #321).**
  `v_tas_progress.updated_at` now reflects the latest edit across every TAS section, not just
  `tas_documents`/`tas_builds`. See `complyhub-kb/audit/2026-07-29_pr321_tas-last-updated-and-silent-catch-logging.md`
  for the full audit record.

**Diagnosis:** The TAS Library dashboard's "Last Updated" column (`src/pages/tas/TasLibraryPage.tsx:250`)
comes from view `v_tas_progress`, which selects `d.updated_at` from `tas_documents` — **not**
`tas_builds`. TAS section-save logic (`src/hooks/useTasBuildState.ts`) never touches `tas_documents`.
There's a working `tas_builds_set_updated_at` trigger that correctly stamps `tas_builds.updated_at`, but
the dashboard doesn't read that column at all.

**Fix shipped:** `v_tas_progress.updated_at` rebuilt as `GREATEST()` across `tas_documents`,
`tas_builds`, and per-section `max(updated_at)` subqueries for all seven TAS sections (setup, units,
market, learners, AOT, delivery, evidence) — migration `20260729003727_tas_progress_updated_at_from_all_sections.sql`.

---

## Adding Electives

- **Ticket:** `8810e366-4618-4732-b375-23094322af6e` · other · High urgency · in_progress
- **Tenant:** `91ffcbdc-c932-4b4c-b0e0-8a208a27abb4` (Australian College)
- **Reported:** hasitha, 21 May 2026 — SIS40221 packaging rules allow 3 units from
  Group A/B/C/another training package, but the elective screen only allows 2 external units.
- **Status: DIAGNOSIS SUPERSEDED (corrected 30 Jul 2026, evidence-verified against live DB) — this
  original diagnosis was WRONG. See `ticketImplementationplan.md` § "Adding Electives — qualification
  packaging rules misread" for the verified root cause, full implementation plan, and one remaining
  scope decision.**

**Diagnosis (corrected):** the original diagnosis above blamed `tga-fetch-qualdetails/index.ts` — that
function has **zero callers** anywhere in `src/` or `supabase/` (confirmed by grep) and is dead code; it
cannot be causing this. The real cause: the codebase already has a separate, AI-based extractor
(`tga-extract-packaging-rules`) that reads SIS40221's packaging rules **correctly** and stores the right
answer (max 3 external electives) in `q1_tas_builder.packaging_rules`. But the number actually enforced
in the UI comes from a *different* code path — `packagingValidation.ts`'s PRIORITY 1/2 branches — which
compute a pure arithmetic guess (`Math.min(2, floor(electiveRequired / 3))`) from the elective count
alone, ignoring the correct AI-extracted answer entirely. This is a **precedence bug**, not a parsing
bug: the right answer already exists and is being discarded. Live-DB verification across all 42
qualifications with an AI extraction found **~48% carry a wrong enforced cap** — 13 too restrictive
(blocks legitimate units, SIS40221's class of problem) and 1 too permissive (HLT23221 — the system
currently allows more external units than the qualification's real rule permits, a compliance risk more
serious than the original ticket).

**Proposed fix:** make the AI-extracted rules the authoritative source for the numeric caps (fixing the
precedence bug), surface confidence/provenance in the UI so staff can see *why* a cap applies, and add a
manual per-qualification override as the escape hatch for qualifications where the rule genuinely can't
be derived. Full 7-phase implementation plan already written — see `ticketImplementationplan.md`.

**Decision needed from Brian:** one open item only — whether the manual-override phase (Phase 4) ships
in the same PR as the core derivation fix, or as a fast-follow. Recommendation in the implementation
plan is to ship the core fix first (no schema change needed) and the override as a fast follow.

---

## RPL Register — course code cannot be added

- **Ticket:** `42245055-da24-46c6-91da-ea3092134bc9` · other · High urgency · in_progress · category: Registers
- **Tenant:** `91ffcbdc-c932-4b4c-b0e0-8a208a27abb4` (Australian College)
- **Reported:** hasitha, 16 Jun 2026 — wants all course codes addable when building the RPL register.
- **Status: OPEN — root cause identified, ready to plan a fix**

**Diagnosis:** `src/types/rpl.ts` (~lines 77-85) hardcodes a static list of exactly 7 course codes
(`COURSE_CODES`), imported directly into `RPLRegisterForm.tsx` and rendered as the entire dropdown. No
free-text fallback, no dynamic pull from the tenant's actual qualifications. Any qualification outside
this list literally cannot be entered.

**Proposed fix:** replace the hardcoded array with a dynamic query against the tenant's own
TAS/qualification data (or add a free-text entry option as a fallback).

**Decision needed from Brian:** dynamic query vs. free-text fallback vs. both.

---

## To add Admin Support as a role

- **Ticket:** `f98a4c6a-3a26-4197-aded-4b885b503b3d` · feature · High urgency · under_review
- **Tenant:** Triquetra (`f5850faf-deb6-4de0-bd06-8060c97ca423`)
- **Reported:** Sharwari Rajurkar, 14 Jul 2026 — wants an "Admin Support" role so non-training admin
  staff aren't wrongly flagged non-compliant in trainer management when given an existing role.
- **Status: OPEN — WAITING ON PRODUCT DECISION (Angela). Sharwari (ticket reporter) has been asked to clarify who these Admin Support users are and what they need to do in the platform, so scope can be forwarded to Angela accurately. Do not proceed to a fix/* branch until Angela's decision comes back.**

**Diagnosis:** Live trigger `sync_trainer_profile()` auto-pushes any `tenant_members` row whose role
matches `Trainer%` (case-insensitive prefix) into `tp_trainers`, which feeds the whole compliance/matrix
engine. A new role name that doesn't match that prefix (e.g. "Admin Support") would automatically avoid
the auto-sync and the resulting compliance flags — no changes needed to the trigger itself.

**Proposed fix:** add a new role constant to `src/lib/constants/roles.ts` + a roles migration.

**Decision needed:** Angela's product decision on permission scope for the new "Admin Support" role (options discussed: (a) minimal — role exists, no gate changes, defaults to no special access; (b) operational_write tier — same access as other operational roles for docs/registers, just not training-specific). Role name "Admin Support" (matching ticket wording) is tentatively agreed pending final confirmation. Blocked on Sharwari's reply about who these users are and what they need to do, which will be forwarded to Angela.

---

## Error with the trainer units

- **Ticket:** `1f54799d-328d-40ba-9f09-2cd403114876` · other · High urgency · in_progress
- **Tenant:** `91ffcbdc-c932-4b4c-b0e0-8a208a27abb4` (Australian College)
- **Reported:** hasitha, 26 May 2026 — units allocated but an error is shown.
- **Status: OPEN — not a bug, needs a product/admin decision**

**Diagnosis:** Prior investigation (22 Jun 2026) found trainer "artwalters" flagged Non-Compliant with
0 units, missing TAE, no industry currency — this is the standard, intended compliance-warning
vocabulary (`src/hooks/useTrainerMatrixEngine.ts:23-48`), not a bug.

**Proposed action:** no dev fix. Decide whether to archive "artwalters" (if inactive) or complete their
record (if active).

**Decision needed from Brian:** archive or complete the trainer record — this is an admin data decision,
not a code change.

---

## Delivery Readiness

- **Ticket:** `2b31181c-e19c-44a8-85e7-068631a854a8` · bug · Medium urgency · in_progress
- **Tenant:** `48e10856-a23d-44f1-b4ec-1c442498e40b`
- **Reported:** Brian Lapitan, 1 Jun 2026 — three sub-issues: (a) trainer-assignment dropdown should
  only show qualified trainers, (b) "Trainer Coverage" shows 73.3% overall vs. 0/15 (0%) in a
  unit-level section, (c) generated schedule/timetable can't be found.
- **Status: OPEN — partially addressed, (b) still unresolved**

**Diagnosis:**
- (a) `src/components/tas/builder-sandbox/TrainerMatrixSection.tsx` (~lines 1192-1210) already filters
  trainer assignment to `qualifiedTrainerIds` — but this may not be the exact dropdown the ticket means;
  not fully confirmed.
- (b) Two genuinely different metrics (matrix-wide qualification coverage vs. TAS-unit-level coverage)
  are computed from different data and shown without explanation — the discrepancy is real and was
  **not** addressed by the 22 Jun resolution note.
- (c) Consistent with the Delivery Hours finding below — no delivery pack/timetable generated yet
  because per-unit hours aren't configured.

**Proposed fix:** (a) confirm with Brian which dropdown is meant; (b) either label the two coverage
numbers distinctly (UX fix) or populate the missing per-unit coverage data; (c) resolved once Delivery
Hours (below) is addressed.

**Decision needed from Brian:** confirm scope of (a), and choose UX-fix vs. data-fix for (b).

---

## Trainer Matrix & Credentials Validation

- **Ticket:** `bea33b1f-00b7-49cb-b727-5cdda6eeb70b` · bug · Medium urgency · in_progress · category: Data
- **Tenant:** `48e10856-a23d-44f1-b4ec-1c442498e40b`
- **Reported:** Brian Lapitan, 1 Jun 2026 — matrix says "1 qualified trainer" but no lead/backup shown;
  also can't view the rest of the units.
- **Status: OPEN — partially diagnosed, needs a live-repro follow-up**

**Diagnosis:** "Qualified" (credential-based eligibility) and "assigned" (explicit lead/backup mapping)
are two separate concepts computed from different data — a trainer can be qualified without a formal
assignment, which would produce exactly this "1 qualified, 0 assigned" appearance. The "can't view rest
of units" claim was **not confirmed** — needs a grep for `.range(`/`.limit(` on the trainer-matrix units
query, or a live UI repro.

**Proposed action:** UX labeling fix for qualified-vs-assigned confusion (low risk); separate
investigation needed for the units-visibility complaint before scoping a fix.

**Decision needed from Brian:** approve a follow-up investigation pass for the units-visibility part.

---

## Delivery Hours

- **Ticket:** `0dabbc86-2aca-485c-b5e4-23d51016b20e` · bug · Medium urgency · in_progress
- **Tenant:** `48e10856-a23d-44f1-b4ec-1c442498e40b`
- **Reported:** Brian Lapitan, 1 Jun 2026 — total delivery hours don't recalculate when units in the
  table change.
- **Status: OPEN — design gap identified, needs a product decision**

**Diagnosis:** `src/components/tas/builder-sandbox/DeliveryPanel.tsx` loads hours from a stored AOT pack
snapshot on mount only (`loadDeliveryHoursFromAotPack`, ~lines 239-266) rather than computing live from
the current unit list. A separate manual action (`rpc_apply_aot_to_delivery_hours`, ~line 522) must be
re-run after the unit table changes — this may be an intentional snapshot pattern, not a bug, but it's
not surfaced to the user as a "needs re-apply" state.

**Proposed fix options:** (a) auto-recompute delivery hours when the unit list changes, or (b) add a
visible "stale — re-apply AOT" banner/prompt in the UI.

**Decision needed from Brian:** (a) auto-recompute vs. (b) surfaced staleness warning.

---

## Industry currency

- **Ticket:** `a2bd5eef-c693-48fd-b711-6aab3321fe38` · feature · High urgency · under_review
- **Tenant:** `91ffcbdc-c932-4b4c-b0e0-8a208a27abb4` (Australian College)
- **Reported:** psychometrix3, 21 May 2026 — wants to log broader industry-currency types (consulting,
  journals/publications, etc.), not just standard PD.
- **Status: OPEN — partially built, scope decision needed**

**Diagnosis:** The richer data model already exists — `IndustryActivityType`
(`src/types/trainer-matrix-engine.ts:30-41`) includes consulting, industry projects, conferences,
memberships, research, etc., used by the admin-side Trainer Matrix Engine (`AddPDDialog.tsx`). But the
ticket's own route (`/dashboard/trainer-portal/pd`) resolves to a different, older module
(`TrainerPDForm.tsx`) constrained to only `vet_pd | industry_pd | general_pd`
(`src/data/constants-trainer.ts:26-30`).

**Proposed fix:** wire the trainer self-service PD form to the richer `IndustryActivityType` enum
already used on the admin side — or confirm the scope split is deliberate.

**Decision needed from Brian:** extend trainer-portal PD form, or confirm current split is intentional.

---

## Student survey results

- **Ticket:** `d39c5044-6ed5-4a66-a3b8-c9d7db7215aa` · feature · Medium urgency · under_review
- **Tenant:** `a6a60268-f437-48ad-8d12-b597e8bfdfb4`
- **Reported:** Louisa Gatto, 26 May 2026 — wants student survey results (post-session, end-of-qual)
  folded into ComplyHub for continuous improvement.
- **Status: OPEN — needs scope decision, real gap in the general survey flow**

**Diagnosis:** Extensive survey infrastructure exists (`surveys`, `survey_templates`,
`survey_questions`, `survey_responses`, `survey_recipients`, `survey_cycles`, `survey_findings`,
`nps_surveys`, etc.), but the general "create a survey" action is an explicit stub —
`src/pages/Surveys.tsx` `handleCreateSurvey()` just shows a "Coming soon" toast. The `QiSurvey*` pages
implement ASQA Quality Indicator surveys specifically, not a general post-session/end-of-qual builder.

**Proposed fix:** clarify whether this wants the QI surveys extended, or the stubbed general survey
builder actually built — these are different scopes of work.

**Decision needed from Brian:** which survey flow this ticket is actually asking for.

---

## Trainer PD — add reflection text box

- **Ticket:** `28d71c9f-2d81-4e1a-b54a-8bd5f671e13d` · feature · Medium urgency · under_review
- **Tenant:** `a6a60268-f437-48ad-8d12-b597e8bfdfb4`
- **Reported:** Louisa Gatto, 25 May 2026 — thread text is thin ("Please see above"), original detail
  presumably lost/attached elsewhere.
- **Status: OPEN — too thin to action, needs the original detail recovered**

**Diagnosis:** `PDRegisterForm.tsx` already has an optional `notes` field; the trainer self-service form
(`TrainerPDForm.tsx`) has a `description` field but nothing explicitly labelled "reflection." Can't tell
from the surviving text whether `description` already covers this or a distinct field is wanted.

**Proposed action:** none yet — need the original ticket detail/attachment.

**Decision needed from Brian:** can the original detail be recovered from Louisa, or should this be
closed as unactionable and re-opened if she re-describes it?

---

## Urgent alerts

- **Ticket:** `9d4bc935-f373-4847-b5b2-f17b5e5e5fe6` · question · Medium urgency · under_review
- **Tenant:** `231ab8df-d035-4ae6-add2-01b4de2b8747`
- **Reported:** Tanya Janklin, 12 Jul 2026 — sees an "Urgent Alerts" notification on the dashboard,
  doesn't know how to open it to act on it.
- **Status: OPEN — likely a real dead-end, not fully confirmed**

**Diagnosis:** No "urgent" references found in `src/pages/consultant/ConsultantMyTenants.tsx` itself —
must come from an embedded shared component. The closest candidate,
`src/components/compliance/NotificationCenter.tsx`, only wires "mark as read"/"delete" — no
click-through to a details view. Could not confirm this is the exact component rendering the widget on
that page.

**Proposed action:** confirm which component renders the widget on `/consultant/my-tenants`, then decide
whether to add a click-through or this is working-as-designed and just needs a tooltip/help text.

**Decision needed from Brian:** approve a short follow-up investigation to confirm the component before
deciding fix vs. no-fix.

---

## Trainer Credential AI Analyse

- **Ticket:** `09932c9c-03d2-4fa6-b79c-fb6cc4a3a000` · bug · High urgency · in_progress
- **Tenant:** `55784940-fdc4-44cd-8bf8-cc1ecc4ac8d2`
- **Reported:** Anthony Reimers, 23 Apr 2026 — can't add a credential without AI Analyse, and can't get
  it Analysed/Verified either; error: "New row violates row-level security policy".
- **Status: OPEN — blocked, needs Angela's full note or a live repro**

**Diagnosis:** Angela's 22 Jun 2026 reply ("I've investigated the issue and found two things:") is
**cut off mid-sentence** in the ticket thread — no record of what she actually found. The UI insert path
(`AddCredentialDialog.tsx` → `useAddCredential` in `src/hooks/useTrainerMatrixEngine.ts:337-377`) does a
direct client-side insert into `trainer_matrix_credentials`, gated by RLS requiring correct
`current_tenant_id()`, active billing state, and no write-lock — any mismatch on any of these at insert
time would throw exactly this error.

**Proposed action:** get Angela's un-truncated 22 Jun note first; if unavailable, needs a live repro with
a real trainer-matrix-engine admin account to catch the RLS failure directly.

**Decision needed from Brian:** can Angela's full note be recovered, or proceed straight to a live repro?

---

## Ready-to-implement summary (no decision blockers)

None yet — every item above has at least one open decision point for Brian before a `fix/*` branch
should be started. Items expected to move to `LOCKED` fastest: **Triquetra doc leak** (P0, scope
question only), **Last Updated TAS**, **RPL course code** — these have a single concrete fix path
already identified.
