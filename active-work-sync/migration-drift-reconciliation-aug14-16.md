# Living doc — Reconcile 62 orphaned production migrations (14–16 Aug 2026)

> Source of truth for this body of work. Work items one at a time (or clustered by related batch),
> lock each decision here with reasoning before moving on. Once everything is locked, ready for a
> clean implementation pass. Delete this file after the audit doc is produced post-implementation.
>
> Branch: `fix/migration-drift-reconciliation-aug14-16` (worktree C)
> Handover source: main workspace chat, 17 Aug 2026
> Re-verified against production ledger 17 Aug 2026 (this session) — list unchanged, no new drift
> since handover was written, still ~61 unrecovered versions (62 minus the pre-existing special case
> `20260812020135` which was already resolved before this task and just needs baselining).

## Status legend
- **OPEN** — not yet investigated
- **RECOVERED** — SQL pulled from ledger, not yet authored as a file
- **LOCKED** — decision + file content finalized, ready to write in implementation pass
- **DONE** — file written to branch

---

## Already resolved / special cases (no fresh recovery needed)

### `20260812020135` — NOT in the 62-list scope, pre-resolved
Superseded by `20260812030143` + `20260812060000` (already exist in git). **LOCKED action:** add to
`.drift-baseline.txt`:
```
20260812020135|38d52f99-e552-4e66-bf9e-0c8c0f653dca — superseded by 20260812030143 + 20260812060000
```
Awaiting Brian's go-ahead to touch `.drift-baseline.txt` (hard gate — DB/migrations dir).

### `20260816081212` (fill_governance_meeting_created_by_under_service_context) + `20260816081345` (fix_tenant_addresses_on_conflict_arbiter)
**LOCKED — DONE (recovery, not yet merged to this branch).** Both already exist as proper git files on
unmerged branch commit `b91190f86` ("chore(migrations): reconcile created_by trigger and TGA upsert
arbiter", authored by Cursor Agent + Angela, 16 Aug 2026):
- `20260816081212_fill_governance_meeting_created_by_under_service_context.sql`
- `20260816081345_fix_tenant_addresses_on_conflict_arbiter.sql`

**Action:** cherry-pick or `git show b91190f86 -- <path>` both files onto this branch as-is (content
already reviewed/co-authored by Angela) rather than re-authoring from scratch. Verify they still match
live ledger content before adopting.

### `20260814061523` (revoke_anon_switch_to_consultant_home) — duplicate/superseded, NOT a fresh file
Local file `20260814043000_revoke_anon_switch_to_consultant_home.sql` already exists and covers
`switch_to_consultant_home`. Production's `20260814061523` version additionally revokes anon EXECUTE
from: `get_my_app_context()`, `switch_to_tenant(uuid)`, `switch_to_superadmin()`, `on_superadmin_login()`.
**Plan:** amend the existing file (or add a companion migration) to cover all five, verify live grants
match via `information_schema.routine_privileges`/`pg_proc` ACLs, then baseline `20260814061523` as
duplicate/superseded of the amended file. **Status: OPEN — SQL not yet recovered, ACL verification not
yet run.**

### `20260814072717` (storage_policies_ofi_and_generic_evidence_buckets) — known defects, author fresh
Recovered content already known from handover: 4 `storage.objects` policies (`ofi_evidence_tenant_insert/
select` on `ofi-evidence`, `evidence_bucket_tenant_insert/select` on `evidence`), each `TO authenticated`
gated by `sec.is_super_admin() OR (storage.foldername(name))[1] IN (select tenant_id::text from
tenant_members where user_id = auth.uid())`. **Known defects to fix in the new file (do not carry
forward):** (a) no UPDATE/DELETE policy — add both, same tenant-scoped gate; (b) not idempotent — add
`DROP POLICY IF EXISTS` guards. **Status: OPEN — draft SQL not yet written.**

---

## Remaining ~57 items — not yet investigated

Full version list (from handover, re-verified against production ledger 17 Aug 2026 — unchanged):

20260814073222, 073339, 073449, 075036, 080359, 080514, 080606, 080641, 080711, 080806, 080839, 080901,
080926, 081219, 081244, 081447, 083633, 083650, 090536, 091013,
20260815060438, 060611, 061927, 062801, 062917, 065509, 073230, 075911, 075949, 230246,
20260816040208, 040425, 040519, 040541, 041205, 041216, 041707, 042007, 044217, 044238, 044252, 044523,
050308, 050404, 051001, 060707, 060754, 073804, 074129, 074137, 074214, 074734, 075652, 080308, 080406,
080610, 080649, 081353

**Suggested clustering (per handover note — likely reason about together):**
1. **Trainer compliance register restore/fix cluster** (080359–081447, 8 items) — danger cluster
   delete fns, silent degrader fns, trainer compliance register restore + service gates + audit schema
   alignment
2. **TGA cluster** (083633, 083650, 090536, 091013 + 060438, 060611) — TGA nightly sync, resolution
   queue, scope items upsert
3. **RLS restrictive-closure / revoke-authenticated security-hardening cluster** (061927, 073230,
   050308, 050404, 051001, 060707, 060754, 073804, 074734, 075652, 081353) — clearly one hardening
   sequence, per handover note
4. **Risk scorer cluster** (062801, 062917, 073339, 073449)
5. **No-RTO-trial / lockout cluster** (044217, 044238, 044252, 044523, 041707, 080308, 080406)
6. **Misc singletons** — everything else (075911, 075949, 230246, 040208, 040425, 040519, 040541,
   041205, 041216, 042007, 074129, 074137, 074214, 080610, 080649)

**Status: OPEN — none recovered yet.** Next step per cluster: `execute_sql` against
`supabase_migrations.schema_migrations` for `statements` column, one cluster at a time.

---

## Decisions log

_(newest first — append here as each item/cluster is locked)_

### 17 Aug 2026 — Cluster 1: Trainer compliance register restore/fix (12 items) — RECOVERED

Versions: `080359, 080514, 080606, 080641, 080711, 080806, 080839, 080901, 080926, 081219, 081244, 081447`.
Full `statements` pulled from `supabase_migrations.schema_migrations`. Narrative: a "dead-table
resolution" project repointed several functions off deprecated `_zz_deprecated_*` tables, discovered
`trainer_compliance_register` was deprecated out from under a still-scheduled nightly job and restored
it (table rename back), fixed a swapped-argument bug in `bulk_recompute_trainer_status`, relaxed two
NOT NULL constraints for system-context recompute (no actor), aligned audit inserts to the legacy audit
schema, and fixed a consultant-lockout UX bug in `get_access_gate` (NULL tenant → `no_tenant_context`
instead of misleading `tenant_not_found`/billing-lockout message).

**Decision: adopt each version's `statements` content verbatim as its own migration file** (one file per
version, matching production's version+name exactly per the naming rule in `supabase/migrations/CLAUDE.md`).
This is a faithful historical reconstruction, not new authorship — the SQL already ran successfully in
production and represents the current live state.

**Idempotency flag (non-blocking, note only):** `20260814080606` does `ALTER TABLE
public._zz_deprecated_trainer_compliance_register RENAME TO trainer_compliance_register` with no
existence guard — will error if run twice, or on a branch DB where the table is already named correctly
from a prior baseline. Same pattern in `20260814090536` (TGA tables, see below). Since these are
git-authored *once* as the permanent record of a rename that already happened, and `supabase db push`
skips re-running an already-applied version (per the interim-procedure doc), this is acceptable as-is —
flagging per convention rather than adding a guard that would obscure the historical record. **No action
needed unless Brian wants belt-and-suspenders `IF EXISTS` guards added.**

Every file in this cluster ends with an identical 5-line "context-RPC invariant re-run" block (REVOKE
EXECUTE on `get_my_app_context`/`switch_to_tenant`/`switch_to_superadmin`/`on_superadmin_login`/
`switch_to_consultant_home` FROM anon) — this is a defensive habit from whoever authored these (re-asserts
the revoke on every migration in case something regranted it). Carrying forward as-is; harmless no-op if
already revoked.

**Status: RECOVERED, not yet LOCKED** — pending Brian's review before writing files.

### 17 Aug 2026 — Cluster 4 (risk scorer, 3 items) — RECOVERED

Versions: `073222, 073339, 073449`. Fixes: (1) `compute_all_student_risk_scores` role-gate rewritten off
legacy `profiles.role` snake_case strings to `sec.has_tenant_role` + canonical Proper-Case role strings,
tightened the `p_tenant_id` override to SuperAdmin-only; (2)+(3) `compute_student_risk_score` had two
dead-table references (`governance_thresholds` → `sso_alert_thresholds`, `risk_events` →
`_zz_deprecated_risk_events`, deliberately "legacy-pointed" per a documented 13 Aug precedent — the
wellbeing sub-signal contributes zero pending a redesign, this is a known/accepted gap, not a bug to fix
here). All three are surgical `pg_get_functiondef` + `replace()` patches guarded by `RAISE NOTICE
'already patched'` early-return — **naturally idempotent as authored**, no flag needed.

**Decision: adopt verbatim**, one file per version. **Status: RECOVERED, not yet LOCKED.**

### 17 Aug 2026 — Cluster 2 (TGA, 6 of ~8 items) — RECOVERED

Versions: `083633, 083650, 090536, 091013, 060438, 060611` (2 more TGA-adjacent items —
`061927`/restrictive-closure and any others — tracked separately, not part of this sub-batch).

- `083633` schedules the `tp-transition-engine-nightly` cron (17:30 UTC, after the TGA sync).
- `083650` seeds one demo-tenant superseded-scope row for `HLT57415` — **already idempotent**
  (existence-checked `IF NOT EXISTS` insert guard, and raises if the expected superseded product is
  missing rather than silently no-op'ing).
- `090536` restores `tga_resolution_queue` + `tga_supersession_alerts` via table rename-back (same
  no-guard rename pattern as `080606` above — same idempotency flag applies, same "acceptable as
  historical record" reasoning).
- `091013` fixes cron job 6 (`tga-nightly-sync-local-time`): swaps anon-key auth for the vault service
  key, and restores `*/10 * * * *` cadence (was firing once daily at a fixed UTC hour, which silently
  stops matching any tenant's local 02:00 window once daylight saving shifts in October — a real latent
  bug being fixed, not just reconciliation).
- `060438` consolidates two colliding `persist_tga_scope_items` overloads (identical param names,
  different positional order — PostgREST couldn't pick one, so ALL scope-sync calls had been silently
  dead) into one canonical function with corrected `is_superseded` derivation logic.
- `060611` immediately follow-up-fixes `060438`: the new function's own audit insert cast `actor` to
  text against a `uuid NOT NULL` column, aborting persistence even after the overload fix. Switches to
  the zero-uuid system-actor convention and wraps the audit insert in its own exception handler so
  audit-logging failure can never abort the real persist.

**Decision: adopt verbatim**, one file per version — `060438`/`060611` are a clear sequential pair and
should probably be called out together in the PR description as "one fix immediately followed by its own
correction," not as two independent items. **Status: RECOVERED, not yet LOCKED.**

### 17 Aug 2026 — Cluster 3: RLS restrictive-closure / revoke-authenticated security hardening (11 items) — RECOVERED — ⚠️ FLAGS FOR BRIAN

Versions: `061927, 073230, 050308, 050404, 051001, 060707, 060754, 073804, 074734, 075652, 081353`.
This is a genuine security-hardening sequence run by Angela over 15–16 Aug ("council review" per several
`COMMENT ON FUNCTION` bodies) — closing several real privilege-escalation and PERMISSIVE/RESTRICTIVE
policy-merge gaps. Full detail in the recovered `statements`; summary:

- `061927`, `073230` — RESTRICTIVE SELECT closure batches 2 & 3 (trainer/transition tables, then
  student-PII tables incl. `ssr_register`, `caa_register`, `risk_snapshots`). Also purges a
  non-canonical `'Consultant Assistant'` role string from a few recreated policies and fixes
  `sso_alert_thresholds` write-lock policies that were accidentally PERMISSIVE (granting) instead of
  RESTRICTIVE (locking).
- `050308`/`050404`/`051001` — three-batch privilege-escalation remediation revoking `authenticated`
  EXECUTE from unguarded/self-certifying SECURITY DEFINER functions: `sa_delete_auth_user`,
  `sa_update_organization_member(uuid,uuid,text)` (self-promotion overload only — two other overloads
  correctly guarded and left alone), `update_user_password`/`update_user_password_direct` (full account
  takeover — any authenticated caller could set any user's password, including SuperAdmin), and six
  trial-management overloads gated on a **caller-supplied** uuid instead of session identity (self-
  certifying auth bypass — revenue exploit + cross-tenant DoS via `revoke_trial`).
- `060707`/`060754` — RESTRICTIVE UPDATE/DELETE/INSERT closure for ~20 more tables where an existing
  PERMISSIVE "admin-only" policy was silently bypassed by `billing_gate`'s PERMISSIVE-ALL OR-merge.
  Includes a deliberate SuperAdmin-lockout-avoidance fix on `tga_sync_jobs` (existing policy used a
  broken `profiles.role = 'super_admin'` text compare instead of `sec.is_super_admin()` — mirroring it
  verbatim would have newly locked out real SuperAdmins; the recovered version correctly uses
  `sec.is_super_admin()` instead).
- `073804` — closes anon read/write/delete on the `trainer-credentials` storage bucket (was fully open
  cross-tenant).
- `074734` — drops the domain-based (`@vivacity.com.au`) auto-grant of platform-wide `super_admin` (8
  profiles had it with zero allow-list/verification). Trigger dropped; function left detached, not
  deleted, for one-statement rollback if needed.
- `075652` — closes `public.subscribers` public/anon read (`read_public` policy was `USING (true)`,
  granted to PUBLIC — 9 rows with emails + Stripe customer IDs were readable with just the publishable
  key). Table confirmed dormant legacy scaffold.
- `081353` — revokes `authenticated` EXECUTE from two platform-admin RPCs
  (`rpc_run_nightly_tas_monitor`, `sa_snapshot_usage`) that had zero authorization guard in their body —
  reachable by any signed-in user of any tenant.

**⚠️ FLAG 1 (needs Brian's read, not just mine) — `050404` shipped with an explicitly stated open risk:**
its own comment says *"RISK ACCEPTED: the frontend call-site audit had not yet run when this was
applied... Decision: account takeover is catastrophic and may be silent; a broken reset is loud and
reversible in seconds."* This is Angela's own documented judgment call, not a defect I'm introducing —
but since it directly affects whether the password-reset flow currently works, it should be verified
(has the frontend audit happened since 16 Aug? does password reset still work end-to-end?) before or
right after this branch merges, not silently absorbed as "just another reconciliation file."

**⚠️ FLAG 2 — idempotency: several files in this cluster use bare `CREATE POLICY ... ` with no
`DROP POLICY IF EXISTS` guard** (`061927`'s dynamic `EXECUTE format('CREATE POLICY %I ...')` loop,
`060707`, `060754`'s ~15 `CREATE POLICY` statements, `073804`, `075652`'s two new policies). Per this
repo's idempotency convention (`AGENTS.md`/migrations `CLAUDE.md`), a migration should be safe to run
twice. Unlike the table-rename cases above (fine as one-shot historical record), these will hit branch
DBs going forward and a second run / re-apply attempt would error with "policy already exists" — and
some are 15+ statements in one file, so a partial-failure mid-loop is messy to recover from. **Since git
is the source of truth going forward and doesn't need to byte-match the flawed original apply, my
recommendation: add `DROP POLICY IF EXISTS <name> ON <table>;` immediately before each `CREATE POLICY`
when authoring these files** (matches the pattern batch_3/`073230` already uses correctly for its own
`DROP POLICY IF EXISTS` guards). `073230` itself is fine as-is (already guarded). Flagging per the
"decide idempotently in git, or ask if ambiguous" instruction — this isn't ambiguous to me, but touches
enough tables that I want it confirmed rather than silently changed.

**FLAG 1 resolved 17 Aug 2026:** grepped `rto-compass-hub-C/src` and `supabase/functions` for
`update_user_password` — the only hit is the generated `src/integrations/supabase/types.ts` (type
definitions only). No frontend hook/component and no edge function calls either RPC directly. The
password-reset flow does not depend on these functions being callable by `authenticated`, so the revoke
in `050404` did not break anything live. Brian confirmed proceed.

**Status: LOCKED — proceeding to author files.**

### 17 Aug 2026 — Cluster 5: No-RTO-trial / lockout cluster (8 items) — RECOVERED

Versions: `20260816041707, 20260816042007, 20260816044217, 20260816044238, 20260816044252, 20260816044523,
20260816080308, 20260816080406`. Two separate sub-threads that happen to interleave by timestamp:
the no-RTO-ID trial signup pipeline (triage fields, risk scoring, notification), and a billing-lockout
incident response. Narrative, in order:

- `041707` (`enforce_lockout_respect_cancelled_suspended_on_unlock`) — per its own comment, Angela's
  16 Aug decision: "a tenant that has cancelled or been suspended stays write-locked even while a paid
  Stripe entitlement runs to `period_end` (read-only access only)." The prior unlock clause honoured the
  entitlement alone, which had auto-unlocked "Intercept Group" after their cancellation — a real named
  customer incident. Rewrites `billing.enforce_lockout()` to add the cancelled/suspended exclusion to the
  unlock branch.
- `042007` (`repair_get_trainer_reports_for_meeting_columns`) — `get_trainer_reports_for_meeting`
  referenced non-existent columns (`payload`, `reporting_period_start/_end`) and errored on any call — no
  live call sites, so a dormant bug. `DROP FUNCTION` then recreate (return signature changes) against the
  real `trainer_monthly_reports` schema, with auth aligned to `profiles.active_tenant_id` +
  `sec.has_tenant_role`.
- `044217` (`no_rto_trial_add_triage_fields`) — purely additive/nullable columns on `no_rto_trial`: ABN
  capture + verification fields, a structured "why no RTO ID" reason code, a deterministic `risk_flag`,
  and notification-delivery tracking (`notified_at`/`notification_error`). Three CHECK constraints added
  (ABN format, reason enum, risk_flag enum). Comment: "existing rows and the current frontend are
  unaffected until the UI is updated to populate the new fields."
- `044238` (`no_rto_trial_risk_and_notify_trigger`) — adds `no_rto_trial_compute_risk()`, a deliberately
  transparent/explainable (not AI-judged) triage scorer keyed on free-email-domain, missing phone, missing
  ABN, missing reason — "so admins can see exactly why something was flagged." Adds
  `trg_fn_notify_no_rto_trial()` + insert trigger: guarantees a database-level notification on every
  no-RTO-ID signup (replacing reliance on a client-side fetch call that "could silently fail or never
  fire; this cannot"), calls `send-admin-trial-notification` via `net.http_post` using the vault service
  key, wrapped in its own exception handler that records `notification_error` rather than aborting the
  signup insert.
- `044252` (`trial_tenant_notify_trigger`) — mirrors the above for the *other* signup path (user who did
  supply an RTO ID and gets a trial tenant created via `admin_create_trial_tenant_for_user`, which never
  called any notification). Scoped via trigger `WHEN` clause to `is_demo = true AND tenant_type = 'trial'`
  only, "so it does not add overhead to ordinary tenant writes."
- `044523` (`no_rto_trial_notify_revoke_anon_authenticated`) — revokes EXECUTE on all three new
  notify/risk functions from **both** `anon` and `authenticated`, per comment: these are trigger-internal
  only and must never be directly callable as PostgREST RPCs, "matches the platform's existing 'no
  anon-executable SECURITY DEFINER function unless deliberately public' discipline flagged in the 14 Aug
  security audit."
- `080308` (`billing_lockout_respect_invoice_payments_and_audit`) — root-cause fix for a **15 August
  incident: three paid-up, invoice-billed RTO clients (8 users, 606 documents) were suspended and then
  could not be released by any automated path.** Four additive changes to `billing.enforce_lockout()`:
  (1) neither lock nor unlock logic previously consulted `paid_through_date` for invoice-billed tenants;
  (2) `locked_reason` was never written on lock, so "eleven non-demo tenants carry a lock with no recorded
  cause and yesterday's incident could not be explained from the data"; (3) a new "Unlock B" branch
  releases invoice-billed tenants paid through a future date, explicitly *not* gated on
  `lifecycle_status` (verified dry-run: matches zero tenants today — "a forward-looking safety net, not a
  bulk release"); (4) every run now writes an `admin_audit` row, including no-ops, "so that silence
  becomes detectable" — comment notes this was a **108-day outage** that went unnoticed because a dead
  job leaves no trace.
- `080406` (`veto_write_lock_for_paid_invoice_tenants`) — belt-and-suspenders companion to `080308`:
  enforces the same invariant at the row level via a `BEFORE UPDATE OF write_locked` trigger on
  `public.tenants`, so no current or future lockout routine can suspend an invoice-paid tenant for a
  payment-related reason without going through this veto. Every veto writes its own `admin_audit` row.
  Deliberate admin locks are preserved (veto only fires when `locked_reason` is absent or matches
  payment/grace/subscription wording).

**Decision: adopt each version's `statements` verbatim, one file per version** — faithful historical
reconstruction of SQL that already ran successfully in production.

**⚠️ FLAG — real incident content, not just a reconciliation nicety:** `080308`'s and `080406`'s own
comments describe a genuine production incident (three paid clients wrongly suspended for 108 days,
undetected) and the fix for it. This isn't a hypothetical risk being surfaced for the first time by this
recovery — it already ran in production on 16 Aug — but worth Brian's explicit awareness since it's the
kind of finding that would normally trigger a customer-facing post-mortem/credit conversation, and this
reconciliation project may be the first time it's been written down anywhere outside the SQL comment
itself.

**Idempotency notes:** `042007` does `DROP FUNCTION IF EXISTS` before `CREATE FUNCTION` — fine.
`044238`/`044252` use `CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS` before `CREATE TRIGGER` —
fine, naturally idempotent. `044217`'s three `ALTER TABLE ... ADD CONSTRAINT` statements have **no**
`IF NOT EXISTS`/existence guard (Postgres doesn't support `ADD CONSTRAINT IF NOT EXISTS`) — will error on
a second run or on a branch DB that already has these constraints from a prior baseline. Flagging per
convention; recommend wrapping each in a `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END
$$;` guard if Brian wants belt-and-suspenders, otherwise acceptable as one-shot historical record like the
Cluster 1 rename case. `080308` and `041707` are both `CREATE OR REPLACE FUNCTION` — safe to rerun.

**Status: RECOVERED, not yet LOCKED.**

### 17 Aug 2026 — Cluster 6: Misc singletons, remaining 5 items — RECOVERED

Versions: `20260816074129, 20260816074137, 20260816074214, 20260816080610, 20260816080649`. Five
unrelated one-off fixes/features:

- `074129` (`add_driver_tagging_layer`) — introduces `public.driver_register_map`, a global lookup table
  tagging each of the platform's 8 Critical Drivers with a build `status` (`not_built`/`building`/`live`)
  and scorecard weight, plus a new `driver_code` column + index on `governance_clause_map`. Updates
  `gov.seed_default_clause_map()` to tag Driver 3 (Student & Client Engagement)'s rows at the source.
- `074137` (`seed_driver_register_map`) — seeds the 8 driver rows into the table just created, one row
  per Critical Driver 1–8 with names matching the fixed 8 Critical Drivers list, initial status mostly
  `not_built` except Driver 3 (`building`) and Driver 6/Training Innovation & Alignment (`live`, linked to
  `training_and_assessment` register_type).
- `074214` (`fix_trainer_credentials_closure_definer_lookup`) — the original
  `trainer_credentials_tenant_closure` storage policy resolved trainer→tenant via an inline subquery over
  `public.tp_trainers`, which is RLS-evaluated as the calling user — comment states this "showed one test
  user only 1 of their tenant's 23 trainers — denying them 46 credential files they are entitled to."
  Fix: new `SECURITY DEFINER` helper `sec.trainer_tenant_from_folder()` (validates UUID-shaped folder
  name, `STABLE`, `search_path` set) does the lookup instead, matching the platform's `sec.*` convention;
  policy recreated with `DROP POLICY IF EXISTS` first.
- `080610` (`repoint_governance_health_dashboard_to_live_register`) — `rpc_governance_health_dashboard`
  counted from `public.governance_register`, which "has never received a single insert (`n_tup_ins = 0`)."
  Live data (183 rows, 17 tenants) lives in `public.gov_register`. Comment stresses this is **two**
  changes, not one: naive repoint alone would have been worse than the original bug, because
  `gov_register` uses lowercase status values while the function's existing filter compared against
  Title-Case strings — "9 completed items would have been counted as overdue... Zeros look obviously
  broken; inflated overdue counts look authoritative." Applied via a programmatic `pg_get_functiondef` +
  `replace()`/`regexp_replace()` rewrite with an explicit `RAISE EXCEPTION` guard if the reference count
  doesn't match expectations exactly (3), "to eliminate transcription risk." Comment explicitly notes
  `create_or_update_meeting` and the 9-argument `log_governance_event` overload also write to the dead
  `governance_register` table and were deliberately left out of scope — "that needs a schema decision, not
  a repoint."
- `080649` (`intelligence_insights_aggregate_dedupe_key`) — `intelligence_insights` deduplicates via a
  partial unique index on `(tenant_id, rule_key, source_record_id) WHERE status = 'active'`, but
  `source_record_id` is nullable and Postgres treats NULLs as distinct in a unique index, so any
  aggregate/driver-level insight with no single source row (e.g. "Driver 7 has no financial sustainability
  evidence this quarter") bypasses dedup entirely and re-inserts on every rule run. Comment: "This must
  land BEFORE the first Intelligence pilot run, not after... unbounded duplicates there are worse than no
  insights at all." Adds nullable `dedupe_key` column, a CHECK constraint requiring exactly one of
  `source_record_id`/`dedupe_key` to be set for active rows, and a new partial unique index on
  `(tenant_id, rule_key, dedupe_key)`.

**Decision: adopt each version's `statements` verbatim, one file per version.**

**Idempotency notes:** `074129`'s `CREATE TABLE`, `CREATE POLICY "authenticated_read"`, and
`CREATE TRIGGER trg_driver_register_map_updated_at` are **all bare, no guards** — will error on a second
run or on a branch DB where this table already exists from a prior baseline capture. Same class as the
Cluster 1 rename pattern — flagging per convention, acceptable as one-shot historical record unless Brian
wants `CREATE TABLE IF NOT EXISTS` / `DROP POLICY IF EXISTS` / `DROP TRIGGER IF EXISTS` added.
`074137`'s plain `INSERT ... VALUES` (no `ON CONFLICT`) will duplicate the 8 seed rows on a second run —
same flag, recommend `ON CONFLICT (driver_code, register_type) DO NOTHING` if reauthoring rather than
byte-matching. `074214` already uses `DROP POLICY IF EXISTS` before `CREATE POLICY` and
`CREATE OR REPLACE FUNCTION` — naturally idempotent, no flag. `080610`'s `DO $migration$` block is
naturally idempotent by construction (rewrites via `pg_get_functiondef`, and would simply re-match/re-fail
the same reference-count guard on a second run against its own already-patched output — worth noting the
guard would need updating if run twice, but that's expected/self-documenting behavior, not a defect).
`080649`'s `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS` + re-add, and
`CREATE UNIQUE INDEX IF NOT EXISTS` are all correctly guarded — no flag.

**Status: RECOVERED, not yet LOCKED.**

### 17 Aug 2026 — Special case `20260814072717` (storage_policies_ofi_and_generic_evidence_buckets) — SQL recovered, defect assessment confirmed

Full `statements` recovered via `execute_sql` (previously only known from the handover's description).
Comment: "Improvement Plan upload diagnosis: table-layer RLS verified fine from the trainer seat (UPDATE
permitted); the failure is at storage. Buckets 'ofi-evidence' and 'evidence' are private, have NO INSERT
policy for authenticated users, and have never received a single object — any component targeting them
fails every upload." Four `CREATE POLICY` statements: `ofi_evidence_tenant_insert`/`_select` on
`ofi-evidence`, `evidence_bucket_tenant_insert`/`_select` on `evidence` — each `TO authenticated`, gated
by `sec.is_super_admin() OR (storage.foldername(name))[1] IN (SELECT tenant_id::text FROM tenant_members
WHERE user_id = (SELECT auth.uid()))`, "mirroring the working `evidence_upload_tenant` policy shape."

**Both previously-noted defects confirmed against the real SQL, exactly as flagged in the "Already
resolved" section:**
1. **No UPDATE/DELETE policy** — confirmed, only INSERT and SELECT exist for both buckets. Uploaders can
   create and read evidence but can never replace or remove a wrongly-uploaded file themselves.
2. **Not idempotent** — confirmed, all four are bare `CREATE POLICY` with no `DROP POLICY IF EXISTS`
   guard. Will error "policy already exists" on any second run/branch-DB rebuild.

**Decision (per the already-locked handover note, reconfirmed here):** when authoring the new file, add
`DROP POLICY IF EXISTS <name> ON storage.objects;` before each `CREATE POLICY`, and add the missing
UPDATE/DELETE policy pair for both buckets using the same tenant-scoped gate — do not carry the two
defects forward. **Status: RECOVERED, not yet LOCKED — file content still to be drafted per this plan,
not written yet** (this task was documentation/recovery only).

### 17 Aug 2026 — Special case `20260814061523` (revoke_anon_switch_to_consultant_home, duplicate) — SQL recovered, confirms exact scope

Full `statements` recovered via `execute_sql`:
```sql
REVOKE EXECUTE ON FUNCTION public.switch_to_consultant_home() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_my_app_context() FROM anon;
REVOKE EXECUTE ON FUNCTION public.switch_to_tenant(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.switch_to_superadmin() FROM anon;
REVOKE EXECUTE ON FUNCTION public.on_superadmin_login() FROM anon;
```
Comment: "switch_to_consultant_home is a context-switching RPC (same family as the four canonical context
RPCs) but was anon-executable. Revoke, and treat it as the fifth RPC on the post-migration revoke
checklist from now on."

**Correction to the existing "Already resolved" note above:** that note states production's
`20260814061523` "additionally revokes anon EXECUTE from: `get_my_app_context()`, `switch_to_tenant(uuid)`,
`switch_to_superadmin()`, `on_superadmin_login()`" — **confirmed accurate**, these are exactly the four
functions in the recovered SQL's "invariant re-run" block, alongside `switch_to_consultant_home()` itself.
No fifth/different function was found; the note's function list was correct.

**Comparison against local file** `20260814043000_revoke_anon_switch_to_consultant_home.sql` (read in
full): the local file only revokes/grants `switch_to_consultant_home()` (`REVOKE ... FROM anon, PUBLIC`,
then explicit `GRANT ... TO authenticated, service_role`) — it does **not** touch the other four
functions at all. Production's `20260814061523` covers `switch_to_consultant_home` **and** the four
canonical context RPCs (revoke-from-anon only, no explicit grants — matching the "invariant re-run"
block pattern seen throughout Clusters 1/2/5 above, which exists purely to re-assert these five revokes
on every migration that might have regranted them).

**Confirmed gap, unchanged from the existing plan:** the local file alone does not reproduce
`20260814061523`'s effect on `get_my_app_context`/`switch_to_tenant`/`switch_to_superadmin`/
`on_superadmin_login` — those four revokes exist in production today only via this orphaned version and
via the repeated "invariant re-run" blocks embedded in many other since-recovered migrations (e.g.
Cluster 1's trailing 5-line block, `041707`'s `DO $$` loop in Cluster 5). **Decision (reconfirming the
existing plan, now with verified SQL):** amend the existing local file to add the four `REVOKE ... FROM
anon` statements (no `PUBLIC`/grant changes needed for those four, matching production's exact statement
list), rather than authoring `20260814061523` as its own new file — then baseline `20260814061523` as
duplicate/superseded of the amended file once ACL verification against live `pg_proc`/
`information_schema.routine_privileges` confirms current grants match. **ACL verification not yet run —
still OPEN**, this task only recovered and confirmed the SQL content and the local-file comparison.
**Status: RECOVERED (SQL + local-file diff), plan unchanged, ACL verification step still OPEN.**

### 17 Aug 2026 — Cluster 7a: Consultant Assistant purge, part 2 of 2 (2 items) — RECOVERED

Versions: `20260815075911` (purge_consultant_assistant_from_policies), `20260815075949`
(purge_consultant_assistant_rbac_rows_and_profiles). A clear sequential pair per their own comments —
"Stage 1 of the Consultant Assistant purge (decision: Angela, 15 Aug 2026)" — the policy-layer half and
the DML/RBAC half of the same removal, 38 seconds apart. Narrative: Consultant Assistant is confirmed
dead code (zero `tenant_members` carry it, absent from `role_definitions`), so removal is asserted
behaviour-neutral.

- `075911` — a `DO $$` block scans **all schemas** (comment notes "v2: covers ALL schemas (first attempt
  asserted correctly and rolled back — CA policies exist outside public)") for any RLS policy whose
  `qual`/`with_check` mentions `'Consultant Assistant'`, strips the literal out of the policy expression
  via string `replace()`, `RAISE EXCEPTION`s if an unhandled/unexpected pattern is found (fails closed
  rather than silently leaving a malformed policy), drops and recreates each affected policy with the
  cleaned expression, then re-verifies zero `Consultant Assistant` references remain across `pg_policies`
  before returning. Ends with the standard context-RPC anon-revoke invariant (looped over all overloads
  via `pg_proc`/`regprocedure`, same pattern as elsewhere).
- `075949` — the DML half: deletes `Consultant Assistant`'s rows from `rbac_role_capabilities` and
  `rbac_roles` (matched on `role_key` or `role_name`), then normalises any `profiles.role = 'Consultant
  Assistant'` to `'Consultant'`. Guards itself with `RAISE EXCEPTION` unless exactly 2 profiles were
  updated ("aborting for review" if the count doesn't match the expected/known scope) — a deliberate
  safety rail against silently touching more rows than Angela's decision covered.

**Decision: adopt each version's `statements` verbatim, one file per version** — call out in the PR
description as the two-part CA purge, same as Cluster 2's `060438`/`060611` pair.

**Idempotency note (non-blocking):** `075911`'s policy-rewrite loop is self-guarding by construction (it
`RAISE EXCEPTION`s if it still finds `Consultant Assistant` after the pass, and would simply find zero
matching policies to touch on a second run — naturally idempotent, no flag). `075949`'s DELETEs are
naturally idempotent (zero rows match on a second run); its own `v_profiles <> 2` guard is a **one-shot
assertion tied to the exact historical data state on 15 Aug** — if this file is ever re-run against a
branch/restore where the profiles table doesn't hold exactly the same 2 pre-purge rows, it will abort by
design. Acceptable as historical record (matches the convention already applied to Cluster 1/2 rename
guards); flagging only so a future rerun-and-it-errored moment isn't mistaken for a new bug.

**Status: RECOVERED, not yet LOCKED.**

### 17 Aug 2026 — Cluster 7b: Misc singletons, final batch (4 items) — RECOVERED

Versions: `20260815065509` (fix_invite_cleanup_cron_auth_and_recreate_ncver_ingest), `20260815230246`
(add_governance_meetings_tenant_fk_for_postgrest_embeds), `20260816040208`
(fix_enforce_lockout_enum_text_casts), `20260816040425`
(fix_ops_diagnostics_service_context_gates_and_enum_literals). Four unrelated one-off fixes, all from the
15–16 Aug auth/service-context sweep:

- `065509` — two cron repairs. (1) Job 1 (`daily-invite-cleanup-and-summary`) sent no credential at all
  against a target with `verify_jwt=true`, so it was rejected every night
  (`UNAUTHORIZED_NO_AUTH_HEADER`) and expired invitations were never cleaned — `cron.alter_job` now sends
  the vault service key. (2) Job 12 (`ingest-ncver-nominal-hours-daily`) is owned by the reserved
  `supabase_read_only_user` role, which cannot call `net.http_post` — "permission denied for function
  http_post" every night, the NCVER nominal-hours ingest fully dead. Same class as jobs 13/14 (cannot be
  altered/removed from SQL; must be deleted via the Dashboard cron UI). Recreated as a new
  `postgres`-owned job (`ingest-ncver-nominal-hours-daily-fixed`) at 02:10 UTC.
- `230246` — the resurrected reminder functions (`sso-report-reminders` v9, `governance-meeting-
  reminders` v8) got past their auth gates for the first time ever on 15 Aug and immediately hit
  `PGRST200`: their queries embed `tenants` via `governance_meetings` (PostgREST resolves embedded joins
  through FK relationships), but `governance_meetings.tenant_id` carried no FK. Adds the FK constraint
  (live-verified 350 rows, 0 orphans before adding) and reloads PostgREST's schema cache.
- `040208` — `billing.enforce_lockout()` had been failing every night since deployment: `COALESCE(t.
  lifecycle_status, '')` and `COALESCE(t.tenant_type, '')` cast an empty string into the actual enum
  types (`lifecycle_status`, `tenant_type`), raising `22P02` before any row was touched. Fix casts to
  `::text` first; no other lockout logic changed (this is the *earlier*, narrower fix — Cluster 5's
  `080308`/`080406` are the later, broader invoice-billing rewrite of the same function on top of this
  one).
- `040425` — both ops-diagnostics functions (`ops_run_diagnostics`, `ops_run_security_diagnostics`) gated
  on `current_setting('role') = 'service_role'`, which is never true under `pg_cron` (runs as `postgres`,
  no role set): `ops-security-diagnostics-15m` had been a silent zombie since ~13 July (returns a
  `FORBIDDEN` jsonb payload but `pg_cron` still records the run as a success), and `ops-run-diagnostics-
  15m` failed outright on a permission error (reserved-owner cron, separate problem). Gate rewritten to
  the same service-context pattern used elsewhere in this sweep (allow when there is no JWT at all, when
  the JWT role is `service_role`, or when the caller is SuperAdmin). `ops_run_diagnostics` additionally
  compared `lifecycle_status` against the invalid literal `'trial'` (not a real enum label) in two of its
  checks — corrected to `::text` comparisons against the real labels (`trial_active`,
  `trial_expiring_soon`, etc.), mirroring the same class of bug Cluster 5's `080308`/`041707` narrative
  already covers elsewhere in the trial/lockout domain.

**Decision: adopt each version's `statements` verbatim, one file per version.**

**Idempotency notes:** all four are naturally idempotent as authored — `065509`'s `cron.alter_job` and
`cron.schedule` calls are safe to rerun (schedule/recreate, not create-or-fail); `230246`'s `ALTER TABLE
... ADD CONSTRAINT` has **no existence guard** (same class as Cluster 5's `044217` — Postgres doesn't
support `ADD CONSTRAINT IF NOT EXISTS`), flagging per convention, acceptable as one-shot historical record
unless Brian wants a `DO $$ ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` guard added; `040208`
and `040425` are both `CREATE OR REPLACE FUNCTION` — safe to rerun.

**Status: RECOVERED, not yet LOCKED.**

### 17 Aug 2026 — Cluster 7c: Reserved-owner cron wave 2 + Confidence Score Phase 1 (4 items) — RECOVERED

Versions: `20260816040519` (fix_compliance_scorer_service_context_and_snapshot_guard), `20260816040541`
(recreate_reserved_owner_crons_wave2), `20260816041205` (confidence_score_phase1_extend_snapshots),
`20260816041216` (confidence_score_nightly_repoint_job29). Two sub-threads: a same-morning fix to the
existing weekly compliance-snapshot cron plus a batch of five more dead reserved-owner cron jobs, then —
11 minutes later — the first phase of a new Confidence Score feature that extends the same snapshot
table. `041205`/`041216` are a clear sequential pair (build the feature, then repoint the nightly job to
call it) and should be called out together in the PR description, matching Cluster 2's `060438`/`060611`
pairing convention.

- `040519` — the weekly compliance snapshot cron (job 29, `postgres`-owned) had never produced a single
  snapshot: `rpc_compliance_readiness_score` requires tenant membership, and under `pg_cron`, `auth.uid()`
  is `NULL`, so it returned `{'error':'not_a_member'}` for every tenant; `snapshot_compliance_scores` then
  crashed on the `NOT NULL overall_score` insert for the *first* tenant, aborting the whole run for every
  tenant behind it. Two fixes: (1) the scorer RPC now admits service context (no JWT at all, or a
  `service_role` JWT) — same service-context pattern used throughout this sweep — with member/SuperAdmin
  behaviour for interactive callers unchanged; (2) the snapshot function now guards **per tenant**,
  skipping and `RAISE WARNING`-logging any tenant that returns an error payload or a NULL score instead of
  aborting the entire batch.
- `040541` — five more reserved-owner cron jobs (16, 20, 21, 22, 23), all owned by
  `supabase_read_only_user`, all failing on every fire (cannot call `net.http_post`, lacks EXECUTE on the
  target functions) — "same class as jobs 12/13/14" (the weekend list). Recreates all five as
  `postgres`-owned replacements: `trial-email-reminders-fixed`, `enforce-billing-lockout-nightly-fixed`
  (calling the now-repaired `billing.enforce_lockout()` from `040208` above), `snapshot-usage-nightly-
  fixed`, `nightly-tas-monitor-fixed`, and `ops-run-diagnostics-15m-fixed` (deliberately time-offset from
  `ops-security-diagnostics-15m` to avoid a collision). The five old reserved-owner jobs join the
  Dashboard-deletion list alongside jobs 12/13/14 — cannot be unscheduled via SQL.
- `041205` — Compliance Confidence Score Phase 1, explicitly designed to **extend the existing snapshot
  system rather than add a parallel table** (four new nullable/defaulted columns on
  `compliance_score_snapshots`: `evidence_readiness`, `key_person_risk`, `currency_scores` jsonb,
  `computed_by` with a `'system'` default), plus a new supporting index. Adds
  `compute_confidence_score(uuid)`: reuses the existing presence score (`rpc_compliance_readiness_score`)
  as one input, and derives a second "currency" composite from four independently-weighted signals —
  credentials expiring within 30 days, overdue validations, TAS finalisation rate (against the live
  `q1_tas_builder` table, not a deprecated one), and overdue open tasks — plus a standalone "Key-Person
  Risk" figure (the busiest assignee's share of open tasks; comment implies this is a genuinely new risk
  signal, not previously computed anywhere). `compute_all_confidence_scores()` iterates all active
  tenants with its own per-tenant exception guard, mirroring `040519`'s per-tenant skip-and-warn pattern
  rather than the earlier abort-on-first-failure bug. Same access gate as `040519` (member/SuperAdmin/
  service-context). Ends with explicit grant hygiene (`REVOKE ... FROM PUBLIC, anon` before granting to
  `authenticated`/`service_role`) plus the standard five-function context-RPC anon-revoke invariant and a
  PostgREST schema-cache reload.
- `041216` — one-line follow-up, 11 minutes later: repoints job 29 from the old weekly presence-only
  snapshot call to `public.compute_all_confidence_scores()` on a new nightly `30 16 * * *` (16:30 UTC =
  2:30am AEST / 3:30am AEDT) schedule, with its own comment confirming "no same-minute cron collision."

**Decision: adopt each version's `statements` verbatim, one file per version** — call out `041205`/
`041216` together in the PR description as build-then-repoint, same convention as Cluster 2's
`060438`/`060611`.

**Idempotency notes:** `040519` is two `CREATE OR REPLACE FUNCTION` statements — safe to rerun. `040541`'s
five `cron.schedule` calls are **not** idempotent (`cron.schedule` errors — or silently creates a
duplicate job under the same name, depending on pg_cron version behaviour — if a job with that name
already exists); same class as the plain `cron.schedule` calls already flagged in earlier clusters (e.g.
`065509` above, `083633` in Cluster 2) — acceptable as one-shot historical record of a job that was
created once in production, per the established convention, no new flag needed beyond noting it exists
here too. `041205`'s `ADD COLUMN IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS` are correctly guarded;
its `CREATE OR REPLACE FUNCTION` statements and its `REVOKE`/`GRANT` lines are all naturally idempotent —
no flag. `041216`'s `cron.alter_job` is safe to rerun (alters in place, does not error if called again
with the same arguments).

**Status: RECOVERED, not yet LOCKED.**

**Cluster 7 recovery complete — all 10 previously-undocumented versions now recovered and logged**
(`065509`, `075911`, `075949`, `230246`, `040208`, `040425`, `040519`, `040541`, `041205`, `041216`).
Combined with Clusters 1–6 and the special cases above, all ~61 items from the "Remaining ~57 items" list
plus the pre-existing special cases now have a corresponding Decisions log entry. None are yet marked
LOCKED — every cluster above is RECOVERED only, pending Brian's review pass before any file is written.

### 17 Aug 2026 — LOCKED and files written (implementation pass complete)

Brian confirmed both flags in Cluster 3 (password-reset frontend audit — verified via grep, no call
sites depend on `update_user_password`/`update_user_password_direct`; the 108-day billing incident —
acknowledged) and gave go-ahead to proceed. All clusters + special cases moved from RECOVERED to
LOCKED and written to `supabase/migrations/` on branch `fix/migration-drift-reconciliation-aug14-16`
(worktree C) via 6 parallel background agents, plus 4 files this session had to recover and author
directly after verification caught them missing from agent reports (**trust-but-verify note:** one
subagent's completion report claimed a file was written that was not actually present on disk —
`20260816040425` — always re-verify agent-reported file writes against `git status`/`ls`, don't take
a completion summary at face value).

**Final verification (17 Aug 2026, this session) — all 60 file-bearing versions from the 62-item list
confirmed present** (the 62nd, `20260814061523`, is intentionally file-less — absorbed into the amended
`20260814043000_revoke_anon_switch_to_consultant_home.sql`), plus:
- `.drift-baseline.txt` — one line appended for `20260812020135` (pre-existing special case, confirmed
  present, correct format).
- `20260814043000_revoke_anon_switch_to_consultant_home.sql` — amended with the 4 additional REVOKE
  statements, confirmed present.
- Two files adopted verbatim from unmerged commit `b91190f86` (`20260816081212`, `20260816081345`),
  confirmed present.
- Two items originally missing from the "Remaining ~57 items" clustering entirely (a gap in the
  original manual clustering pass, not a subagent error) were caught during verification and recovered
  fresh in this session: `20260814075036` (restore_lkl_audit_status_and_merge_plans_tables — dead-table
  rename, same class as Cluster 1) and `20260815062801`/`20260815062917` (the actual risk-scorer
  rebuild + breadth-modifier pair — Cluster 4's original recovery had mistakenly substituted
  `073222`/`073339`/`073449` instead of pulling these two; both sets are real production versions and
  both are now present as separate files, no conflict).

Total: 63 files touched (61 new `.sql` files + 2 amended files: `.drift-baseline.txt` and
`20260814043000_...`).

### 17 Aug 2026 — Post-push fixes (Cursor Bugbot, Cursor Security Reviewer, branch-DB failure)

PR #459 pushed, then Bugbot/Security Reviewer flagged 8 findings and CI + the Supabase Preview
branch-DB build failed. Verified each against the actual file (not taken at face value) before
fixing. Commit `b6b469bd3`:

- **Fixed:** CI's naive "SECURITY DEFINER present + search_path absent" text-match false-positived
  on 4 files that only mention the term in comments (reworded, no logic change) — same class of
  bug this branch's own history already hit once (`a17e468d6`).
- **Fixed (Bugbot):** `075949` exact-count-of-2 assertion hard-failed on branch DBs with 0 CA
  profiles (now accepts 0 or 2); `083650` demo seed hard-failed when the production-only HLT57415
  row is absent (now skips gracefully); `074129`/`074137` driver_register_map's composite unique
  key let NULL `register_type` rows bypass `ON CONFLICT` (narrowed key to `driver_code` alone,
  which is the real uniqueness constraint — only 1 of 8 drivers has a non-null `register_type`);
  `080308` Unlock A didn't check `locked_reason` before releasing a Stripe-entitled tenant, unlike
  Unlock B and the file's own stated intent — added the same guard.
- **Fixed (Security Reviewer — real cross-tenant vulnerabilities, inherited from production, not
  introduced by this reconciliation):** `060611` (`persist_tga_scope_items`) and `062801`
  (`compute_student_risk_score`) are both SECURITY DEFINER + granted to `authenticated` with zero
  ownership check on the caller-supplied tenant id. Added tenant-membership/role gates.
- **Fixed (mine to tighten, not inherited):** `072717`'s two new UPDATE/DELETE storage policies
  (added this session to fix the "no update/delete" defect) were scoped to "any tenant member" —
  narrowed to the object's own uploader (`storage.objects.owner`) or an active operational-write
  role, matching the file's own stated intent.
- **Fixed (pre-existing file, NOT part of the 62-item scope, already applied to production):**
  `20260814063744` references `trainer_monthly_report_attachments` before it exists in a fresh
  migration replay (created later the same day by `20260814100000`, which sorts after it). This
  broke the Supabase Preview build for this branch. Added `to_regclass` existence guards — safe
  since production already has the table and never re-runs an applied version; only affects future
  branch-DB provisioning. Flagged prominently since editing an already-applied file is outside this
  task's normal boundaries, but the fix carries no production risk.
- **Deliberately NOT fixed — flagged on the PR instead:** hardcoded production URLs in
  cron/trigger migrations (083633, 091013, 040541, 065509, 044238, 044252). Verified this matches
  an existing, already-merged, already-applied pattern in this repo
  (`20260618021900_schedule_email_outbox_worker.sql`) with zero branch-safety guard. Inventing a new
  guard here would be inconsistent with the rest of the codebase and is a platform-wide convention
  decision, not a reconciliation-scope fix — left as a PR comment for Brian/Carl to decide.

**Status: pushed, awaiting CI re-run.**

**Status: LOCKED and DONE for all 62 items.** Not yet committed or pushed (hard gate — awaiting
Brian's explicit commit instruction). Remaining steps per the handover: run `ci-gate` skill, then
commit/push/PR per the standard hard gates, with a PR description calling out the sequential pairs
(`060438`/`060611`, `041205`/`041216`, the two Consultant Assistant purge files) and the post-merge
checklist (apply each migration to production per the interim `execute_sql` + `migration repair`
procedure — none of this is auto-applied by merge).
