# Diagnosis discipline

> Moved from `CLAUDE.local.md` (10 July 2026). Content unchanged from the original. Kept as team-wide reference since these lessons apply to anyone diagnosing bugs in this codebase, not just Brian.

## Trace the full flow — never hand off mid-chain

When diagnosing a bug or tracing a feature, follow the execution path all the way to the end before reporting findings. Do not stop at a plausible-looking file or function and hand the problem back with "this is probably where it is." That approach misses bugs and adds unnecessary work hours.

The complete trace means:
- User action → component → hook → RPC/edge function → DB function → return value → UI render
- Follow every branch of the chain that could affect the outcome
- Confirm each step is actually called in the right context (grep callers, don't assume)
- Only report findings once the full path is traced and the root cause is confirmed, not suspected

If the trace is genuinely blocked (e.g., missing source, external service), state exactly where it stops and why — not just "it might be here."

## DB data-state check — standard diagnosis step

For any bug report involving data not loading, links not working, or content appearing missing: query the relevant database rows early in the diagnosis — before theorising about code causes. The actual data state (status, token, expiry, flags) resolves most hypotheses in a single step and avoids chasing the wrong fix. Use the Supabase MCP server (read-only) as the first investigative tool, not the last.

## Learned from NEW-013 multi-attempt failure

These rules apply to every bug fix, not just QA findings. Violating them is how a fix lands in the wrong file and wastes iterations.

1. **Trace the execution path from the user action, not from the plausible-looking file.** Start at the button click / route load / login event and follow the code forward to the actual decision point. Do not start at the file you expect is responsible.

2. **Grep callers before editing any function.** If you cannot see the function being called from the right place, you have not found the right fix target. (`routeAfterLogin` looked correct but was only called from `ResetPassword` — not normal login.)

3. **For switch/case blocks or arrays of roles — audit every entry.** When fixing one case, read every other case in the same block. Ask: does each entry have a corresponding config? This is how the Consultant sidebar bug was missed when fixing CM's case.

4. **For a directory of similar files — check all files for the same pattern.** When fixing one guard, grep all guards in the same folder for the same wrong value before reporting the BRC as clean.

5. **For context-switching bugs — query the DB early.** Check `profiles.active_tenant_id` and `tenant_members` for the affected user before theorising. The actual DB state resolves hypotheses in one step.

6. **Before routing any previously-unrouted component — cross-reference every DB field name used in the component against `src/types/` and the actual schema.** A feature parity check (does it have the right columns, the right form?) does NOT substitute for a field-name correctness check (are the actual property names correct?). This step is mandatory when the file has `// @ts-nocheck` on line 1 — TypeScript cannot catch mismatches, so the cross-reference must be done manually. Failure to do this was the root cause of the MCN register white screen (PR #98 route switch, July 2026): `change_title`, `description_of_change`, `submitted_to_asqa`, and `date_of_change` were used throughout `mcn/index.tsx` but none of them exist on `MCNRegister` — the correct fields are `title`, `change_description`, `date_submitted`, and `change_date`.

## Learned from PR #279 — a live DB fetch is not proof of the correct guard set

`CLAUDE.md` requires reading a function's *live* definition before `CREATE OR REPLACE`, so nothing already-live gets silently dropped. That rule is necessary but not sufficient: it only protects against the AI dropping something itself. It does not protect against the live database already being **behind** what's merged in git.

On PR #279 (`rpc_tas_create_draft`), the live function was faithfully copied and preserved — but the live copy itself was already missing a `tenant_scope_items` upsert path from a migration (`20260716090000`) that had been merged to `main` on 16 July but never actually applied to production. Cursor Bugbot and Vercel's bot both flagged the replacement as "dropping" that logic — correctly, because they diff against git history, not the live DB, and git said the function should look different from what was live. Confirmed via `supabase_migrations.schema_migrations`: the version jumped straight past `20260716090000`, meaning it was merged but never deployed.

**Rule going forward:** before any `CREATE OR REPLACE FUNCTION` on an existing function, in addition to fetching the live definition, run `git log --oneline -- 'supabase/migrations/*<function_name>*'` (or grep migration files/content for the function name). If a migration touching that function is more recent in git than what the live fetch reflects, stop and check `list_migrations` / `schema_migrations` for a version gap before treating the live fetch as ground truth — the live DB and git can silently disagree, and only a history check catches it.

## Learned from PR #356 — a call-pattern-scoped search is not the same as "is this referenced anywhere"

Before deleting anything (storage buckets, tables, columns, functions), "is this still referenced in
code?" was checked by grepping for a specific call shape — e.g. `storage.from('<bucket-id>')`. That
search came back clean for 6 storage buckets, which were then queued for deletion in a PR. Cursor
Bugbot caught, before merge, that all 6 were actually live: referenced not as a direct call argument but
as a **string value inside a config/lookup object**
(`supabase/functions/register-evidence-manager/index.ts`'s `REGISTERS` map, e.g.
`ofi: { bucket: "ofi-evidence" }`), resolved dynamically at runtime rather than passed literally to
`.storage.from(...)`. The call-pattern-scoped grep was structurally blind to this — it only ever could
have matched the one shape it was written to look for.

**Rule going forward:** before deleting or dropping anything, search for the **literal identifier
itself** (bucket id, table name, column name, function name) as a plain string across the **entire**
relevant codebase — not scoped to a specific call pattern, and not scoped to only `src/`. Specifically:
1. Do the first pass as an unrestricted string search (no `.method(...)` wrapper, no quote-style
   assumption) across both frontend (`src/`) and edge functions (`supabase/functions/`) — this is
   deliberately blunter and will surface more candidates to manually rule out, but a cheap false
   positive is vastly preferable to a missed true one.
2. Explicitly check config objects, lookup/dispatch maps, and any `Record<string, ...>`-shaped
   structures in edge functions separately — this is exactly the pattern this incident missed, and
   edge functions in particular are easy to under-scrutinize relative to user-facing frontend screens.
3. Only after the unrestricted pass comes back clean should a narrower, call-pattern-specific search be
   trusted as confirmation — never as the sole check.
4. Re-run the same check again immediately before executing the delete, not just once during planning —
   code can change between the two points.

## Learned from PR #362 review — both bugs came from checking the happy path only

Two review bots (Cursor Bugbot, Vercel) each caught a separate bug in the same ~15-line block that
implemented "publish this record, unless it was already published." Both slipped through because the
first-draft implementation only proved the happy-path, first-attempt, admin-role case worked — neither
retries nor the full set of allowed roles were stress-tested before calling it done.

1. **A "skip if already done" check must read live state, not a client-side cache.** The draft checked
   `item.published_to_register_id` from a React Query cache already sitting in the component. That
   cache can't reflect a *previous* attempt at the same operation that partially failed (e.g. the create
   succeeded but the follow-up link-back update didn't) — which is exactly the scenario the check exists
   to protect against. **Rule:** any "does this already exist / has this already run" guard in front of
   a create-if-not-exists flow must query the database directly, immediately before deciding, not trust
   data fetched earlier in the session. Ask explicitly: "if this exact code path partially failed and
   the user retries, what does my check see?"

2. **`.insert(...).select(...)` depends on the SELECT RLS policy, not just INSERT.** The draft confirmed
   the INSERT policy allowed all 5 approver roles (having just widened it for 2 of them) and treated
   that as "permissions checked." It missed that requesting data back from an insert
   (`.select().maybeSingle()`) triggers a second, separate RLS check — the table's SELECT policy — to
   read the row back. Two of the five roles could insert but not read back their own new row (a
   RESTRICTIVE audience-based SELECT policy filtered it out), so the insert silently succeeded while the
   code treated the null read-back as a failure. **Rule:** when writing any `.insert(...).select(...)`
   against a table with RLS, check the SELECT policy for every role the write path needs to work for —
   not just the INSERT/WRITE policy — or avoid the read-back entirely by generating the row's ID
   client-side (`secureId()`) and inserting without `.select()`.

**Standing habit these both point to:** before calling an insert/create flow done, explicitly write out
(a) what happens on a second, retried call, and (b) whether the exact write-then-read pattern used has
been checked against every role/permission tier the feature is meant to support — not just the role
used to write the code.

## Learned from PR #381/#383 — a blanket RESTRICTIVE gate applied across many tables needs a per-table access-pattern check, not a single review

PR #381 added one RESTRICTIVE policy (`billing_gate_active_tenant`, requiring
`sec.user_in_tenant(tenant_id) AND sec.tenant_is_active(tenant_id)`) across a loop of **~48 tables** in a
single "blanket" migration batch. It was reviewed once, as a batch, against the general principle
("stop inactive/unpaid tenants from writing data") — not against each table's actual pre-existing access
pattern. Two regressions escaped: `consultant_portfolio_requests` (an affiliate/consultant requesting
access to a client tenant they are *not yet* a member of — the exact non-member path the new membership
check blocked) and, found only in a follow-up audit on PR #383, the identical structural bug on
`trainer_vet_currency` and `trainer_wud_log` (owner-only insert — `trainer_id = auth.uid()` — with no
tenant-membership requirement by design, also blocked by the new AND).

A full 50-table audit on PR #383 found the blast radius was larger than either individual fix: 1
confirmed-broken table already fixed by #383 (`consultant_portfolio_requests`), 1 more confirmed broken
and fixed in the same PR (`trainer_vet_currency`, real call site in
`src/pages/trainer-portal/vet-currency.tsx`), 1 fixed defensively despite being dormant
(`trainer_wud_log` — same structural bug, no live caller found), and one **genuine design question, not
a bug** — `survey_tokens` has a real PUBLIC/unauthenticated SELECT policy for token-based lookups (e.g.
survey links opened without login) that the blanket gate would also block; this was deliberately left
unfixed pending a product decision on whether that public lookup path should sit behind this gate at all.
The remaining ~45 tables were individually confirmed safe (either already tenant-scoped, or writes go
exclusively through a service-role client that bypasses RLS regardless of the gate).

**Rule going forward:** any migration that applies the *same* RESTRICTIVE (or otherwise AND-combining)
policy across a loop/batch of multiple tables must be checked **one table at a time**, not once against
the batch's stated intent:
1. For every table in the batch, read its *other* pre-existing policies (SELECT/INSERT/UPDATE) — not
   just confirm the new policy's own logic is correct.
2. Explicitly look for "non-membership-by-design" patterns before assuming a tenant-membership AND is
   safe: owner/author-only checks (`x_id = auth.uid()` with no tenant condition), public/unauthenticated
   access (`USING (true)` or token-based lookups), cross-tenant affiliate/consultant flows, and
   super-admin-only tables where the caller may have no membership anywhere.
3. For every flagged table, grep `src/` and `supabase/functions/` for real call sites and confirm which
   Supabase client is used — a user-JWT client is subject to RLS and can be broken by the new gate; a
   service-role client bypasses RLS entirely, so the gate is a no-op for that caller regardless of what
   the policy says on paper. Don't leave this as "theoretical" — resolve it with file:line evidence one
   way or the other.
4. A table with a genuine public/unauthenticated access requirement is a **design decision**, not a
   mechanical fix — flag it to the human rather than silently patching the gate or silently leaving it
   broken.
5. Batch-applying one migration across many tables is efficient to *write*, but each table still needs
   its own before/after check — "reviewed the batch's intent" is not the same as "reviewed every table's
   interaction with that intent."
