# Trainer Matrix Engine — Diagnosis (07 Aug 2026)

> Diagnosis-only pass per Brian's request — no code edited, no migrations applied, no commits made.
> Living doc per `CLAUDE.md`'s "Living-doc workflow" — one source of truth for this body of work.
> Work through items one at a time to reach a locked fix decision; delete this file once implemented
> and audited.

## Context

Reported against `https://rto.complyhub.ai/admin/trainer-matrix-engine?tab=engine` — reachable by
Administrator, Governing Person, Consultant, Consultant Assistant, and Compliance Manager (per
`AdminRoute.tsx`), not admin-only. Screenshots: demo trainer Brian Sismundo (TGA Units dropdown
clipping) and demo trainer Brendan Nguyen (`brendan.nguyen@demo.complyhub.ai`, 853/857 currency gap).

---

## 1. AI onboarding: user's corrected file label doesn't propagate to later steps — DIAGNOSED

**Root cause confirmed:** not a stale closure, not an id mismatch, not a bug in the AI analysis or
normalisation logic itself — those all correctly read `userCategory || category`. The bug is a missing
cache invalidation.

- AI classification: `src/hooks/useTrainerOnboarding.ts` `runAIAnalysis` (lines 363-467) calls edge
  function `analyze-trainer-evidence`, stores results in `analyses` state (`EvidenceAnalysis` type,
  `src/types/trainer-onboarding.ts` lines 75-76, has `category`/`subcategory` + optional
  `userCategory`/`userSubcategory`).
- User review/edit: `src/components/trainer-matrix/onboarding/steps/AIAnalysisStep.tsx` lines 357-377,
  a `Select` per file calling `onUpdateCategory` → `TrainerOnboardingWizard.tsx` `handleUpdateCategory`
  (lines 218-224) → hook's `updateAnalysis` (lines 1053-1055):
  ```ts
  const updateAnalysis = useCallback((analysisId, updates) => {
    setAnalyses((prev) => prev.map((a) => (a.id === analysisId ? { ...a, ...updates } : a)));
  }, []);
  ```
  This part works correctly — `analyses` state is updated properly.

- **The break:** later steps don't read `analyses` — they read two derived, CACHED objects that are
  never invalidated when `updateAnalysis` runs:
  - `normalisedRows` — built by a `useEffect` in `TrainerOnboardingWizard.tsx` (lines 192-201) gated by
    `normalisedRows.length === 0`. Only fires once; a correction made after the first pass through
    `normalisation-review` never triggers a rebuild.
  - `matrixPreview` — built once via a manual "Generate Records Preview" button
    (`AutoCreateStep.tsx` line 139); once non-null, the button is hidden (lines 41, 163-174), so there's
    no way to regenerate it even if `normalisedRows` were refreshed.
  - `removeFile` (lines 345-356) already shows the correct pattern — it resets both
    `normalisedRows` and `matrixPreview` when a file is removed. `updateAnalysis` has no equivalent.
  - Every downstream step (`NormalisationReviewStep`, `AutoCreateStep`, `MatrixPreviewStep`,
    `ConfirmStep`) and the actual DB-writing `confirmAndSave()` (lines 631-1050, inserts into
    `trainer_matrix_credentials`/`trainer_pd`/`trainer_industry_currency`) all read from
    `matrixPreview`/`normalisedRows`, never from live `analyses`.

**Proposed minimal fix (not implemented):** in `updateAnalysis` (and the delete-analysis path), also
call `setNormalisedRows([])` and `setMatrixPreview(null)` — mirrors the existing `removeFile` pattern
and lets the existing one-shot effect guard do the rebuild correctly. Consider a toast telling the user
their correction requires re-running Normalisation/Preview.

**Scope:** likely 1-2 files (`useTrainerOnboarding.ts` for the state reset, maybe a toast in
`TrainerOnboardingWizard.tsx`). No DB/migration changes.

### Implementation Plan — LOCKED (mechanical fix, no design decision needed)

Re-verified against current code 07 Aug 2026: `updateAnalysis` still at
`useTrainerOnboarding.ts:1053-1055`, `removeFile`'s reset pattern still at lines 344-356, `useToast`
already imported (line 6). No drift since diagnosis.

1. **`src/hooks/useTrainerOnboarding.ts`** — extend `updateAnalysis` to mirror `removeFile`'s reset:
   ```ts
   const updateAnalysis = useCallback((analysisId: string, updates: Partial<EvidenceAnalysis>) => {
     setAnalyses((prev) => prev.map((a) => (a.id === analysisId ? { ...a, ...updates } : a)));
     setNormalisedRows([]);
     setMatrixPreview(null);
   }, []);
   ```
   This covers both correction (`handleUpdateCategory`) and deletion (`handleDeleteAnalysis`) paths in
   `TrainerOnboardingWizard.tsx`, since both route through `updateAnalysis`.
2. **Toast on correction** — in `TrainerOnboardingWizard.tsx`'s `handleUpdateCategory` (lines 218-224),
   call `toast({ title: 'Correction saved', description: 'Normalisation and preview will re-run to
   reflect your change.' })` after `updateAnalysis(...)`. `useToast` is already available in that file
   (used elsewhere in the wizard) — confirm import at implementation time.
3. **Why this is sufficient:** clearing `normalisedRows` re-arms the existing one-shot guard at
   `TrainerOnboardingWizard.tsx:192-201` (`normalisedRows.length === 0`), so `runNormalisation()`
   fires again next time the user is on/re-enters `normalisation-review`. Clearing `matrixPreview`
   re-shows the "Generate Records Preview" button (`AutoCreateStep.tsx:41,163-174`), giving the user an
   explicit re-generate action rather than a silent auto-rebuild mid-review.
4. **No DB/migration/edge-function changes.** Two files, both `src/`.
5. **Test after implementing:** in the onboarding wizard, run AI analysis, correct a file's category on
   the AI Analysis step, proceed to Normalisation Review, confirm the corrected category appears in the
   normalised row — not the original AI-suggested one — before Auto-Create/Preview/Confirm.

---

## 2. Duplicate records when re-onboarding a partially-set-up trainer — DIAGNOSED

**Confirmed: duplicates ARE currently possible, and nothing in the onboarding flow prevents them.**

- `useDuplicateCredentials.ts` (lines 16-38) is a `useMemo` that groups an already-fetched
  `credentials` array by exact `qualification_code` string match — pure client-side, no hash/filename
  comparison, credentials-only (no PD/currency equivalent). It never runs automatically during
  onboarding — it's only wired into `TrainerProfileDrawer.tsx` line 721 (the profile's Credentials
  tab), a completely separate view from the onboarding wizard.
- `TrainerOnboardingWizard.tsx` never imports or references `useDuplicateCredentials` or
  `DuplicateCredentialNotice` at all.
- All three record-insert calls in `useTrainerOnboarding.ts`'s `confirmAndSave` insert unconditionally,
  with zero existence check against the trainer's current records:
  ```ts
  // Credentials — line 705-709
  await supabase.from('trainer_matrix_credentials').insert(payload).select().maybeSingle();
  // PD — line 761-765
  await supabase.from('trainer_pd').insert(payload).select().maybeSingle();
  // Currency — line 813-817
  await supabase.from('trainer_industry_currency').insert(payload).select().maybeSingle();
  ```
- No DB-level backstop either — confirmed no `UNIQUE` constraint on `(trainer_id, qualification_code)`
  or similar on any of the three tables in the baseline migration.
- The only dedup that exists at all is **file-identity-based** (SHA-256 hash via
  `evidenceService.computeFileHash`/`findExistingDocument`, `useTrainerOnboarding.ts` lines 203-264) —
  it stops a byte-identical file from re-uploading to storage, but the reused document is still pushed
  through AI analysis and `confirmAndSave`'s unconditional inserts, so a **new structured record** is
  still created and linked via a second `evidence_document_links` row. The batch-level dedupe in
  `evidenceNormalisation.ts` (`computeDedupeKey`/`normaliseAnalyses`, lines 178-192, 430-527) only
  compares within the current wizard session's `analyses` array — it has zero visibility into what's
  already saved in the DB from a prior session.
- `DuplicateCredentialNotice.tsx` (only rendered in `TrainerProfileDrawer.tsx` line 721) is purely
  reactive: requires a human to open the profile drawer's Credentials tab, only fires on exact
  `qualification_code` match, and requires manual "Mark Superseded"/"Keep" per row — no PD/currency
  equivalent, not triggered during or immediately after onboarding.
- `PreviousUploadSessions.tsx` (`TrainerProfileDrawer.tsx` line 1348) is informational only — a
  read-only list of past sessions, no cross-session comparison or flagging.

**Bottom line:** re-running onboarding on a trainer with partial prior records will blindly create new
`trainer_matrix_credentials`/`trainer_pd`/`trainer_industry_currency` rows, whether the re-uploaded
file is genuinely new or a byte-identical re-upload of something already processed.

**Not yet proposed:** a fix approach (pre-insert existence check by trainer_id + qualification_code/
type+date, proactive duplicate warning surfaced during onboarding itself rather than only in the
profile drawer afterward, and/or a DB-level unique constraint) — needs a design decision on what
"duplicate" should mean for PD/currency records (exact field match? date range overlap?) before
locking a fix. Discuss with Brian before implementing.

### Implementation Plan — NOT LOCKED, needs a decision from Brian before coding starts

Two questions have to be answered before this can be scoped, because the answer changes which files
and how many are touched:

**Question A — what counts as a duplicate for each record type?**
- Credentials: existing pattern is exact `qualification_code` match (`useDuplicateCredentials.ts:16-38`)
  — reuse that definition, or tighten it?
- PD (`trainer_pd`): no existing definition anywhere in the codebase. Candidates: same
  `activity_type` + same date; same `activity_type` + overlapping date range; or file-hash reuse only
  (i.e. don't dedupe PD content at all, only prevent re-uploading the identical file).
- Currency (`trainer_industry_currency`): no existing definition. Candidates: same `unit_code`
  (or qualification) with an overlapping validity window, vs. exact field match.

**Question B — warn-and-let-user-decide, or hard-block?**
- (i) Soft warning during onboarding (surface something like the existing
  `DuplicateCredentialNotice` pattern inline in the wizard, user chooses Keep/Supersede/Skip per row)
  — matches the credentials pattern already in `TrainerProfileDrawer.tsx`, no DB change.
- (ii) Hard pre-insert existence check in `confirmAndSave` that silently skips/merges instead of
  inserting a duplicate — simpler, but removes the user's ability to intentionally add a second
  overlapping record (e.g. a genuine renewal).
- (iii) DB-level `UNIQUE` constraint as a backstop under either (i) or (ii) — catches anything the
  application-level check misses, but needs the exact duplicate definition from Question A to write
  correctly, and is a migration (falls under the interim `execute_sql` + `migration repair` procedure
  in `CLAUDE.md`, not a plain `db push`).

**Once Brian answers A and B, the plan becomes concrete:**
- If (i): extend `useTrainerOnboarding.ts`'s `confirmAndSave` (lines 705-817) to run an existence query
  per record type before each insert (mirroring `useDuplicateCredentials.ts`'s grouping logic but
  against live DB rows, not just in-session state), surface results in a new onboarding step or inline
  banner using the `DuplicateCredentialNotice` pattern, and gate the three inserts on the user's
  Keep/Supersede/Skip choice per flagged row.
- If (ii): same existence query, but skip flagged inserts automatically and toast a summary
  ("3 records skipped as duplicates") instead of building new UI.
- If (iii) in addition to either: a new migration adding `UNIQUE (tenant_id, trainer_id,
  <duplicate-key-columns-from-Q-A>)` per table, following the idempotent-migration and
  `git log -S` pre-check rules in `supabase/migrations/CLAUDE.md`.

**Scope once decided:** `useTrainerOnboarding.ts` (existence checks in `confirmAndSave`) always; a new
component/step only under (i); a migration only under (iii). No file edits until Brian locks A and B.

### Decision — LOCKED (07 Aug 2026)

**Question A answered:** Credentials keep the existing exact `qualification_code` match rule. PD and
currency records do NOT get a field/date-based duplicate rule — legitimate repeat activities (multiple
PD sessions of the same type, periodic currency renewals) must never be flagged. Instead, the duplicate
signal for PD and currency is **evidence-document reuse**: before inserting a PD or currency record,
check whether the trainer already has a record linked to the same `evidenceDocumentId`. Only a
re-processed/re-linked instance of the *same* uploaded document counts as a duplicate — two different
documents never trigger it, no matter how similar their type/date.

**Question B answered:** Warn-and-let-user-decide (option (i) from the plan above), applied using the
Question A definition — i.e. surfaced during onboarding when a file already linked to an existing
record for this trainer is reprocessed, with Keep / Skip per flagged row. No DB-level unique constraint
for now (option (iii) not adopted).

**Concrete scope:** `useTrainerOnboarding.ts`'s `confirmAndSave` (credentials/PD/currency insert calls
around lines 705-817) gains a pre-insert check per record type: credentials by exact
`qualification_code`; PD and currency by existing `evidenceDocumentId` link on the trainer's current
records. Flagged rows surface via a wizard step/banner (following the `DuplicateCredentialNotice`
pattern) before insert, gated on the user's Keep/Skip choice. No migration required.

---

## 3. "Add Qualification & Units (TGA)" dropdown clipped/unscrollable — DIAGNOSED

**Root cause confirmed:** a hand-rolled combobox that never actually escapes its scrollable ancestor,
despite computing positioning as if it does.

- Component chain: `TrainerMatrixEngine.tsx` → `TrainerProfileDrawer.tsx` (line 410:
  `SheetContent className="... h-full overflow-hidden flex flex-col"`; line 459:
  `ScrollArea className="flex-1"` wraps all tab content) → `TgaQualificationUnitPicker.tsx` (line 187
  "Add Qualification & Units (TGA)" card, line 196 renders the dropdown) →
  `QualificationSearchDropdown.tsx` (the actual combobox, root cause).
- `QualificationSearchDropdown.tsx` has a comment implying portal behaviour, but there is **no**
  `ReactDOM.createPortal`/Radix `Portal` anywhere in the file (verified, zero matches). The "portal"
  is a plain child `<div>`:
  ```tsx
  // lines 118-129
  const portalContent = open ? (
    <div ref={dropdownRef} style={{ position: 'absolute', top: '100%', left: 0, width: '100%', zIndex: 1060 }}
         className="bg-background border rounded-md shadow-lg flex flex-col mt-1">
  ```
- `calculatePosition()` (lines 61-72) computes real viewport-relative `top`/`left` via
  `getBoundingClientRect()` against `window.innerHeight` — but the rendered style only uses
  `top: '100%'; left: 0` (normal in-flow absolute placement), so that computed positioning is dead
  code; only `dropdownStyle.maxHeight` (line 154) is actually applied.
- Real ancestor chain: `containerRef div (position: relative)` → `TgaQualificationUnitPicker`'s
  Card/CardContent → `TabsContent value="tga-units"` → `ScrollArea` Root (`overflow-hidden`,
  `src/components/ui/scroll-area.tsx` line 12) → `SheetContent` (`overflow-hidden`,
  `TrainerProfileDrawer.tsx` line 410). The dropdown panel is clipped by one of these ancestors before
  its own internal `overflow-y-auto` (line 153, correctly implemented) ever gets a chance to matter.
- Not a "not enough results" issue — `useTgaQualificationsWithUnits` (`src/hooks/useTgaUnits.ts`)
  loads the full cached qualification/unit set with no pagination; filtering is client-side. More
  results genuinely exist below the clipped cutoff.

**Proposed minimal fix (not implemented):** wrap `portalContent` in `ReactDOM.createPortal(...,
document.body)` (or a Radix `Popover.Portal`), switch to `position: fixed` using the already-computed
`dropdownStyle.top`/`left`/`width` from `calculatePosition()` (currently computed but unused) instead
of `position: absolute; top: 100%`.

**Blast radius:** `QualificationSearchDropdown` is only used by `TgaQualificationUnitPicker`, which is
only used by `TrainerProfileDrawer`, which is only used by `TrainerMatrixEngine.tsx` — a fix here is
fully isolated, no shared generic combobox component involved. Confirmed reachable by all the
non-admin roles `AdminRoute` allows (Governing Person, Consultant, Consultant Assistant, Compliance
Manager), not admin-only.

**Aside, out of scope:** `AdminRoute.tsx` lines 73/77 have raw `console.log` calls — banned pattern per
`CLAUDE.md`/`AGENTS.md`. Noted for awareness, not part of this fix.

**Scope:** single file (`QualificationSearchDropdown.tsx`). No DB/migration changes.

### Implementation Plan — LOCKED (mechanical fix, no design decision needed)

Re-verified against current code 07 Aug 2026 — file lives at
`src/components/trainer-matrix/tga-picker/QualificationSearchDropdown.tsx` (diagnosis's path was
missing the `tga-picker/` subfolder). `portalContent` still plain-div at lines 118-205,
`calculatePosition()` still computing real `top`/`left`/`width` at lines 61-72 and storing them in
unused-for-positioning `dropdownStyle` state. No drift since diagnosis.

1. Add `import { createPortal } from 'react-dom';` to the top imports.
2. Change the `portalContent` wrapper (lines 118-129) from a plain child `<div>` to
   `createPortal(<div ...>, document.body)`:
   ```tsx
   const portalContent = open
     ? createPortal(
         <div
           ref={dropdownRef}
           style={{
             position: 'fixed',
             top: dropdownStyle.top,
             left: dropdownStyle.left,
             width: dropdownStyle.width,
             zIndex: 1060,
           }}
           className="bg-background border rounded-md shadow-lg flex flex-col"
         >
           {/* ...unchanged inner content, lines 130-204... */}
         </div>,
         document.body
       )
     : null;
   ```
3. Switch `position: 'absolute'; top: '100%'; left: 0` → `position: 'fixed'` using the already-computed
   `dropdownStyle.top`/`left`/`width` (now genuinely used, not dead code). Drop the `mt-1` class — the
   `+4` offset is already baked into `calculatePosition()`'s `rect.bottom + 4` (line 67), so keeping
   `mt-1` on top of that would double the gap now that it's real fixed-position spacing rather than
   in-flow stacking.
4. No change needed to the existing scroll/resize/outside-click listeners (lines 79-106) — they already
   operate on `window` and `dropdownRef`/`containerRef`, which stay valid once portalled to
   `document.body`.
5. **Test after implementing:** open Trainer Profile drawer → TGA Units tab → "Add Qualification &
   Units (TGA)" → open the dropdown with the drawer scrolled so the trigger sits near the bottom of the
   viewport — confirm the panel now renders past the drawer's `overflow-hidden` boundary and its own
   `overflow-y-auto` (line 153) becomes reachable/scrollable. Also test with the drawer scrolled to the
   top (dropdown should still position correctly below the trigger, not detached).

---

## 4. "853 of 857 units missing currency" for Brendan Nguyen — DIAGNOSED, NOT a query bug

**Root cause confirmed: this is a data problem, not a scoping/query bug.** Verified against live DB
(project `gdwhlstfguxarnxasrrs`, read-only).

- `UnitCurrencyCoverage.tsx` (line 93, 98, 114, 146) does no querying itself — it just renders whatever
  `competencies` array prop it's given; `total = competencies.length`.
- `TrainerProfileDrawer.tsx` (lines 219, 872) feeds it via `useTrainerVocationalCompetencies` in
  `useTrainerMatrixEngine.ts` (lines 202-221):
  ```ts
  .from('trainer_vocational_competency').select('*')
  .eq('tenant_id', tenantId).eq('trainer_id', trainerId).order('unit_code');
  ```
  Correctly trainer-scoped — no missing WHERE clause.
- The "Currency Gap: X of Y" text comes from DB function `compute_trainer_classification` in
  `00000000000000_baseline.sql` (~line 25846+, loop at line 25980), also correctly filtered by
  `tenant_id` + `trainer_id`.
- **Live query confirms 857 is real and trainer-scoped**, not a global/national total:
  ```sql
  select count(*) from trainer_vocational_competency
  where tenant_id = 'df5c0c9d-...fc01' and trainer_id = 'b2000001-...002';
  -- => 857
  ```
  (For reference, the actual global catalogue tables — `units`, `training_unit_codes` — have 0 and 10
  rows respectively, nowhere near 857, ruling out a "leaked global count" theory.)
- **The real issue:** the content of those 857 rows is wrong for this trainer. Breakdown by unit-code
  prefix shows units spanning Hospitality (SITH, 89), Community Services (CHCC/CHCE/CHCD, 159 combined),
  Retail (SIRX, 49), Tourism (SITX, 38), Hairdressing/Beauty (SHBB, 35), plus Business (BSB*, 232) —
  16 distinct training-package prefixes total. Brendan's only real credentials
  (`trainer_matrix_credentials`) are TAE40122 (Cert IV TAE) and BSB50420 (Diploma of Leadership and
  Management) — a Business/Leadership trainer with no plausible connection to Hospitality, Retail,
  Hairdressing, etc.
- All 857 rows were inserted in exactly 2 bulk-timestamp batches (03 Jul 2026 and 17 Jul 2026) —
  consistent with a bulk-upsert, not organic per-unit entry.
- Insert path: `rpc_bulk_upsert_trainer_units(p_tenant_id, p_trainer_id, p_units jsonb)` (baseline
  migration ~line 67642) — trusts whatever `p_units` array it's given, no server-side relevance check.
  Frontend caller: `useAddUnitsFromTGA` in `useFullTrainerMatrix.ts` (~line 267) — builds `p_units` from
  whatever the calling UI flow supplies, with no check that the units are relevant to the trainer's
  actual qualifications.
- No comment/doc found indicating this breadth is intentional — `UnitCurrencyCoverage.tsx` line 125's
  Standard 3.3 reference is about currency for units the trainer is *actually* delivering, not the
  entire national catalogue.

**Two separate fix angles (not yet decided which, or both):**
(a) **Data cleanup** — this specific demo trainer's `trainer_vocational_competency` rows need pruning
    to only the units genuinely relevant to TAE40122/BSB50420. This is demo/seed data, not a real
    tenant, so cleanup risk is low, but confirm before deleting anything.
(b) **Product gap** — if this is possible for real tenants too (not just this demo seed), add a guard
    in the `useAddUnitsFromTGA` → `rpc_bulk_upsert_trainer_units` path so a trainer can't be bulk
    assigned units unrelated to any qualification they actually hold.

**Scope:** (a) is a data-only fix, no code change, but needs sign-off since it's a live tenant's data
even if demo. (b) would touch `useFullTrainerMatrix.ts` and possibly the RPC — needs a design decision
on what "relevant" means (unit-to-qualification mapping source of truth) before locking a fix.

### Implementation Plan — NOT LOCKED, needs a decision from Brian before coding starts

The two angles are independent — (a) can happen alone, (b) can happen alone, or both. Recommend doing
(a) regardless (bad demo data actively misleads anyone using Brendan Nguyen for demos), and deciding
separately whether (b) is worth building now vs. deferring.

**(a) Data cleanup — pure DB, no code/migration file, needs a scope decision:**
1. Confirm demo tenant `df5c0c9d-...fc01` / trainer `b2000001-...002` is genuinely demo/seed data
   (not a real customer using the same-looking id prefix) before touching anything — re-verify via
   `mcp__supabase__execute_sql`, don't rely on the 07 Aug snapshot in this doc.
2. Decide keep-criterion: delete every `trainer_vocational_competency` row whose unit-code prefix
   doesn't map to TAE40122 or BSB50420, or explicitly pass Brian the list of 16 prefixes and get a
   per-prefix keep/drop call (some Business-adjacent prefixes might be intentionally broad for a demo
   showing partial currency).
3. Execute as a one-off `execute_sql` DELETE (not a migration file — this is tenant data, not schema),
   scoped by `tenant_id` + `trainer_id` + the agreed prefix exclusion list.
4. Verify afterward: re-query the 857 count, confirm `compute_trainer_classification`'s "X of Y" now
   reflects a sane number for a TAE40122/BSB50420-only trainer.

**(b) Product guard — needs "what does relevant mean" answered first:**
- Candidate A: a unit is "relevant" if it belongs to the same training package as any qualification in
  the trainer's `trainer_matrix_credentials` (prefix match, e.g. `BSB*` for `BSB50420`) — cheap, but
  coarse (a trainer with one BSB cert could still bulk-add all ~232 BSB-prefixed units in one shot).
- Candidate B: relevant only if the unit is a component/elective of a qualification the trainer
  actually holds — accurate, but needs a real qualification→unit structure/mapping table as source of
  truth; confirm whether `training_unit_codes` (10 rows per this doc's live check) or the TGA data
  powering `useTgaQualificationsWithUnits` already has this structure, or whether it would need new
  ingestion.
- Once the source of truth is picked: add a check in `useAddUnitsFromTGA` (`useFullTrainerMatrix.ts`
  ~line 267) before calling `rpc_bulk_upsert_trainer_units` — either a client-side filter/warning, or
  (better, since the RPC currently trusts its input unconditionally) a server-side guard inside
  `rpc_bulk_upsert_trainer_units` itself so the check can't be bypassed by another caller later. A
  server-side guard is a migration (`CREATE OR REPLACE FUNCTION rpc_bulk_upsert_trainer_units`) —
  requires the `git log -S` history check and idempotency rules from `CLAUDE.md` before writing it, and
  must re-implement every existing guard in that function, not just append the new one.

**Scope once decided:** (a) alone = zero code files, one supervised DB cleanup. (b) alone or with (a) =
`useFullTrainerMatrix.ts` + a new migration touching `rpc_bulk_upsert_trainer_units`, which needs
sign-off per the CLAUDE.md gate on anything touching `supabase/migrations/`.

### Item 4(a) — EXECUTED and verified (07 Aug 2026)

Before deleting, verified live against Supabase project `gdwhlstfguxarnxasrrs`:
- Tenant `df5c0c9d-e4be-4f67-b454-1a7128b2fc01` confirmed `is_demo = true`, name "ComplyHub Demo" — not
  a real customer.
- Trainer resolved via `tp_trainers.email = 'brendan.nguyen@demo.complyhub.ai'` →
  `trainer_id = b2000001-0000-4000-8000-000000000002`.
- Only foreign key referencing `trainer_vocational_competency.id` is
  `trainer_unit_mapping_suggestions.applied_to_vocational_competency_id` (delete_rule `NO ACTION`) — 0
  rows in that table referenced any of Brendan's 857 rows, so the FK could not block the delete.
- All 857 rows had `competency_evidence_path` and `industry_currency_evidence_path` both null — no
  storage files attached to any row, so nothing shared with other data was at risk.
- Exact prefix breakdown before delete: CHC 272, BSB 232, SIT 133, SHB 77, SIR 61, HLT 38, PSP 12, CPP
  11, TAE 6, DEF 6, FNS 4, ICT 1, CUA 1, CUE 1, TLI 1, MSS 1 (857 total).

Brian approved. Executed:
```sql
delete from trainer_vocational_competency
where tenant_id = 'df5c0c9d-e4be-4f67-b454-1a7128b2fc01'::uuid
  and trainer_id = 'b2000001-0000-4000-8000-000000000002'::uuid
  and left(unit_code,3) not in ('TAE','BSB');
```
619 rows deleted. Verified remaining: 238 rows (232 BSB + 6 TAE) — exactly the keep set. Brendan Nguyen
now shows a currency gap against a realistic unit set instead of a nonsensical 853-of-857.

**Item 4(a) is now closed.** Item 4(b) (the product-level guard on `rpc_bulk_upsert_trainer_units` /
`useAddUnitsFromTGA` to stop this happening for real tenants) is still open and not yet locked — see
the plan above.

### Item 4(b) — Decision LOCKED (07 Aug 2026): precise qualification-to-unit mapping, single enforcement point, skip-and-report

**Data source of truth confirmed live** (no new ingestion needed): `training_products` (tenant-scoped
qualification catalog — demo tenant already has `BSB50420` mapped to 10 units, `TAE40122` mapped to 8
units) joined to `training_product_units` (`training_product_id` → `unit_code`, with `core`/`elective`
flags). Real, populated, FK-linked structure confirmed via live query against project
`gdwhlstfguxarnxasrrs` — this is what the fix uses, not a new mapping that needs to be built.

**Single enforcement point (per Brian's "one system" requirement):** the guard goes inside
`rpc_bulk_upsert_trainer_units` itself (the Postgres function `useAddUnitsFromTGA` calls), not
duplicated in the frontend hook. Every current and future caller of this RPC goes through the same
check — no separate client-side filter that could drift out of sync with a server-side one.

**Behavior: skip-and-report (locked).** Units that don't belong to any qualification the trainer holds
are excluded from the insert; their codes are returned in the RPC's response so the caller can tell the
user what was skipped and why. Valid units still get added in the same call — the whole batch is never
rejected over one bad entry. Matches this codebase's existing pattern for partial-batch operations
(the bulk-delete FK guard documented in `AGENTS.md`).

**Current function guards that MUST be preserved** (read live via `pg_get_functiondef` 07 Aug 2026, not
inferred from memory — full definition on file, most recent migration touch per
`git log -S "rpc_bulk_upsert_trainer_units"` was "Audit trainer bulk sync path"):
1. Caller must belong to `p_tenant_id` (`sec.user_in_tenant`) or be a super_admin in a writable support
   session (`sec.is_super_admin() AND sec.support_session_writable`).
2. Tenant must not be write-locked (`sec.is_tenant_write_locked`).
3. `p_trainer_id` must belong to `p_tenant_id` (`tp_trainers` existence check).
4. Disables/re-enables `trg_sync_trainer_vocational_competency` around the bulk write (avoids N
   per-row syncs).
5. `INSERT ... ON CONFLICT (tenant_id, trainer_id, unit_code) DO UPDATE`, only when a field actually
   changed (`IS DISTINCT FROM` guard).
6. Calls `sync_trainer_to_all_engines(...)` once at the end, only if rows actually changed.
7. Exception handler re-enables the trigger even on error, returns `{success:false, error, trainer_id}`.
8. Response shape: `{success, units_submitted, rows_changed, trainer_id, duration_ms}`.

**New logic to insert (after guard 3, before the bulk INSERT):**
```sql
-- Units this trainer is actually entitled to, based on qualifications they hold
WITH held_quals AS (
  SELECT qualification_code
  FROM public.trainer_matrix_credentials
  WHERE tenant_id = p_tenant_id
    AND trainer_id = p_trainer_id
    AND is_superseded IS NOT TRUE
    AND archived_at IS NULL
),
valid_unit_codes AS (
  SELECT DISTINCT tpu.unit_code
  FROM public.training_product_units tpu
  JOIN public.training_products tp ON tp.id = tpu.training_product_id
  JOIN held_quals hq ON hq.qualification_code = tp.code
  WHERE tp.tenant_id = p_tenant_id
)
```
Split `p_units` into valid units (`unit_code IN valid_unit_codes`) and skipped units (not in it). Run the
existing `INSERT ... ON CONFLICT` only over the valid set. Add to the returned jsonb:
`'skipped_units', v_skipped_units, 'skipped_count', jsonb_array_length(v_skipped_units)`.

**Frontend:** `useAddUnitsFromTGA` (`useFullTrainerMatrix.ts` ~line 267) needs to read
`skipped_units`/`skipped_count` from the RPC response and surface a toast/message such as "X units
added, Y skipped — not part of this trainer's held qualifications" instead of assuming a flat success.

**Before writing the actual migration:** re-run `git log -S "rpc_bulk_upsert_trainer_units"` at
implementation time to catch any changes since 07 Aug 2026, and confirm the `CREATE OR REPLACE`
re-implements every one of the 8 guards above — dropping any of them (especially the trigger
disable/re-enable) would reintroduce a performance regression or corrupt the sync trigger's state on
error.

**Migration procedure:** per the interim procedure in `CLAUDE.md` (`supabase db push` is currently
unusable until the baseline drift reconciliation), this ships via `execute_sql` for the schema change
only, then Brian runs `supabase migration repair --status applied <version>` from his terminal per that
procedure — not a plain migration push.

**Scope:** one migration file (`rpc_bulk_upsert_trainer_units`), one frontend file
(`useFullTrainerMatrix.ts`). Both need Brian's explicit go-ahead before implementation, per the
CLAUDE.md gate on anything touching `supabase/migrations/`.

---

## Status

All 4 items diagnosed 07 Aug 2026. Implementation plans added 07 Aug 2026, re-verifying every file
reference against current code (one path correction: item 3's file is under
`tga-picker/QualificationSearchDropdown.tsx`, not directly in `trainer-matrix/`).

| Item | Plan status | Ready to implement? |
|---|---|---|
| 1. AI onboarding stale cache | **LOCKED** | Yes — 1 file, ~5 lines + a toast |
| 2. Duplicate records on re-onboarding | NOT LOCKED | No — needs Brian's answer on Question A (duplicate definition per record type) and Question B (warn vs. block vs. DB constraint) |
| 3. TGA dropdown clipping | **LOCKED** | Yes — 1 file, portal + fixed positioning |
| 4. Currency gap (Brendan Nguyen) | NOT LOCKED | (a) DONE — 619 rows deleted, verified 07 Aug 2026; (b) LOCKED — precise qualification-to-unit rule via `training_product_units`/`training_products`, single server-side guard in `rpc_bulk_upsert_trainer_units`, skip-and-report behavior. Ready to implement, needs Brian's go-ahead to start (migration touches supabase/migrations/). |

**Recommended implementation order once 2 and 4 are decided:** 3 → 1 → 4(a) → 2/4(b), since 3 and 1 are
fully locked and isolated (no shared files, no cross-item risk), 4(a) is data-only and low-risk once
approved, and 2/4(b) are the larger design-dependent pieces best done last so earlier fixes aren't
blocked waiting on a decision.

Branch note: this plan was written while `rto-compass-hub` is on `fix/document-register-storage-and-attachments-batch`
(confirmed via `git branch --show-current` on 07 Aug 2026) — a document-register/attachments branch,
not a trainer-matrix one. Flagged to Brian before implementation starts; landing on a separate branch
is worth reconsidering if this PR should stay scoped to one feature area.
