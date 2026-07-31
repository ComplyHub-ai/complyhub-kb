# Audit — Trainer's Report Submission Notification: Send Trigger (Phase 2)

**Date:** 31 July 2026
**Branch:** `feat/trainer-report-submit-notify-trigger`
**PR:** #336 — merged, `5d1004c4b..ef7e1a0ee`
**Migration:** `20260731024542_add_trainer_report_submit_notify_trigger.sql` — applied directly to production by RJ (SQL Editor); RJ has confirmed he's taking ownership of migrations on this feature as a standing default, not per-instance. Ledger entry inserted directly via `execute_sql` (no Supabase CLI on RJ's machine).

---

## What was built

Completes the feature started in PR #335 (settings) — this is the actual send-on-submit behaviour.

- Two triggers on `trainer_monthly_reports` (`trg_notify_trainer_report_submit_insert`, `trg_notify_trainer_report_submit_update`), both calling `trg_notify_on_trainer_report_submit()`. Fire whenever a row transitions to `status = 'submitted'`.
- The trigger function reads `tenant_governance_settings.notify_on_submit`/`notify_this` for that report's tenant. Does nothing if disabled. If enabled, queues one `email_outbox` row per address in `notify_this.emails`.
- New in-code HTML template short-circuit in `send-mailgun-email` (`trainer_report_submitted_v1`), mirroring the existing `trainer_report_reminder_v1` block — no Mailgun-console template dependency.

## Key design decisions

- **Trigger, not RPC code.** Confirmed with RJ before building: this had to avoid touching `submit_trainer_monthly_report()` or the trainer's submission page at all (same RPC this session's earlier race-condition fix touched — no appetite to touch it again so soon). A table-level trigger fires regardless of which of the 3 known submission paths a report goes through, and requires zero trainer-facing code changes.
- **Two separate triggers (INSERT vs UPDATE)**, not one combined "INSERT OR UPDATE" trigger — sidesteps any ambiguity about whether `OLD` is legitimately referenceable in a WHEN clause for an event that also fires on INSERT (where OLD doesn't conceptually exist). Each trigger's WHEN clause only touches what's valid for its own event.
- **Idempotency key** on the queued email (`tenant_id + report_id + recipient email`) — same defensive pattern as the existing reminder system, guards against a double-queue if the trigger ever fires twice for the same row.
- **Subject line finalized as** "Trainer's Report Submitted — {Month Year} — {Legal Name}" — RJ's original spec was in all-caps ("TRAINERS REPORT FOR..."); flagged that this reads as shouty/spam-like against ComplyHub's calm/professional brand voice, RJ agreed to the toned-down version.
- Verified (not assumed) that `email_outbox.idempotency_key` has a supporting unique index (`email_outbox_idempotency_key_uidx`) before relying on `ON CONFLICT (idempotency_key)` — it doesn't show up under `pg_constraint` since it's a bare unique index rather than a named table constraint, which could easily have been missed.

## Blast radius

Additive: 1 new migration (function + 2 triggers on an existing table, no schema change), 1 new short-circuit block in an existing edge function (~75 lines, doesn't touch any other branch of that function). No frontend changes in this PR — Phase 1 (PR #335) already covers the UI.

## Files changed

| Area | File |
|---|---|
| Trigger function + triggers | `supabase/migrations/20260731024542_add_trainer_report_submit_notify_trigger.sql` |
| Email template | `supabase/functions/send-mailgun-email/index.ts` |

## Decisions recorded

| Decision | Outcome |
|---|---|
| Where the send logic lives | DB trigger, decoupled from any submit RPC — confirmed with RJ specifically to avoid touching the just-fixed submit path again |
| Subject line casing | Toned down from RJ's all-caps draft to sentence case, per brand voice — RJ agreed |
| Migration ownership | RJ, standing default going forward on this feature (his words: "always") |

## Outstanding

- [ ] End-to-end test not yet done: enable the toggle, pick a recipient, submit a real trainer report, confirm the email actually arrives with correct subject/body
- [ ] Angela's 3 direct-to-prod migrations from earlier today (risk register, storage policies, deprecated tables) still need reconciliation — unrelated to this feature, still flagged not actioned
