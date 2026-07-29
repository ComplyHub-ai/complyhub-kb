---
name: feedback-create-or-replace-check-git-history-too
description: "Before any CREATE OR REPLACE FUNCTION/VIEW, run git log for that object name first — neither the live pg_get_functiondef fetch NOR a copy from 00000000000000_baseline.sql can be trusted as ground truth on their own; either can be stale relative to what's merged in git."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 363be5c4-e1b1-48f6-90c4-458948d10958
  modified: 2026-07-29T00:53:02.861Z
---

When replacing a Postgres function or view (`CREATE OR REPLACE ...`) in rto-compass-hub, there are two
different ways to end up copying a stale body — both fixed by the same one check: `git log` for the
object name before writing anything.

**Failure mode A — live DB behind git.** `rto-compass-hub/CLAUDE.md` requires reading the *live*
function definition first and preserving every guard it has. That's necessary but not sufficient — it
doesn't protect against the live database already being behind what's merged in git (a
`supabase/migrations/` file merged to `main` but never actually applied to production).

**What happened (21 Jul 2026, PR #279, `rpc_tas_create_draft`):** fetched the live function via
`pg_get_functiondef`, copied it faithfully into a new migration per the CLAUDE.md rule, and shipped a
fix. Cursor Bugbot + Vercel's bot both flagged that the replacement "dropped" a tenant_scope_items upsert
path. Investigation showed the live database itself had been missing that logic since a July 16
migration (`20260716090000`) was merged to `main` but never deployed — confirmed by a version gap in
`supabase_migrations.schema_migrations` (jumped straight past that version). The bots caught this because
they diff against git history, not the live DB, so they saw exactly what a live-only check structurally
can't: git said the function should look one way, and the live copy — trusted as ground truth — didn't
match.

**Failure mode B — the baseline file behind git.** `00000000000000_baseline.sql` is a point-in-time
snapshot of the schema. Copying an object's body straight from it is fine for something that's never been
touched since — but if any migration has modified that object since the baseline was generated, the
baseline copy is stale in the exact same way the live-DB fetch was stale in mode A, just from the
opposite direction (git has moved on, the static file hasn't).

**What happened (29 Jul 2026, `rpc_get_tas_build_state`):** drafted a migration to add `RAISE WARNING`
logging to this function's exception handlers, copying its body from the baseline file. Two later
migrations already merged to `main` had changed it since: one added `resources_ready`/`resources_checks`
fields, and another (`20260723143058`) fixed a real production outage (`jsonb_build_object` past
Postgres's 100-arg limit), added a `sec.claim_tenant_id()` tenant-access guard, and renamed a column.
Shipping the baseline-based version would have silently reverted all three — re-breaking the app for
every tenant and dropping a security check — while looking like a clean diff, since it's valid SQL that
just does the wrong thing. Caught by `cichecker`'s pre-push check, but only after already committing and
pushing the wrong version once.

**Why both fail the same way:** neither `pg_get_functiondef` nor the baseline file carries any signal
that it might be stale. Each is a single point-in-time snapshot — one live, one static — and only git
history shows the full timeline of what's actually supposed to be true.

**How to apply:** before writing any `CREATE OR REPLACE FUNCTION`/`VIEW` migration, run
`git log --oneline -- 'supabase/migrations/*<object_name>*'` first, regardless of which source (live DB
or baseline) you're about to copy from. If hits exist, read the **most recent** one and base the new
migration's body on that file's current definition — not on the live fetch or the baseline in isolation.
If a migration touching that object was merged more recently than what you're about to copy from, treat
it as a red flag and re-check before trusting anything else. Do this while *authoring* the migration, not
only as a pre-push gate — `cichecker` Step 5 already runs this check before push, but by then a wrong
version may already be committed. This is now also written into the team-durable docs:
`rto-compass-hub/supabase/migrations/CLAUDE.md` and `complyhub-kb/pinned/conventions.md` § "CREATE OR
REPLACE on an existing object — check git history first" (added 29 Jul 2026) — those are the source of
truth for Carl/Dave/RJ too; this memory is the personal reflex layer.

See also [[feedback_pr_audit_functional_deps]] — same underlying theme of checking dependencies/history
beyond the immediate diff before trusting a single point-in-time read.
