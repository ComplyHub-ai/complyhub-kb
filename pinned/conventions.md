> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** medium — RLS and Edge function sections added from production incident; other sections still scaffold.

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
6. Merge the PR to `main` — this lands the `.sql` file in the repo only; it does NOT touch the production DB
7. Manually apply the migration to production via MCP `apply_migration` immediately after merge — never defer
8. Verify the DB object changed in production

**Non-migration branch flow:** no branch DB is created — QA runs against production DB, no manual apply step needed after merge.

**Key rules:**
- Merging to `main` never auto-applies migrations to production — always a separate manual step
- Never do production QA for migration branches — always use the branch DB
- Apply to production immediately after merge — never leave it pending

### Migration discipline — preventing drift (effective 26 June 2026)

The repo and the production database are independent. Merging to `main` only updates files — it never touches the database. Applying to production is always a separate manual step.

**The only safe flow:**
1. Write the `.sql` file on a branch
2. Push → branch DB confirms green (no `MIGRATIONS_FAILED`)
3. Merge PR to `main`
4. **Apply to production immediately** via MCP `apply_migration` — never defer
5. Verify the DB object changed in production

**If anyone applies directly to production:** write a reconciliation migration capturing the exact change. Merge it before any new branch work touches that schema area. This is what happened with Angela's 26 June fixes — failure to do this caused branch DB failures across the whole PR.

**Reconciliation file naming — must match the original production version, not today's date (effective 14 July 2026):** `migration-drift-check.yml` matches production `schema_migrations` rows to git files by exact `version` + `name` string identity — not by SQL content. Query `supabase_migrations.schema_migrations` for the row's real `version` and `name`, then name the reconciliation file `supabase/migrations/<that version>_<that name>.sql` — e.g. a prod row `version=20260712031504, name=batch04a_restrict_select_sensitive_role_filtered_tables` becomes `supabase/migrations/20260712031504_batch04a_restrict_select_sensitive_role_filtered_tables.sql`, verbatim SQL from `.statements`.

Do **not** timestamp the file with the date you're doing the reconciliation and do **not** prefix the name with `reconcile_`/similar — either one breaks the exact-match and the drift check keeps flagging the row as unresolved even though the SQL is now captured in git. (This is exactly what happened with the 13 July 2026 `Reconcile Angela's 12 Jul security remediation batches` commit — 11 files were written as `20260713100000+_reconcile_*`, using the commit date instead of the original version, so all 11 still show as drift today.) Backdating the filename to the true original version is safe — `supabase db push` and branch-DB creation treat a file whose version is already recorded as applied and skip re-running it; on a *fresh* branch DB (where that version doesn't exist yet) it correctly runs for the first time, which is the whole point.

**Branch DB + seed.sql:** Branch DBs run: baseline → migrations → `seed.sql`. The `seed.sql` is live and configured in `config.toml` under `[db.seed]`. It uses hardcoded tenant UUIDs so QA accounts exist on every branch DB. If a migration adds a column that `seed.sql` references and the baseline doesn't have it, the seed step fails. Always check `seed.sql` when adding columns to seeded tables.

### Schema drift — Lovable legacy (context as of 25 June 2026)

Before June 2026, Lovable applied database changes directly to the production DB without creating migration files. This left 3,608 migration version records in production with no corresponding `.sql` files in the repo. Branch DBs hit `MIGRATIONS_FAILED` because they start fresh and can't find those versions. Lovable is no longer in use — all migrations now go through files + branch DB testing.

**Known drift fixed:** Migration `20260624000100_gap_fill_tenants_schema_drift.sql` adds 10 columns to `public.tenants` that were applied directly to production via Lovable and were missing from the baseline: `cricos_provider_code`, `lms_name`, `llnd_provider`, `llnd_assessment_instrument`, `english_evidence_policy` (jsonb), `acsf_defaults` (jsonb), `delivery_sites` (jsonb), `funding_streams` (text[]), `trainer_pd_review_cadence`, `parent_consultant_org_id` (uuid).

**Rule going forward:** If a branch DB migration fails with `column X does not exist`, check whether that column exists in production but has no migration file. If so, add a gap-fill migration (`ADD COLUMN IF NOT EXISTS`) before the failing migration and document it in `supabase/migrations/CLAUDE.md`.

### Baseline-first migration rule (effective 01 July 2026)

When a DB change is needed and the situation supports it, prefer editing the baseline (`supabase/migrations/00000000000000_baseline.sql`) over creating a new migration file. Use judgement:

**Edit the baseline when:** the column/object doesn't exist anywhere yet; the change is purely additive with no risk of conflicting with existing migration files; the table's `CREATE TABLE` already exists in the baseline; no existing migration file creates or references the same object.

**Create a new migration file when:** the object already exists in production (baseline won't re-run against production, so an `ALTER TABLE` still needs manual apply); the change modifies an existing baseline object; the baseline doesn't contain a `CREATE TABLE` for the affected table (Lovable-era drift); risk of conflict with another migration in the chain is high.

**Key caveat:** editing the baseline only covers branch DBs. Production always requires a separate manual `apply_migration` step after the PR merges — never assume baseline changes flow through to production automatically.

**Watch for redundancies:** before adding anything to the baseline, check whether an existing migration file already handles it.

### Migration idempotency — every CREATE must be safe to run twice (effective 16 Jul 2026)

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

**Lovable exception — anon key only:** Lovable regenerates `src/integrations/supabase/client.ts` and does not support exporting constants from it safely. Frontend gateway files (`src/lib/documentFiles.ts`, etc.) that call Edge Functions need both the project URL and the anon key to construct auth headers for Kong. The anon key is a **public** key — it is already committed in `client.ts` and safe to expose in browser code. Inlining it as a local constant in gateway files is acceptable. The service role key must never appear in any frontend file under any circumstances.
