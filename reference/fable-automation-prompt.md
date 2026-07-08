# ComplyHub Automation & Improvement Discovery Prompt — Fable Edition

> **Purpose:** Paste this entire prompt into a Fable (claude-fable-5) session to run a
> comprehensive discovery of automation opportunities and system improvement paths across
> the ComplyHub platform. This is a companion to `fable-audit-prompt.md` — it does not
> look for what is broken; it looks for what is manual, slow, or repetitive and proposes
> how to eliminate or streamline it.
>
> **File location:** `complyhub-kb/reference/fable-automation-prompt.md`
> **Last updated:** 2 July 2026
> **Maintained by:** Brian (Khian)
> **Use this when:** Planning a sprint focused on efficiency, evaluating n8n adoption,
> preparing a product roadmap for Angela, or after an audit cycle has cleared critical issues.
>
> **How to use:**
> 1. Open a fresh Fable session (model: `claude-fable-5`)
> 2. Ensure you are in the `complyhubworkspace/` root
> 3. Copy everything below the first horizontal rule and paste it as your first message
> 4. Do not add other context before this prompt — it is fully self-contained

---

---

# FABLE AUTOMATION MISSION — ComplyHub Platform

You are running as **Fable (claude-fable-5)**, Anthropic's most capable reasoning model,
performing a full-spectrum automation and improvement discovery for the ComplyHub SaaS
platform. Your job is not to audit for security or correctness — that is covered by the
companion audit prompt. Your job is to find every place where a human is doing something
a machine could do, every flow that stops and waits when it should continue automatically,
and every integration gap where two systems should talk but do not.

For every opportunity you find, you will deliver a **recommendation with a justified
implementation path**: pure codebase (Edge Function, pg_cron, DB trigger, frontend
enhancement), external orchestration (n8n or equivalent), or hybrid. You will apply the
multi-tenancy guardrail to every recommendation — no automation can weaken the tenant
isolation that makes this platform trustworthy.

This prompt is structured into a Knowledge Base Load phase, five discovery phases, and
the same session continuity system used in the audit prompt. Complete each in order.

---

## Section 0 — Context (Read This First)

### The Platform

**ComplyHub** is a multi-tenant SaaS compliance platform for Australian Registered Training
Organisations (RTOs). It helps RTOs manage governance, compliance, training products, trainer
registers, evidence, and regulatory self-assessments against the Standards for RTOs 2025.

RTOs operate under ASQA audit cycles, PD review cadences, credential renewal schedules, and
compliance deadlines that are predictable and calendar-driven. This is a time-rich environment
for automation — the "when" is almost always known. The opportunity is wiring that predictability
into the system so users are informed, nudged, or unblocked without manual intervention.

### The Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript, Vite, Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + PostgREST + RLS) |
| Auth | Supabase Auth (JWT-based, magic link + password) |
| Serverless | Deno Edge Functions on Supabase infrastructure |
| Storage | Supabase Storage (private buckets gated via Edge Functions) |
| AI | Anthropic Claude API via `supabase/functions/ai-router` and related functions |
| Billing | Stripe (gated via `supabase/functions/billing-gate` + `stripe-webhook`) |
| TGA Sync | `supabase/functions/tga-integration` + `tga-rto-sync` — pulls from Training.gov.au |
| CI / Deploy | GitHub Actions + Vercel (frontend); Supabase CLI (Edge Functions) |
| Live URL | https://rto.complyhub.ai |
| Automation candidate | n8n (not yet adopted — treat as a candidate tool to evaluate) |

### The People

| Person | Role | What they own |
|---|---|---|
| Angela | Product + Regulatory | Product decisions, compliance interpretation |
| Carl | Infrastructure Lead | `rto-compass-hub/CLAUDE.md`, CI guardrails, `config.toml`, Edge Function structure |
| RJ | App Engineering Lead | Frontend patterns, hooks, component architecture |
| Dave | Database Lead | Schema, migrations, RLS policies |
| Brian (Khian) | Junior Dev / Infrastructure Assistant | KB, branch work, automation discovery |

### User Roles in the Platform

Automation recommendations must specify which roles trigger, consume, or are affected by
each proposed automation.

| Role | Description |
|---|---|
| `super_admin` | Platform god mode; can impersonate tenants via Support Mode (read-only, audit-logged) |
| `consultant_admin` (CAA) | Manages multiple RTO tenants; cross-tenant by design |
| `consultant_member` (CM) | Works within a single RTO tenant on behalf of the consultant org |
| `rto_admin` | Full admin within a single RTO tenant |
| `rto_manager` | Manager within a single RTO tenant |
| `rto_trainer` | Trainer within a single RTO tenant; limited to own records |
| `rto_viewer` | Read-only within a single RTO tenant |

### The Cardinal Rule — Multi-Tenancy is Non-Negotiable

Every automation recommendation must preserve tenant isolation. Any proposed n8n workflow,
scheduled function, webhook, or external integration that touches tenant data must route
through an authenticated Edge Function with tenant membership validation — never directly
to the database via service role. Automation that saves ten minutes of manual work but
introduces cross-tenant exposure is not an improvement; it is a regression.

Flag any automation opportunity that cannot be implemented safely within the tenant isolation
model as `MULTI-TENANT-CONSTRAINT` and document what would need to change before it could
be safely built.

---

## Section 1 — Knowledge Base Load (MANDATORY — Do This Before Any Discovery Work)

Before analysing the codebase for automation opportunities, load the team's knowledge base.
This prevents you from recommending patterns the team has already decided against, proposing
automations that already exist, or misunderstanding intentional manual steps that must remain
manual for regulatory or audit reasons.

### Step 1.1 — Load Pinned Files (All Required)

Read every file in `complyhub-kb/pinned/` in this order:

1. `complyhub-kb/pinned/guardrails.md` — write permissions, absolute never-do rules, entity routing
2. `complyhub-kb/pinned/conventions.md` — RLS patterns, Edge Function patterns, storage gateway
3. `complyhub-kb/pinned/decisions.md` — architectural decisions log (PD-001 through PD-006+)
4. `complyhub-kb/pinned/session-protocol.md` — how sessions are run on this team
5. `complyhub-kb/pinned/glossary.md` — terminology (if present)
6. `complyhub-kb/pinned/team-roles.md` — team structure (if present)

### Step 1.2 — Load Codebase State Snapshots

Read all files in `complyhub-kb/codebase-state/` (if present). These snapshot what was
intentional at specific points in time — use them to understand what already exists before
recommending it be built.

### Step 1.3 — Load Existing Audit Log

Read all files in `complyhub-kb/audit/` to identify:
- Issues already documented that may unlock automation once resolved
- Previously attempted automations and their outcomes
- Patterns of recurring manual intervention that the audit log flags

### Step 1.4 — Load Reference Docs on Demand

Do not bulk-read `complyhub-kb/reference/` — it is large. Fetch relevant reference files
during each discovery phase as needed. Key ones:

- `complyhub-kb/reference/architecture.md` — system architecture
- `complyhub-kb/reference/key-flows.md` — critical user journeys (read this early)
- `complyhub-kb/reference/user-roles.md` — detailed role permissions
- `complyhub-kb/reference/known-issues.md` — known issue tracker

### Step 1.5 — Read Carl's Code Rules

Read `rto-compass-hub/CLAUDE.md`. Any automation that requires a new Edge Function, a new
`config.toml` entry, a new migration, or a new cron job must be flagged as `NEEDS-CARL`
and conform to his patterns before being implemented.

### Step 1.6 — KB Load Checkpoint (Write This Before Proceeding)

```
KB LOAD SUMMARY
===============
Pinned files loaded: [list each file + one-line takeaway]
Codebase state snapshots: [list files or "none found"]
Existing audit entries: [count] files, covering [date range]
Automation-relevant audit items found: [list or "none"]
Key decisions loaded: [list PD-NNN + one-line summary each]
Decisions that constrain automation: [list any PD that rules out a pattern]
Carl's rules loaded: [yes/no, key constraints noted]
Ready to proceed: YES
```

---

## Section 2 — Cross-Reference Labels (Apply to Every Opportunity)

Before writing an opportunity, cross-reference it against the KB and apply the appropriate label.

| Label | When to use |
|---|---|
| `NEW-OPP` | Opportunity not documented anywhere in the KB |
| `ALREADY-AUTOMATED` | This flow or trigger is already automated — document what exists |
| `INTENTIONALLY-MANUAL [PD-NNN]` | A decision in `decisions.md` requires this to stay manual — cite the PD |
| `PARTIAL` | Some automation exists but there are gaps or edge cases not yet covered |
| `NEEDS-CARL` | Implementation requires a new Edge Function, migration, `config.toml` entry, or cron job |
| `NEEDS-RJ` | Implementation requires frontend changes (new UI triggers, status displays, notifications) |
| `NEEDS-ANGELA` | Implementation requires a product/regulatory decision before it can be designed |
| `MULTI-TENANT-CONSTRAINT` | Opportunity cannot be safely implemented without solving a tenant isolation challenge first |
| `N8N-CANDIDATE` | Recommended implementation path involves n8n or equivalent external orchestrator |
| `CODEBASE-NATIVE` | Recommended path is entirely within the existing stack (Edge Function, pg_cron, DB trigger) |
| `KB-IMPROVE` | Opportunity reveals a gap in the KB that should be documented |
| `CARL-RULE-VIOLATION` | A proposed implementation would violate a rule in `rto-compass-hub/CLAUDE.md` |

When you write a `KB-IMPROVE` label, append the suggestion to a `## KB Improvement Suggestions`
section at the end of the output.

---

## Section 3 — Session Continuity System

### The 5-Hour Problem

Fable sessions have a context limit. This discovery may not complete in a single session.
The continuity system ensures nothing is lost.

### Checkpoint Protocol

At the end of every phase (and after the KB Load), write:

```
CHECKPOINT — [Phase Name] — [COMPLETE / PARTIAL]
================================================
Areas examined: [list]
Areas not yet reached: [list, if partial]
Opportunities found this phase: [count by impact — High: n, Medium: n, Low: n]
Running total: [cumulative count across all phases so far]
Last area examined: [description]
Time estimate remaining: [substantial / moderate / low]
```

### Context Exhaustion Procedure

**Trigger:** Fewer than approximately 15,000 tokens of context window remaining.

**WRAP-UP Procedure:**

1. Finish the current opportunity block if mid-write. Do not leave it incomplete.
2. Write the checkpoint for the current phase (mark PARTIAL if not complete).
3. Compile all findings into the Final Output format (Section 8).
4. Write the output to: `complyhub-kb/audit/automation-[YYYY-MM-DD]-session-[N].md`
   (DD-MM-YYYY date format, Australian standard; increment session number if prior file exists for the same date)
5. Append a `## CONTINUATION PROMPT` section at the bottom (see format below).
6. Tell the user: "Context limit approaching. All opportunities saved to [filename].
   Copy the Continuation Prompt from the bottom of that file to start the next session."

### Continuation Prompt Format

```markdown
## CONTINUATION PROMPT

Paste this entire section as your first message in the next Fable session.

---

# ComplyHub Automation Discovery — Resuming Session [N+1]

This is a continuation of a full automation discovery started on [date].
Session [N] completed the following phases and must NOT be repeated:

**Completed phases:** [list]
**Phases remaining:** [list in order]
**Running opportunity total entering this session:** [count by impact]
**Output file from prior session:** complyhub-kb/audit/automation-[date]-session-[N].md

Before resuming:
1. Load the full knowledge base as described in Section 1 of the original prompt.
   The original prompt is at: complyhub-kb/reference/fable-automation-prompt.md
2. Read the prior session output file to understand what has already been found.
3. Do NOT re-examine areas already listed in the checkpoints below.

Areas already examined in prior sessions:
[full list from all checkpoints]

Resume from: [next phase name] — [next area or sub-section]

Continue following all instructions in the original prompt for the remaining phases.
Append new findings to: complyhub-kb/audit/automation-[date]-session-[N+1].md
At the end, write a combined summary referencing both session files.
```

---

## Section 4 — Implementation Path Decision Framework

Apply this framework to every opportunity. The output is the `Recommended Path` field in
each opportunity block.

### When to choose Codebase-Native (Edge Function / pg_cron / DB trigger / React enhancement)

Use codebase-native when:
- The automation must read or write tenant data (RLS must be in force, or the Edge Function
  validates JWT + tenant membership before any data operation)
- Latency matters — the action must complete within a user-facing request cycle
- The trigger is a DB event (row insert, status change, FK update) — DB triggers or
  Supabase real-time listeners are the natural fit
- The logic is simple and does not require external connectors or retry orchestration
- The team wants full ownership of the code and no external dependency

### When to choose n8n (or equivalent external orchestrator)

Use n8n when:
- The automation connects three or more systems (e.g. Supabase → email → Slack → TGA API)
- The workflow needs visual retry logic, error branches, or monitoring dashboards
- The trigger is time-based and complex (business-day-aware scheduling, multi-step reminder
  sequences, escalation ladders)
- Non-developers (Angela) may need to inspect or modify the workflow without a code deploy
- The automation is cross-tenant at the orchestration layer — but **all tenant-data operations
  must still route through authenticated Edge Functions; n8n must never hold or pass raw tenant
  data between steps**

### When to choose Hybrid (n8n orchestrates, Edge Function handles data)

Use hybrid when:
- n8n is right for the orchestration and connector pattern, but a tenant-data step is
  involved — n8n calls a secured Edge Function endpoint, passing only the trigger context
  (e.g. `tenant_id`, `event_type`) and the Edge Function performs the data operation under
  RLS with JWT validation

### The n8n security rule (non-negotiable)

If n8n is recommended, the rule is absolute: **n8n never holds credentials that grant direct
DB access, and never receives raw tenant data in a payload it stores or logs.** n8n is an
orchestrator, not a data processor. Every step that touches tenant data must be a call to a
secured, authenticated Edge Function. Flag any opportunity where this cannot be achieved as
`MULTI-TENANT-CONSTRAINT`.

---

## Section 5 — Phase 1: Manual and Repetitive User Journey Discovery

**Framing:** You are a workflow consultant who has spent a week sitting beside an `rto_admin`
and watching everything they do by hand. You are looking for every action they repeat, every
email they send manually, every status they update by clicking through a form, and every
decision they make that a rule or calendar could make for them.

### 5.1 — Tenant Onboarding Flow

Read the onboarding path from the code and the KB (`key-flows.md` if present). Map the steps:
- Which steps require a human to manually configure something?
- Which steps are sequential but could be parallelised?
- Is there a checklist or wizard that guides the onboarding, or does the admin discover steps
  by exploration?
- What data does the platform already have (from TGA sync, from Stripe) that could
  pre-populate the onboarding experience?

Flag every step that is repeated for every new tenant and could be templated, defaulted, or
automated.

### 5.2 — Trainer Register Upkeep

The trainer register is central to RTO compliance. Map the maintenance cycle:
- How does a trainer's currency status get updated when their qualifications change?
- How does the platform know when a trainer's PD review is due?
- Are trainers notified when their evidence is expiring?
- Is there a bulk-update path, or must admins update trainer records one at a time?
- Can the TGA sync feed automatically validate trainer qualifications against current
  registrations?

### 5.3 — Evidence Collection and Compliance Tracking

- How does evidence get from a trainer to the register? Is it email-and-upload, or is there
  a structured submission flow?
- Who reviews submitted evidence and marks it accepted? Is there a workflow state machine or
  is it a manual status toggle?
- Are there automated reminders for evidence that is due or overdue?
- How does the platform surface compliance gaps — a dashboard, a report, or does the admin
  have to know to look?

### 5.4 — Self-Assessment Cycle

RTOs must complete regular self-assessments against the Standards for RTOs 2025. Map the cycle:
- How does a self-assessment get started? Manual creation by an admin?
- How are individual standard items assigned to staff for evidence?
- Is there a progress tracker, or does the admin count completed items manually?
- How does a completed self-assessment get exported or reported to governance?

### 5.5 — Consultant Workflow (CAA / CM Roles)

Consultant admins manage multiple RTO tenants. Map their cross-tenant workflow:
- How do they switch between tenants and track which ones need attention?
- Is there an aggregated view of compliance status across all tenants they manage?
- Do they receive alerts when a tenant they manage has an overdue item?
- How do they produce client reports? Manual export, or generated?

---

## Section 6 — Phase 2: Time- and Event-Driven Automation Opportunities

**Framing:** You are a calendar. You know that compliance has deadlines — PD review
cadences, credential expiries, ASQA audit cycles, reporting periods. You are looking for
every deadline or event the platform knows about but does not act on automatically.

### 6.1 — Scheduled Reminders and Notifications

Map all date-bound fields in the schema (read `supabase/migrations/` for columns named
`*_due`, `*_expiry`, `*_date`, `*_at`, `*_review_cadence`, `*_next_review`). For each:
- Is there an automated reminder before the date? How many days in advance?
- Is there an escalation if the deadline passes without action?
- Who receives the reminder — the affected trainer, the admin, both?
- Is there a Supabase Edge Function or pg_cron entry already handling this? If not: flag as
  `NEW-OPP` with a recommended implementation path.

Key deadline categories to look for:
- Trainer PD review cadence (`trainer_pd_review_cadence` on `tenants`)
- Evidence expiry dates on trainer register records
- Training product review dates
- Credential / qualification expiry for trainers
- Self-assessment completion deadlines
- Subscription renewal dates (Stripe)

### 6.2 — Event-Driven Triggers

Map the DB schema for status fields (`status`, `stage`, `state`, any enum columns). For
each status transition:
- Should something happen automatically when status changes? (e.g. when a trainer's evidence
  is marked `accepted`, update their currency status; when a self-assessment moves to `submitted`,
  notify governance)
- Is the transition currently manual (admin clicks "accept") or does the system enforce it?
- Could a DB trigger or Supabase real-time webhook fire a downstream action?

### 6.3 — TGA Sync Opportunities

The TGA sync functions pull data from Training.gov.au. Map what data comes in and what the
platform currently does with it:
- Are training product details auto-updated from TGA, or does an admin manually check and
  update?
- Are trainer qualifications cross-referenced against TGA registrations?
- Is there a staleness window — how old can TGA data be before it is considered untrustworthy?
- Could the sync trigger downstream actions (e.g. flag a trainer whose qualification has been
  revoked on TGA)?

### 6.4 — Billing Event Automation

The Stripe webhook at `supabase/functions/stripe-webhook` handles billing events. Map the
events it currently processes and identify gaps:
- On `customer.subscription.created` — does the platform automatically provision the tenant's
  feature set, or is it manual?
- On `customer.subscription.deleted` — is the tenant gracefully offboarded or does it just
  lose access?
- On `invoice.payment_failed` — is the rto_admin notified? Is there a grace period enforced
  in the system?
- On trial expiry — is there an automated upgrade nudge sequence, or does it just cut off?

---

## Section 7 — Phase 3: Cross-System Integration Gaps

**Framing:** You are an integration engineer looking at two systems that share users but
do not share data. You are looking for every place where a human is manually copying
information between systems, or where an event in one system should trigger an action in
another but currently does not.

### 7.1 — Email and Notification Gap

Map what emails the platform currently sends automatically (look for any email invocation
in Edge Functions — `sendEmail`, Resend, SMTP, or any notification pattern). Then map what
emails a user would reasonably expect:
- Welcome email on account creation
- Magic link / password reset (likely handled by Supabase Auth — confirm)
- Evidence submission confirmation to trainer
- Evidence accepted / rejected notification to trainer
- PD review due reminder to trainer and admin
- Self-assessment submission acknowledgement
- Subscription payment failure / renewal confirmation
- ASQA audit date reminder (if the platform captures this)

For each gap: `NEW-OPP`, with recommended path (Supabase Edge Function + email provider vs
n8n workflow with email node).

### 7.2 — Document Generation

Does the platform generate any PDFs or structured exports automatically?
- Trainer register export (for ASQA audit evidence)
- Self-assessment report
- PD summary for governance
- Compliance gap analysis report

For each output type:
- Is it currently generated on demand (user clicks Export)?
- Could it be scheduled (monthly PDF to governance email list)?
- Could it be event-triggered (generate and attach to ASQA audit record when status changes)?
- Recommended implementation: React PDF / Edge Function PDF generation vs n8n document
  generation node vs external service (DocuSeal, Anvil, or equivalent).

### 7.3 — Slack / Teams Integration Opportunity

RTOs and consultant admins may coordinate compliance work in Slack or Teams. Assess:
- Are there any existing integrations?
- Would a daily digest of overdue compliance items to a Slack channel reduce manual checking?
- Would an alert on critical events (trainer evidence rejected, ASQA audit date approaching,
  subscription payment failed) be useful?
- For each: is this better as n8n → Slack node or as a direct webhook from an Edge Function?

### 7.4 — Reporting and Analytics

- Does the platform expose any reporting beyond in-app dashboards?
- Could compliance health data be pushed to a BI tool (Metabase, Looker Studio, Power BI)?
- For consultant admins managing multiple tenants: is there an aggregated health report they
  can share with RTO governance without them needing a ComplyHub login?

### 7.5 — CRICOS and GTO Integration (if applicable)

If any tenants are CRICOS providers or GTOs:
- Does the platform handle National Code 2018 obligations differently from Standards for
  RTOs 2025?
- Are there integration points with PRISMS or other CRICOS-specific data sources?
- Are National Standards for GTOs 2017 supported? If not, flag the gap for Angela.

---

## Section 8 — Phase 4: Internal Data Lifecycle and DB-Layer Automation

**Framing:** You are a database engineer looking at the schema and asking: what should the
database do by itself that it currently relies on application code or humans to do?

### 8.1 — DB Trigger Opportunities

Read the schema (from `supabase/migrations/`). For each major table, ask:
- Is there a `status` or `stage` column that should trigger a downstream action on change?
- Are there `created_at` / `updated_at` columns that are manually set in application code
  but should be automatic (DB default or trigger)?
- Are there derived or calculated columns (e.g. `compliance_score`, `currency_status`) that
  are computed in the frontend but could be maintained as a DB trigger for consistency?
- Are there audit log entries that should be written automatically on row changes, but are
  currently only written when the application remembers to do so?

### 8.2 — pg_cron Opportunities

- Are there any scheduled jobs currently running via pg_cron? List them.
- What jobs should exist but do not?
  - Stale session cleanup
  - Expired evidence flagging
  - Reminder record generation (create a "pending reminder" row that the Edge Function then sends)
  - Snapshot / archive of compliance state at period end
  - TGA sync schedule (is it triggered manually or scheduled?)

### 8.3 — Stale Data and Cleanup

- Are there soft-deleted records (`deleted_at` columns) that accumulate without a cleanup policy?
- Are there temporary or draft records (self-assessment drafts, evidence uploads that were
  abandoned) that persist indefinitely?
- Are there any RLS-excluded tables or views that grow without bound?
- Recommend a cleanup strategy for each: DB trigger, pg_cron, or manual periodic task.

### 8.4 — Schema Gaps That Block Automation

- Are there automations that cannot be built because the schema does not capture the required
  data? (e.g. no `pd_due_date` column means no automated PD reminder can be sent)
- For each gap: flag as `SCHEMA-GAP-BLOCKS-AUTOMATION` and specify what column(s) would need
  to be added, which migration that requires, and whether it needs Carl or Dave's input.

---

## Section 9 — Phase 5: AI-Assisted Automation Opportunities

**Framing:** The platform already has `ai-router`, `ai-tenant-coach`, `ai-unit-risk-scorer`,
and `ai-build-generator`. These are currently on-demand features — a user invokes them.
You are looking for where AI could be wired into flows to provide proactive assistance,
not just reactive on-demand features.

### 9.1 — Proactive AI Nudges

- When a new training product is added, could the AI automatically generate a draft unit
  mapping or risk score without the admin having to request it?
- When a trainer's PD record is updated, could the AI coach generate a currency assessment
  draft for review?
- When a self-assessment is started, could the AI pre-populate guidance notes for each
  Standard based on the tenant's existing evidence?

For each nudge:
- Is this technically feasible with the current `ai-router` pattern?
- What trigger would fire it (DB insert, status change, manual button)?
- Is there a cost/latency concern for firing it automatically vs on demand?

### 9.2 — AI-Assisted Document Generation

- Could the AI generate a first-draft trainer register export narrative for ASQA audit purposes?
- Could it generate a compliance gap summary in plain English from the self-assessment data?
- Could it draft responses to standard ASQA evidence requests based on existing platform data?

### 9.3 — AI Risk Monitoring

The `ai-unit-risk-scorer` already scores training products. Extend this thinking:
- Could the AI monitor the tenant's overall compliance posture and flag emerging risks before
  they become gaps?
- Could it compare a tenant's evidence against peers (anonymised, aggregate only — no
  cross-tenant data exposure) to flag outliers?
- Is there a scheduled risk report that could be auto-generated and delivered to governance?

### 9.4 — Prompt Injection and Cost Guardrails (for any new AI automation)

For every proactive AI automation proposed above, flag:
- **Prompt injection risk** — if user-supplied content feeds the AI trigger, is it isolated
  from the system prompt?
- **Cost ceiling** — is there a per-tenant or per-period token budget enforced? Proactive AI
  calls multiply quickly at scale.
- **Human-in-the-loop requirement** — for any AI output that could affect compliance records
  or ASQA submissions, there must be a human review step before it is written to the DB.
  Flag automations that skip this as `NEEDS-ANGELA` for a product decision.

---

## Section 10 — Final Output Format

### Output File

Write the final output to: `complyhub-kb/audit/automation-[DD-MM-YYYY]-session-[N].md`

DD-MM-YYYY format (Australian standard). Session 1 for a new date; increment if a prior
file for the same date already exists.

### File Structure

```markdown
# ComplyHub Automation & Improvement Discovery — [DD Month YYYY] — Session [N]

**Discovered by:** Fable (claude-fable-5)
**Discovery started:** [DD Month YYYY]
**KB load date:** [date KB was last updated]
**Phases completed:** [list]
**Phases not completed:** [list, if any — see Continuation Prompt at bottom]

---

## Executive Summary

[4–5 paragraphs. Written for Angela (product) and Carl (infrastructure lead).]

[Paragraph 1 — Plain English: What is the overall automation opportunity for the platform?
What class of work is most ripe for automation?]

[Paragraph 2 — The highest-impact opportunities and their business case. Quantify where
possible: how much admin time, how many manual steps, what compliance risk is reduced.]

[Paragraph 3 — The quickest wins: automations that could be live within one sprint using
only the existing stack, with no new dependencies.]

[Paragraph 4 — Where n8n (or an equivalent external orchestrator) adds clear value over
a codebase-native approach, and the security model that must surround it.]

[Paragraph 5 — What Angela needs to decide before specific automations can be designed,
and what Carl needs to build before others can be implemented.]

---

## Opportunity Summary Table

| # | Impact | Phase | Category | Path | KB Status | One-line Summary |
|---|---|---|---|---|---|---|
| OPP-001 | High | Journey | Notifications | CODEBASE-NATIVE | NEW-OPP | [summary] |
| OPP-002 | Medium | Integration | Email | N8N-CANDIDATE | NEW-OPP | [summary] |
| ... | | | | | | |

*Sorted: High impact first, then Medium, Low. Within each impact level, Phase order.*

---

## Detailed Opportunities

[One block per opportunity, using the format below. Group by phase.]

### Opportunity [OPP-NNN] — [One-line title]

**Impact:** High / Medium / Low
**Phase:** [1 Journey / 2 Time-Event / 3 Integration / 4 Data Lifecycle / 5 AI]
**Category:** [Notifications / Email / Document / DB Trigger / pg_cron / AI / Reporting / etc.]
**Recommended Path:** [CODEBASE-NATIVE / N8N-CANDIDATE / HYBRID]
**KB Status:** [NEW-OPP / ALREADY-AUTOMATED / INTENTIONALLY-MANUAL [PD-NNN] / PARTIAL / etc.]
**Roles affected:** [which user roles trigger or benefit from this automation]
**Owner to implement:** [NEEDS-CARL / NEEDS-RJ / NEEDS-ANGELA / Brian can implement]

**What:**
[One clear sentence stating the opportunity — what is currently manual, and what automated
behaviour would replace or supplement it.]

**Why it matters:**
[Business impact. Time saved per week/month. Compliance risk reduced. User experience improved.
For an RTO compliance platform, relate to ASQA audit readiness or trainer burden reduction where relevant.]

**Current state:**
[What happens now — who does what, how often, what triggers it. Be specific: file path or
UI path if applicable.]

**Proposed automation:**
[The automated behaviour. What triggers it. What it does. What output it produces. Where
that output goes. Who sees it.]

**Implementation path — justified:**
[Why this path (codebase-native / n8n / hybrid) over the alternatives. Reference the
decision framework in Section 4. Note any multi-tenancy considerations explicitly.]

**Dependencies:**
[What must exist before this can be built. Schema columns, Edge Functions, external accounts,
Angela's decisions, Carl's input.]

**Multi-tenancy note:**
[Explicit statement of how tenant isolation is maintained in this automation. If it cannot
be maintained: `MULTI-TENANT-CONSTRAINT` with explanation.]

**Effort estimate:** [< 1 hour / half day / full day / multi-day / needs team discussion]

---

[... repeat for each opportunity ...]

---

## KB Improvement Suggestions

[KB-IMP-NNN — file to update — suggested addition or correction.]

---

## Decisions Required Before Implementation

[List of `NEEDS-ANGELA` items — product or regulatory decisions that must be made before
the automation can be designed. Format: who decides, what the question is, why it is
a product decision not an engineering one.]

---

## Infrastructure Prerequisites

[List of `NEEDS-CARL` items — new Edge Functions, config.toml entries, pg_cron jobs,
migrations, or external service accounts that must be provisioned before automations
can be implemented.]

---

## Continuation Prompt

[Only present if session ended before all phases were complete. See Section 3.]
```

---

## Section 11 — Final Instructions to Fable

1. **Begin with the KB Load** (Section 1). Every opportunity label depends on it. An
   automation that already exists in the codebase filed as `NEW-OPP` is wasted planning time.

2. **Read `key-flows.md` early in Phase 1.** The user journeys are the map. Automation
   opportunities live at the friction points in those journeys.

3. **Think in sequences, not steps.** A single form submission may involve five systems.
   The automation opportunity is usually in the handoffs between systems, not in any
   individual step.

4. **Apply the implementation path framework honestly.** Do not default to n8n because it
   sounds impressive, and do not default to codebase-native because it avoids a new dependency.
   Apply the criteria in Section 4 to every recommendation.

5. **The multi-tenancy rule is not optional.** For every automation involving n8n or any
   external system: if you cannot describe exactly how tenant data is protected at each step
   of the workflow, the recommendation is incomplete. Write the protection mechanism
   explicitly, or flag as `MULTI-TENANT-CONSTRAINT`.

6. **Weight opportunities for this business.** A generic SaaS notification system is a
   medium opportunity. For an RTO compliance platform where a missed PD review could result
   in an ASQA non-compliance finding, the same notification system is high impact. Adjust
   accordingly.

7. **Be specific about triggers.** "Send a reminder" is not an opportunity specification.
   "At T-30 days before `trainer_pd_due_date`, create a row in `pending_notifications` with
   `notification_type = 'pd_review_due'` and `recipient_id = trainer.user_id`, then fire
   an Edge Function to dispatch the email" is an opportunity specification.

8. **Flag the quick wins clearly.** Angela and Carl need to know what can ship in a sprint
   with no new dependencies. Put these in the executive summary and tag them in the table.

9. **The session continuity system is not optional.** Context exhaustion is real. Execute
   the WRAP-UP procedure before you run out — not after.

10. **Write the output file.** Use your Write tool to create the output at
    `complyhub-kb/audit/automation-[DD-MM-YYYY]-session-1.md`. The conversation is ephemeral;
    the file is permanent.

---

*End of automation discovery prompt. Everything above this line should be pasted into the Fable session.*

---

## Maintenance Notes (For Brian — Do Not Include in Fable Session)

| Item | Notes |
|---|---|
| **Fable model ID** | `claude-fable-5` |
| **When to re-run** | After each audit cycle; before each quarterly planning sprint; after major feature releases that add new user journeys |
| **Output location** | `complyhub-kb/audit/automation-[DD-MM-YYYY]-session-[N].md` |
| **After the session** | Review `NEEDS-ANGELA` decisions with Angela first. Review `NEEDS-CARL` prerequisites with Carl before scheduling implementation. Add `KB-IMPROVE` items to the KB. |
| **n8n adoption decision** | This prompt treats n8n as a candidate. If the team adopts n8n, update Section 0 stack table and Section 4 decision framework to reflect it as available. |
| **Companion prompt** | `complyhub-kb/reference/fable-audit-prompt.md` — run the security audit before running this prompt so the KB has the latest audit findings loaded |
| **Last discovery run** | 2 July 2026 — output at `complyhub-kb/audit/automation-02-07-2026-session-1.md` (all 5 phases completed in one session; 27 opportunities). |
