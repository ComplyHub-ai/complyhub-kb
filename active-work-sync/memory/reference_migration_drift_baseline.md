---
name: reference-migration-drift-baseline
description: rto-compass-hub/supabase/migrations/.drift-baseline.txt is the authoritative CI-tracked list of already-acknowledged orphaned production migrations — check it before any drift reconciliation work
metadata: 
  node_type: memory
  type: reference
  originSessionId: ded89d58-5c45-4b93-b8cf-39a7b38c7b98
---

`rto-compass-hub/supabase/migrations/.drift-baseline.txt` is a checked-in, CI-maintained snapshot of
production migrations applied directly to the database with no matching git file (`version|name` per
line, pipe-delimited). It's built from a direct `psql` query against production's real
`schema_migrations` table by `.github/workflows/migration-drift-check.yml` (the "ratchet model," added
via PR #196/#197, 14 Jul 2026, most recently pruned 20 Jul 2026). Anything in this file is known,
accepted, pre-existing debt — not a fresh discovery.

**Why this matters:** On 20 Jul 2026, a migration-drift investigation was run from scratch —
reconstructing a list of "213 undocumented production migrations" via `list_migrations` +
±120-second timestamp-window matching against local/archived filenames — before discovering this
baseline file already existed and already tracked ~199 of those 213 items. That was a genuinely large
amount of duplicated investigation work (multiple feature-area group dispatches, cursor-CLI agents,
detailed write-ups) spent re-discovering things the team's own CI already knew about. Only 14 items in
the reconstructed list turned out to be genuinely new — not in the baseline at all — and one of those
14 was a real, live, exploitable security gap (`sa_extend_trial_v2` missing a paid-subscriber guard)
that got fixed as a result. So the investigation wasn't wasted, but 199/213 of it was redundant with
information already sitting in the repo.

**How to apply:** Before starting any "what's undocumented / orphaned in production" investigation,
read `.drift-baseline.txt` first and cross-reference against it. Only items NOT in the baseline are
genuinely new work worth investigating feature-area by feature-area. This is now also codified directly
in `CLAUDE.md` (workspace root) under "Migration drift reconciliation — check the baseline FIRST."

**Naming-convention gotcha surfaced by this same investigation:** reconciliation migration files must
satisfy TWO separate CI checks that can conflict — the drift-check (which matches a production row to a
git file by the leading 14-digit version, so the trailing description can be anything) and the separate
"Migration guards (new files only)" job (which requires plain snake_case filenames, no hyphens/UUIDs).
When a production row's own recorded `name` is a Lovable-style UUID, use the real production version as
the filename prefix but a readable snake_case slug for the description — not the literal UUID name —
and note the original name in the file's header comment for traceability. Full working method and
example: `reconciliationwork.md` (workspace root, from the PR #272 session).

See [[feedback_no_autonomous_ci_polling]] for a related lesson from the same session (about
`ScheduleWakeup` misuse while working this same PR).
