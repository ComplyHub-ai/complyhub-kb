---
name: feedback-check-migrations-claude-md-first
description: Always read rto-compass-hub/supabase/migrations/CLAUDE.md before writing any migration
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f5b08881-db3d-4e48-8e64-7c11fd3e7979
---

Always check `rto-compass-hub/supabase/migrations/CLAUDE.md` before writing any new migration file — not just when drift comes up.

**Why:** That file holds the current migration discipline (naming convention, branch-DB testing workflow, known schema-drift gap-fills, reconciliation naming rules). It has changed multiple times recently (e.g. the 14 July 2026 fix to reconciliation-file naming) and outdated assumptions here cause real drift-check failures and broken branch DBs — see [[project_migration_discipline]].

**How to apply:** Before drafting any `.sql` file in `supabase/migrations/`, Read `rto-compass-hub/supabase/migrations/CLAUDE.md` fresh (don't rely on memory of its contents) to confirm current naming convention, gap-fill list, and any new discipline notes.
