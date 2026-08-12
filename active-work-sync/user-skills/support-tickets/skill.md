---
name: support-tickets
description: >
  Reads ComplyHub support tickets directly from the live database (the
  `suggestions` table and related tables — see complyhub-kb/reference/support-tickets-schema.md)
  instead of Brian describing the ticket by hand. Trigger on "check the tickets",
  "what's open", "pull ticket #X", "any high urgency tickets", "look at the support
  tickets", or when a bug report references a ticket instead of a fresh description.
  Read-only — this skill only queries, it never writes to suggestions/comments/etc.
---

# Support Tickets — Read Path

ComplyHub's Support Tickets screen is backed by the `suggestions` table (not a
table named `tickets`). Full schema map, column reference, and ready-to-use
queries live in `complyhub-kb/reference/support-tickets-schema.md` — read that
file first, every time, rather than relying on memory of column names.

## How to run this

1. Read `complyhub-kb/reference/support-tickets-schema.md` for the current
   schema (it can drift — verify against live `information_schema` if a query
   errors on an unknown column).
2. Query via the Supabase MCP `execute_sql` tool. Common cases:
   - "what's open" / "high urgency" → the open/high-urgency query in the
     reference doc.
   - "ticket #X" / "look at this ticket" → pull the `suggestions` row by
     `issue_key` or `id`, then the full-thread query (comments + activity log).
   - A bug-type ticket (`is_bug = true`) that's about to be fixed → pull
     `steps_to_reproduce`/`expected_result`/`actual_result`/`error_message_seen`/
     `ui_route`/`app_build_version` and hand that straight to the
     `complyhub-bug-fix` skill as the starting context, instead of asking Brian
     to re-describe the bug.
3. This is read-only. Never `insert`/`update`/`delete` against `suggestions` or
   related tables from this skill — if Brian wants to change ticket status,
   that's a separate, explicit ask (and likely needs to go through the app's
   own update path, not a raw DB write, per the ticket tables' `write_lock_*`
   RLS policies).
4. Multi-tenant confidentiality applies: don't cross-reference one tenant's
   ticket content into another tenant's work, and strip `tenant_id`/
   `submitted_by_name`/`submitted_by_email` before putting ticket content
   anywhere externally shareable.
