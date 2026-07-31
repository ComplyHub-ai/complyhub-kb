# Audit — Trainer's Report Settings Tab: Submission-Notification Settings (Phase 1)

**Date:** 31 July 2026
**Branch:** `feat/trainer-report-notify-settings`
**PR:** #335 — merged, `a3d81e436..5d1004c4b`
**Migration:** `20260731021216_add_trainer_report_submit_notifications.sql` — applied directly to production by RJ (SQL Editor), per his own root-cause/ownership call, not flagged to Dave. Ledger entry inserted directly (`supabase_migrations.schema_migrations`) since RJ doesn't have the Supabase CLI installed — same workaround as the earlier display_id race-condition fix.
**Requested by:** RJ, on behalf of a client — wants an admin/Compliance Manager notified by email when a trainer submits their monthly report.

---

## Scope — Phase 1 only

This PR is settings storage and UI only. **Nothing sends an email yet.** The actual send-on-submit trigger is a separate, later change — deliberately sequenced this way per RJ: confirm the settings persist correctly first, before touching anything in the trainer's submission path.

## What was built

- `tenant_governance_settings` gains two columns:
  - `notify_on_submit boolean NOT NULL DEFAULT false`
  - `notify_this jsonb NOT NULL DEFAULT '{}'::jsonb` — shape `{ legal_name, emails }`
- Two new RPCs, both gated to **Administrator and Compliance Manager only**:
  - `gov_set_trainer_report_notify_enabled(p_enabled boolean)`
  - `gov_set_trainer_report_notify_recipients(p_emails text[])`
- New Settings-tab UI on the Trainer's Report page: the existing `ReportModulesCard` (unchanged, reused as-is) plus a new `TrainerReportNotifySettingsCard` — toggle + recipient multi-select, both auto-saving (500ms debounce).

## Key design decisions

- **Narrower role gate than the existing Report Modules toggle, on purpose.** `gov_set_report_features` (existing) allows Governing Person/Administrator/Consultant/Consultant Assistant. RJ deliberately excluded Governing Person and the Consultant roles from *this* gate — his reasoning: those roles can be held by external parties, who shouldn't control notification routing. Confirmed this needed its own RPC rather than extending the existing one, since the role sets genuinely differ.
- **Two RPCs, not one**, specifically so toggling the switch off can never touch — let alone clear — the saved recipient list. `gov_set_trainer_report_notify_enabled` only ever writes `notify_on_submit`; only `gov_set_trainer_report_notify_recipients` ever writes `notify_this`. This is enforced structurally (separate functions, separate `UPDATE SET` clauses), not just by frontend discipline.
- **`notify_this` denormalizes `tenants.legal_name` and raw recipient emails**, rather than referencing `tenants`/`profiles` live. Deliberate per RJ: the eventual send-time trigger should build the notification from this one column alone, without joining elsewhere. Flagged the tradeoff once (if the tenant renames, or a recipient's email changes, this saved copy goes stale until re-saved) — RJ's call stands. `legal_name` is stamped server-side from `tenants.legal_name` inside the RPC, never trusted from the client, so it's at least correct as of the most recent save. Each email is regex-validated before saving.
- **Recipient pool for the picker** is active tenant members with role Administrator or Compliance Manager (the same roles that can edit these settings) — an inference from RJ's original framing ("an administrative role"), not explicitly confirmed; worth a quick check with him if the picker looks short or empty for a tenant.
- Frontend note: seeding local editable state from the async query result hit a lint rule (`react-hooks/set-state-in-effect`) that the existing `ReportModulesCard` precedent also violates (pre-existing debt, left alone — out of scope to fix here). The new component instead uses React's currently-recommended "adjust state during render" pattern (comparing against a `useState`-held previous value, not a `useRef`, since the stricter `react-hooks/refs` rule also blocks reading/writing refs during render).

## Blast radius

Additive only: 2 new files, 1 modified page (`TrainersReport.tsx`, adding the two settings cards to its Settings tab), 1 migration (2 new columns + 2 new functions on an existing table — no new table, no RLS change needed since these are `SECURITY DEFINER` RPCs with their own explicit role checks).

## Unrelated CI note

The migration-drift-check workflow failed on this PR for a reason unrelated to it: 3 migrations (`harden_risk_register_and_link_ci`, `drop_dead_storage_policies_on_empty_buckets`, `drop_deprecated_empty_document_tables`) were applied directly to production by Angela the same day, with no matching git file. Confirmed via the ledger (`created_by = angela@vivacity.com.au`) that this PR's own migration was correctly recognized and not implicated. RJ merged past the failing check (not a required status check). **Still outstanding, not part of this PR:** those 3 need reconciliation migration files written under their original ledger version+name per `supabase/migrations/CLAUDE.md`'s documented procedure. Flagged to RJ; not actioned here.

## Files changed

| Area | File |
|---|---|
| New hook | `src/hooks/governance/useTrainerReportNotifySettings.ts` |
| New component | `src/components/governance/TrainerReportNotifySettingsCard.tsx` |
| Settings tab wiring | `src/pages/admin/TrainersReport.tsx` |
| Migration | `supabase/migrations/20260731021216_add_trainer_report_submit_notifications.sql` |

## Decisions recorded

| Decision | Outcome |
|---|---|
| Who can edit notify settings | Administrator + Compliance Manager only — narrower than the existing Report Modules toggle, RJ's explicit call (external-role risk) |
| Migration ownership | RJ, self-taken (not flagged to Dave) |
| Store recipients as user IDs (looked up at send time) vs. raw emails | Raw emails + denormalized tenant legal_name, RJ's explicit override of the initially-proposed user-ID design — "one source at trigger time" |
| Toggle-off behaviour | Never clears the recipient list — enforced via two separate RPCs, not just UI discipline |

## Outstanding

- [ ] Phase 2: the actual send-on-submit trigger (a DB trigger on `trainer_monthly_reports`, decoupled from any specific submit RPC so it catches all known submission paths)
- [ ] Reconcile Angela's 3 direct-to-prod migrations from today (separate task, flagged not actioned)
- [ ] Manually verify the Settings tab in a browser — not yet visually tested this session
