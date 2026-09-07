# QI Register — Automation & Cleanup Work

Living doc. Source of truth for this body of work. Delete after implementation is audited (per CLAUDE.md living-doc workflow).

Worktree: C (`rto-compass-hub-C`), branch `fix/retire-legacy-qi-data`.

## Open items (to do)

1. **Delivery confirmation** — DONE, implemented on branch `fix/retire-legacy-qi-data` (worktree C), commit `1e5511737`, pushed. Investigation found the intended Mailgun webhook delivery-tracking pipeline was completely non-functional in production (confirmed via live query: `email_events` had zero rows ever recorded), caused by four compounding bugs, all fixed:
   - `enhanced-mailgun-webhook` had `verify_jwt=true` in `config.toml`, so Supabase's platform gateway rejected every Mailgun webhook call (which authenticates via its own signature headers, not a Supabase JWT) before the function's own signature-check code ever ran. Flipped to `verify_jwt=false` (Brian's explicit go-ahead obtained first, since this touches a security-relevant config.toml setting).
   - `email-outbox-worker` recorded the returned Mailgun message ID only inside a JSON `payload` field, never in the dedicated `mailgun_message_id` column the webhook matches on — so even a successful webhook call couldn't find its outbox row. Fixed to write both.
   - The `email_status` Postgres enum was missing `bounced`, `complained`, `unsubscribed`, `rejected`, and a distinct `delivered` value (previously collapsed into `sent`) — so the webhook's status update failed with an invalid-enum-value error for every outcome except a plain send/failure, silently swallowed by the webhook's logging-only error handling. Added via migration `20260827090000_extend_email_status_enum_bounce_events.sql` (additive, `ADD VALUE IF NOT EXISTS`, no existing-data impact).
   - Added a new `qi_campaign_recipient_delivery_status` RPC (migration `20260827090500_add_qi_campaign_recipient_delivery_status_rpc.sql`, `SECURITY DEFINER`, authorized via `can_manage_qi_for_tenant()`) that joins `email_outbox` status back onto each campaign recipient via the existing `idempotency_key = 'qi_campaign_recipient_' || recipient.id` pattern `qi_bulk_send_campaign` already writes.
   - UI (`QiCampaignRecipientTable.tsx`) now shows real per-recipient delivery status (queued/sent/delivered/bounced/failed/etc.) alongside the existing workflow status, plus a summary badge row flagging recipients who may not have received their invite.
   - **Parked, not fixed here:** found `email_outbox`'s `email_outbox_tenant_select` RLS policy authorizes off the stale `profiles.tenant_id` snapshot instead of `profiles.active_tenant_id` — the exact banned pattern documented in this repo's `CLAUDE.md`. Avoided by using a `SECURITY DEFINER` RPC instead of a client-side select, so it doesn't block this feature, but the underlying RLS bug itself is still live and affects any other direct read of `email_outbox`. Needs its own FRAME.
   - **Post-merge action required:** the two new migration files still need to be applied to production after this branch merges, per the repo's standard post-merge migration procedure (`supabase/migrations/CLAUDE.md`) — not yet done as of this write.

2. **Response de-duplication** — ALREADY IMPLEMENTED, no work needed. Verified live against production on 27 Aug 2026: this was fully built and shipped after this doc was originally written (the doc's "not yet investigated/planned" status was stale, not accurate). Confirmed via live `pg_get_functiondef`:
   - `qi_bulk_send_campaign` (live definition, superseding the 5 Aug version) already generates a unique, cryptographically random per-recipient token (`qic-` + 24 random bytes, hex-encoded) for every recipient, stores its SHA-256 hash + expiry on `qi_campaign_recipients.response_token_hash`/`response_token_expires_at`, and embeds the raw token — not the old shared link — in each recipient's email.
   - `public_get_qi_survey_by_slug` and `public_submit_qi_survey` (the RPCs the public survey pages call) detect the `qic-` prefix, look the token up by hash, and reject it if the recipient already completed/was excluded/bounced/the campaign closed, or if the token's expired.
   - `public_submit_qi_survey` locks the recipient row (`FOR UPDATE`) during submission to prevent a race condition from letting the same link submit twice, links the resulting `qi_responses.id` directly to that exact recipient via `response_id`, and nulls out the token so it can never be reused.
   - The old shared-link path (matching by `qi_survey_links.survey_slug`) is still supported as a fallback for non-managed/legacy links, but every managed campaign send now uses the tokenized per-recipient path.
   - No code changes made for this item — verification only.

3. **Automated quarterly sending** — DONE (scoped), implemented on branch `fix/retire-legacy-qi-data` (worktree C), commit `1f1aac46c`, pushed. Brian chose the "auto-create draft only" scope over full end-to-end automation, after investigation found recipients are 100% hand-entered today with no link to any learner/employer roster table in the codebase — true full automation would need a new decision about an authoritative recipient-source register (doesn't exist yet) and raises a compliance question about unreviewed automated external email, so it was parked rather than built.

   What shipped: a new `qi_ensure_quarterly_campaigns()` function (migration `20260827091500_add_qi_quarterly_campaign_auto_draft.sql`) plus a new `qi-ensure-quarterly-campaigns` pg_cron job firing on the 1st of Jan/Apr/Jul/Oct. It loops every active tenant that already has an active `qi_survey_links` row for a given survey type (used as the signal the tenant has configured that survey before — avoids creating drafts for survey types a tenant has never used), and creates one draft `qi_campaigns` row per (tenant, survey_type, quarter) if one doesn't already exist, pre-filled with the computed quarter/year, a generated name, and calendar-quarter `window_opens_at`/`window_closes_at` dates. Verified against live schema/triggers before writing: `custom_id` is auto-populated by an existing `trg_qi_campaigns_set_custom_id` trigger (not supplied by the function); `enforce_qi_campaign_register_year` trigger requires the campaign's `tenant_id`/`collection_year` match its register, which the function's lookup logic satisfies; there is no DB-level unique constraint preventing duplicate quarter/tenant/survey_type campaigns (only `(tenant_id, custom_id)` is unique), so the function's own existence-check-before-insert is the only real duplicate guard.

   Still fully manual after this: a person must open the auto-created draft, add/confirm the recipient list, and click send — no email goes out without a human step.

   **Post-merge action required:** this migration still needs to be applied to production after this branch merges, per the repo's standard post-merge migration procedure (`supabase/migrations/CLAUDE.md`) — not yet done as of this write.

4. **QR code generation** — DONE, implemented on branch `fix/retire-legacy-qi-data` (worktree C), commit `ead72719c`, pushed. Added a QR code button (`QiSurveyLinkQrButton.tsx`) next to each survey link (Learner/Employer/Rapid) on `QiSurveyLinksPanel.tsx`, generated client-side via the `qrcode` npm package (was already an installed dependency, previously unused anywhere in the codebase — confirmed via grep before building). Popover shows the QR image on demand plus a "Download PNG" button for posters/handouts. No database changes, no new dependencies.

   Note: confirmed the target is `qi_survey_links.survey_slug` (the tenant-wide shared link, one per register+survey_type), not the newer per-recipient `qic-` tokenized links added for item 2 — QR codes need a static, non-personalized link, so this is the correct target and the doc's original premise (shared link exists, feasible without restructuring) still holds despite the later tokenization work.

   **Open question, deliberately left undecided (Brian's call, 27 Aug 2026):** the shared link this QR encodes has no expiry by default (`expires_at: null` at creation, only deactivated by a manual toggle) — unlike the per-recipient email tokens, which auto-expire with the campaign window. Since QI is annual/quarterly ASQA compliance data tied to a specific collection period, a permanently-scannable QR code (e.g. on a printed poster) could keep accepting submissions after that period's collection window has closed. Not fixed as part of this change. Needs its own FRAME if Brian wants to decide: auto-expire matching the collection period vs. leave evergreen for poster-lifespan reasons.

5. **Automated reminders** — DONE, implemented on branch `fix/retire-legacy-qi-data` (worktree C), commit `1fb52fd3f`, pushed. Unlike item 3 (auto-draft only, no email sent without a human click), this DOES send real email to real recipients with no human review step — Brian confirmed this explicitly before building, since it's a step up in risk from everything else on this branch.

   What shipped: a new `qi_auto_send_campaign_reminders()` function (migration `20260827093000_add_qi_automated_campaign_reminders.sql`) plus a new `qi-auto-send-campaign-reminders` pg_cron job running daily. It loops every open campaign (not draft/closed/cancelled) across all tenants still within its window, and for each non-responder: sends reminder 1 seven days after their initial send (if not yet reminded), and reminder 2 a further seven days after reminder 1 — capped at two reminders per recipient via the existing `reminder_count` CHECK constraint (0–2), which the function respects rather than re-implements. Reuses the exact same `qi_reminder` email template and per-recipient tokenized-link generation (`qic-` prefix, SHA-256 hash stored on `response_token_hash`) that the manual `qi_send_campaign_reminder` RPC already uses — the only difference is this loops across all tenants on a schedule instead of requiring an authenticated user acting on one campaign at a time. The two reminder intervals (7 days, 7 days) are hardcoded constants in the function body, adjustable if the cadence needs to change later.

   **Post-merge action required:** this migration still needs to be applied to production after this branch merges, per the repo's standard post-merge migration procedure (`supabase/migrations/CLAUDE.md`) — not yet done as of this write.

## Decisions (locked)

### Item: Retire legacy `qi-data` system — LOCKED, verified safe

**Decision:** Retire the legacy QI system entirely (routes, pages, components, hook, edge function if confirmed legacy-only, storage path if confirmed legacy-only, orphaned dropdown tables), including removing the live navigation entry point Brian flagged.

**Verification (via Supabase MCP against live production project `gdwhlstfguxarnxasrrs`, plus full codebase grep):**
- `qi_data_register` table does NOT exist in production — confirmed via direct query (`42P01: relation does not exist`) and `information_schema.columns`. The legacy add/edit form is already broken against production today.
- No other page, edge function, redirect, report generator, or database rule (view/RPC/trigger/FK) depends on the legacy system in current (non-archived) migrations.
- Main sidebar navigation is clean — only points at the new `/dashboard/registers/qi` system.
- **Live dependency found and must be removed as part of retirement:** `src/pages/registers/RegistersHub.tsx` has a "QI Data Register" card routing to `/dashboard/registers/qi-data`, with a count badge wired via `src/hooks/useRegisterCounts.ts` (`qi: 'qi_data_register'` mapping) that is silently failing since the table doesn't exist. Brian confirmed this card must be removed, not repointed.
- Five orphaned dropdown tables still exist live with no application code depending on them: `qi_dd_survey_type`, `qi_dd_response_scale`, `qi_dd_collection_method`, `qi_dd_learner_questions`, `qi_dd_employer_questions`.

**Concrete retirement plan:**
1. `src/pages/registers/RegistersHub.tsx` — remove the "QI Data Register" card entirely (not repoint — confirmed by Brian).
2. `src/hooks/useRegisterCounts.ts` — remove the `qi: 'qi_data_register'` mapping.
3. `src/AppRoutes.tsx` — remove the three legacy routes (`registers/qi-data`, `registers/qi-data/add`, `registers/qi/edit/:id`) and their lazy imports (`QIDataRegister`, `QIDataAddEdit`).
4. Delete `src/pages/registers/qi-data/*`, `src/components/qi/QIDataForm.tsx`, `src/hooks/useQIDropdowns.ts`.
5. `src/__tests__/routes/unique-routes.test.tsx` — remove the `/dashboard/registers/qi-data` entry from the expected route list.
6. Before deleting: confirm `supabase/functions/extract-qi-data/` is only invoked by `useExtractQiPdf.ts`/the legacy form (open check) — if so, retire together.
7. Before deleting: confirm the `qi-data/{tenant}/...` storage path prefix used by `register-evidence-manager` is not shared with the new QI system's evidence uploads (open check) — if legacy-only, remove alongside.
8. As a separate, later migration (after code retirement confirmed clean in a deploy): drop the five orphaned `qi_dd_*` tables.

**Status:** Implemented on branch `fix/retire-legacy-qi-data` (worktree C), not yet committed/pushed — pending Brian's go-ahead. Steps 1-5 and 8 of the concrete retirement plan completed as specified:
1. `RegistersHub.tsx` — 'QI Data Register' card removed.
2. `useRegisterCounts.ts` — `qi: 'qi_data_register'` mapping removed (and `'qi'` removed from the `RegisterKey` type).
3. `AppRoutes.tsx` — the three legacy routes and their lazy imports removed.
4. Deleted `src/pages/registers/qi-data/*`, `src/components/qi/QIDataForm.tsx`, `src/hooks/useQIDropdowns.ts`.
5. `src/__tests__/routes/unique-routes.test.tsx` — removed the `/dashboard/registers/qi-data` entry.

Steps 6 and 7's open checks resolved as NOT legacy-only — both stay, no deletion:
- Step 6 (`extract-qi-data` edge function): still called by `useExtractQiPdf.ts`, which is used by `QiAsqaSubmissionPanel.tsx`, which is wired into the current (non-legacy) `src/pages/registers/qi/index.tsx` page. Not legacy-only — kept.
- Step 7 (`qi-data/{tenant}/...` storage path prefix): `register-evidence-manager/index.ts` builds this exact path for any `register: 'qi'` call, and the live `ReceiptLink.tsx` component (current QI system, not legacy) calls `downloadRegisterEvidence({ register: 'qi', ... })` against it. Shared infrastructure with the current system — kept.

Step 8 (drop the five orphaned `qi_dd_*` tables) stays parked for a separate later migration, as originally planned — not part of this change.

Verification: `npx tsc --incremental --noEmit` clean, `npx eslint` on changed files clean. Note: `src/__tests__/routes/unique-routes.test.tsx` is not actually included in `vitest.config.ts`'s test glob (`tests/**/*.test.{ts,tsx}` only) and has no CI job running it — pre-existing gap, out of scope for this change, edited anyway to keep it correct as source of truth.

## Status

All 5 items in the original open-items list are now resolved: item 3 (legacy retirement, the original locked decision) implemented and pushed; items 1 (delivery confirmation), 3 (automated quarterly sending — auto-draft only), 4 (QR codes), and 5 (automated reminders) implemented and pushed; item 2 (response de-duplication) found already implemented in production, verification only. All work sits on branch `fix/retire-legacy-qi-data` in worktree C (`rto-compass-hub-C`), committed and pushed, not yet merged to `main`. Several migrations from this branch still need to be applied to production after merge, per the repo's standard post-merge migration procedure — see each item's note above for the specific migration files. One open, deliberately-parked design question remains: whether the QR code's underlying shared survey link should auto-expire at the end of its collection period (see item 4's note) — not decided as of this write. Next: Brian to review the branch and decide on opening a PR.

---