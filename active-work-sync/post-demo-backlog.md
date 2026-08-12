# Post-Demo Backlog — Living doc

> Living doc per CLAUDE.md § "Living-doc workflow." Covers the three items promoted to
> `active-work.md` Backlog as "after demo" follow-ups from the Part 3 QA sweep — see
> `complyhub-kb/audit/2026-08-12_part3-onboarding-qa-sweep-risk-ci-ofi-complaints-ssr.md` for full
> background on each. Work through one at a time; write each locked decision (reasoning + fix plan)
> into this file before implementing. Delete this file once implementation is complete and an audit
> file has been written, per the living-doc workflow.
>
> Branch: `fix/post-demo-backlog-cleanup` (worktree A, cut from `main` @ `5eb12db7a`, 12 Aug 2026).

## Status: OPEN — none locked yet.

---

## Item 1 — Risk Register dedicated status table

**Correction to background:** there is no `ofi_dd_status`/`ofi_dd_*` status table — OFI's status
falls back to the shared `dd_status` too (confirmed live: OFI status resolves via the generic
fallback, same as Risk). The real precedent is a **wider family** of per-register dedicated status
tables that already exist: `ci_dd_status`, `pli_dd_status`, `gov_dd_status`, `ct_dd_status`,
`idc_dd_status`, `tp_dd_status` — six existing examples, not one.

**Confirmed live (12 Aug 2026):**
- `dd_status` (shared, `bigint id`, `label text NOT NULL`, `value text` nullable) currently has 10
  rows: `open`, `resolved`, `escalated`, `appealed`, `closed`, `archived`, `draft`,
  `requires_action`, `mitigated`, `in_progress`. `resolved`/`appealed`/`draft` read as
  Complaints & Appeals vocabulary, not Risk — confirms this is a genuinely mixed bag, not just a
  Risk/AVR/STR split.
- Genuine live readers of plain `dd_status` (grepped, not assumed): `RiskManagementDashboard.tsx:82`,
  `RiskRegister.tsx:77` (Risk), `str/index.tsx:56` + `STRRegisterForm.tsx:96` (Student Support),
  `AVRForm.tsx:156` (Assessment Validation), `AIRRegisterForm.tsx:379` (fallback only). No other
  register reads it directly.
- `ci_dd_status` shape to mirror: `CREATE TABLE (id integer PK, value text NOT NULL UNIQUE, label
  text NOT NULL)`, own sequence, RLS `ENABLE ROW LEVEL SECURITY` + single policy
  `"Authenticated users can read ci_dd_status" FOR SELECT USING (current_user_id() IS NOT NULL)` —
  no tenant scoping (global lookup), no write policy for normal users. `ci_dd_status`'s own 4 rows:
  `open`/`in_progress`/`closed`/`escalated`.
- `seed-demo-data` edge function references `dd_status` indirectly and does insert `risk_register`
  rows — would need its status-value source updated if Risk moves to its own table (not yet traced
  to the exact line; small, mechanical once the new table exists).

**Candidate approaches:**
- **A — New `risk_dd_status` table, mirror `ci_dd_status` exactly.** Seed with Risk's actual live
  vocabulary: `open`, `mitigated`, `escalated`, `in_progress`, plus decide whether `closed`,
  `archived`, `requires_action` are genuinely used by Risk or leftover noise from the shared table
  (needs one more live check: `SELECT DISTINCT status FROM risk_register` before locking the seed
  list). Re-wire `RiskRegister.tsx:77` and `RiskManagementDashboard.tsx:82` from `table: 'dd_status'`
  to the new table. Remove the `in_progress` row from `dd_status` only if nothing else needs it
  there — AVR/STR would still see it in their dropdown otherwise (cosmetic, not a bug, matches the
  A-4 audit note).
- **B — Leave shared `dd_status`, just curate it.** Cheaper: no new table/migration, but doesn't fix
  the actual problem (any register sharing the table can add noise for every other register forever)
  and doesn't match the established precedent. Rejected direction unless Brian wants to defer this
  properly rather than half-fix it again.
- **C — Same as A, but also migrate AVR/STR off `dd_status`** onto their own dedicated tables in the
  same pass, closing the mixed-vocabulary problem at the root instead of just for Risk. Bigger scope,
  touches two other registers' code Worktree A doesn't normally own (AVR/STR were Worktree B
  territory in the QA sweep) — would need Worktree B or a "shared/cross-cutting" FRAME, not squeezed
  into this one.

**Recommendation:** A. Matches precedent, smallest safe scope, doesn't touch AVR/STR code. C is the
"right" long-term answer but is a bigger cross-cutting change better scheduled on its own.

**Live `risk_register.status` distribution (confirms the seed list):** `open` (26), `mitigated` (7),
`Mitigated` (3 — casing straggler, pre-existing, currently read correctly only because
`normalizeRiskKey` folds case at read time), `In Progress` (2 — same straggler pattern), `escalated`
(2), `archived` (1). No `closed` or `requires_action` in live Risk data — those are Complaints/other
registers' vocabulary bleeding through the shared table. Seed list for the new table: `open`,
`mitigated`, `escalated`, `in_progress`, `archived`.

**Decision: Option C — LOCKED and implemented 12 Aug 2026.**

**Correction found during implementation:** the original framing said "AVR/STR" would also move off
`dd_status`, using STR to mean Student Support Register. That was wrong — Student Support Register is
`ssr_register` and has always had its own independent hardcoded status list (never read `dd_status` at
all). The actual second/third consumers of `dd_status` are **AVR** (Assessment Validation,
`assessment_validation` table) and **STR = Staff Turnover Register** (`str_register`, tracks employee
departures — unrelated to students). Corrected before any file was touched; no wrong-register edits
were made.

**Implemented:**
- Migration `20260812022300_risk_avr_str_dedicated_status_tables.sql` — creates `risk_dd_status`,
  `avr_dd_status`, `str_dd_status` (same shape/RLS as `ci_dd_status`: `id/value/label`, single
  `SELECT` policy for `authenticated, service_role`, `service_role` write policy), seeded from each
  register's actual live status distribution (queried, not guessed):
  - `risk_dd_status`: open, mitigated, escalated, in_progress, archived
  - `avr_dd_status`: draft, in_progress, completed — **fixes a pre-existing gap**: live
    `assessment_validation.status = 'completed'` (17 rows) had no matching row anywhere in
    `dd_status`, so any status filter/badge lookup for those rows was already silently broken before
    this change.
  - `str_dd_status`: open, draft, escalated, appealed, archived
- Rewired 5 call sites from `table: 'dd_status'` to the new dedicated tables:
  `RiskRegister.tsx:77`, `RiskManagementDashboard.tsx:82` → `risk_dd_status`; `AVRForm.tsx:156` →
  `avr_dd_status`; `str/index.tsx:56`, `STRRegisterForm.tsx:96` → `str_dd_status`.
- **No change needed** to `RiskRegisterForm.tsx` (the Risk create/edit form) — it already uses the
  generic `DdAutoSelect`/`resolveDropdownTable` resolver (`registerTable="risk_register"
  fieldKey="status"`), which already prefers `{code}_dd_{fieldKey}` (i.e. `risk_dd_status`) over the
  generic fallback whenever the preferred table has rows. It picks up the new table automatically
  once merged — confirmed by reading `dropdowns.ts:85` + `useDropdown`'s preferred-then-generic-
  fallback logic, not assumed.
- `dd_status` itself left untouched (per your answer to the scope question) — still has all 10 rows,
  still read directly by whatever else uses it (Complaints & Appeals path, `AIRRegisterForm.tsx`
  fallback).
- Lint clean on all 5 touched files (0 errors; 2 pre-existing unrelated `react-hooks/exhaustive-deps`
  warnings on `RiskManagementDashboard.tsx`). `tsc --noEmit` is a known no-op in this repo (solution-
  style tsconfig, `"files": []`, checks 0 files without `-b`) — not used as evidence here; a full
  build-mode compile is known to hang on this machine, so relying on lint + manual review + later CI.
- **Not yet done:** migration hasn't been applied to production (branch not merged yet — per
  migrations discipline, apply only after merge, via the interim `execute_sql`-then-
  `migration repair` procedure).

---

## Item 2 — `ci_register` dual columns (`priority` vs `priority_level`)

**Confirmed live (12 Aug 2026) — the two columns are not equal-status duplicates, one is clearly
primary:**
- `priority_level` is the **only** column the real, user-facing CI form/list
  (`ContinuousImprovementForm.tsx`, `continuous-improvement/index.tsx`) reads or writes. Every
  manually-created/edited CI row gets its priority here. 139 of 181 live rows have it set.
- `priority` is written by exactly two paths: `convert_ofis_to_ci` (RPC) and the CI CSV import — both
  already keep it in sync with `priority_level` on write (A-6 fix). Only 14 of 181 live rows have it
  set (the ones created via those two paths). Every other row (125) has `priority_level` set but
  `priority` still `NULL` — confirms `priority` was never the primary column, just a secondary one
  some paths happened to also populate.
- `priority` is **read** by exactly three files, all cross-register governance rollups, not the CI
  register itself: `GovernanceExecutiveSummary.tsx:89,117,125`, `RegisterOverviewGrid.tsx:159`,
  `AuditReportGenerator.tsx:172,282`. Each pulls mixed rows from several registers and checks
  `item.risk_level === 'High' || isHighPriority(item.priority)` — i.e. they expect Risk rows to carry
  `risk_level` and CI rows to carry `priority`, as two different field names for the same "is this
  high priority" concept across registers.

**Candidate approaches:**
- **A — Make `priority_level` canonical.** Repoint the three governance-rollup readers to
  `item.priority_level` instead of `item.priority` for CI rows. Stop `convert_ofis_to_ci` and CSV
  import from writing `priority` (or leave them writing it one more release as a safety net, doesn't
  hurt). Leave the `priority` column in place but unused going forward — a physical `DROP COLUMN` is
  a separate, later, explicitly-approved step once nothing reads it (irreversible, deserves its own
  go-ahead, not bundled here). **Recommended** — matches actual usage (`priority_level` is what 77%
  of live rows actually have set, and it's the only column the primary form touches), smallest
  change (3 files, no touch to the main CI form), lowest regression risk.
- **B — Make `priority` canonical instead.** Would mean rewiring the main CI form and list page off
  `priority_level` onto `priority` — bigger, touches the primary user-facing form/list/CSV
  export/prefill paths, and goes against the grain of what's actually being used today. Not
  recommended.
- **C — Keep both, but stop hand-maintaining the sync.** Add a DB trigger or generated column so
  `priority` always mirrors `priority_level` (or vice versa) automatically, removing the "a new
  writer might forget to sync both" risk that caused this whole item in the first place. Doesn't
  reduce to one column, so doesn't fully close the item, but is the safest incremental step if Brian
  wants to defer the column-drop decision indefinitely rather than pick a canonical column now.

**Decision: Option A — LOCKED and implemented 12 Aug 2026.**

**Implemented:**
- Repointed all 3 governance-rollup readers from `item.priority` to `item.priority ?? item.priority_level`
  (fallback, not a straight swap) in `GovernanceExecutiveSummary.tsx` (3 usages), `RegisterOverviewGrid.tsx`
  (1), `AuditReportGenerator.tsx` (2). The `??` fallback was deliberate, not a shortcut: these files
  loop over mixed rows from several registers in one generic array (`gov_register`, `risk_register`,
  `ci_register`, `ofi_register`, `tasks`), and `ofi_register` has its own genuine, already-correct
  `priority` column (wired to `ofi_dd_priority` per A-1) — a straight swap to `priority_level` would
  have silently broken OFI's high-priority counting. The fallback means: use `priority` when a row
  has it (OFI, and the 14 CI rows `convert_ofis_to_ci`/CSV already populate), otherwise fall back to
  `priority_level` (the other 125 CI rows that only ever had this column set).
- No change to `ContinuousImprovementForm.tsx`, `continuous-improvement/index.tsx`,
  `convert_ofis_to_ci`, or the CSV import — they keep working exactly as before. `priority` column
  itself untouched (not dropped) — that's a separate, later, explicitly-approved step per the
  candidate-approaches note above.
- Lint clean on all 3 touched files (0 errors; 2 pre-existing unrelated `react-hooks/exhaustive-deps`
  warnings, same class as Item 1's).

---

## Item 3 — SSR seed-path permanent fix for `responsible_person`

**Background:** B-1's immediate fix backfilled the 10 seeded Demo-tenant SSR rows (data-only, no code
change). The seed/demo-data creation path itself still doesn't set `responsible_person`, so this will
recur for any future demo tenant. Also open: whether `ssr_register.responsible_person` should become
DB `NOT NULL`, and the fate of Direct Response's one remaining null row (excluded from the 12 Aug
backfill, not investigated).

**Confirmed live (12 Aug 2026) — the original premise was wrong, real scope is smaller:**
- **No seed function creates `ssr_register` rows at all.** Grepped every file in
  `supabase/functions/` — zero hits for `ssr_register` outside an unrelated audit-pack reader
  (`generate-audit-pack/assembleSummarySections.ts`). `seed-demo-data/index.ts` only seeds
  `gov_register`, `risk_register`, `ci_register`, `documents_register` — never SSR.
  `seed-registers/index.ts` has `responsible_person` writes for other registers, not SSR either.
  **There is no seed-path code to fix** — the 10 Demo-tenant rows (and the 1 Direct Response row)
  were created some other way (Lovable-era manual setup or ad-hoc QA insert), not through a reusable
  function. Nothing to change here going forward unless/until someone builds an SSR seed path.
- **Global null count is 1**, not "10 Demo + 1 Direct Response" — the Demo 10 are already fixed
  (this session). The one remaining null is `SSR0001` ("Something bad") on tenant **Direct Response**
  — confirmed `is_demo = true, status = 'trial'`, i.e. also a demo/trial tenant, not a real paying
  customer. Two active members on that tenant: AJ Delostrico (Administrator) and Dave Richards
  (Governing Person).

**Candidate approaches:**
- **A — Backfill the one remaining row to AJ Delostrico (Administrator, same convention as the Demo
  backfill), then add `NOT NULL` to `ssr_register.responsible_person` via migration.** Global null
  count would be 0 immediately, so the constraint is safe to add with no data cleanup needed first.
  Closes the item fully — matches what the form already enforces client-side, DB now backs it up.
  **Recommended.**
- **B — Same backfill, skip the `NOT NULL` constraint.** Leaves the DB permissive even though the
  form requires it — matches Complaints/other registers' looser pattern, but doesn't actually close
  the "decide whether NOT NULL" question, just defers it again.
- **C — Leave `SSR0001` null.** It's trial/demo data, low stakes either way, but leaves one dangling
  null that would block a `NOT NULL` migration if added later without noticing.

**Decision: Option C — LOCKED 12 Aug 2026. Do NOT touch the Direct Response row.**

**Reasoning (Brian's call, overriding the initial recommendation):** `is_demo`/`status='trial'` most
likely means this is a real prospect's own self-service trial workspace, not an internal QA/test
fixture — the same class of data as the ComplyHub Demo tenant only from our own database's point of
view, not from the actual account owner's. Editing a real user's record on their behalf without their
knowledge (even just filling in a Responsible Person) is a different category of action from fixing
our own internal demo tenant, and was correctly declined.

**Implication for the `NOT NULL` question:** also declined for now — a `NOT NULL` constraint can't be
added while this one real null exists, and we're not touching it. Not closing this permanently; if
that row ever gets a value some other way (the account owner sets it themselves, or the account is
churned/deleted), `NOT NULL` becomes safe to revisit.

**No seed-path code change needed** — confirmed there's nothing to fix there regardless (see above).
**Item 3 closed with no code or data changes.**
