# ComplyHub Automation & Improvement Discovery — 2 July 2026 — Session 1

**Discovered by:** Fable (claude-fable-5)
**Discovery started:** 2 July 2026
**KB load date:** KB current to 2 July 2026 (audit log through security_audit_july02.md; codebase-map dated 5 May 2026 — noted as stale)
**Codebase state:** `main` @ `5d70cfef4` (pulled 2 July 2026)
**Phases completed:** KB Load, Phase 1 (Journeys), Phase 2 (Time/Event), Phase 3 (Integration), Phase 4 (Data Lifecycle), Phase 5 (AI)
**Phases not completed:** none

---

## Executive Summary

ComplyHub's biggest automation finding is not that automation is missing — it is that it is **built but switched off**. The platform already has every piece of infrastructure a mature automation layer needs: a `pg_cron`-drained `email_outbox` queue running every minute, an `in_app_notifications` table with priority levels, a trigger-driven Stripe billing state machine, a `pg_net` event-trigger precedent (suggestion intake), and a 90-day credential expiry alert view. Yet only **one pg_cron job exists in the entire repo** (the outbox worker). Functions that were clearly written to run on a schedule — `trial-expiry-scanner`, `cron-expire-invites`, `trainer-report-reminders`, `billing.revenue_audit()` — sit dormant, waiting for someone to schedule them. The class of work most ripe for automation is deadline-driven compliance nudging: the platform already knows every expiry date, review cadence and meeting date, and simply doesn't act on them.

The highest-impact opportunities cluster around ASQA audit readiness. A trainer whose First Aid, WWCC or TAE credential lapses silently is a non-compliance finding waiting to happen; the `v_credential_expiry_alerts` view already computes the 90-day window but nothing emails anyone. The same applies to evidence sitting in `needs_review` with no reviewer notified, trainer monthly reports going overdue with no escalation, and a tenant's self-assurance score that only updates when someone remembers to click Recalculate. On the revenue side, a tenant whose card fails is put into grace by the webhook but **never told** — a churn risk that costs real subscription dollars. Each of these is measured in hours of admin checking per tenant per week, and in the harder currency of audit findings avoided.

The quickest wins need no new dependencies and could ship inside one sprint: pg_cron entries for the four dormant scheduled functions; a credential-expiry reminder that joins the existing alert view to the existing outbox; a payment-failure email added to the existing Stripe webhook; and a DB trigger that notifies the register custodian when evidence enters `needs_review`. All of them compose existing, tested pieces. The one hard precondition is Carl's in-flight security work: the 2 July security audit found 122 edge functions with `verify_jwt = false`, including `tga-rto-sync` and `enforce-billing-compliance` with **no auth at all**. No cron or webhook should be pointed at an unauthenticated function — scheduling work must land after (or alongside) the P0 hardening, using a shared-secret or direct-RPC pattern Carl approves.

On n8n: applying the decision framework honestly, **most of this platform's automation should be codebase-native**, because the stack already owns the queue, the scheduler, the webhook receiver and the event triggers, and because every automation touches tenant data that must stay under RLS or JWT-validated Edge Functions. n8n earns its place in exactly two niches: (1) internal operations alerting that touches no tenant data — migration failures, cron-job failures, Mailgun bounce-rate spikes, suggestion-SLA escalation to Slack/Teams — and (2) future multi-step outreach ladders (trial nudge sequences, consultant client check-ins) if Angela wants to own and tune those cadences without code deploys. If n8n is adopted, the security rule is absolute: it orchestrates by calling secured Edge Functions with event context only; it never holds DB credentials and never carries tenant data in its payloads or logs.

What Angela needs to decide: whether trainers and admins receive compliance reminder emails by default or opt-in (and their cadence); whether the trainer-report reminder allowlist is lifted to all tenants; whether governance stakeholders without logins may receive tokenised report links; the human-review policy for AI outputs that currently write directly to compliance records; and whether CRICOS/PRISMS and GTO support enter the roadmap at all (GTO Standards 2017 are currently entirely absent — flagged for product decision). What Carl needs to build first: the P0 auth fixes from the security audit, a `_shared/` cron-caller pattern (service-secret header validation), the pg_cron schedule entries, and roughly six small migrations adding the date columns that block automation (`next_pd_review_due`, training product review dates, tenant ASQA audit dates, evidence expiry). Everything else stacks on top of those.

---

## Opportunity Summary Table

| # | Impact | Phase | Category | Path | KB Status | One-line Summary |
|---|---|---|---|---|---|---|
| OPP-001 | High | 2 Time-Event | pg_cron | CODEBASE-NATIVE | PARTIAL | Schedule the four dormant automations (trial expiry, invite expiry, trainer reminders, revenue audit) |
| OPP-002 | High | 2 Time-Event | Notifications | CODEBASE-NATIVE | PARTIAL | Credential/currency expiry reminder pipeline from existing `v_credential_expiry_alerts` view |
| OPP-003 | High | 3 Integration | Email | CODEBASE-NATIVE | NEW-OPP | Payment-failure and billing-lifecycle emails to tenant admins from the Stripe webhook |
| OPP-004 | High | 2 Time-Event | TGA Sync | CODEBASE-NATIVE | NEW-OPP | Nightly TGA sync with staleness tracking and change detection (blocked on P0 auth fix) |
| OPP-005 | High | 1 Journey | Reporting | CODEBASE-NATIVE | NEW-OPP | Consultant portfolio compliance digest and aggregated overdue-items dashboard |
| OPP-006 | High | 1 Journey | DB Trigger | CODEBASE-NATIVE | PARTIAL | Self-assurance auto-recalculation, per-meeting snapshots and score-drop alerts |
| OPP-007 | High | 5 AI | Cost Guardrails | CODEBASE-NATIVE | NEW-OPP | Per-tenant AI usage metering and tier gating — prerequisite for all proactive AI |
| OPP-008 | Medium | 2 Time-Event | Billing | CODEBASE-NATIVE | PARTIAL | Handle `subscription.trial_will_end` and `charge.dispute.created` Stripe events |
| OPP-009 | Medium | 1 Journey | Notifications | CODEBASE-NATIVE | NEW-OPP | Notify register custodian when evidence enters `needs_review` |
| OPP-010 | Medium | 3 Integration | Email | CODEBASE-NATIVE | NEW-OPP | Evidence submission confirmation and accepted/rejected notifications to trainers |
| OPP-011 | Medium | 3 Integration | Email | CODEBASE-NATIVE | NEW-OPP | Welcome email on tenant/account creation |
| OPP-012 | Medium | 3 Integration | Email | CODEBASE-NATIVE | PARTIAL | Automated bounce/complaint suppression and delivery-health alerting on Mailgun events |
| OPP-013 | Medium | 1 Journey | Workflow | CODEBASE-NATIVE | PARTIAL | Trainer monthly report auto-drafts, submission confirmation and overdue escalation |
| OPP-014 | Medium | 1 Journey | Onboarding | CODEBASE-NATIVE | PARTIAL | Auto-import TGA scope and Stripe metadata into tenant onboarding |
| OPP-015 | Medium | 2 Time-Event | Notifications | CODEBASE-NATIVE | SCHEMA-GAP-BLOCKS-AUTOMATION | ASQA audit-date reminder emails (needs tenant audit-date columns) |
| OPP-016 | Medium | 4 Data Lifecycle | Schema | CODEBASE-NATIVE | SCHEMA-GAP-BLOCKS-AUTOMATION | Training product review cadence (no review-date columns exist) |
| OPP-017 | Medium | 4 Data Lifecycle | Schema | CODEBASE-NATIVE | SCHEMA-GAP-BLOCKS-AUTOMATION | PD review due automation using the unused `trainer_pd_review_cadence` tenant setting |
| OPP-018 | Medium | 3 Integration | Document | HYBRID | NEW-OPP | Scheduled governance pack / monthly compliance digest generation |
| OPP-019 | Medium | 3 Integration | Reporting | CODEBASE-NATIVE | NEW-OPP | Tokenised shareable compliance reports for governing persons without logins |
| OPP-020 | Medium | 5 AI | AI | CODEBASE-NATIVE | NEW-OPP | Auto-run unit risk scoring when a TAS is approved |
| OPP-021 | Medium | 5 AI | AI | CODEBASE-NATIVE | NEW-OPP | Auto-run governance meeting analyser on meeting close (review panel retained) |
| OPP-022 | Medium | 5 AI | AI | CODEBASE-NATIVE | PARTIAL | Persist document auto-tagging output on upload with review flag |
| OPP-023 | Medium | 4 Data Lifecycle | pg_cron | CODEBASE-NATIVE | NEW-OPP | Data-retention crons: hard-delete purge, activity-log archival, outbox cleanup |
| OPP-024 | Medium | 4 Data Lifecycle | pg_cron | CODEBASE-NATIVE | PARTIAL | Overdue assessment-tool validation flagging |
| OPP-025 | Low | 3 Integration | Ops Alerting | N8N-CANDIDATE | NEW-OPP | Internal ops alerts to Slack/Teams: cron failures, migration failures, bounce spikes, suggestion SLA |
| OPP-026 | Low | 3 Integration | CRICOS/GTO | — | NEEDS-ANGELA | CRICOS provider code is captured but unused; PRISMS and GTO Standards unsupported |
| OPP-027 | Low | 5 AI | AI Governance | CODEBASE-NATIVE | NEW-OPP | Human-review policy enforcement for AI functions that write directly to compliance records |

*Sorted: High impact first, then Medium, Low. Within each level, phase order.*

---

## Detailed Opportunities

### Phase 1 — Manual and Repetitive User Journeys

### Opportunity OPP-005 — Consultant portfolio compliance digest and aggregated overdue view

**Impact:** High
**Phase:** 1 Journey
**Category:** Reporting / Notifications
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP
**Roles affected:** `consultant_admin`, `consultant_member` (consume); `rto_admin` (indirectly benefits)
**Owner to implement:** NEEDS-CARL (RPC + cron) + NEEDS-RJ (dashboard UI) + NEEDS-ANGELA (digest content)

**What:** Consultants managing multiple RTOs currently switch into each tenant one at a time to check for overdue items; there is no aggregated compliance view or proactive alert across their portfolio.

**Why it matters:** This is the consultant value proposition. `useConsultantDashboard` already aggregates activity events cross-tenant, and `rpc_get_consultant_portfolio` returns the managed tenant list — but overdue trainer reports, expiring credentials, open OFIs and declining self-assurance scores are invisible until the consultant goes looking. A weekly digest plus a "top risks across my portfolio" panel converts hours of tenant-hopping into one glance, and makes ComplyHub sticky for the consultant channel Vivacity is actively building (referral pipeline shipped June 2026).

**Current state:** `src/pages/consultant/ConsultantDashboard.tsx` shows activity and subscription status per tenant; no compliance aggregation, no alerts, no report generation. Confirmed by Phase 1 sweep.

**Proposed automation:** A `rpc_get_consultant_compliance_summary` (SECURITY DEFINER, gated on consultant membership per tenant) aggregating per managed tenant: overdue trainer reports, credentials expiring ≤ 90 days, evidence in `needs_review`, open high risks, self-assurance score and trend. Surfaced two ways: a portfolio dashboard panel (RJ) and a weekly `email_outbox` digest per consultant (cron → RPC → outbox).

**Implementation path — justified:** Codebase-native. The aggregation is pure tenant data under existing consultant RLS relationships; an external orchestrator would add nothing and would have to carry tenant data. The email leg reuses the existing outbox worker.

**Dependencies:** OPP-002 (expiry data), consultant RLS access pattern (already fixed in PR #60 hardening); Angela to define digest content and cadence.

**Multi-tenancy note:** The RPC must derive the tenant list from `rpc_get_consultant_portfolio` server-side (never from the request body) and check consultant membership per tenant. Cross-tenant aggregation is by design for CAA — but only within their own portfolio.

**Effort estimate:** Multi-day.

---

### Opportunity OPP-006 — Self-assurance auto-recalculation, snapshots and score-drop alerts

**Impact:** High
**Phase:** 1 Journey
**Category:** DB Trigger / pg_cron
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** PARTIAL
**Roles affected:** `rto_admin`, `rto_manager` (governing persons consume the reports)
**Owner to implement:** NEEDS-CARL (trigger/cron) + Brian can implement the RPC wiring

**What:** The self-assurance score (`self-assurance-simulation` edge function, scorecard at `src/pages/self-assurance/index.tsx`) only recalculates when a user clicks Recalculate; there are no historical snapshots and no alert when the score declines.

**Why it matters:** Self-assurance is the ongoing-review posture ASQA expects under the Standards for RTOs 2025. A score that silently goes stale defeats its purpose; a score that drops after a new OFI or escalated risk should reach the admin without them checking. Snapshots at each governance meeting create the trend evidence RTOs present to their governing persons.

**Current state:** Live scoring engine and PDF export exist (`self-assurance-pdf`); `governance_readiness_snapshots` tables exist but are populated only by explicit RPC calls. No triggers, no schedule, no trend view. (Phase 1 + Phase 4 sweeps.)

**Proposed automation:** (a) Weekly pg_cron recalculation per active tenant writing a dated snapshot; (b) recalculation enqueued on material events — OFI closed, risk status change, improvement action completed — via lightweight AFTER-UPDATE triggers inserting into a work queue the cron drains (avoids running the full simulation inside a transaction); (c) an `in_app_notifications` alert when the score drops more than a threshold between snapshots; (d) auto-snapshot attached when a governance meeting is created.

**Implementation path — justified:** Pure tenant data plus a DB-event trigger — squarely codebase-native under the Section 4 framework. The queue-then-cron shape keeps triggers cheap.

**Dependencies:** OPP-001 (cron pattern), threshold definition from Angela (what counts as a reportable drop).

**Multi-tenancy note:** Recalculation runs per tenant_id; snapshots carry tenant_id under existing RLS. No cross-tenant reads.

**Effort estimate:** Multi-day.

---

### Opportunity OPP-009 — Evidence `needs_review` reviewer notification

**Impact:** Medium
**Phase:** 1 Journey
**Category:** Notifications / DB Trigger
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP
**Roles affected:** `rto_admin`, `rto_manager` (receive); `rto_trainer` (submits)
**Owner to implement:** NEEDS-CARL (trigger) — Brian can draft

**What:** When an evidence document enters `needs_review` status (`evidence_documents.status`, managed via `src/lib/evidence/evidenceService.ts`), no one is told; compliance managers discover pending reviews only by visiting the page.

**Why it matters:** Evidence stuck unreviewed is a direct audit-readiness gap — a credential can show "pending" at audit time simply because nobody knew to look. Review latency also blunts the value of the AI evidence classification the platform already does well.

**Current state:** Status workflow exists (pending → validated / needs_review / rejected); deduplication and record-linking are automated; no notification of any kind on state change. (Phase 1 sweep — "NO AUTOMATION FOUND" for review reminders.)

**Proposed automation:** AFTER INSERT/UPDATE trigger on `evidence_documents` where status becomes `needs_review` → insert `in_app_notifications` (category `compliance`, priority medium) for tenant admins/managers, plus an `email_outbox` row (respecting a per-tenant daily batch to avoid spam — one summary email listing all items). A weekly cron sweeps items in `needs_review` older than 7 days and escalates priority.

**Implementation path — justified:** DB-event trigger feeding existing notification rails — the textbook codebase-native case. No external system involved.

**Dependencies:** Notification preference decision (NEEDS-ANGELA: immediate vs daily batch); recipient resolution (tenant members with admin/manager roles).

**Multi-tenancy note:** Trigger operates on the row's own tenant_id; recipients resolved from `tenant_members` of that tenant only.

**Effort estimate:** Half day to full day.

---

### Opportunity OPP-013 — Trainer monthly report auto-drafts, confirmation and overdue escalation

**Impact:** Medium
**Phase:** 1 Journey
**Category:** Workflow / Email
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** PARTIAL
**Roles affected:** `rto_trainer` (submits), `rto_admin`/`rto_manager` (review)
**Owner to implement:** NEEDS-ANGELA (lift allowlist, define escalation) + Brian can implement

**What:** Reminders at 7/3/1 days before the governance meeting already exist (`send-trainer-report-reminder`, `monthly-report-reminders`, RPC `process_trainer_report_reminders`), but there is no auto-created draft at period start, no pre-population from delivery data, no submission confirmation to the trainer, and no escalation to the manager when a report goes overdue.

**Why it matters:** Trainer reports feed the governance meeting pack; a missing report degrades the meeting and the compliance record. Escalation closes the loop the reminders start. Note two blockers found in the audit log: the reminder email allowlist currently contains **a single test address** (needs Angela/Dave to extend to production tenants), and PR #79 noted the email wording still says "month" although periods are now meeting-anchored.

**Current state:** Reminder functions and suppression logic are solid (fixed in `20260626000002`); reminders are in-app + email; **the reminder function itself is not on a pg_cron schedule** (Phase 2 sweep) and the allowlist gates it to one address.

**Proposed automation:** (a) Schedule the reminder RPC daily (folded into OPP-001); (b) on governance meeting creation, auto-insert draft `trainer_monthly_reports` rows for active trainers; (c) submission confirmation via `email_outbox` on status → submitted; (d) day-after-meeting cron marks unsubmitted reports overdue and notifies the admin; (e) fix the "month" wording; (f) lift the allowlist.

**Implementation path — justified:** Every trigger is a DB event or schedule on tenant data — codebase-native. An n8n escalation ladder is not justified while the ladder is two steps.

**Dependencies:** OPP-001; Angela sign-off on allowlist lift and escalation recipients.

**Multi-tenancy note:** All queries already scope by tenant_id and meeting_id; no change to the isolation model.

**Effort estimate:** Full day.

---

### Opportunity OPP-014 — Onboarding pre-population from TGA and Stripe

**Impact:** Medium
**Phase:** 1 Journey
**Category:** Onboarding
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** PARTIAL
**Roles affected:** `rto_admin` (new tenants), `super_admin` (provisioning)
**Owner to implement:** NEEDS-RJ (wizard UX) + Brian can implement the sync call

**What:** The onboarding checklist (`src/config/onboardingSteps.ts`) auto-detects completed steps, but the admin still types organisation details the platform can already fetch: TGA scope import is a manual button, and Stripe metadata (org name, billing email, tier) is not fed into the settings form.

**Why it matters:** First-session experience for every new tenant. An RTO code entered once should cascade: legal name, ABN, scope of registration, training products — all fetchable from TGA. Every pre-filled field is a step the auto-detector can mark complete, shortening time-to-value on trials.

**Current state:** `tga-rto-sync` can populate `tenants.legal_name`/`abn` on demand; onboarding auto-detect conditions exist per step; nothing chains them. (Phase 1 sweep.)

**Proposed automation:** On tenant creation with an RTO code (or when the code is first entered), automatically invoke the TGA sync and product import, then let the existing auto-detect mark steps complete. Pre-fill billing email and organisation name from the Stripe customer where a subscription exists.

**Implementation path — justified:** One Edge Function call chained on an existing event, behind JWT + tenant membership — codebase-native. **Blocked on the P0 auth fix to `tga-rto-sync`** (currently unauthenticated; do not chain automations onto it until hardened).

**Dependencies:** Security audit P0 fix (Carl); PD-005 note — TGA data accuracy remains TGA's responsibility, display as synced.

**Multi-tenancy note:** Sync writes only to the requesting tenant's row; tenant_id derived from the authenticated context, never the request body (this is precisely what the current unauthenticated function gets wrong).

**Effort estimate:** Full day (after the auth fix).

---

### Phase 2 — Time- and Event-Driven

### Opportunity OPP-001 — Schedule the four dormant automations

**Impact:** High (quick win)
**Phase:** 2 Time-Event
**Category:** pg_cron
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** PARTIAL (functions exist; schedules do not)
**Roles affected:** all tenant roles (trial expiry, invites); `rto_trainer` (reminders); platform (revenue audit)
**Owner to implement:** NEEDS-CARL (cron entries are his domain)

**What:** Four production-ready scheduled behaviours exist as callable functions but have no schedule: `trial-expiry-scanner` (trial lock + notifications), `cron-expire-invites` / `rpc_invites_expire_stale` (invitation hygiene), `process_trainer_report_reminders` (report nudges), and `billing.revenue_audit()` (grace/suspension state transitions). Trial expiry is currently enforced only by **client-side polling** (`useTrialExpirationCheck`, 15-second stale time) — an expired trial that never opens the app is never locked.

**Why it matters:** This is the single highest ratio of value to effort in the platform: the logic is written, reviewed and in production; only the timer is missing. Server-side trial enforcement also closes a revenue-integrity hole.

**Current state:** Exactly one pg_cron job exists (`20260618021900_schedule_email_outbox_worker.sql`, every minute). Historical cron definitions were archived to stop branch-DB pollution (`_archive/20260526120000_cron_env_guard.sql`). (Phase 2 + Phase 4 sweeps.)

**Proposed automation:** One migration adding cron entries — trial scanner daily 06:00 AEST; invite expiry daily 00:30; trainer reminders daily 08:00 AEST; revenue audit daily 05:00 — each calling its function via the pattern Carl approves (preferred: `cron.schedule` → `net.http_post` to the Edge Function **with a service-secret header the function validates**, or direct `SELECT rpc(...)` for the pure-SQL ones, avoiding HTTP entirely).

**Implementation path — justified:** Scheduling existing stack components is definitionally codebase-native. n8n as an external timer would add a dependency to gain nothing.

**Dependencies:** ⚠️ **CARL-RULE-VIOLATION risk if done naively:** the earlier outbox cron hardcoded the production URL and anon key and had to be fixed (`20260622000000`); and several target functions are `verify_jwt = false` — `enforce-billing-compliance` has **no auth at all** (security audit Finding 016). Harden first, then schedule. Also respect the branch-DB env guard so crons don't fire from branch databases.

**Multi-tenancy note:** All four functions iterate tenants internally under service context; they must validate their caller (shared secret) since cron is not a JWT context. No tenant data leaves the platform.

**Effort estimate:** Half day (given auth fixes land separately).

---

### Opportunity OPP-002 — Credential and currency expiry reminder pipeline

**Impact:** High
**Phase:** 2 Time-Event
**Category:** Notifications / Email
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** PARTIAL (alert view + dashboard exist; no outbound notification)
**Roles affected:** `rto_trainer` (own credentials), `rto_admin`/`rto_manager` (register health)
**Owner to implement:** NEEDS-CARL (cron + RPC) — Brian can draft the RPC

**What:** `v_credential_expiry_alerts` already computes credentials expiring within 90 days (TAE, WWCC, First Aid, CPR, matrix credentials) and the super-admin dashboard reads it — but no trainer or admin is ever notified.

**Why it matters:** An expired WWCC or First Aid certificate on a delivering trainer is an immediate ASQA non-compliance exposure. This is the canonical "the platform knows and doesn't tell anyone" case, and the highest-weight compliance nudge in the whole discovery per Section 11 rule 6.

**Current state:** View exists in the baseline schema; `sa_dashboard_health` counts `credential_expiry_90d`; industry currency dates live in `trainer_industry_currency`. No reminder function, no schedule. (Phase 2 sweep.)

**Proposed automation:** Daily pg_cron → RPC that selects from the alert view at T-90/T-30/T-7 thresholds, inserts `in_app_notifications` for the trainer and the tenant's admins, and queues `email_outbox` rows (template `credential_expiry_reminder`) with idempotency keys of `(credential_id, threshold)` so each threshold fires exactly once. Extend the same sweep to industry-currency staleness (no activity in N months, tenant-configurable).

**Implementation path — justified:** Deadline scan + existing queue = codebase-native. Escalation is a threshold ladder inside one RPC, not a workflow engine.

**Dependencies:** OPP-001 cron pattern; email template; Angela: default thresholds and whether trainers can opt out.

**Multi-tenancy note:** The sweep RPC iterates per tenant; every notification row carries the source row's tenant_id; recipients resolved from that tenant's members only.

**Effort estimate:** Full day.

---

### Opportunity OPP-004 — Nightly TGA sync with staleness tracking and change detection

**Impact:** High
**Phase:** 2 Time-Event
**Category:** TGA Sync
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP (sync exists; scheduling/diffing does not)
**Roles affected:** `rto_admin` (scope accuracy), `rto_trainer` (qualification validity flags)
**Owner to implement:** NEEDS-CARL (P0 auth fix is a hard precondition, then cron)

**What:** All TGA sync functions (`tga-rto-sync`, `tga-sync-products`, `tga-batch-sync` — even one named `tga-sync-nightly-local`) are manual-only; there is no `last_synced_at` staleness tracking, no diff against the previous sync, and no downstream flag when a qualification or scope item changes on Training.gov.au.

**Why it matters:** Scope of registration is the legal boundary of what an RTO may deliver. A superseded qualification or a scope change that ComplyHub shows stale undermines the platform's core promise. Change detection also unlocks a genuinely differentiating alert: "unit X on your scope was superseded this week — these 3 TAS documents and 2 trainer mappings reference it."

**Current state:** On-demand only; no staleness columns; no diffing; and `tga-rto-sync` is **unauthenticated** (security audit Finding 003 — anyone can trigger a service-role write for any tenant). (Phase 2 sweep + audit log.)

**Proposed automation:** After hardening: nightly batch sync per active tenant (stagger to respect TGA API limits), write `last_synced_at` per tenant/product, diff key fields (status, currency, packaging) against prior values, and on change insert `in_app_notifications` + queue admin email listing affected TAS documents and trainer unit mappings.

**Implementation path — justified:** Scheduled tenant-data operation → codebase-native. PD-005 holds: ComplyHub reports what TGA returns; the automation is about freshness and awareness, not correcting TGA.

**Dependencies:** P0 auth fix (Carl); `last_synced_at` columns (small migration); TGA API rate limits (verify).

**Multi-tenancy note:** Batch runs iterate tenants server-side; per-tenant writes only. The current body-supplied `tenantId` pattern must be eliminated as part of the auth fix.

**Effort estimate:** Multi-day.

---

### Opportunity OPP-008 — Close the Stripe webhook event gaps

**Impact:** Medium
**Phase:** 2 Time-Event
**Category:** Billing
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** PARTIAL
**Roles affected:** `rto_admin` (billing outcomes), platform revenue ops
**Owner to implement:** NEEDS-CARL (stripe-webhook is reference code he owns)

**What:** `stripe-webhook/index.ts` handles checkout, subscription create/update/delete, invoice paid/failed — but ignores `customer.subscription.trial_will_end` (Stripe fires it 3 days before trial end) and `charge.dispute.created`, and applies no action to other persisted events.

**Why it matters:** `trial_will_end` is a free, reliable upgrade-nudge trigger that currently goes unused (the trial nudge UI is client-side polling). Disputes are rare but time-boxed — missing the window costs the revenue outright.

**Current state:** Signature verification, idempotency and raw-event persistence are exemplary (Carl's reference implementation); the two events fall through to "logged, no action". (Phase 2 sweep.)

**Proposed automation:** `trial_will_end` → queue upgrade-nudge email + `system_notifications` row; `dispute.created` → immediate internal alert (email to billing owner; Slack if OPP-025 lands).

**Implementation path — justified:** Two new cases in an existing, well-built webhook — codebase-native by any reading of the framework.

**Dependencies:** Email templates; entity note — ComplyHub.ai Pty Ltd is the billing entity for all of this.

**Multi-tenancy note:** Webhook already resolves tenant from Stripe customer mapping; unchanged.

**Effort estimate:** Half day.

---

### Opportunity OPP-015 — ASQA audit-date reminders

**Impact:** Medium
**Phase:** 2 Time-Event
**Category:** Notifications
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** SCHEMA-GAP-BLOCKS-AUTOMATION
**Roles affected:** `rto_admin`, governing persons
**Owner to implement:** NEEDS-CARL + Dave (migration), then Brian

**What:** `create_non_rto_calendar_events(p_target_audit_date)` generates 12/6/3/1-month pre-audit calendar milestones at setup, but `tenants` has no `next_asqa_audit_date` column, no sweep emails against those milestones, and nothing regenerates events if the date changes.

**Why it matters:** Audit preparation is the single most calendar-predictable event in an RTO's life and the reason they buy the product.

**Current state:** Calendar events on setup only; audit readiness computed on-read by `rpc_sa_dashboard_health`; no persistent tenant-level audit dates. (Phase 2 + 4 sweeps.)

**Proposed automation:** Migration adds `next_asqa_audit_date` (and optionally `last_asqa_audit_date`) to `tenants`; daily sweep emails admins at the milestone offsets; optionally auto-generate the audit pack (`generate-audit-pack`) at T-30 (links to OPP-018).

**Implementation path — justified:** Deadline sweep on tenant data — codebase-native. Gap-fill rule from CLAUDE.local.md applies if any of this already exists in production without a migration file.

**Dependencies:** Migration (rollback plan mandatory per guardrails); Angela: who sets the audit date and milestone content.

**Multi-tenancy note:** Per-tenant column, per-tenant sweep; standard isolation.

**Effort estimate:** Full day including migration.

---

### Phase 3 — Cross-System Integration

### Opportunity OPP-003 — Payment-failure and billing-lifecycle emails

**Impact:** High
**Phase:** 3 Integration
**Category:** Email
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP
**Roles affected:** `rto_admin` (billing contact)
**Owner to implement:** NEEDS-CARL (webhook edit) — Brian can draft

**What:** `invoice.payment_failed` correctly moves the tenant into grace/past-due — but no email tells the tenant. They discover it via the in-app payment bar, or not at all if nobody logs in during the grace window.

**Why it matters:** This is silent churn. A failed card is usually an expiry, fixable in one click if the customer knows. Every tenant that slides from grace to suspended without an email is avoidable lost revenue, and an avoidable support escalation ("why are we locked out?").

**Current state:** Webhook state machine complete; `send-test-invoice` and `_shared/send-invoice-email.ts` exist as manual/test paths only; no automated billing emails of any kind. (Phase 3 sweep — flagged CRITICAL gap.)

**Proposed automation:** From the existing webhook handlers, queue `email_outbox` rows on: `payment_failed` (with update-payment-method link via `stripe-create-portal-session`), grace entered (days remaining), suspension applied, and payment recovered (confirmation). Idempotency key per (invoice, event) — the outbox already dedupes.

**Implementation path — justified:** Event source, state machine and email queue all already exist in-stack; this is wiring, not building. n8n would only add a place for tenant billing data to leak into external logs.

**Dependencies:** Email templates (ComplyHub.ai entity branding); grace-period lengths documented (billing enum already models grace).

**Multi-tenancy note:** Recipient is the tenant's own billing email from its `tenants` row; no cross-tenant surface.

**Effort estimate:** Full day.

---

### Opportunity OPP-010 — Evidence submission confirmation and outcome notifications

**Impact:** Medium
**Phase:** 3 Integration
**Category:** Email
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP
**Roles affected:** `rto_trainer` (receives), `rto_admin`/`rto_manager` (their accept/reject actions trigger it)
**Owner to implement:** Brian can implement (trigger + templates); NEEDS-ANGELA (tone/cadence)

**What:** Trainers who submit evidence receive no confirmation, and no notification when their evidence is validated or rejected — they must poll the portal.

**Why it matters:** Reduces trainer burden and "did you get my certificate?" emails to admins. Rejection latency is compliance latency: an unnoticed rejection means the gap it represents stays open.

**Current state:** `send-document-notification` exists for generic document events; nothing fires on `evidence_documents` status transitions. (Phase 3 sweep.)

**Proposed automation:** Status-transition trigger on `evidence_documents` → `email_outbox` (submitted → confirmation; validated → accepted notice; rejected → notice with reviewer comment and resubmission link) + matching `in_app_notifications`. Pairs with OPP-009 (the reviewer-side alert).

**Implementation path — justified:** Same trigger→outbox rail as OPP-009; codebase-native.

**Dependencies:** OPP-009 trigger scaffolding; templates.

**Multi-tenancy note:** Recipient is the evidence row's owning trainer within its tenant; standard RLS.

**Effort estimate:** Half day (on top of OPP-009).

---

### Opportunity OPP-011 — Welcome email on account/tenant creation

**Impact:** Medium
**Phase:** 3 Integration
**Category:** Email
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP
**Roles affected:** all new users; `rto_admin` for new tenants
**Owner to implement:** Brian can implement; NEEDS-ANGELA (content)

**What:** New users get a verification email (Supabase Auth) but no welcome/orientation email; new trial tenants get no "here's how to start" sequence beyond the in-app checklist.

**Why it matters:** Trial activation. The onboarding checklist is good but only works if the user comes back; a welcome email carrying the first three checklist actions (and the Clarity Call booking link where relevant) is the cheapest activation lever available.

**Current state:** `trial-email-automation` has milestone logic (7d/1d) but no day-0 welcome; demo/trial creation functions send nothing. (Phase 3 sweep.)

**Proposed automation:** On tenant creation / first admin login, queue a welcome email; optionally a short drip (day 0, day 3 if checklist < 30% complete) — the drip cadence is where n8n *could* live later if Angela wants no-deploy tuning, but two fixed emails don't justify it yet.

**Implementation path — justified:** Single event → outbox; codebase-native now, revisit if the sequence grows beyond ~3 steps.

**Dependencies:** Angela: copy and whether the drip exists at all.

**Multi-tenancy note:** Trivial — recipient is the new user themselves.

**Effort estimate:** Half day.

---

### Opportunity OPP-012 — Automated bounce/complaint handling and delivery health

**Impact:** Medium
**Phase:** 3 Integration
**Category:** Email
**Recommended Path:** CODEBASE-NATIVE (suppression) + N8N-CANDIDATE (ops alerting leg)
**KB Status:** PARTIAL
**Roles affected:** platform ops; all email recipients indirectly
**Owner to implement:** NEEDS-CARL (webhook + outbox worker changes)

**What:** `mailgun-delivery-webhook` verifies signatures and records events, but only updates `user_invitations.delivery_status`; hard bounces and spam complaints don't suppress future sends, and nobody is alerted when delivery health degrades.

**Why it matters:** Every automation in this report multiplies email volume. Sending to known-bad addresses degrades Mailgun sender reputation, which then degrades delivery of *everything* — including invitations and payment-failure notices. Suppression is table stakes before scaling outbound.

**Current state:** `email_events` captures raw events; `email_outbox` worker sends without checking any suppression state; no complaint handling; `check-mailgun-status` is a manual admin lookup. (Phase 3 sweep + audit-log gap list.)

**Proposed automation:** (a) `email_suppressions` table (address, reason, source event, timestamp); webhook writes it on hard bounce/complaint; outbox worker checks it before sending and marks skipped rows. (b) Daily health check: bounce rate over trailing 24 h above threshold → internal alert (email now; Slack via OPP-025 later).

**Implementation path — justified:** Suppression must sit inside the send path — codebase-native by necessity. The alerting leg touches no tenant data, so n8n is acceptable there if adopted.

**Dependencies:** none hard; migration for the suppression table (rollback plan required).

**Multi-tenancy note:** Suppression is keyed on email address at platform level; it stores addresses only, no tenant content.

**Effort estimate:** Full day.

---

### Opportunity OPP-018 — Scheduled governance pack and compliance digest generation

**Impact:** Medium
**Phase:** 3 Integration
**Category:** Document
**Recommended Path:** HYBRID (codebase-native generation; n8n optional for distribution cadence)
**KB Status:** NEW-OPP
**Roles affected:** `rto_admin`, governing persons; `consultant_admin` (client packs)
**Owner to implement:** NEEDS-ANGELA (what ships automatically) + NEEDS-CARL (schedule)

**What:** Every export (`generate-meeting-pack`, `generate-audit-pack`, `self-assurance-pdf`, `export-meeting-report`, `tas-export-pdf`, `generate-dap-docx`) is click-to-download only; nothing is generated on a schedule or on an event (e.g. audit pack at T-30 before an audit date, meeting pack 48 h before a scheduled meeting).

**Why it matters:** Governing persons meet on a rhythm the platform already stores (`governance_meetings.meeting_date`). Auto-generating the pack 48 hours prior — and emailing it to attendees — removes the most time-pressured manual task in the governance cycle.

**Current state:** All generation on-demand; no scheduled or event-triggered documents anywhere. (Phase 3 sweep.)

**Proposed automation:** Event-triggered generation: meeting scheduled → T-48h cron slot generates the pack, stores it against the meeting, queues email with a link (in-app download, not attachment — keeps documents behind auth). Audit pack at T-30 per OPP-015. Consultant monthly client digest per OPP-005.

**Implementation path — justified:** Generation must run in Edge Functions under tenant context (it reads registers). Distribution cadence could be n8n later, but the trigger data (meeting dates) is already in the DB, so cron is simpler and keeps tenant data internal — hybrid only if Angela wants configurable cadences without deploys.

**Dependencies:** OPP-001 cron; Angela: which documents auto-generate and who receives links.

**Multi-tenancy note:** Documents stored in the tenant's own storage path behind the existing storage-gateway pattern; emails carry links requiring login, never attachments.

**Effort estimate:** Multi-day.

---

### Opportunity OPP-019 — Tokenised shareable reports for governing persons without logins

**Impact:** Medium
**Phase:** 3 Integration
**Category:** Reporting
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP
**Roles affected:** governing persons (external), `rto_admin` (issues links), `consultant_admin` (client reporting)
**Owner to implement:** NEEDS-ANGELA (product/security decision first) + NEEDS-CARL (pattern review)

**What:** There is no way to show a compliance summary to a governing person or client stakeholder who has no ComplyHub seat — yet the platform already proved the tokenised public-access pattern with QI survey links (`qi_survey_links`: UUID slug, `expires_at`, `is_active`, anon RLS).

**Why it matters:** Governance oversight under the Standards involves people who will never log into a compliance tool. A read-only, expiring, revocable report link (self-assurance scorecard, meeting pack summary) extends the product to them without seat cost or auth friction — and for consultants it becomes the client-facing deliverable.

**Current state:** QI survey links pattern shipped June 2026 and is production-tested (including the anon `expires_at` RLS fix `20260629000200`); nothing equivalent exists for reports. (Phase 3 sweep.)

**Proposed automation:** `report_share_links` table cloning the QI pattern (token slug, report type, tenant_id, expires_at, revocation, access logging); public page renders a snapshot (not live data — generate at share time so the link can't become a live window into the tenant).

**Implementation path — justified:** Pure in-stack reuse of a proven pattern. Snapshot-at-share-time is the key isolation decision: the token exposes a frozen artefact, not a query path.

**Dependencies:** NEEDS-ANGELA — this deliberately exposes tenant-derived data outside auth; scope, expiry defaults, and watermarking are product/regulatory calls. De-identification rules apply to anything a consultant shares onward.

**Multi-tenancy note:** Token → single tenant's single snapshot; access logged; expiring and revocable. Follows and extends a pattern that already passed the team's RLS review cycle.

**Effort estimate:** Multi-day.

---

### Opportunity OPP-025 — Internal ops alerting (Slack/Teams)

**Impact:** Low (platform-facing, not customer-facing — but protects everything else)
**Phase:** 3 Integration
**Category:** Ops Alerting
**Recommended Path:** N8N-CANDIDATE
**KB Status:** NEW-OPP
**Roles affected:** internal team only (Carl, Dave, Brian; Angela for product-visible incidents)
**Owner to implement:** NEEDS-CARL (owns CI/infra surface)

**What:** Operational failures are discovered retroactively: the Aug 2025 index-sweep migration failure sat unnoticed; cron jobs "can silently fail" (architecture.md's own words); suggestion-intake alerts land in inboxes with no SLA follow-up; Mailgun delivery degradation has no tripwire.

**Why it matters:** Every automation this report proposes adds a scheduled or event-driven component that can silently fail. An alerting channel is the insurance policy on the whole program.

**Current state:** No outbound Slack/Teams/webhook integrations exist anywhere in the codebase (Phase 3 sweep — confirmed none). GitHub Actions exist for CI (`migration-drift-check.yml`, `deploy-edge-functions.yml` — both new on main as of this week) and can alert natively for CI-side failures.

**Proposed automation:** Route to Slack/Teams: pg_cron job failures (query `cron.job_run_details` for recent failures via a watchdog), migration/deploy workflow failures (GitHub Actions native Slack step — no n8n needed there), bounce-rate threshold breaches (OPP-012), suggestion tickets unanswered > 24 h.

**Implementation path — justified:** This is the honest n8n fit under Section 4: three-plus systems (Supabase, GitHub, Mailgun, Slack), retry/error branches, zero tenant data. Equally, a minimal version is achievable with GitHub Actions + one watchdog Edge Function — so n8n adoption can be deferred until the alert count justifies a dashboard. Payloads must carry event context only (job name, status, counts) — never tenant rows.

**Dependencies:** Team Slack/Teams workspace decision; n8n hosting decision if chosen (self-hosted vs cloud — self-hosted keeps everything in-region).

**Multi-tenancy note:** No tenant data may appear in alert payloads. Counts and job names only. This is what makes n8n acceptable here.

**Effort estimate:** Full day (minimal GitHub-Actions version) / multi-day (n8n).

---

### Opportunity OPP-026 — CRICOS/PRISMS and GTO support decision

**Impact:** Low today (product-scope gap, potentially High if those segments matter)
**Phase:** 3 Integration
**Category:** CRICOS/GTO
**Recommended Path:** — (decision precedes design)
**KB Status:** NEEDS-ANGELA
**Roles affected:** prospective CRICOS/GTO tenants
**Owner to implement:** NEEDS-ANGELA

**What:** `tenants.cricos_provider_code` is captured (via the June gap-fill migration) but **never read anywhere in the codebase**; `training_products.cricos_course_code` flows into TAS documents, but there is no National Code 2018 logic, no PRISMS integration, and no GTO (National Standards for GTOs 2017) support at all.

**Why it matters:** If any current or target tenant is a CRICOS provider, the platform silently under-serves their obligations while appearing to capture the data (the unused column implies support that doesn't exist). GTOs are governed by a different standards framework entirely — RTO Standards must not be applied to them.

**Current state:** Data columns without behaviour. (Phase 3 sweep.)

**Proposed automation:** None yet — this is a scope decision. If in scope: PRISMS-adjacent reminders and National Code obligation tracking become a Phase 2-style deadline automation family. If out of scope: remove or clearly label the CRICOS field to avoid implying coverage.

**Implementation path — justified:** Deferred until the decision.

**Dependencies:** Angela's product/regulatory call.

**Multi-tenancy note:** n/a at this stage.

**Effort estimate:** Needs team discussion.

---

### Phase 4 — Data Lifecycle

### Opportunity OPP-023 — Data-retention crons: hard-delete purge, log archival, outbox cleanup

**Impact:** Medium
**Phase:** 4 Data Lifecycle
**Category:** pg_cron
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP
**Roles affected:** none directly (platform hygiene); all indirectly via performance
**Owner to implement:** NEEDS-CARL + Dave (retention policy sign-off)

**What:** Soft delete works (archive RPCs, 24 h undo, `hard_delete_after`), but nothing ever purges rows past `hard_delete_after`; `auth_activity_log`, `activity_log`, `ai_tagging_audit`, `complybot_messages`, `email_events`, `suggestion_activity_log` and sent/failed `email_outbox` rows grow without bound. The just-landed `20260702032411_gap_fill_drop_smoke_log.sql` (dropping an unbounded debug table) shows the cost of not having a policy.

**Why it matters:** Unbounded logs degrade dashboard queries (`auth_activity_log` feeds `sa_dashboard_health`) and inflate storage; unpurged "deleted" records are also a data-minimisation liability — a tenant that deleted a trainer record reasonably expects it gone after the undo window.

**Current state:** Zero cleanup crons. (Phase 4 sweep — "NOTHING AUTOMATED FOR LOG CLEANUP".)

**Proposed automation:** Nightly purge of rows past `hard_delete_after`; retention windows per log table (proposal for Dave: `auth_activity_log`/`activity_log` 90 days hot then archive/delete; `email_outbox` sent rows 30 days; `email_events` 12 months; AI audit tables 12 months); each implemented as a small SECURITY DEFINER cleanup RPC on a shared nightly schedule, logging counts to `system_logs`.

**Implementation path — justified:** Pure DB maintenance — pg_cron is the only sensible home.

**Dependencies:** Retention policy sign-off (Dave/Angela — some AI audit trails may have compliance-evidence value and need longer windows); migration with rollback plan.

**Multi-tenancy note:** Purges operate on age and lifecycle flags, never on tenant boundaries; no isolation surface.

**Effort estimate:** Full day.

---

### Opportunity OPP-016 — Training product review cadence

**Impact:** Medium
**Phase:** 4 Data Lifecycle
**Category:** Schema
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** SCHEMA-GAP-BLOCKS-AUTOMATION
**Roles affected:** `rto_admin`, `rto_manager`
**Owner to implement:** NEEDS-CARL + Dave (migration), NEEDS-ANGELA (cadence policy)

**What:** `training_products` has no `last_review_date` / `next_review_due` columns, so no review-cycle automation can exist. RPCs like `get_document_compliance` derive review dates from related tables rather than the product itself.

**Why it matters:** Product review on a defined cycle is core self-assurance behaviour; today the platform cannot even represent "this product is due for review", let alone nudge on it.

**Current state:** Nothing exists (Phase 2 + Phase 4 sweeps agree).

**Proposed automation:** Migration adds the two columns (+ tenant-level default cadence); the OPP-002 daily sweep gains a product-review threshold; overdue products surface on the compliance dashboard.

**Implementation path — justified:** Schema first, then it joins the existing deadline-sweep family.

**Dependencies:** Angela: default cadence (annual?), whether TGA change events (OPP-004) should reset/force a review.

**Multi-tenancy note:** Columns on tenant-scoped rows; standard RLS.

**Effort estimate:** Half day after policy decision.

---

### Opportunity OPP-017 — PD review due automation (the unused `trainer_pd_review_cadence`)

**Impact:** Medium
**Phase:** 4 Data Lifecycle
**Category:** Schema / Notifications
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** SCHEMA-GAP-BLOCKS-AUTOMATION (cadence setting exists; per-trainer due date does not)
**Roles affected:** `rto_trainer`, `rto_admin`
**Owner to implement:** NEEDS-CARL + Dave (migration) — Brian can draft

**What:** `tenants.trainer_pd_review_cadence` exists (added in the June schema-drift gap-fill) but is referenced by no trigger, RPC or UI; trainers have `last_vet_pd_date` / `last_industry_pd_date` but no `next_pd_review_due`, so PD-due reminders cannot be computed reliably.

**Why it matters:** PD currency is a Standards obligation and one of the most common audit findings. The tenant-level setting exists precisely for this and is dead weight until wired.

**Current state:** Setting stored, never read; PD recommendation AI (`generate-pd-recommendations`) exists on demand. (Phase 4 + Phase 1 sweeps.)

**Proposed automation:** Migration adds `next_pd_review_due` to `tp_trainers`, maintained by trigger from PD event inserts + the tenant cadence; the daily sweep (OPP-002) notifies at T-30/T-7 and flags overdue on the trainer matrix; optionally chain `generate-pd-recommendations` into the reminder so the nudge arrives with concrete suggested PD (human reviews before anything is recorded — see OPP-027).

**Implementation path — justified:** Trigger-maintained derived date + shared sweep; textbook codebase-native.

**Dependencies:** Migration (rollback plan); Angela: cadence defaults and reminder recipients.

**Multi-tenancy note:** Per-tenant cadence, per-trainer dates, standard RLS.

**Effort estimate:** Full day.

---

### Opportunity OPP-024 — Overdue assessment-tool validation flagging

**Impact:** Medium
**Phase:** 4 Data Lifecycle
**Category:** pg_cron / Notifications
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** PARTIAL
**Roles affected:** `rto_admin`, `rto_manager`
**Owner to implement:** Brian can implement once OPP-001/002 rails exist

**What:** `next_validation_due` on assessment tools is trigger-maintained (`trg_propagate_assessment_tool_validation`, migration `20260618022300`), but nothing flags or notifies when it passes.

**Why it matters:** Assessment validation on schedule is a direct Standards requirement, and the AI risk scorer already recommends validation frequencies — the loop just never closes.

**Current state:** Column maintained; no consumer. (Phase 4 sweep.)

**Proposed automation:** Add assessment-tool thresholds to the OPP-002 daily sweep (T-30 reminder, overdue flag + admin notification); surface overdue count on the compliance dashboard.

**Implementation path — justified:** Joins the shared sweep; no new machinery.

**Dependencies:** OPP-001/OPP-002.

**Multi-tenancy note:** Standard tenant-scoped rows.

**Effort estimate:** < 1 hour once the sweep exists.

---

### Phase 5 — AI-Assisted

### Opportunity OPP-007 — Per-tenant AI usage metering and tier gating (prerequisite)

**Impact:** High (as an enabler and cost-risk control)
**Phase:** 5 AI
**Category:** Cost Guardrails
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP
**Roles affected:** all AI-using roles; platform economics
**Owner to implement:** NEEDS-CARL (shared middleware) + NEEDS-ANGELA (tier policy)

**What:** 87 AI functions call Claude (plus GPT-4.1 and Perplexity in places) with **no per-tenant quota, no token accounting on the core paths, and no subscription-tier gating** — `record_ai_usage` exists but is called only by the regulatory-analysis functions; `billing-gate` gates platform access, not AI.

**Why it matters:** Every proactive-AI idea below multiplies call volume from "when a user clicks" to "whenever data changes". Without metering, one busy tenant on a starter plan can consume unbounded Anthropic spend, and Angela cannot price AI into tiers. This must land before any AI automation is switched on — it is also why several Phase 5 items are sequenced behind it.

**Current state:** Rate limits are per-function ad hoc (e.g. suggestion-triage 3/24 h); Anthropic 429/402 handled reactively; no `ai_usage` ledger on ai-router or the generate-* fleet. (Phase 5 sweep.)

**Proposed automation:** A `_shared/aiUsage.ts` wrapper (fits Carl's Milestone-4 `_shared/` plan) that every LLM call goes through: records tenant_id, function, model, input/output tokens (from the API response) into an `ai_usage` table; checks a per-tenant monthly budget by tier before calling; returns a friendly "AI allowance reached" error. Super-admin dashboard panel for spend per tenant.

**Implementation path — justified:** Must sit inside the call path — only codebase-native works. Incremental adoption function-by-function as files are touched, per Carl's "replace anti-patterns as you touch" rule.

**Dependencies:** Carl's `_shared/` milestone (due late July); Angela: tier allowances; migration for `ai_usage` (rollback plan).

**Multi-tenancy note:** Usage rows are tenant-scoped accounting metadata; no content stored — prompts stay out of the ledger.

**Effort estimate:** Multi-day (wrapper + table + first 5 functions), then incremental.

---

### Opportunity OPP-020 — Auto unit risk scoring on TAS approval

**Impact:** Medium
**Phase:** 5 AI
**Category:** AI
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP
**Roles affected:** `rto_admin`, `rto_manager` (validation planning)
**Owner to implement:** Brian can implement after OPP-007

**What:** `ai-unit-risk-scorer` (Haiku, heuristic fallback) scores units for validation frequency only when a user asks; scoring could fire automatically when a TAS is approved or a unit is added to scope, pre-populating the validation schedule.

**Why it matters:** The score is cheap (Haiku, small payload), the trigger moment is unambiguous, and the output directly feeds OPP-024's validation deadlines — chaining AI scoring → `next_validation_due` → sweep-driven reminders closes an entire compliance loop with no human data entry.

**Current state:** On-demand via `useUnitValidationSchedule`; returns JSON, writes nothing. (Phase 5 sweep.)

**Proposed automation:** On TAS status → approved (DB trigger → queue), score the build's units and write proposed frequencies flagged `ai_suggested = true`; admin confirms in the existing schedule UI (human-in-the-loop preserved because the result affects compliance planning).

**Implementation path — justified:** DB-event trigger + existing function; latency irrelevant (async); costs bounded by OPP-007.

**Dependencies:** OPP-007 metering; a suggested/confirmed flag on the schedule rows.

**Multi-tenancy note:** Scoring input is the tenant's own unit list; results tenant-scoped.

**Effort estimate:** Full day.

---

### Opportunity OPP-021 — Auto-run governance meeting analysis on meeting close

**Impact:** Medium
**Phase:** 5 AI
**Category:** AI
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP
**Roles affected:** `rto_admin`, governing persons
**Owner to implement:** Brian can implement after OPP-007; NEEDS-ANGELA (confirm review stays mandatory)

**What:** `governance-meeting-analyser` extracts decisions/actions from minutes but must be manually invoked; it could fire automatically when a meeting is marked completed with minutes attached — while keeping `AIOutputReviewPanel` approval before anything writes to `governance_actions`.

**Why it matters:** The review panel is the platform's best human-in-the-loop pattern; auto-running the *analysis* (not the commit) means the admin opens a pre-analysed meeting instead of waiting on a spinner. Latency moves off the user's clock.

**Current state:** Button-triggered; review panel already gates the write. (Phase 5 sweep.)

**Proposed automation:** Meeting status → completed with minutes → queue analysis → store draft results → notify admin "analysis ready for review". No auto-commit — `parse-meeting-notes-ai`'s `commit=true` path must NOT be used here (see OPP-027).

**Implementation path — justified:** Event trigger + existing function + existing review UI.

**Dependencies:** OPP-007; notification rail (OPP-009 scaffolding).

**Multi-tenancy note:** Meeting data tenant-scoped throughout; drafts stored against the meeting row.

**Effort estimate:** Full day.

---

### Opportunity OPP-022 — Persist document auto-tagging on upload (with review flag)

**Impact:** Medium
**Phase:** 5 AI
**Category:** AI
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** PARTIAL
**Roles affected:** `rto_admin`, `rto_trainer` (uploaders)
**Owner to implement:** NEEDS-RJ (upload flow UX) after OPP-007

**What:** `analyze-document-fields` already runs automatically on upload but only returns JSON; the frontend decides whether to save, and abandoned flows lose the analysis. Persist the extracted metadata as `ai_suggested` fields the user confirms or edits.

**Why it matters:** Removes double handling — the AI has already done the work; today it evaporates unless the user completes the wizard in one sitting.

**Current state:** Auto-invoked in `BulkDocumentUploadStep2`/`DocumentUploadStep1`; no persistence, no audit trail of suggestions (the KB's assumed `ai_tagging_audit` table was not found by the sweep — see KB-IMP-002). (Phase 5 sweep.)

**Proposed automation:** Edge function writes suggestions to the document row (`ai_suggested_metadata` jsonb + reviewed flag); UI shows them pre-filled; bulk-confirm action for admins.

**Implementation path — justified:** Already-firing event; persistence is a small write under the user's tenant context.

**Dependencies:** OPP-007; small migration.

**Multi-tenancy note:** Written to the uploading tenant's document row; unchanged surface.

**Effort estimate:** Full day.

---

### Opportunity OPP-027 — Human-review policy for AI writes to compliance records

**Impact:** Low (governance/consistency; prevents future incidents rather than adding features)
**Phase:** 5 AI
**Category:** AI Governance
**Recommended Path:** CODEBASE-NATIVE
**KB Status:** NEW-OPP
**Roles affected:** all; Angela (policy owner)
**Owner to implement:** NEEDS-ANGELA (policy) then Carl (enforcement pattern)

**What:** Three AI paths write to records without human review: `suggestion-intake` (acceptable — internal triage, marked draft), `audit-ai-processor` (inserts `audit_findings` + `audit_tasks` directly on upload), and `parse-meeting-notes-ai` with `commit=true` (inserts `governance_actions` directly). The platform has a good review pattern (`AIOutputReviewPanel`) but no rule about when it is mandatory.

**Why it matters:** AI-inserted audit findings and governance actions are compliance records an RTO may present to ASQA. PD-004 covers output *variation*; it does not cover unreviewed writes. One policy line — "AI output affecting compliance records requires human confirmation before commit" — plus a consistent `ai_suggested`/`confirmed_by` convention prevents a future incident and simplifies every proactive-AI build above.

**Current state:** Inconsistent by function. (Phase 5 sweep.)

**Proposed automation:** Not an automation — a convention: shared columns (`ai_generated`, `reviewed_by`, `reviewed_at`) and a rule in `decisions.md` once Angela decides. Retrofit `audit-ai-processor` to mark findings `ai_generated=true, status='open', requires_review=true` surfaced in a review queue.

**Implementation path — justified:** Policy + column convention; enforcement lives in code review and Carl's rules.

**Dependencies:** Angela's decision (logged as PD-00X in `decisions.md`).

**Multi-tenancy note:** n/a.

**Effort estimate:** Half day once decided.

---

## KB Improvement Suggestions

- **KB-IMP-001 — `pinned/conventions.md`:** Document the notification rails as canonical patterns: `email_outbox` (+ every-minute worker, idempotency keys) and `in_app_notifications` (priority/category constraints). Today they're only discoverable from the baseline schema; every automation above depends on them.
- **KB-IMP-002 — `reference/key-flows.md`:** Flow 8 (Evidence Upload + AI Tagging) references `ai_tagging_audit` — the Phase 5 sweep could not find this table; tagging output is currently returned to the frontend and not persisted. Verify against production and correct the flow.
- **KB-IMP-003 — `reference/architecture.md`:** States "several edge functions run on a schedule (cron-expire-invites, revenue-audit-daily, etc.)" — the repo contains exactly one scheduled job (email outbox worker). Either the schedules live outside the repo (document where) or the doc is aspirational (correct it). This discrepancy materially misled planning until the migration sweep resolved it.
- **KB-IMP-004 — `pinned/decisions.md`:** Add the AI human-review policy once Angela decides (OPP-027), and record the n8n evaluation outcome from this discovery so future sessions don't re-litigate it.
- **KB-IMP-005 — `codebase-state/codebase-map.md`:** Dated 5 May 2026 and now ~2 months stale against a fast-moving main (consultant hub, QI surveys, billing screens all missing). Refresh after the current audit cycle.
- **KB-IMP-006 — `reference/known-issues.md`:** Also stale (5 May). Fold in the still-open items from `security_audit_july02.md` (unauthenticated functions, super-admin gate regression) so bug triage and automation planning share one source.

---

## Decisions Required Before Implementation (NEEDS-ANGELA)

1. **Compliance reminder defaults** — Do trainers/admins receive credential, PD and evidence reminder emails by default (opt-out) or opt-in? What thresholds (T-90/30/7 proposed)? Product call because it shapes perceived noisiness and the platform's duty-of-care posture. (OPP-002, 009, 010, 017, 024)
2. **Trainer report reminder allowlist** — The Mailgun reminder currently sends to a single test address. Lift to all tenants? With what rollout? (OPP-013)
3. **Tokenised report sharing** — May tenant-derived compliance summaries leave the auth boundary as expiring snapshot links? Scope, expiry, watermark. Regulatory-adjacent, so this is Angela's, not engineering's. (OPP-019)
4. **AI human-review policy** — Which AI outputs may write to compliance records without human confirmation? Recommend: none. Needs to become a PD entry. (OPP-027, gates 020/021/022)
5. **AI allowances per tier** — Token/call budgets per subscription tier, and behaviour at the cap. Pricing decision. (OPP-007)
6. **CRICOS/GTO scope** — In or out of roadmap? If out, the unused CRICOS field should be labelled or removed. GTOs are a different standards framework entirely. (OPP-026)
7. **Welcome/drip content and governance pack distribution** — copy, cadence, recipients. (OPP-011, 018)

## Infrastructure Prerequisites (NEEDS-CARL)

1. **P0 security fixes first** — `tga-rto-sync`, `enforce-billing-compliance`, `ops-run-diagnostics` auth (security_audit_july02 Findings 003/016), and the broader `verify_jwt=false` sweep. No cron or trigger should invoke an unauthenticated function. Blocks OPP-001, 004, 014.
2. **Cron-caller pattern** — A `_shared/` convention for scheduled invocation: service-secret header validation in the function, env-var URLs (never hardcoded — the `20260622000000` lesson), branch-DB env guard respected. Blocks every pg_cron item.
3. **pg_cron schedule migration(s)** — OPP-001 entries + nightly retention job (OPP-023) + daily compliance sweep (OPP-002 family). All with rollback plans per guardrails.
4. **Schema migrations** — `next_pd_review_due` (tp_trainers); `last_review_date`/`next_review_due` (training_products); `next_asqa_audit_date` (tenants); `last_synced_at` (TGA-synced tables); `email_suppressions` table; `ai_usage` table; `ai_suggested` columns. Dave to review; rollback plans mandatory.
5. **`_shared/aiUsage.ts`** — fits the existing Milestone-4 `_shared/` plan. (OPP-007)
6. **Index sweep completion** — the failed Aug 2025 `CREATE INDEX CONCURRENTLY` sweep (needs a non-transactional path) should complete before daily sweeps add query load to trainer tables at scale.
7. **n8n decision** — Recommendation from this discovery: **defer platform-facing n8n adoption**; the stack already owns queue/scheduler/webhooks and every tenant-data automation is better in-stack. Reconsider only for internal ops alerting (OPP-025) and future multi-step outreach ladders, under the absolute rule that n8n never holds DB credentials or tenant data.

---

## Suggested Sequencing (one view, for sprint planning)

1. **Sprint-1 quick wins (after/with P0 auth fixes):** OPP-001 (schedules), OPP-003 (payment-failure emails), OPP-009 (needs_review alert), OPP-024 (validation flags), OPP-012a (suppression table).
2. **Sprint 2:** OPP-002 (credential sweep — the flagship), OPP-010/011 (email pack), OPP-013 (report lifecycle), OPP-023 (retention).
3. **Then:** OPP-006 (self-assurance), OPP-005 (consultant digest), OPP-004 (TGA nightly), OPP-018/019 (documents/sharing) — interleaved with the schema migrations and Angela's decisions.
4. **AI track:** OPP-007 first, then 020 → 021 → 022; OPP-027 policy can land any time and should land early.

---

*Discovery complete — all five phases executed in a single session. Companion security audit: `security_audit_july02.md` (run 2 July 2026, before this discovery, per the maintenance protocol). No continuation prompt required.*
