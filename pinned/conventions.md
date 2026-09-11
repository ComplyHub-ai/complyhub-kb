> **Last updated:** 7 Sep 2026 · **Reconsider by:** 7 Mar 2027 · **Confidence:** medium — RLS and Edge function sections added from production incident; other sections still scaffold.

# System Design — Conventions & Patterns

## Scope of these conventions

## Multi-tenant model

## RLS (Row Level Security)

RLS is the primary access control layer for all `public` schema tables. It works reliably for PostgREST queries (data reads and writes via the JS SDK).

**RLS on Supabase Storage is different and less reliable from the browser.** The storage server has its own internal tables (`storage.buckets`, `storage.buckets_analytics`, `storage.s3_multipart_uploads`, etc.) that have RLS enabled but are owned by Supabase — you cannot add policies to some of them without support involvement. The SDK's endpoint routing also changes across minor versions without notice, which means a correct `storage.objects` RLS policy can still produce 400 errors from the browser.

**Rule:** If a private bucket Storage operation fails from the browser after one RLS fix attempt, pivot to the Edge Function gateway pattern rather than adding more policies. See `patterns/storage-gateway.md` for the full pattern and `supabase/functions/document-file-manager/` as the reference implementation.

**Diagnostic shortcut:** A working `/object/list/{bucket}` does not prove that download will work — list uses a different internal code path. Do not treat listing success as RLS proof.

## Edge functions

Edge Functions run as Deno on Supabase infrastructure. They have access to `SUPABASE_SERVICE_ROLE_KEY` via `Deno.env.get()`, which bypasses all RLS.

**Storage gateway pattern:** All private bucket operations that have proven fragile from the browser are routed through an Edge Function. The function verifies the caller's JWT, checks tenant membership via the admin client, then performs Storage I/O as service role.

Reference implementations in the codebase:

| Function | Bucket | Frontend gateway |
|---|---|---|
| `supabase/functions/document-file-manager/` | `documents` | `src/lib/documentFiles.ts` |
| `supabase/functions/register-evidence-manager/` | `trainer-evidence` | `src/lib/storage/trainerEvidenceDownload.ts` |

When adding a new private bucket, default to this pattern from the start. See `patterns/storage-gateway.md` for the full write-up.

## Frontend patterns

## Database conventions

> Content below moved from `CLAUDE.local.md` (10 July 2026) — unchanged from the original.

### Branch DB workflow (effective 30 June 2026)

**Migration branch flow (sequential — do not skip or reorder):**
1. Write the `.sql` migration file on the branch
2. Commit → push → open PR against `main`
3. Supabase detects the new migration file and automatically creates a branch DB, runs all migrations against it
4. Confirm branch DB shows no `MIGRATIONS_FAILED` before doing any QA
5. QA is done against the branch DB (not production)
6. Merge the PR to `main` — the `Apply Supabase Migrations` GitHub Actions workflow applies the migration to production automatically within minutes (fixed 4 Sep 2026, hardened 7 Sep 2026 — see below). No manual step needed.
7. **Never** use MCP `apply_migration` for this — it does not respect the migration file's version and creates a git/production ledger mismatch. A manual apply also just races the automated workflow.
8. Verify the DB object changed in production (the workflow's log confirms the apply, but re-checking the live object is still good practice)

**Non-migration branch flow:** no branch DB is created — QA runs against production DB, no manual apply step needed after merge.

**Key rules:**
- Merging to `main` auto-applies migrations to production via the `Apply Supabase Migrations` GitHub Actions workflow — no manual step
- Never do production QA for migration branches — always use the branch DB
- Never hand-apply a migration after merge (races the automated workflow); if the workflow fails, fix the underlying cause and re-run it rather than applying by hand

### Migration discipline — preventing drift (effective 26 June 2026; apply step automated 4 Sep 2026)

The repo and the production database are independent. Merging to `main` only updates files. Applying to production used to require a separate manual step; as of 4 Sep 2026 it's automatic (see below).

**The canonical rule (locked 28 Aug 2026, workspace `CLAUDE.md`):**

> A migration may only be deployed to production once its `.sql` file is merged into `main`.
> Write the file on a branch → open a PR → let the branch-DB check pass → merge → then it deploys.
> No dashboard SQL Editor against production, no MCP/AI-tool schema changes against production, no
> `apply_migration` for anything that already exists as a file.

Angela and RJ retain direct production access — this is enforced by detection (the drift-check CI job),
not by revoking permissions. An auto-reconciliation bot was proposed to strengthen this further but was
discarded 7 Sep 2026 (Brian) — not being built. Full reasoning and the whole squash/hardening project:
`complyhub-kb/audit/2026-09-07_migration-drift-remediation.md`.

**The only safe flow:**
1. Write the `.sql` file on a branch
2. Push → branch DB confirms green (no `MIGRATIONS_FAILED`)
3. Merge PR to `main`
4. Production apply happens automatically via the `Apply Supabase Migrations` GitHub Actions workflow within minutes — do NOT use MCP `apply_migration` to do this manually, it does not respect the file's version and creates a ledger mismatch
5. Verify the DB object changed in production

**If anyone applies directly to production:** write a reconciliation migration capturing the exact change. Merge it before any new branch work touches that schema area. This is what happened with Angela's 26 June fixes — failure to do this caused branch DB failures across the whole PR.

**Reconciliation file naming — must match the original production version, not today's date (effective 14 July 2026):** `migration-drift-check.yml` matches production `schema_migrations` rows to git files by exact `version` + `name` string identity — not by SQL content. Query `supabase_migrations.schema_migrations` for the row's real `version` and `name`, then name the reconciliation file `supabase/migrations/<that version>_<that name>.sql` — e.g. a prod row `version=20260712031504, name=batch04a_restrict_select_sensitive_role_filtered_tables` becomes `supabase/migrations/20260712031504_batch04a_restrict_select_sensitive_role_filtered_tables.sql`, verbatim SQL from `.statements`.

Do **not** timestamp the file with the date you're doing the reconciliation and do **not** prefix the name with `reconcile_`/similar — either one breaks the exact-match and the drift check keeps flagging the row as unresolved even though the SQL is now captured in git. (This is exactly what happened with the 13 July 2026 `Reconcile Angela's 12 Jul security remediation batches` commit — 11 files were written as `20260713100000+_reconcile_*`, using the commit date instead of the original version, so all 11 still show as drift today.) Backdating the filename to the true original version is safe — `supabase db push` and branch-DB creation treat a file whose version is already recorded as applied and skip re-running it; on a *fresh* branch DB (where that version doesn't exist yet) it correctly runs for the first time, which is the whole point.

**Branch DB + seed.sql:** Branch DBs run: baseline → migrations → `seed.sql`. The `seed.sql` is live and configured in `config.toml` under `[db.seed]`. It uses hardcoded tenant UUIDs so QA accounts exist on every branch DB. If a migration adds a column that `seed.sql` references and the baseline doesn't have it, the seed step fails. Always check `seed.sql` when adding columns to seeded tables.

### Schema drift — Lovable legacy — ✅ RECONCILED 4 Sep 2026

Before June 2026, Lovable applied database changes directly to the production DB without creating migration files. This left thousands of migration version records in production (measured at 3,608 in June, ~4,600 by end of August as more accumulated) with no corresponding `.sql` files in the repo. Branch DBs hit `MIGRATIONS_FAILED` because they start fresh and can't find those versions. Lovable is no longer in use — all migrations now go through files + branch DB testing.

**Resolved 4 Sep 2026.** The ledger was reconciled to exactly match the repo's files, then ~1,050 superseded migration files were squashed into a fresh 20-slice baseline dump (`supabase/migrations/2026090403…_baseline_01.sql` through `..._baseline_20.sql`). `supabase db push` now reports the remote database up to date, and the automated apply workflow has passed on every merge since (confirmed 8+ consecutive successes, 6–7 Sep 2026). Full history: `complyhub-kb/audit/2026-09-07_migration-drift-remediation.md`.

**Known drift fixed:** Migration `20260624000100_gap_fill_tenants_schema_drift.sql` adds 10 columns to `public.tenants` that were applied directly to production via Lovable and were missing from the baseline: `cricos_provider_code`, `lms_name`, `llnd_provider`, `llnd_assessment_instrument`, `english_evidence_policy` (jsonb), `acsf_defaults` (jsonb), `delivery_sites` (jsonb), `funding_streams` (text[]), `trainer_pd_review_cadence`, `parent_consultant_org_id` (uuid).

**Rule going forward:** If a branch DB migration fails with `column X does not exist`, check whether that column exists in production but has no migration file. If so, add a gap-fill migration (`ADD COLUMN IF NOT EXISTS`) before the failing migration and document it in `supabase/migrations/CLAUDE.md`.

### Baseline-first migration rule (effective 01 July 2026)

When a DB change is needed and the situation supports it, prefer editing the baseline (`supabase/migrations/00000000000000_baseline.sql`) over creating a new migration file. Use judgement:

**Edit the baseline when:** the column/object doesn't exist anywhere yet; the change is purely additive with no risk of conflicting with existing migration files; the table's `CREATE TABLE` already exists in the baseline; no existing migration file creates or references the same object.

**Create a new migration file when:** the object already exists in production (baseline won't re-run against production, so an `ALTER TABLE` still needs manual apply); the change modifies an existing baseline object; the baseline doesn't contain a `CREATE TABLE` for the affected table (Lovable-era drift); risk of conflict with another migration in the chain is high.

**Key caveat, corrected 7 Sep 2026:** this note used to say production requires a separate manual `apply_migration` step after merge — that is now wrong and must not be followed. As of 4 Sep 2026 (hardened 7 Sep 2026, PR 5) the `Apply Supabase Migrations` GitHub Actions workflow applies any pending migration automatically within minutes of merging to `main`, atomically with the ledger stamp. **Never use MCP `apply_migration` for a file that already exists in `supabase/migrations/`** — it does not respect the filename's version and creates a git/production ledger mismatch; it's fine only for one-off exploratory SQL with no corresponding file. Full detail: `supabase/migrations/CLAUDE.md` § "✅ Migration apply — fully automated".

**Watch for redundancies:** before adding anything to the baseline, check whether an existing migration file already handles it.

### `CREATE OR REPLACE` on an existing object — check git history first, not just the baseline (effective 29 Jul 2026)

The baseline-first rule above is about *creating* new objects. Replacing an *existing* function or view
is the opposite risk: `00000000000000_baseline.sql` is a point-in-time snapshot, and any migration
merged after it was generated won't be reflected there. Copying a function/view body straight from the
baseline and issuing `CREATE OR REPLACE` silently reverts every change made to that object since —
there's no error at write time or at apply time, because it's valid SQL that just does the wrong thing.

**Before writing any `CREATE OR REPLACE FUNCTION`/`VIEW` migration, use a content search, not a
filename search (corrected 7 Sep 2026):**
```bash
git log --oneline -S "<object_name>" -- supabase/migrations/*.sql
```
**Do not use `git log -- 'supabase/migrations/*<object_name>*'` (filename-pattern search) for this
check — it misses batch migrations.** Many migrations are named after the ticket/incident, not the
function(s) they touch (e.g. `fix_critical_suggestion_qi_rpcs.sql` touches five differently-named
functions) — a filename search on any of those five functions returns nothing even though that file
is the true most recent version. `-S "<string>"` searches the actual diff content of every commit and
finds it regardless of filename. Confirmed 30 Jul 2026 (PR #329): a filename search for
`mark_suggestion_viewed` returned no hits, silently reverting a fix already shipped in
`20260624180000_fix_critical_suggestion_qi_rpcs.sql`.

If any hits exist, read the **most recent** one and base the new migration's body on that file's
current definition — never on the baseline directly.

**Incident:** 29 Jul 2026 — a migration meant only to add `RAISE WARNING` logging to
`rpc_get_tas_build_state`'s exception handlers was drafted from the baseline copy of the function. Two
later migrations already merged to `main` had changed it: `20260717061109` added
`resources_ready`/`resources_checks` fields (and three more exception-wrapped checks), and
`20260723143058` fixed a production outage (a `jsonb_build_object` call had grown past Postgres's
100-argument limit), added a `sec.claim_tenant_id()` tenant-access guard, and renamed `qual_code` to
`training_product_code`. Replacing against the baseline would have reverted all three — reintroducing
the outage and dropping the tenant-access check — while adding logging that looked correct on its own.
Caught by `ci-gate`'s pre-push gate (formerly named `cichecker`), but only after the (wrong) migration had already been committed
and pushed once. Doing the git-log check while *authoring* the file, not just before pushing, avoids the
wasted round trip.

### Migration idempotency — every CREATE must be safe to run twice (effective 16 Jul 2026; CI-enforced 7 Sep 2026)

**Now a blocking CI check, not just a convention.** `ci.yml`'s `migration-guards` job flags any new migration with a bare `CREATE TABLE`/`CREATE INDEX`/`CREATE UNIQUE INDEX` (no `IF NOT EXISTS`), a `CREATE POLICY` with no matching `DROP POLICY IF EXISTS`, or a `CREATE TYPE` with no `pg_type` existence guard. This landed alongside making the production apply workflow's migrate-and-stamp step atomic (PR 5) — since apply is now fully automatic on merge, a non-idempotent file that fails partway can no longer be safely hand-retried the way it used to be.

Before finishing any migration file that does `DROP X IF EXISTS <name>` then `CREATE X <name>`, check that the name being dropped and the name being created are the SAME name — not "drop the old live name, create a differently-named new thing." If they differ, a second run of the same file (or any other file creating that same new name) hits a collision and the whole migration chain halts.

**Incident:** `20260716180000_qi_asqa_narrative_restrict_write_policies_actual_names.sql` correctly dropped the real live policy names (`tenant_insert`/`tenant_update`) but then created *new* policies under different names copied verbatim from an earlier broken file. Cursor Bugbot caught it post-merge as High Severity — a branch DB rebuild or any other PR touching the table would hit `CREATE POLICY` on an existing name and fail. Root cause: verifying correctness against **current live state only**, not **resilience against re-runs**.

**How to apply:** For every `CREATE POLICY`/`CREATE FUNCTION`/`CREATE TABLE` in a new migration, trace the exact name string through: what does `DROP ... IF EXISTS` target, and does the following `CREATE ...` use that *same* string? If reconciling/replacing an earlier broken migration, don't copy its new-object name verbatim — verify it doesn't already exist from a prior partial run, and drop it by that name too. Before considering a migration file done, ask: "if this ran twice in a row right now, would the second run succeed?"

### Migration archive — never read

`supabase/migrations/_archive/` contains 3,600+ historical Lovable-era files. They do not run. Never read, grep, or reference them when diagnosing migration failures. When investigating any migration issue, only look at files directly in `supabase/migrations/` (not subdirectories). Always verify the actual file before drawing conclusions — do not rely on memory about what migrations exist.

### Unit tests — default expectation for logic changes (effective 03 July 2026)

When making a bug fix, feature addition, or any code change on a branch in `rto-compass-hub` that involves real logic (mutations, hooks, conditional behaviour), write or update a unit test alongside it — not just run the existing suite passively. The test must specifically prove the change works and would fail if the fix were reverted, not just re-assert existing behaviour.

**Add a test when:** fixing a bug in logic (mutation, hook, race condition, conditional branch); adding a new feature with real behaviour to verify.

**Don't force a test when:** the change is pure UI text/wording; the change is a database migration or RLS policy widening (verified by the branch DB check instead — mocked Supabase calls can't catch a real RLS rejection); the change is config-only.

**Know the limits:** unit tests here run against a *mocked* Supabase client — no real database, no real RLS. A test can pass 100% clean while a real permission check would still reject the request in production (this happened with a Governing Person RLS gap that no unit test could have caught — only the branch database check surfaced it). Mocks are maintenance debt — when a query chain's shape changes, tests mocking that chain need updating too.

**Mechanics:** before pushing, run the relevant test file(s) locally (`npx vitest run <path>`) in addition to `npm run type-check` and `npm run lint`. Watch for `html/` collateral damage — Vitest's HTML report generator can overwrite the app's real build output directory; always run `git status` after tests and discard any accidental `html/*` changes before staging/committing.

**Explicitly out of scope for now:** Playwright/end-to-end browser tests — come later as part of a dedicated QA protocol.

### Invitation RPC and delivery checklist

For Super Admin invitation changes, verify all of the following before merge:

- `user_invitations.full_name` is generated; write only `first_name` and `last_name`.
- Membership checks use `tenant_members` with `status = 'active'`, not the legacy
  `organization_members` compatibility view.
- `SECURITY DEFINER` RPCs explicitly revoke `PUBLIC` and `anon`, then grant only the intended
  authenticated or service roles.
- The client calls the canonical `send-invite` Edge Function after the invitation row is created,
  and reports success only after delivery succeeds.
- Generated Supabase types are updated whenever an RPC signature or return shape changes.

If unit-test CI is intentionally omitted for a narrowly scoped PR, record that decision in the
PR/work ledger and still run the relevant unit tests locally before merge; removing a CI job is not
a substitute for validating the changed behavior.

### Pre-push adversarial self-review (effective 14 Jul 2026)

Before pushing any commit to `rto-compass-hub` (and before opening/updating a PR), run a dedicated adversarial self-review of the actual diff — not just `tsc`/`eslint`, which only catch syntax/type issues, not logic bugs. Trace through each changed function's branches by hand, specifically checking:

1. **Status/enum comparisons** — check the real `CHECK` constraint or type definition for the column before writing any `=== 'x'` or `!== 'x'` comparison. Don't pattern-match off nearby existing code — that code is often exactly the bug being fixed. Known multi-state columns: `trainer_monthly_reports.status` (`draft|submitted|reviewed|approved|committed`), `sso_monthly_reports.status` (`draft|submitted|tabled|archived`). Prefer an explicit allow-list of "done" states over a `!== 'draft'` deny-list — a deny-list silently treats any new/synthetic placeholder value as done unless specifically excluded.
2. **Role checks** — roles are stored in both a single `tenant_members.role` column AND a `tenant_members.roles` JSONB array inconsistently across features. Check both whenever gating on a role, not just whichever one the nearest example used.
3. **Timezone assumptions** — ComplyHub is Australia-only (AEST/AEDT). Any date/time construction from user input must explicitly use `Australia/Sydney` (via `luxon`, already a dependency — see `EditMeetingTimeDialog.tsx`), never a bare `new Date(...)` that implicitly uses the browser's local zone.

**Why:** In the 14 Jul 2026 session (governance meeting time fixes, PR #153), three separate Bugbot findings across two review rounds shared this exact root cause — a narrow assumption checked against a richer real domain model, caught reactively instead of proactively.

**How to apply:** After finishing a round of fixes and before every `git push`, re-read the full diff once specifically hunting for these three patterns before considering the round done. In addition to, not instead of, `tsc`/`eslint`/unit tests above.

### Never run `npm run build`

Never run `npm run build` for any reason — verification, pre-push checks, or confirming a fix compiles. It hangs the local workstation. To verify code correctness, run `npm run type-check` (TypeScript) and `npm run lint` (ESLint) instead — both are fast and sufficient for pre-commit verification. The actual build gate is Vercel, which runs automatically after push.

### Existing-data impact check — PR review checklist for forms/mutations/effects (effective added after PR #37)

When reviewing a PR that modifies a form, mutation, or `useEffect` that runs on existing records, explicitly check three things before writing the verdict:

1. **Auto-filter/cleanup effects:** Does any `useEffect` filter or clear form state based on external data (e.g. TAS units, scope records)? Trace what happens when that external query returns empty — does it silently wipe previously saved data? A guard requiring non-empty external data before any wipe is mandatory.
2. **Mutation atomicity:** Does any sync function do delete-then-insert? If the insert fails after delete, what state is left in the DB? Prefer diff-based sync (only delete removed rows, only insert new rows). Rate delete-all-then-insert as MEDIUM severity minimum, not LOW.
3. **Edit pre-population fallback chain:** For edit modals, trace the full fallback chain. If a dedicated hook can fail or return empty, is there a fallback to data already in memory (e.g. from the list query)? If not, flag MEDIUM.

**Why:** PR #37 (assessment-tools multi-select) passed review but had three post-merge Bugbot findings (two HIGH, one MEDIUM) — the review traced the happy path on new records but didn't ask "what happens to existing records when external queries degrade?"

**How to apply:** Any PR touching a form with edit mode, any mutation writing junction-table rows, any `useEffect` filtering saved state against external data.

## New table checklist

## What NOT to do

### Never hardcode service URLs or credentials in source code

Service URLs (Supabase project URL, API base URLs, etc.) and credentials (anon keys, service-role keys, API secrets) must **only** come from environment variables. Never embed them as string literals in source files — even as a fallback.

**Wrong:**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? 'https://your-project.supabase.co';
```

**Right:**
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL is not set');
```

If the env var is missing, surface a clear error rather than silently falling back to a hardcoded value. Hardcoded URLs leak infrastructure details into the public repo and create a false sense of security.

This applies equally to any code written by Claude in Lovable prompts, KB docs, or direct file edits — prompts that end up as committed code are held to the same standard.

### `rto-compass-hub`'s `tsc --noEmit` checks ZERO files — do not trust it as verification

Confirmed 1 Aug 2026 on PR #334. `npx tsc --noEmit` — which is exactly what `npm run type-check`,
`.husky/pre-push`, and CI's "Type check (blocking)" job all run — silently type-checks **nothing**.
Proof: `npx tsc --noEmit --extendedDiagnostics` reports `Files: 0`; appending a blatant
`const x: number = "a string"` to a real file and re-running the command exits 0 with no output.

**Root cause:** the root `tsconfig.json` is a solution-style config (`"files": []` plus
`"references"` to `tsconfig.app.json`/`tsconfig.node.json`). Plain `tsc` only processes the root's
own (empty) file list — it does not expand into referenced projects unless invoked with `tsc --build`.
`git log` shows this has been the config since the "Initial commit from remix" (~26 Feb 2026), so this
has likely been a no-op for as long as the current repo structure has existed — not a recent
regression.

**Real-world consequence:** a genuine compile-time bug (a `const` declared inside a `try` block,
referenced from the sibling `catch` block — a real scope violation) shipped in CB6's bulk
trainer-assignment fix, passed the pre-push hook and would have passed CI's type-check job, and was
only caught by Cursor Bugbot / Vercel bot reviewing the pushed PR.

**Until this is fixed properly (needs a deliberate decision — touches `ci.yml`, `tsconfig.json`, and
the pre-push hook, not a drive-by patch):**
- `npx tsc --noEmit --project tsconfig.app.json` or `npx tsc --build --project tsconfig.app.json` do
  check real files, but a full non-incremental run OOMs on Brian's machine (~2GB heap exhausted) — the
  same memory ceiling documented elsewhere for `npm run build`.
- ESLint does not catch this bug class (block-scope/control-flow compile errors) — a clean lint pass
  is not a substitute for a real type-check.
- For a specific pattern (e.g. "is this variable visible across this try/catch boundary"), an isolated
  repro in a throwaway `.ts` file checked with `npx tsc --noEmit --strict <file>` (no project config)
  is fast and does check the file, since no solution-style config is involved.
- Actual CI runners (GitHub Actions) may have more RAM than Brian's local machine, but the *command*
  itself is vacuous regardless of available memory — more RAM does not fix `files: 0`.

**Lovable exception — anon key only:** Lovable regenerates `src/integrations/supabase/client.ts` and does not support exporting constants from it safely. Frontend gateway files (`src/lib/documentFiles.ts`, etc.) that call Edge Functions need both the project URL and the anon key to construct auth headers for Kong. The anon key is a **public** key — it is already committed in `client.ts` and safe to expose in browser code. Inlining it as a local constant in gateway files is acceptable. The service role key must never appear in any frontend file under any circumstances.
