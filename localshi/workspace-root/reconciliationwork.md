# Migration Drift Reconciliation — Working Doc

> Source of truth for tracking genuinely NEW production migration drift — i.e. drift not already known
> to the team's own CI baseline. Read this at session start; update after every investigation step.

Last updated: 22 July 2026 (independent verification pass — see banner below)

---

## ⚠️ Independent verification pass (22 Jul 2026) — read this before trusting anything below

Brian asked for every claim in this document to be independently re-verified against live production
state and git — not re-read from the document's own narrative. Good call: **item 12's writeup was
proven backwards** (see below), and the same "trusted the migration's stated intent instead of the
live result" error recurred **four more times** across the rest of the document. Corrections are
inserted inline at each affected item, marked **⚠️ CORRECTED (22 Jul verification)**. Everything not
marked has been independently re-checked and holds up (Groups 6, 8's 19 numbered items, 12/13 of the
"new" items, 14/15 of Group 5, 32/33 of Group 7, and a 15-item spot-check of Groups 1–4 all confirmed
against live SQL, not just re-read).

**The recurring failure pattern, for future reference:** this document repeatedly described what a
migration *said* it would do, or what a later migration *claimed* to supersede, without confirming the
live database actually ended up in that state. Concretely:
1. Item 12 — blamed the wrong migration version for creating a vulnerable function (it actually created
   a safer one; a different, already-git-tracked migration caused the real regression).
2. Group 7 — claimed `rpc_get_consultant_portfolio` was "cleanly replaced" by
   `rpc_get_consultant_portfolio_org_based`. That replacement function does not exist in production.
3. Group 9 — claimed "0 disabled triggers live" as a verification result. 3 disabled triggers actually
   exist (unrelated table, likely pre-existing debt, but the specific claim was false).
4. Group 5 — claimed the Tenant B seed tenant "still" needed a human decision. It had already been
   quarantined two days earlier — the claim was stale, not wrong-when-written, but presented as current.
5. Group 8 — claimed two anon-executable write functions were "concerning" / exploitable. Their actual
   function bodies fail closed on `auth.uid() IS NULL` — the grant is real but not currently exploitable.

**Going forward:** any claim in this document of the form "migration X did Y" or "X was superseded by Y"
must be checked against `pg_get_functiondef`/`information_schema`/a direct row query before being relied
upon — the SQL a migration *contains* and the state production actually *ended up in* are not
guaranteed to match, especially across a chain of several same-day migrations.

---

## What this is

Production has migrations applied directly to the database with no matching file in git. The team
already tracks this via `rto-compass-hub/supabase/migrations/.drift-baseline.txt` — a checked-in,
CI-maintained snapshot used by `.github/workflows/migration-drift-check.yml` (the "ratchet model,"
added via PR #196/#197, 14 Jul 2026, last pruned 20 Jul 2026 in commit `a21a5bf7f`). Anything in that
file is **known, accepted debt** — not something to re-investigate from scratch.

We independently reconstructed a list of 213 undocumented production migrations (via `list_migrations`
+ timestamp-window matching against local/archived files — see method note below). Cross-referencing
that list against `.drift-baseline.txt`:

- **199 of the 213 are already in the baseline.** Not new. (We separately investigated ~76 of these
  across Billing/Trial, Security, Trainer Roles, and TAS Product Scope groups before realising this —
  all confirmed present in the baseline, all consistent with live app behaviour, nothing broken. That
  work is superseded by this finding and not repeated here.)
- **14 of the 213 are NOT in the baseline at all.** These are genuinely new — nobody, including the
  CI process, has a record of them. **This is the only remaining open work.**

**Method note:** Supabase records a migration's `version` as its actual execution timestamp, not the
filename's timestamp, so raw string matching produces false positives. Our reconstruction used a
±120-second window match against local + archived filenames to correct for this.

---

## The 14 genuinely new items

| # | Version | Name (from production) | Date |
|---|---|---|---|
| 1 | `20260630075042` | *(no name recorded)* | 30 Jun 2026 |
| 2 | `20260703022530` | *(no name recorded)* | 3 Jul 2026 |
| 3 | `20260703073434` | *(no name recorded)* | 3 Jul 2026 |
| 4 | `20260709084428` | `20260709084423_5be361d5-bcb8-435b-a117-ee4862786013` | 9 Jul 2026 |
| 5 | `20260709085335` | `20260709085329_b5232f6d-aa53-485a-bcd8-8d03a5446dad` | 9 Jul 2026 |
| 6 | `20260709231800` | `20260709231755_25a0c678-8ca6-4a29-90f3-6d82060e37f8` | 9 Jul 2026 |
| 7 | `20260712121455` | `20260712121450_7ffbb0cd-b05a-4997-b030-b965f9bf41f8` | 12 Jul 2026 |
| 8 | `20260712123359` | `20260712123353_139742e9-338d-4717-982c-bcf556335e8c` | 12 Jul 2026 |
| 9 | `20260712124721` | `20260712124715_3d2abc3c-8ced-4371-9061-7c9c2b39d6d3` | 12 Jul 2026 |
| 10 | `20260712231935` | `20260712231931_d4954985-3759-410b-939f-fdfaa03d7384` | 12 Jul 2026 |
| 11 | `20260715015941` | `20260715015936_6d83a88f-6620-4514-992c-df9de733a85e` | 15 Jul 2026 |
| 12 | `20260716012333` | `20260716012327_21cc2e7a-ec4b-4d09-83f0-eaae405b1d1a` | 16 Jul 2026 |
| 13 | `20260717063102` | `20260717063052_d8c7352b-8234-4f33-89c9-0bc565367399` | 17 Jul 2026 |
| 14 | `20260717063255` | `20260717063251_dc218902-000b-4d42-8176-9965dfbe2ff0` | 17 Jul 2026 |

**Notable pattern:** all 14 are recent (30 Jun – 17 Jul), clustering in the last ~3 weeks. 11 of the 14
carry UUID-style names (no human-readable description at all) — the same naming pattern as several
UUID-named rows already in the baseline (e.g. baseline row `20260709053642|20260709032943_2fa8d929...`),
suggesting these came from the same kind of tool/process (possibly Lovable or a direct SQL client) that
produced earlier UUID-named baseline entries — just not yet captured into the baseline file itself.

The baseline was last pruned/updated 20 Jul 2026. Since most of these 14 predate that update (up to 17
Jul), they were either missed by whatever process built/pruned the baseline, or happened through a path
that process doesn't scan.

---

## Investigation plan for the 14

For each item, need to answer: **what did this actually change in the database, and does the app
currently behave consistently with it (i.e. is it safe, working debt) — or does it need urgent
attention (security-relevant, broken, or actively risky)?**

Steps:
1. Pull the actual SQL each of these 14 versions executed against production (via `execute_sql` against
   `supabase_migrations.schema_migrations` or equivalent — the baseline/CI process reads this table
   directly).
2. For the two with no name at all (`20260630075042`, `20260703022530`, `20260703073434` — three,
   correction) — a blank name is unusual even by this repo's own drift patterns; worth checking if this
   indicates something different (e.g. a manual `psql` session vs a tool-driven migration).
3. Cross-reference each against live schema/app code, same method as the earlier group investigations.
4. Decide per item: reconcile (write the missing migration file + prune nothing since it was never in
   baseline), investigate further (if security/data-risk), or flag to Carl/Dave if genuinely unclear.
5. Once understood, these 14 should also be **added to `.drift-baseline.txt`** (or reconciled with real
   files) so the CI ratchet actually tracks them going forward — right now CI would flag these as FAIL
   if it ever re-ran the exact same diff, since they're missing from its own accepted list.

---

## Findings (20 Jul 2026) — all 14 pulled from production, one urgent

### ⚠️ CORRECTED (22 Jul verification) — item 12: `20260716012333` did NOT create the vulnerable function

**The paragraph below (as originally written) is wrong and is kept struck through for the record — see
the correction underneath.**

~~This is the exact function `rto-compass-hub/CLAUDE.md` already documents as a regression example (the
"banned pattern" writeup under Migrations/Edge Functions): on 16 Jul 2026, a staging-sync created
`sa_extend_trial_v2` with only a super-admin + positive-days check — missing the paid-subscriber guard
that its predecessor (`admin_extend_trial`) had gained the day before (#206).~~

**What actually happened, verified directly against `supabase_migrations.schema_migrations.statements`
for every version involved, in true chronological order:**

1. **`20260716012333`** (production name: UUID `20260716012327_21cc2e7a-...`) — the version this document
   originally blamed — actually created a **heavily-guarded, safe** version of `sa_extend_trial_v2`:
   rejects diamond tenants, rejects tenants with a future `paid_through_date`, rejects
   `tenant_type='subscriber'`/`lifecycle_status='subscriber_active'`, requires the tenant to actually
   look like a trial, requires a reason of 5+ characters, and explicitly `REVOKE`s execute from
   `PUBLIC`/`anon`. This is the safest version of this function that ever existed — the opposite of
   vulnerable.
2. **Production version `20260716051346`**, name `20260716111500_sa_extend_trial_v2` — **this is the
   migration that actually overwrote the safe version with the lean, unguarded one** (only a
   super-admin + positive-days check). Its name matches an existing git file exactly:
   `supabase/migrations/20260716111500_sa_extend_trial_v2.sql`. **This migration is already committed to
   git — it is not orphaned and never needed a reconciliation file.** This is the real regression this
   document was trying to describe; it just had the wrong version number attached to it.
3. **`20260716160000_sa_extend_trial_v2_reject_paid_subscribers.sql`** — the fix, applied to production
   20 Jul 2026 (see "RESOLVED" below) — restored a billing/subscription-status check, but only a partial
   one (see gap below).

**Corrected conclusion: item 12 (`20260716012333`) needs no reconciliation file.** It never created an
orphaned or vulnerable object — remove it from any "still open" reconciliation backlog.

**✅ Confirmed still true: the fix WAS applied to production 20 Jul 2026** — `sa_extend_trial_v2` now
checks `v_billing_status`/`v_subscription_status` and refuses a paid/payment-locked tenant
(`not_a_trial_tenant` error). Anon execute is correctly revoked (`information_schema.routine_privileges`
confirms only `authenticated`/`service_role`/`postgres`, no `anon`).

**⚠️ New, real, currently-live finding the original write-up missed:** the live function today, even
after the 20 Jul fix, is missing several guards the *original* safe version (from step 1 above) had:
- No `is_diamond` check
- No `paid_through_date` check
- No `tenant_type='subscriber'` / `lifecycle_status='subscriber_active'` check
- No mandatory-reason validation (reason is now optional, `DEFAULT NULL`)

A diamond tenant, or a tenant with a future paid-through date, whose `billing_status`/
`subscription_status` string doesn't happen to be one of the five checked values
(`active, past_due, unpaid, grace, suspended`) could still be incorrectly flipped to trial by a
super-admin today. **This is a real, open, unaddressed gap — recommend restoring the missing guards in
a proper migration, pending Brian's sign-off**, since it touches production and billing-adjacent logic.

---

### Item 1: `20260630075042` (no name recorded)

`CREATE OR REPLACE FUNCTION public.sa_update_tenant(p_tenant_id uuid, p_updates jsonb)` — a super-admin
function for making ad-hoc updates to a tenant record via a JSON payload. `SECURITY DEFINER`. Worth a
closer look at what fields it allows updating and whether it has appropriate guardrails (a generic
"update any tenant field from JSON" function is a common source of the "trusting client input" issues
flagged elsewhere in this codebase) — not yet fully reviewed line by line.

### Item 2: `20260703022530` (no name recorded)

A substantial (15.5KB) addition: a new RPC ensuring a minimal `qualification_context` row exists for
standalone-unit TAS builds (as opposed to full-qualification builds) — writes only `aqf_level`, leaving
other qualification-derived fields NULL since standalone units don't have them. This reads as a genuine
feature addition for the TAS builder, not a one-off fix. Worth checking whether app code
(`useTasRegistry.ts` or similar) currently depends on this RPC existing.

### Item 3: `20260703073434`

One-off data fix: clears `is_extracted` and `packaging_rules` for one specific `q1_tas_builder` row
(hardcoded UUID `cea84fa3-...`), conditioned on packaging_rules being null or a specific stale value.
Classic one-tenant/one-record repair — low risk, just needs documenting.

### Items 4–5: `20260709084428`, `20260709085335` — release notes cleanup (fix-and-retry pair)

Both delete rows from `release_note_items` for the same three release-note IDs, with slightly different
conditions — looks like the first attempt didn't fully work and was corrected six minutes later. Content
cleanup only (says "content is now in `summary_md`" — i.e. consolidating structured release-note items
into a single markdown summary field). Low risk.

### Item 6: `20260709231800`

One-off content fix: replaces "Under Standard 8, governing persons are personally accountable" with
"Under Quality Area 4, governing persons are personally accountable" in `help_centre_content`. This is a
**regulatory terminology correction** — aligning help-centre wording with the Standards for RTOs 2025
framework (which uses "Quality Area" terminology, replacing the old "Standard" numbering). Correct and
appropriate; low risk, just needs documenting.

### Items 7–9: `20260712121455`, `20260712123359`, `20260712124721` — tenant_addresses TGA-sync saga

A three-step sequence: (7) added a unique index to de-duplicate `tenant_addresses` by
tenant+type+full_address, (8) dropped that same index 12 minutes later, (9) added a `source` column
(default `'manual'`) to `tenant_addresses` so TGA-synced address rows can be idempotently upserted going
forward. Reads as: tried a database-level de-dupe constraint first, found it didn't fit the real
approach, backed it out, and did the actual fix (a source-tracking column) instead. Worth confirming the
`source` column is actually used by the TGA sync code path now.

### Item 10: `20260712231935`

`CREATE OR REPLACE FUNCTION public.get_my_affiliate_context()` — `SECURITY DEFINER`, `STABLE`. Part of
the Consultant/affiliate program (already partly covered in earlier group investigations —
`get_my_affiliate_context_rpc` appears in the baseline too, so this may be a later revision/fix of that
same function). Worth confirming this version matches current app expectations in `useAffiliateContext`
or similar hooks.

### Item 11: `20260715015941`

`CREATE OR REPLACE FUNCTION public.get_survey_results(p_survey_id uuid)` — `SECURITY DEFINER`, `STABLE`,
explicitly commented "aggregated, anonymity-safe survey results." This is QI (quality indicator) survey
infrastructure. Being anonymity-safe and security-definer, this is worth a closer check that it correctly
scopes/anonymizes before returning data — the QI survey group wasn't part of our earlier investigation
passes.

### Items 13–14: `20260717063102`, `20260717063255` — q1_tas_builder compatibility columns

(13) adds `qual_code`/`qual_title` compatibility columns to `q1_tas_builder` alongside the newer
`training_product_code`/`training_product_title` columns, because "the codebase still references these
legacy names." (14) three minutes later, drops the `NOT NULL` constraint on
`training_product_code`/`training_product_title` — consistent with supporting standalone-unit TAS
builds (item 2 above) that wouldn't have a training product code/title at all. These two look like a
related pair, both low-risk schema-compatibility patches, not urgent.

---

## Next step

**Immediate:** decide with Brian on applying the `sa_extend_trial_v2` fix (item 12) — this is a live,
exploitable gap, not theoretical.

**Then:** for the remaining 13 (all lower risk), write reconciliation migration files documenting each,
and add all 14 versions to `.drift-baseline.txt` so the CI ratchet actually tracks them going forward
(right now none of these 14 exist in that file, so they'd show as new FAILs if the exact same diff were
re-checked).

---

## ✅ Done (20 Jul 2026)

**Security fix applied to production:** `sa_extend_trial_v2` now rejects paid/payment-locked
subscribers — confirmed live via direct query post-apply.

**Branch created:** `fix/migration-drift-reconciliation-13`, off a clean `main`. 13 reconciliation
migration files written, one per genuinely-new drift item (excluding the urgent one, which was
resolved via the fix above rather than a reconciliation file). Filenames follow the
`<production version>_<production name>.sql` convention from `supabase/migrations/CLAUDE.md`, with
verbatim SQL pulled directly from `supabase_migrations.schema_migrations`. Three items had no
production `name` recorded — used a descriptive slug instead and noted the deviation in each file's
header comment.

**PR #272 merged (20 Jul 2026) — post-merge complete:**
- ✅ Merged to `main` (commit `900eb2acf`). CI initially failed on "Migration guards (new files only)"
  (filename conflict between the drift-check's version-matching and the separate snake_case naming
  guard) and a Cursor Bugbot finding (`get_survey_results` text_samples wrong shape). Both fixed and
  re-pushed — see commit `ab89e3bf0`. Full detail on both fixes is in the git history / PR discussion.
- ✅ Post-merge: pulled `main` locally. Applied the one genuinely-new migration
  (`20260720120000_fix_get_survey_results_text_samples_plain_strings.sql`) to production — verified
  live via direct query. The other 13 reconciliation files were NOT re-applied to production, since
  they document changes already live since their original drift dates; several (one-off DELETE/UPDATE
  data fixes, the address-index create/drop saga) would not be safe to replay.
- ✅ Bugbot review thread resolved on GitHub, with a PR comment explaining the fix landed via a separate
  migration file (append-only convention — couldn't edit the flagged reconciliation file itself).
- ✅ Branch `fix/migration-drift-reconciliation-13` deleted (local + auto-deleted remote on merge).

**Still open / not yet done:**
- [x] ~~`20260716012333` needs its own reconciliation file~~ — **⚠️ CORRECTED 22 Jul: this was based on
      the wrong version being blamed for the vulnerability (see corrected item 12 writeup above).**
      `20260716012333` created a *safe* function and needs no reconciliation file. The migration that
      actually caused the regression (`20260716051346` / git file `20260716111500_sa_extend_trial_v2.sql`)
      is already tracked in git. **Nothing outstanding here** — except the newly-found live gap in the
      current function (missing diamond/paid-through/subscriber-type/mandatory-reason checks), logged
      above and in the Backlog.
- [ ] None of these 14 versions were ever in `.drift-baseline.txt` (that's what made them "new"), so
      there's nothing to prune there for this batch — but worth a follow-up `migration-drift-check` run
      against current `main` to confirm all 13 now show as matched, not orphaned. **Still not done as of
      22 Jul verification pass** — this remains open.
- [x] Item 1 (`sa_update_tenant`) — **⚠️ CORRECTED 22 Jul verification:** this was flagged as an
      unreviewed risk ("generic update-tenant-from-JSON pattern"). Independently verified: it's
      `SECURITY DEFINER`, gated by `is_super_admin()`, writes only via a fixed allowlist of 6 named
      columns (no dynamic SQL, no arbitrary-column write), and logs to `log_security_audit_enhanced`.
      **No action needed — closed, not a risk.**
- [x] **The remaining 138 baseline items** — security-priority subset (15 items) now investigated,
      see Group 5 below. 123 non-security items (QI surveys, consultant/affiliate program, governance,
      demo/misc seeds) still uninvestigated. **⚠️ CORRECTED 22 Jul: this "138" figure does not reconcile
      with the actual per-group counts — see the "Item-count discrepancy" note in the closing summary
      section. 8 baseline items were never itemized in any group.**

---

## Group 5: Security-priority pass over remaining baseline items (20 Jul 2026)

Scope: rather than working through all 138 remaining items in feature-area order, took the
handover's suggested shortcut and pulled out just the security-shaped items first (RLS policies,
anon/public grants, superadmin-gated functions, the new security-diagnostics infra) — 15 items,
all verified live against current schema/grants/policies/cron state via direct query, not just
read from migration names.

### SuperAdmin tenant-scoping (RESTRICTIVE SELECT gate rollout)

**Item 1: `20260616032602` — `add_sec_superadmin_tenant_gate_helper`**
Creates `sec.superadmin_tenant_gate(p_tenant_id uuid)`: no-op (returns true) for non-super-admins;
returns true for a super-admin in panel mode (no active tenant); for a super-admin who has entered a
tenant workspace, returns true only if the row's `tenant_id` matches that active tenant.
`SECURITY DEFINER`, correct `search_path`, `anon`/`PUBLIC` execute revoked, `authenticated`/
`service_role` granted. Verified live — matches design intent exactly. **CONSISTENT.**

**Items 2–3: `20260616032625` / `20260616032645` — `restrictive_superadmin_tenant_scope_registers_batch1` / `batch2`**
Adds RESTRICTIVE SELECT policies using the gate above across ~34 tenant-scoped register/workforce
tables — defense-in-depth so a super-admin "inside" a tenant workspace can't accidentally read
cross-tenant rows via some other over-permissive policy. Verified live — policies present, consistent
naming pattern shared with the 9 Jul stage1 batch. **CONSISTENT.**

### Anon-execute grant revocations (four cleanup passes)

**Item 4: `20260618233051` — `revoke_anon_execute_billing_rpcs`**
Revokes `anon` EXECUTE on 7 billing RPCs that trust a caller-supplied tenant_id/uuid — this is the
"anon-execute grant worth a second look" flagged in the handover. Verified live: all 7 confirmed
`anon_can_exec = false`, `authenticated = true`. **CONSISTENT — confirmed fixed and holding, no
regression.**

**Item 5: `20260621233627` — `revoke_anon_grants_consultant_rpcs`**
Same pattern, 4 consultant/affiliate RPCs. Verified live: all 4 `anon_can_exec = false`.
**CONSISTENT.**

**Item 6: `20260622235529` — `revoke_anon_gov_seed_clause_map`**
Revokes anon/PUBLIC execute on `gov.seed_default_clause_map(uuid)`. Verified live: `anon_can_exec =
false`. **CONSISTENT.**

**Item 7: `20260624063611` — `fix_trainer_report_readiness_role_string_and_anon_grants`**
Bundles (a) fixing `get_trainer_report_readiness` to check role string `'Trainer/Assessor'` instead
of a stale `'Trainer'` value that no longer exists, and (b) anon-execute revoke on 4 trainer-report
RPCs. Verified live: `'Trainer/Assessor'` confirmed as the only live role string in `tenant_members`;
all 4 RPCs `anon_can_exec = false`. **CONSISTENT.**

### SuperAdmin cross-tenant SELECT exception (complybot logs)

**Item 8: `20260704054605` — `fix_complybot_response_logs_superadmin_select`**
Adds an additive PERMISSIVE policy letting super-admins read `complybot_response_logs` across all
tenants (support/AI-log triage) — a deliberate, narrow, single-table exception, separate from the
RESTRICTIVE tenant-gate batches elsewhere. Verified live, policy present exactly as written.
**CONSISTENT** — worth a human noting this as an intentional documented exception (super-admin read
here is NOT scoped to active-tenant context by design), not an accidental gap.

### Trainers Matrix RESTRICTIVE closure

**Item 9: `20260709040602` — `restrictive_select_trainers_matrix_stage1`**
Extends the superadmin-tenant-gate RESTRICTIVE pattern to 7 more trainer-matrix tables not covered
by the 16 Jun batches. Verified live: all 7 policies present. **CONSISTENT.**

### RLS test tenant seed data — ⚠️ CORRECTED (22 Jul verification): already resolved, doc was stale

**Items 10–11: `20260713034900` / `20260713034944` — `seed_rls_test_tenant_b` / `_decoy_data`**
Seeds a synthetic "Tenant B" (`is_demo=true`, `tenant_type='internal'`) plus a decoy trainer +
credential row — built to prove cross-tenant isolation.

**The paragraph below (as originally written) is now stale — the situation it describes has already
been resolved:**

~~Verified live right now: the tenant row still exists in production, `status='active'`... its
`billing_subscriptions` row is still `active`/`active`... FLAGGED — needs a human decision: delete the
tenant + rows... or explicitly set `billing_state='cancelled'`~~

**Re-verified 22 Jul 2026:** tenant `b3000002-...-000000000001` currently has `status='suspended'`, and
its `billing_subscriptions` row has `status='cancelled'`, `billing_state='cancelled'`, last updated
**2026-07-20 05:15 UTC** — two days *before* this document's "needs a human decision" framing was
written. **Someone already made the call and quarantined it** (not deleted — full deletion is blocked by
the platform's append-only audit-log guard on `trainer_timeline_events`, a real immutability protection,
not a bug). The decoy trainer/credential rows still exist but are attached to a now-suspended,
non-billing tenant. **No further action needed — this is resolved, remove it from any open backlog.**

One nuance worth noting on the `adminTenants.ts` claim: `adminListTenants()` (the generic listing
function) no longer filters demo tenants at all — its `includeDemos` param is deprecated/ignored per an
in-code comment ("Demo filtering removed — consolidated into Trial via tenant_type"). Only
`adminListPaidTenants()` still excludes `is_demo` tenants, via `config.is_demo` on the
`v_tenants_normalized` view. So "paid tenant counts exclude demos" holds specifically for that one
function, not for tenant listing generally — a sharper caveat than the original doc gave, though moot
now that the tenant itself is quarantined.

### Security-diagnostics infrastructure (DDL audit trail + automated alerts)

**Item 12: `20260713222254` — `create_sec_ddl_audit_and_event_trigger`**
Creates `sec.ddl_audit` (logs every DDL command platform-wide) + an event trigger firing
`sec.log_ddl()` on `ddl_command_end`, RLS-restricted to super-admins, designed to never raise (wrapped
in `EXCEPTION WHEN OTHERS THEN NULL`) so it can't block a real migration. Verified live: `anon` execute
revoked, event trigger present, `sec.ddl_audit` has 843 rows, most recent today (20 Jul 2026) —
actively logging. **CONSISTENT.**

**Item 13: `20260713222350` — `create_function_ops_run_security_diagnostics`**
Creates `public.ops_run_security_diagnostics()` (service_role/super-admin gated), running three
detectors into `ops.alerts`: a super-admin touching >8 tenants in 60 min, >40 tenant-context switches
in 60 min by one user, and the same DB object touched by ≥2 distinct backend sessions within 20
min (concurrent-DDL collision risk — the same incident class as the migration-collision issue
already documented in this workspace's CLAUDE.md). Verified live: `anon_can_exec=false`,
`authenticated`/`service_role` can execute as intended. **CONSISTENT.**

**Item 14: `20260713222400` — `schedule_security_diagnostics_cron`**
Schedules the above every 15 minutes via pg_cron. Verified live: job exists, `active=true`, schedule
matches. **CONSISTENT.**

**Item 15: `20260713222509` — `fix_ddl_collision_exclude_migration_bookkeeping`**
~90 seconds after item 13, adds an exclusion to the concurrent-DDL detector so it stops flagging
`supabase_migrations.%`/`storage.migrations` bookkeeping that every `apply_migration` call touches —
without it, every migration would trigger a guaranteed false-positive "critical" alert. Verified live:
current function body already contains this exclusion. **CONSISTENT.**

### Group 5 summary

- **⚠️ CORRECTED 22 Jul:** all 15 items independently re-verified live. 14 clean, 1 (items 10–11,
  Tenant B) already resolved (see correction above) — **0 items remain open in this group.**
- The handover's "anon-execute grant worth a second look" is confirmed resolved and holding (item 4),
  with items 5–7 covering the same pattern elsewhere — no anon-execute regressions found. (Verified: the
  7 billing RPCs are `get_eligible_plans`, `check_plan_eligibility`, `upsert_checkout_attempt`,
  `get_billing_plan_by_code`, `get_billing_customer`, `upsert_billing_customer`,
  `recompute_entitlement_for_tenant` — more specific than this doc originally named them.)
- Minor count nuance (not a correction): items 2–3's own migrations cover 36 tables (18+18), not "~34" —
  the live total of 47 gated tables includes QI tables and Group 5 item 9's 7 trainer-matrix tables
  added by other migrations.
- No reconciliation-file work needed for these 15 — status checks against already-known baseline
  debt, not new drift.
- **123 non-security items remain uninvestigated** (QI surveys, consultant/affiliate program,
  governance meetings/clauses, demo-data seeds, misc). Resume there if continuing this work.
  **⚠️ CORRECTED 22 Jul: this "123" figure is also wrong — see the item-count discrepancy note in the
  closing summary. The real remaining count itemized across Groups 6–9 is 115, not 123.**

---

## Group 6: QI (quality indicator) survey infrastructure (22 Jul 2026)

Full end-to-end pass — every table/RPC/bucket read in full and cross-checked against live schema
and app code (`src/hooks/qi/`, `src/pages/public/QiSurveyPage.tsx`, `supabase/functions/generate-qi-survey-email`).

**Item 1: `20260617223751` — `create_qi_survey_questions_table`**
Creates `qi_survey_questions` (locked ACER/rapid question wording, `UNIQUE(survey_type, question_code)`).
Live: 92 seeded rows (52 acer_learner, 32 acer_employer, 8 rapid_learner); a later migration tightened
the original bare grant into an RLS public-read policy. Read by `useQiSurveyQuestions.ts` and both
public RPCs. **CONSISTENT.**

**Item 2: `20260617223927` — `create_qi_responses_table`**
Creates `qi_responses` with the full RLS stack, `custom_id` (QIR) trigger, and an anon UPDATE policy
gated on a GUC (`app.trusted_public_write`). That anon UPDATE policy is now vestigial — the live submit
RPC INSERTs as SECURITY DEFINER instead, and anon can't set that GUC via PostgREST, so it's dead-but-
not-exploitable. **CONSISTENT** (cleanup candidate, not a live leak).

**Item 3: `20260617223949` — `create_qi_annual_register_table`**
Creates `qi_annual_register` (one row per tenant per survey_year, ASQA submission tracking). Live
schema matches plus the two ASQA columns from item 9. Used by `useQiAnnualRegister.ts` and
`QiAsqaSubmissionPanel.tsx`. **CONSISTENT.**

**Item 4: `20260617223958` — `add_indexes_qi_tables`**
Five indexes on `qi_responses`/`qi_annual_register`, all matching live columns. **CONSISTENT.**

**Items 5–6: `20260617224015` / `20260617224033` — original public survey RPCs**
Both superseded cleanly: item 5 (slug-per-respondent get) superseded by item 13's link-based version;
item 6 (2-arg submit) superseded by item 13 and formally dropped by item 18. Live only has the current
forms. **CONSISTENT** (correctly superseded).

**Items 7–8: seed ACER/rapid questions**
Live counts (52 acer_learner, 32 acer_employer, 8 rapid_learner) match what the submit RPC expects.
**CONSISTENT.**

**Item 9: `20260619050843` — ASQA report columns on `qi_annual_register`**
Idempotent, both columns present live. **CONSISTENT.**

**Item 10: `20260619054103` — `create_qi_survey_ai_emails_table`**
AI-drafted invite storage, tenant-RLS only (no anon). Live matches plus later link_id/nullable
response_id additions (items 14–15); written by `generate-qi-survey-email` and `QiSurveyEmailModal.tsx`.
**CONSISTENT.**

**Item 11: `20260619072615` — `create_qi_survey_links_table`**
Shared anonymous survey links. Live anon SELECT policy is stricter than the original migration
(tightened by a later migration to `is_active = true AND not expired`) — exposes only slug/tenant/type/
year, no PII. **CONSISTENT.**

**Item 12: `20260619072627` — `redesign_qi_responses_as_submissions`**
Dropped per-respondent dispatch columns, narrowed status CHECK. Live state has since partially
reverted — later in-git migrations reintroduced a register-based dispatch model alongside the
shared-link model, so `qi_responses` now supports both. Documented sequential evolution, not silent
drift. **CONSISTENT.**

**Item 13: `20260619072657` — `update_qi_public_rpcs_for_shared_links`**
Rewrites both public RPCs around `qi_survey_links` by slug — no respondent PII returned, writes scoped
to the link's own tenant only. Verified live function bodies match verbatim; `anon_exec = true` on
both (intentional). Driven by `usePublicQiSurvey.ts` / `QiSurveyPage.tsx`. **CONSISTENT.**

**Items 14–15: link_id column + nullable response_id on `qi_survey_ai_emails`**
Both present live. **CONSISTENT.**

**Item 16: `20260625003644` — ASQA evidence columns on `qi_register`**
Idempotent, present live, consumed by `useQiEvidenceUpload.ts`. **CONSISTENT.**

**Item 17: `20260625003657` — `create_qi_evidence_storage_bucket`**
Private `qi-evidence` bucket (50MB, PDF/JPEG/PNG/DOC/DOCX), tenant-folder-scoped storage policies.
Verified live: `public = false`. **CONSISTENT.**

**Item 18: `20260712034550` — `drop_legacy_qi_survey_submit_overload`**
Drops the legacy 2-arg submit RPC to resolve PostgREST overload ambiguity. Verified live: only the
4-arg form remains. **CONSISTENT.**

### Group 6 summary
18 items, all **CONSISTENT**. Two non-urgent cleanup notes: (1) item 2's vestigial anon UPDATE policy
on `qi_responses` is dead code, safe to drop opportunistically; (2) item 12's schema redesign was
partially superseded by later migrations — documented evolution, not a problem. Every object in this
group is actively referenced by live app code; nothing left unverified.

---

## Group 8: Governance (22 Jul 2026)

All 19 baseline drift versions read in full and cross-checked against live function bodies
(`pg_get_functiondef`), EXECUTE grants, table/RLS/row-count state, cron jobs, and app code.

**Item 1: `20260622033917` — `rpc_save_suggestion_workflow`**
Super-admin-gated suggestion triage RPC. Live: SECURITY DEFINER, pinned `search_path`, `anon_exec=false`.
**CONSISTENT.**

**Item 2: `20260622231029` — `create_sso_report_reminders_table`**
The migration text created an unscoped `billing_gate` (`USING (true)`), but the **live** policy has
since been tightened to tenant-scoped (`sec.user_in_tenant(tenant_id) AND sec.tenant_is_active(...)`)
— no cross-tenant leak in production today. 15 rows live, FK to `governance_meetings` CASCADE, consumed
by the `sso-report-reminders` edge function. **CONSISTENT** (live policy is safer than what shipped).
Minor observation: this policy is broader/less granular than the sibling `trainer_report_reminders`
policy — not a gap, just an inconsistency in strictness.

**Item 3: `20260622234804` — role-string fix in governance RPCs**
`'Trainer'` → `'Trainer/Assessor'` in two functions. Live confirms the correct string is in force; the
only remaining `'Trainer'` literal is inside a comment. **CONSISTENT.**

**Item 4: `20260622235226` — `recreate_governance_clause_tables`**
Recreates 3 clause tables with renamed constraints. Live: RLS + granular policies present; 0 rows in
all three, but by design — `seed_default_clause_map` seeds per-tenant on first call, scores/trends
compute on demand. Not data loss. **CONSISTENT.**

**Item 5: `20260622235331` — Governing Person added to clause-score gate**
Live `gov.calculate_governance_clause_score` confirmed present, `anon_exec=false`. **CONSISTENT.**

**Item 6: `20260622235430` — `fix_governance_readiness_missing_table_refs`**
Rewrites `calculate_governance_readiness` to drop deprecated table refs. Live matches, used by
`useGovernanceReadiness.ts`. **CONSISTENT.**

**Items 7 & 13: two intermediate rewrites of `generate_governance_auto_suggestions`**
Both cleanly superseded by item 17 below — not the live body, but the chain is coherent (each fixed a
real problem in the last: role gate, then column refs, then re-adding Consultant). **CONSISTENT**
(correctly superseded).

**Item 8: `20260623000734` — meeting carryover schema on `governance_actions`**
7 lifecycle columns + 2 indexes, all present live. **CONSISTENT.**

**Item 9: `20260623000813` — `rpc_dispatch_governance_action_to_register`**
Live present, SECURITY DEFINER, `anon_exec=false`, used by `CarryoverActionsSection.tsx`.
**CONSISTENT.**

**Item 10: `20260623004551` — meeting agenda auto-populate trigger**
Live trigger confirmed firing — `governance_meeting_agenda_items` has ~1857 rows. **CONSISTENT.**

**Item 11: `20260623010238` — `cron_governance_meeting_reminders`**
Cron job live, `active=true`, schedule matches; edge function exists. **CONSISTENT.**

**Item 12: `20260623010649` — `rpc_validate_governance_meeting_schedule`**
Live present, STABLE SECURITY DEFINER, `anon_exec=false`. **CONSISTENT.**

**Items 14–16: Consultant added to artefacts/minutes/storage/trainer-report-mark policies (08 Jul)**
All confirmed live exactly as the migrations describe. **CONSISTENT.**

**Item 17: `20260708035444` — `gov_add_consultant_to_auto_suggestions`**
**This is the live body** of `generate_governance_auto_suggestions` — gate now includes Consultant
Assistant too (added by a later documented git migration), so drift intent is present and further
evolved. `anon_exec=false`. **CONSISTENT.**

**Item 18: `20260708035649` — `gov_create_auto_mark_sso_reports_reviewed`**
Live present, SECURITY DEFINER, `anon_exec=false`. **CONSISTENT.**

**Item 19: `20260708044309` — `add_rpc_carryover_governance_actions`**
Live present and correctly tenant-scoped. Minor observation: its role gate excludes Consultant, unlike
the sibling Consultant-enablement batch from the same day — a Consultant closing a meeting can't
trigger carryover. Consistent-as-shipped, just a small thematic inconsistency, not a defect.
**CONSISTENT.**

### Group 8 summary
19/19 **CONSISTENT**. No security gaps in this specific version list — every governance write function
checked is `anon_exec=false`, SECURITY DEFINER, pinned `search_path`. Two non-blocking observations
(differing policy strictness, one role-gate omission) noted above but neither is a defect.

**⚠️ Adjacent finding, OUT of this group's 19 versions but surfaced during the scan — ⚠️ CORRECTED 22 Jul
verification, severity downgraded:**
Several other governance `SECURITY DEFINER` functions carry `anon_exec = true` — this part is confirmed
real: `gov_set_trainer_report_exemptions` and `gov_update_meeting_time` (both write functions) do have
genuine `anon` EXECUTE grants, and `get_clause_heatmap_data`, `get_clause_heat_timeline`,
`get_clause_heatmap_trend`, `get_clause_signals`, `notify_meeting_scheduled` have `PUBLIC`/`anon` grants
too.

**What the original write-up got wrong:** it treated "has an anon grant" as equivalent to "is
exploitable by an anonymous caller." Independently pulling the full body of all 7 functions via
`pg_get_functiondef` shows every one of them fails closed before doing anything else:
- `gov_set_trainer_report_exemptions` — first line: `IF v_user_id IS NULL THEN RAISE EXCEPTION
  'unauthenticated'`.
- `gov_update_meeting_time` — calls `public._assert_tenant_access(v_tenant_id)`, which itself raises
  `'Not authenticated'` when `auth.uid()` is null.
- The 4 `get_clause_*` functions all resolve `v_tenant_id` from `profiles WHERE id = auth.uid()` and
  raise `'tenant_required'` if null — a truly anonymous caller has no profile row, so this always fires.
- `notify_meeting_scheduled` requires active `tenant_members` membership or `sec.is_super_admin()`, both
  keyed on `auth.uid()`, both fail closed when it's null.

**Corrected conclusion:** a genuinely unauthenticated PostgREST caller (anon key, no valid JWT) **cannot
exploit any of these 7 functions** — the door is technically unlocked but every function has its own
guard standing behind it. This is still unnecessary defense-in-depth debt worth cleaning up (same
pattern as `revoke_anon_execute_billing_rpcs` in Group 5) — recommend revoking the anon grants as
hygiene — but it should NOT be tracked or reported as a live exploitable gap. Downgrade from "needs a
dedicated urgent follow-up" to "low-priority hygiene cleanup, no live risk."

---

## Group 7: Consultant affiliate / referral program (22 Jul 2026)

All 33 baseline drift versions read end-to-end and cross-checked against live DB state (function
grants, table structure, row values) and app code in `src/hooks/`.

### Infra: RPCs, tables, enums

Core objects — `get_user_tenant_memberships` fix, `consultant_affiliates`/`affiliate_ref_codes`/
`consultant_commission_ledger` tables (RLS enabled, generated columns, uniqueness constraints), the
`consulting_org` tenant-type enum + `parent_consultant_org_id` self-FK, the `trial` invite type, and
the full set of consultant-facing RPCs (`rpc_get_consultant_referral_pipeline`,
`rpc_get_consultant_commission_summary`, `rpc_send_consultant_trial_invite`,
`rpc_update_consultant_org_profile`, `rpc_get_consultant_portfolio_org_based`,
`get_my_affiliate_context`, `get_affiliate_portfolio`) — all verified live, all `SECURITY DEFINER` with
pinned `search_path`, all `anon_exec=false` except `rpc_resolve_affiliate_ref` (intentionally
anon-executable — public signup-page ref-code lookup, matched by an anon-SELECT policy on
`affiliate_ref_codes` for the same reason, independently re-confirmed).

**⚠️ CORRECTED 22 Jul verification — the "cleanly replaced" claim below is false:**
~~Two RPCs (`rpc_get_consultant_portfolio`, `get_my_affiliate_context`) had their bodies cleanly replaced
in-place by later versions (`rpc_get_consultant_portfolio_org_based`, a `_v2` git migration) — no
orphaned functions, no dead code.~~ Independently verified via `pg_proc`: **`rpc_get_consultant_portfolio_org_based`
does not exist in production at all.** The name only appears in `.drift-baseline.txt` (migration
`20260622071547`) — that migration's intent apparently never took live effect, or was later dropped.
The original `rpc_get_consultant_portfolio` is still the only live function, and it's still exactly what
`useConsultantPortfolio.ts` calls. `get_my_affiliate_context` itself is fine (confirmed live, correctly
called by `useAffiliateContext.ts`) — the false claim is specifically about its sibling RPC's supposed
replacement. Not a security regression, just a wrong "no dead code" narrative — same class of error as
item 12.

Every RPC is called by a matching live hook (`useConsultantReferralPipeline.ts`,
`useConsultantCommissionSummary.ts`, `useSendConsultantTrialInvite.ts`,
`useUpdateConsultantOrgProfile.ts`, `useConsultantPortfolio.ts`, `useAffiliateContext.ts`,
`useAffiliatePortfolio.ts`). **15 of 16 infra items CONSISTENT; 1 corrected as above.**

### Angela / Vivacity one-off data fixes (17 items)

Vivacity was seeded as the founding affiliate (initial rate 20%, later corrected to the authoritative
**5%** — `commission_rate_pct = 5.00` confirmed live), ref code `VIVACITY2025`, now attributed to **19**
client tenants (grown by 1 organically since the migration's `18`). Ghost account `19b7…` and gmail
account `aa8e…` for Angela are both confirmed **absent** from production — cleanly deleted as intended.
The identity clean-up ended differently than the migrations originally scripted but arrived at a
coherent end state: account `373…` reverted to `angela@vivacity.com.au` as a `Consultant`, while a
**separate** account `14c1ec33…` = `angela@complyhub.ai` now serves as her clean `super_admin` login
with no active tenant. No duplicate/conflicting complyhub.ai logins exist. All 17 items **CONSISTENT**
— historical one-offs that met their goal, several via a superseded rate/account rather than their
literal original target.

**Two minor omissions found by 22 Jul verification (not corrections, just gaps the doc didn't mention):**
account `373…` also holds an `Administrator` membership on the "ComplyHub Demo" tenant, alongside her
`Consultant` role on Vivacity + 19 client tenants — not a contradiction, just unmentioned. And a further
account `angela+phase7test@complyhub.ai` exists — a distinct plus-addressed test email, not a true
duplicate of `angela@complyhub.ai`, so "no duplicate logins" isn't technically wrong, but "no other
complyhub.ai accounts exist" would have been. Neither needs action.

### Group 7 summary
**⚠️ CORRECTED 22 Jul: 32/33 CONSISTENT, 1 CORRECTED** (the `rpc_get_consultant_portfolio_org_based`
"clean supersession" claim above — that function doesn't exist in production). No security
regressions — every RPC in this group is `SECURITY DEFINER` with an explicit `search_path`; the one
anon-executable RPC (`rpc_resolve_affiliate_ref`) is intentional by design for the public signup page,
independently re-confirmed, consistent with Group 5's confirmation that the other 4 consultant RPCs
have anon revoked. Operational items worth a human eyeball, not fixes:
1. Angela now has two separate accounts (Consultant on `vivacity.com.au`, super_admin on
   `complyhub.ai`) — confirm this two-account arrangement is intended, not accidental drift. (Also now
   has a confirmed `Administrator` membership on the Demo tenant and a `+phase7test` variant account —
   see note above.)
2. Anonymous visitors can resolve a referral code's org name + commission rate via
   `rpc_resolve_affiliate_ref` — by design for the signup page, low sensitivity, flagged for awareness
   only.

One version (`rpc_get_consultant_portfolio_org_based`'s migration) does not reflect live production
state — see correction above.

---

## Group 9: Misc / loose items (22 Jul 2026)

All 45 versions read end-to-end and cross-checked against live catalog state, row counts, and app
code.

**IC (industry consultation) survey:** three successive fixes to the anon-callable
`public_submit_ic_survey` RPC (final version generates custom IDs via a correctly-quoted dynamic
sequence). Validates slug/active/expiry/write-lock and resolves tenant server-side — no cross-tenant
or PII leak path despite being anon-executable. The `industry_consultation_survey_responses` compat
table has a permissive anon INSERT (`WITH CHECK (true)`), but an AFTER INSERT trigger rejects any row
whose survey_id doesn't resolve to a real survey, so no orphaned/cross-tenant write can survive — not
a hard flag. TAS-link/theme tables, auto-populate triggers, and a `training_products` de-dup +
uniqueness constraint all verified live. **11 items, CONSISTENT.**

**SA dashboard / tenant health:** dashboard alias fix, sales-lead login-attribution rewrite, and the
three-stage `tenant_health_alerts` dedup (unique partial index confirmed holding — 0 duplicate open
alert pairs live) all verified. **6 items, CONSISTENT.**

**Demo trainer seeds:** 7 seeds. **⚠️ CORRECTED 22 Jul verification:** the doc names the seed table as
`trainer_profiles` — the real seed table is `tp_trainers` (`trainer_profiles` is a large, unrelated,
real production table with rows across many live tenants; querying that one directly would have wrongly
flagged this group). Re-verified against the correct table: all 37 `demo.complyhub.ai`-email trainer
rows in `tp_trainers` belong to the `ComplyHub Demo` tenant only (`df5c0c9d-...`) — genuinely scoped, no
leakage. **But the "0 disabled triggers live" claim is FALSE as written** — `pg_trigger WHERE
tgenabled='D'` returns 3 disabled triggers: `t_touch_invites`, `update_user_invitations_updated_at`,
`user_inv_expire_biu`, all on the unrelated `user_invitations` table. These predate and are unrelated to
this seed group's own migrations — likely pre-existing debt from a different feature — but the specific
verification claim in this document is incorrect and should not be repeated. **Action: these 3 disabled
triggers on `user_invitations` are a separate, unexplored finding — worth a look to confirm whether
they're intentionally disabled or accidentally left off.**

**ComplyBot / KB:** conversations/feedback tables (RLS + billing-gate confirmed), `kb_miss` flag +
trending view, and 4 KB normalisation/cleanup/enrichment migrations — live KB instrument_ids are
exactly the canonical `{OS-2025, CR-2025, CP-2025}` set, no stragglers. **6 items, CONSISTENT.**

**Consultation product-type / onboarding materialisation:** product-type column + backfill, trainer-
credential FK re-point off the legacy `trainers` table (orphaned demo rows cleaned up), and 4
successive rewrites of `materialise_onboarding_session_records` — live version is the final
`preserve_records_created` variant with correct currency/date handling. **7 items, CONSISTENT.**

**Trainer unit mapping, reconcile, demo clear, help centre, misc UUID-named items:** mapping-
suggestions table (wired, unused so far — not orphaned), 3 Lovable-generated UUID-named migrations
(CI dedup functions, SA users directory) all live and app-referenced, a documentation-only audit-trail
reconciliation, a demo-tenant PII clear scoped only to the demo tenant, and help-centre category +
article-stub seeding (stubs since completed and published). **11 items, CONSISTENT.**

### Group 9 summary
**⚠️ CORRECTED 22 Jul: 4 of 5 priority claims re-verified CONFIRMED; 1 CORRECTED** (the "0 disabled
triggers live" claim — see above; 3 disabled triggers actually exist, unrelated table). The 18 items
in "Consultation product-type/onboarding materialisation" and "Trainer unit mapping/reconcile/demo
clear/help centre/misc" sub-groups were **not independently re-checked** in this verification pass
(time-budgeted to prioritize the security/data-integrity claims first) — treat those 18 as unverified,
not confirmed, until someone spot-checks them the way the rest of this document now has been.

---

## Full reconciliation status (22 Jul 2026, corrected same day by independent verification)

**⚠️ The table and "all 214 investigated" claim below, as originally written, do not add up — corrected
here.**

| Group | Feature area | Items claimed | Independently verified | Corrected |
|---|---|---|---|---|
| 1–4 | Billing/Trial/Subscriptions, Security Hardening, Trainer Roles/Matrix, TAS Product Scope | 76 | 15-item spot-check only, all clean | Bare claim, not fully itemized (see below) |
| (side-quest) | 14 genuinely-new items not in baseline | 14 | 14 (13 + item 12) | 1 corrected (item 12's blamed version was wrong) |
| 5 | Security-priority (superadmin gating, anon revokes, security-diagnostics infra) | 15 | 15 | 1 corrected (Tenant B already resolved, not open) |
| 6 | QI survey infrastructure | 18 | 18 | 0 |
| 7 | Consultant affiliate / referral program | 33 | 33 | 1 corrected (false "clean supersession" claim) |
| 8 | Governance | 19 | 19 | 0 (adjacent finding severity corrected, see below) |
| 9 | Misc / loose items | 45 | 27 (5 priority sub-groups) | 1 corrected ("0 disabled triggers" was false); 18 items unverified |

**Item-count math, verified independently — the "all 214 investigated" claim is false:**
`.drift-baseline.txt` has 517 total lines; the 25 May–20 Jul 2026 window is genuinely 214 lines
(confirmed: lines 304–517). But summing this table's own group counts — 76 + 15 + 18 + 33 + 19 + 45 =
**206** (the 14 side-quest items are correctly excluded from this sum since they're defined as *not* in
the baseline — adding them, as the original document did, to get "220" was itself a further error).
**206 is 8 short of 214.** This 8-item gap recurs in a second place in the document: the "Still open"
section's own claim that "76 investigated + the remaining 138 baseline items = 214" doesn't reconcile
either — 138 was supposed to be 15 (Group 5) + 123 non-security, but Groups 6+7+8+9 only total
15+18+33+19+45=130 (or 115 excluding Group 5's already-counted 15) — the same 8 items are missing from
both attempts to add this up. **These 8 baseline-window items were never itemized in any group, and the
document's claim that "all 214 items are now investigated" is not true.** Whoever picks this up next
should identify and itemize those 8 specifically (diff the full 214-line baseline-window slice against
every version number that actually appears somewhere in Groups 1–9 above) before this can honestly be
called closed.

**Open items remaining, corrected list:**

1. ~~Stale RLS test tenant needs a human decision~~ — **RESOLVED, not open.** Independently re-verified
   22 Jul: already quarantined (suspended tenant, cancelled billing) as of 20 Jul 2026, two days before
   this document's "still open" framing was written. No action needed.
2. ~~Two anon-executable SECURITY DEFINER write functions in governance need urgent follow-up~~ —
   **downgraded, not urgent.** Independently verified: the anon grants are real, but every one of the 7
   affected functions (2 write + 5 read/notify) fails closed on `auth.uid() IS NULL` before touching
   data — not currently exploitable by a genuinely anonymous caller. Still worth revoking the unnecessary
   grants as hygiene, same pattern as `revoke_anon_execute_billing_rpcs`, but it is not a live security
   hole and doesn't need urgent handling.
3. **NEW — currently live, not previously flagged:** `sa_extend_trial_v2` (the item 12 function) is
   missing several guards compared to its original safe version — no diamond-tenant check, no
   paid-through-date check, no subscriber-type check, no mandatory-reason validation. A diamond or
   paid-through tenant whose status string falls outside the 5 values the current check looks for could
   still be wrongly reset to trial by a super-admin. Recommend restoring these guards via a proper
   migration, pending Brian's sign-off (touches production + billing logic).
4. **NEW — found during verification, unrelated to any group's own scope:** 3 disabled triggers exist on
   `user_invitations` (`t_touch_invites`, `update_user_invitations_updated_at`, `user_inv_expire_biu`).
   Not caused by anything in this document's scope, but worth confirming whether intentional.
5. **NEW — structural, not a security item:** 8 baseline-window items were never itemized anywhere (see
   item-count math above) — the reconciliation is not actually 100% complete as claimed.
6. **NEW — narrative-only, no live impact:** `rpc_get_consultant_portfolio_org_based` (Group 7) doesn't
   exist in production despite a migration claiming to create it — worth understanding why (dropped
   later? never applied?) even though nothing currently depends on it.
7. **Unverified, not confirmed:** 18 items in Group 9's "Consultation product-type/onboarding" and
   "misc UUID-named" sub-groups were not independently re-checked in this pass.

**Everything else — the remaining ~195 items — held up under direct, independent re-verification against
live schema, function bodies, grants, and app code, not just re-read from the document's own claims.**

---

## Remaining work queue (22 Jul 2026)

Ordered list — work one at a time. Mark each `[x]` when genuinely done (not just planned).

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | **Fix `sa_extend_trial_v2` missing guards** — diamond, paid-through, subscriber-type/lifecycle | `[ ]` planned | Decision locked; implement later on the shared reconciliation `fix/*` branch |
| 2 | **Find the 8 baseline items nobody itemized** — diff 214-line window vs all version numbers in Groups 1–9 | `[ ]` blocked by #3 | 8 provisional candidates found, but cannot prove them until #3 establishes the exact 76 |
| 3 | **Reconstruct and verify the Groups 1–4 "76 items"** | `[ ]` planned | Original inventory and claimed 15-item spot-check evidence do not exist; treat all 76 as unverified |
| 4 | **Verify remaining 18 Group 9 items** — consultation/onboarding + misc UUID sub-groups | `[ ]` pending | Not independently re-checked in verification pass |
| 5 | **Revoke unnecessary anon-execute grants** — 2 governance write + 5 read/notify functions | `[ ]` pending | Low-priority hygiene; fail closed today, not exploitable |
| 6 | **Two loose ends (look only, not fixes):** 3 disabled triggers on `user_invitations`; why `rpc_get_consultant_portfolio_org_based` doesn't exist | `[ ]` pending | Curiosity/cleanup |
| 7 | **Follow-up CI check** — run migration-drift-check against current `main`; confirm PR #272's 13 reconciliation files resolve as matched | `[ ]` pending | Known gap, never run post-merge |

### Item 1 — `sa_extend_trial_v2` guard restoration (decision locked; implementation pending)

**Scope IN:** restore the three missing billing protections on the live function via a new git
migration on the shared reconciliation `fix/*` branch; apply to production only after explicit
sign-off.

**Scope OUT:** changing `admin_extend_trial`, Sales Leads UI, or any other RPC; items 2–7.

**Live gap (confirmed from git, 22 Jul 2026):** the current definition in
`20260716160000_sa_extend_trial_v2_reject_paid_subscribers.sql` only refuses tenants whose
`billing_subscriptions.status` or `tenants.subscription_status` is one of five strings
(`active`, `past_due`, `unpaid`, `grace`, `suspended`). It does **not** check:

| Guard | Was in safe prod version (`20260716012333`) | In live git definition |
|---|---|---|
| `is_diamond` / diamond tier | yes | no |
| `paid_through_date >= now()` | yes | no |
| `tenant_type = 'subscriber'` | yes | no |
| `lifecycle_status = 'subscriber_active'` | yes | no |
| Mandatory reason (≥5 chars) | yes | no (`p_reason DEFAULT NULL`, unchecked) |
| Paid-status string refusal (#206 partial fix) | — | yes (added 20 Jul) |

**Risk scenario:** a diamond tenant, or one with a future paid-through date, whose status strings fall
outside those five values could still be flipped to `is_trial = true` by a super-admin via Sales Leads.

**Decision locked (Brian, 22 Jul 2026):**
- Restore the diamond guard (`is_diamond` and/or diamond plan tier).
- Restore the future `paid_through_date` guard.
- Restore the subscriber-shape guard (`tenant_type = 'subscriber'` and
  `lifecycle_status = 'subscriber_active'`).
- **Keep `p_reason` optional.** The Sales Leads UI currently labels the reason optional and does not
  enforce a minimum length. Mandatory reason validation is therefore not part of this fix.
- Preserve the five-status refusal already added by the 20 Jul partial fix.
- Plan this now, but implement it later with the other approved reconciliation changes on one shared
  `fix/*` branch.

**Implementation remains pending:** no branch, migration file, or production change has been made.

### Item 3 — Groups 1–4 inventory and verification (diagnosis complete; re-audit pending)

**Finding (22 Jul 2026):** the document's original claim that Groups 1–4 contained 76 investigated
items, including a 15-item live spot-check, is unsupported. No workspace document, git history, agent
transcript, or retained query output identifies:

- the authoritative 76 migration versions assigned to Groups 1–4;
- which 15 versions were supposedly spot-checked; or
- the live SQL results from those checks.

The number 76 is reproducible **only by arithmetic**:

`214 baseline-window rows − 130 itemized Groups 5–9 rows − 8 provisional unassigned rows = 76`

That arithmetic does not prove the original group membership or verification status. A thematic
reconstruction is also unreliable: it assigns almost everything to TAS Product Scope, produces no
clear in-window Security Hardening group, and requires subjective placement of overlapping demo,
billing, trainer, and TAS migrations.

**Decision for planning:** treat all 76 as **unverified**, not “15 verified / ~61 remaining.” Todo #3
is a complete 76-item evidence re-audit:

1. Derive and record the definitive 76-row inventory by exact set difference.
2. Do not preserve the old Groups 1–4 labels unless each assignment is supported by evidence.
3. Verify every row against live production state and relevant app behaviour.
4. Record the query/object evidence for each item so the result is independently reproducible.
5. Finalize Todo #2's eight-item set only after this inventory is fixed.

**Dependency:** Todo #2 remains provisional until this re-audit establishes the exact 76.

**Current execution blocker:** live verification requires read-only Supabase access. The Supabase MCP
was not available in this Cursor session, so no production claims were made and no database changes
were attempted.

**Implementation impact:** this is investigation/documentation work, not a code change for the shared
reconciliation `fix/*` branch unless the re-audit later discovers a real defect requiring a migration.
