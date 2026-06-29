# Audit — PRs #58 + #59 + #62: Suggestion intake pipeline, AI triage, and unified chat

**Date:** 23–24 June 2026
**Branches:** `fix/suggestion-photo-attachments` · `fix/suggestion-comments-wrong-table` · `feat/suggestion-intake`
**PRs:** #58 (merged 23 Jun) · #59 (merged 23 Jun) · #62 (merged 24 Jun)
**Merged by:** Brian (Khian)
**Merge commits:** `c1b80ca6` (PR #58) · `0e5bb466` (PR #59) · `a2c66476` (PR #62)
**Migrations applied to production:** Yes — 7 migrations in PR #62 (see below).

---

## What was built / fixed

### PR #58 — Support ticket photo attachments

- Support ticket photo attachments stored in `url_link` were not rendering in the ticket view.
- Fix: updated the attachment rendering to read from `url_link` and hardened the upload flow.

### PR #59 — Comments loading from wrong table

- Suggestion comments were loading from `ai_suggestions` instead of `public.suggestions`.
- Fix: corrected the `get_suggestion_comments` RPC to target `public.suggestions`. Single migration (`20260623093000_fix_get_suggestion_comments_table.sql`).

### PR #62 — Suggestion intake pipeline, AI triage, unified chat

**Overview:** End-to-end automated intake pipeline for support tickets / platform suggestions, from submission through AI triage and into a unified chat thread.

**Automated intake pipeline:**
- New edge function `supabase/functions/suggestion-intake/index.ts` (487 lines) fires on every suggestion INSERT via a `pg_net` trigger (`20260623075940_suggestion_intake_trigger.sql`).
- On submission the function:
  1. Runs **inline Claude Sonnet triage** — classifies as bug/feature, assesses severity, extracts structured fields.
  2. Persists results to `platform.suggestion_triage` and `platform.ai_triage_runs`.
  3. Sends **acknowledgement email** to the submitter (Mailgun EU API).
  4. Sends **alert email** to the dev team (khian, carl, rhald) with structured triage summary.
- Function uses `verify_jwt: false` secured by a shared secret header (`x-intake-secret`) — not a user JWT, since triggers fire server-side.
- Shared Mailgun client updated to post to the EU API host.

**Structured intake fields:**
- `get_my_suggestion_detail` RPC extended with structured triage fields (`20260624101230_get_my_suggestion_detail_structured_fields.sql`).
- `platform` schema exposed to PostgREST so the frontend can read triage results (`20260624101231_expose_platform_schema_to_postgrest.sql`).
- Super admin Details tab and user-facing ticket view surface the structured fields.

**Unified communication (Chat tab):**
- Separate Comments tab removed; Chat tab is now the sole communication channel, backed by `suggestion_comments` table for both super admin and user messages.
- Legacy JSON-in-`description` message threads still render read-only above the new thread.
- Super admin and user messages share the same thread with bubble UI on both sides; super admin messages appear as "ComplyHub Team" in the user view.
- Migrations: `20260624150000_unify_chat_and_status.sql`, `20260624160000_fix_support_chat_marks_unread.sql`, `20260624170000_fix_add_suggestion_comment_role_and_transition.sql`, `20260624171000_fix_update_suggestion_status_unread.sql`.

**Status simplification:**
- `public_status` field removed from user-facing flow; internal `status` field drives all display with friendly label mapping (`in_progress` → "In Progress", etc.).
- `update_public_suggestion_status` RPC added (`20260624120000_update_public_suggestion_status_rpc.sql`).
- `useUpdatePublicSuggestionStatus` hook removed from the client — status is now a single source of truth.
- Support replies auto-transition `new` → `under_review` on first reply; `last_public_update_at` bumped on replies and status changes.

---

## Files changed

| Area | Files |
|---|---|
| Edge function | `supabase/functions/suggestion-intake/index.ts` (new, 487 lines) |
| Email templates | `supabase/functions/suggestion-intake/email-templates.ts` (new, 298 lines) |
| Runbook | `supabase/functions/suggestion-intake/RUNBOOK.md` (new, 207 lines) |
| Shared Mailgun | `supabase/functions/_shared/mailgun.ts` (EU host fix) |
| Migrations (7) | `20260623075940_suggestion_intake_trigger.sql` · `20260623093000_fix_get_suggestion_comments_table.sql` · `20260624101230_get_my_suggestion_detail_structured_fields.sql` · `20260624101231_expose_platform_schema_to_postgrest.sql` · `20260624120000_update_public_suggestion_status_rpc.sql` · `20260624150000_unify_chat_and_status.sql` · `20260624160000_fix_support_chat_marks_unread.sql` · `20260624170000_fix_add_suggestion_comment_role_and_transition.sql` · `20260624171000_fix_update_suggestion_status_unread.sql` |
| Frontend | `src/components/superadmin/SuggestionDrawer.tsx` · `src/hooks/useMySuggestions.ts` · `src/pages/suggestions/MySuggestionsPage.tsx` |
| Config | `supabase/config.toml` (suggestion-intake entry added) |

---

## Security notes (flagged by Cursor Bugbot)

- `suggestion-intake` uses `verify_jwt: false` secured by `x-intake-secret` shared secret. This is intentional (trigger fires server-side with no user session). Secret must be kept in Supabase vault; never exposed to the frontend.
- SECURITY DEFINER RPCs (`get_my_suggestion_detail`, `get_suggestion_comments`, `update_public_suggestion_status`) control tenant chat access and unread signalling — RLS policies verified at time of merge.
- AI-driven writes to `platform.suggestion_triage` are scoped by `suggestion_id` with no cross-tenant risk (each suggestion is tenant-scoped at the `suggestions` table level).

---

## Notes / follow-up

- `platform.ai_triage_runs` provides a log of every Claude call for observability and cost tracking.
- The RUNBOOK (`supabase/functions/suggestion-intake/RUNBOOK.md`) documents the full pipeline, secret rotation procedure, and fallback behaviour when Claude is unavailable.
- Mailgun EU endpoint change applies to all future emails from `_shared/mailgun.ts` — verify delivery monitoring if email issues emerge.
- `useUpdatePublicSuggestionStatus` removed from client — if any future feature needs to set status independently, use the `update_public_suggestion_status` RPC directly.
