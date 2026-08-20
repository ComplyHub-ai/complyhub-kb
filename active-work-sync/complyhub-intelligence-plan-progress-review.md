# ComplyHub Intelligence Plan — Progress Review (PRs #411, #412, #418 vs. the 10-phase plan)

> **Created:** 12 August 2026 · **Type:** read-only analysis — no code, DB, or config changes were made
> in producing this document.
> **Scope:** cross-reference of what actually landed in `rto-compass-hub/main` against Angela's
> "ComplyHub Intelligence Plan" (Phases 1–10), with senior-developer findings and recommendations.
> **Evidence base:** `gh pr view` on #411/#412/#418, `git ls-tree origin/main`, the migration files
> themselves, and live production queries via Supabase MCP (`execute_sql`) — not PR descriptions.

---

## Session start

- `complyhub-kb` — pulled clean.
- **Worktree A** (`rto-compass-hub`) is on **`cursor/gov-overdue-action-v1-5f7c`** (PR #412's branch,
  already merged), with dirty untracked/modified files under `html/`. `active-work.md` claims A is on
  `main` read-only — **git disagrees, git wins.** Nothing committed; flagging it rather than touching it.
- Also present: `rto-compass-hub-B` on `main`, `rto-compass-hub-C` on `fix/postdemo_bugfix`, plus a
  stale scratchpad worktree (`wt412`, detached).
- This session used worktree A read-only. **No edits, no commits, no pushes.**
- Latest on `main`: `4f240a0f0` (merge of #412).

---

## What's actually in `main` (verified, not from PR bodies)

| PR | State | What landed |
|---|---|---|
| **#411** | Merged 12 Aug 2026 | 5 tables (`intelligence_insights`, `_events`, `_feedback`, `_opportunities`, `_runs`) + full RLS + `docs/intelligence/source-data-map.md` (731 lines) |
| **#412** | Merged 12 Aug 2026 | **Two** rules (`GOV_OVERDUE_ACTION_V1`, `ASS_VALIDATION_OVERDUE_V1`), `rpc_run_intelligence_tenant`, scoring functions, 4 more migrations, **and a complete SuperAdmin Intelligence Viewer** (11 components, 6 hooks, route, nav) — 41 files, +6,596 |
| **#418** | Merged 12 Aug 2026 | Help Centre video library session summaries. **Nothing to do with the Intelligence Plan.** Only indirect relevance: it's the onboarding surface that would eventually need to explain Intelligence to users. |

Production state — all verified live:

- All 5 tables exist. All 6 migrations are in the ledger with matching `version` + `name` (the interim
  `execute_sql` + `migration repair` procedure was followed correctly — good).
- All rule/scoring/RPC functions exist, `SECURITY DEFINER`, `search_path` set, `REVOKE ... FROM PUBLIC`
  + `GRANT ... TO service_role`. Genuinely careful SQL.
- `intelligence_insights` = **0 rows**. Events = 0. Runs = 0. Opportunities = 0. Feedback = 0.
- `feature_flags` rows for `intelligence_enabled` / `intelligence_pilot` = **0**. The feature is dark on
  all 88 tenants.
- **No cron job** for Intelligence. `rpc_run_intelligence_tenant` is manual-only.

So: the foundation is real and well-built. Nothing has ever run.

### Migrations shipped by this programme (all six confirmed in the production ledger)

| Version | Name |
|---|---|
| `20260812001640` | `complyhub_intelligence_foundation` |
| `20260812011150` | `intelligence_gov_overdue_action_v1` |
| `20260812012831` | `fix_gov_overdue_dismissed_recreate` |
| `20260812013640` | `intelligence_ass_validation_overdue_v1` |
| `20260812015112` | `fix_ass_validation_overdue_dismissed_and_errors` |
| `20260812020000` | `intelligence_viewer_superadmin_rpcs` |

---

## Plan vs. reality, phase by phase

| Phase | Status in `main` | Reality check |
|---|---|---|
| 1 — Homepage experience | **Not started.** No wireframe, no data spec, no tenant-facing UI | The only UI shipped is SuperAdmin-only (`/superadmin/intelligence`, gated on `sa_platform_insights`) |
| 2 — Data map | **Done, and done well** — `source-data-map.md` is the strongest artefact in the batch | But it maps *schema* readiness, not *data* readiness. See below — this is the critical flaw |
| 3 — Priority Engine | **~20%** — two rules, deterministic SQL scoring | Both rules sit on empty tables. Scoring has a proven ranking inversion |
| 4 — While You Were Away | Not started | Has a hard blocker nobody has flagged yet (last-login watermark) |
| 5 — Opportunity Engine | Table exists, zero logic | — |
| 6 — Automation recipes | Not started | ~8 relevant cron jobs already exist and already send reminders — overlap risk |
| 7 — Impact tracking | Not started | No schema for it at all |
| 8 — Leadership View | **Partly already exists** — the CEO Governance Portal (`feature_governance_portal`, enabled on 23 tenants, `/dashboard/ceo-governance`) | Phase 8 should *extend* that, not build a third dashboard |
| 9 — Ask ComplyHub | **Partly already exists** — ComplyBot + `src/components/ComplianceIntelligence/` (CompactComplyBotChat, ExplainScorePanel, SuggestedQuestionsPanel, ComplianceSignalsPanel) | `complybot_conversations` = 0 rows, so it's built but unused |
| 10 — AI-First layer | Not started | — |

---

## The five things that will hurt you

### 1. Both shipped rules run against empty tables ⛔ (the big one)

Row counts in production:

```
governance_actions               0     ← GOV_OVERDUE_ACTION_V1 source
assessment_validation_actions    0     ← ASS_VALIDATION_OVERDUE_V1 source
assessment_validation_findings   0     ← its parent
```

Both Release 1 rules **can never produce an insight today, on any of the 88 tenants.** Meanwhile, here's
where overdue data actually lives:

```
tasks                       451 overdue rows across 16 tenants
ci_register                  57 overdue (action_due_date) across 10 tenants
ci_register                  48 overdue (due_date) across 8 tenants
risk_register                29 overdue across 6 tenants
documents_register           19 overdue reviews across 7 tenants
trainer_matrix_credentials    5 expired, 2 expiring within 90d
```

The source-data-map ranked `governance_actions` "READY / High confidence / best first rule" on schema
quality — clean CHECK constraints, a dedicated due-date column, an existing UI overdue predicate. All
true. It never asked *does this table contain rows*. And it explicitly **de-prioritised `tasks`** ("not
authoritative for register overdue state") — which is the single largest source of real overdue data in
the platform.

Note also: the plan's own flagship demo line is *"Trainer evidence expires in 12 days."* Production has
**2** credentials expiring in the next 90 days, on **one** tenant.

**Fix:** add a mandatory **data-volume column** to the readiness matrix — `rows`, `rows matching the rule
predicate`, `distinct tenants affected` — and never promote a rule to "first to implement" without it.
Re-run the matrix before choosing rule #3.

### 2. Only 22 of 88 tenants have any overdue signal at all

Union of every overdue/expiring source above: **22 tenants**. Of 38 non-trial tenants, more than half
would open the new homepage and see an empty Priority Actions block. A homepage whose entire value
proposition is "here's what needs your attention" that says *nothing needs your attention* reads as
broken, not reassuring.

**Fix:** design the empty state as a **first-class deliverable in Phase 1**, not an afterthought — and
make it earn its place ("ComplyHub checked 41 deadlines, nothing is overdue" is a genuine wow; a blank
card is not). This also means Phase 4's monitoring counters need to work *independently* of whether any
insight fired.

### 3. The Priority Engine's ranking is inverted — proven live

Executed against the production scoring functions:

```
unassigned, priority=low,      40 days overdue  →  score 50
assigned,   priority=critical,  5 days overdue  →  score 45
assigned,   priority=critical, 400 days overdue →  score 55  ← realistic ceiling
```

**A low-priority unassigned action outranks a critical-priority assigned one.** "Nobody owns this" (+20)
is weighted comparably to "this is critical" (+30), and the due-date bucket saturates at 31 days — so day
31 and day 400 score identically.

Two more defects in the same function:

- **`critical` severity is mathematically unreachable.** Max score is 25+30+20 = 75; the threshold is 80.
  The migration comment admits this. So the Leadership View's "High-risk issues: 2" tile can never count
  a governance action.
- **Scores aren't comparable across rules.** `priority='low'` scores 5 in the governance rule and 0 in the
  validation rule. Since Phase 3's whole output is one ranked list *across modules*, a shared 0–100 scale
  has to be defined **once, centrally** — not per-rule.

**Fix before building rule #3:** define a single scoring contract (component names, weight budgets,
severity thresholds, and a documented ceiling per component). Make the accountability bonus a modifier,
not a peer of risk. Uncap the due-date bucket or make it logarithmic. Add a test that asserts
monotonicity: increasing risk or days overdue must never lower rank.

### 4. "While You Were Away" has an unflagged hard blocker

The plan says "Since your last login: …". The only login timestamp available is
`auth.users.last_sign_in_at` — which Supabase **overwrites at login**. By the time the homepage renders,
that value *is* the current session. There is no "previous login" anywhere in the schema.

Phase 4 therefore needs a new per-user watermark (`intelligence_user_seen`: `user_id`, `tenant_id`,
`last_seen_at`, `previous_seen_at`) written on session start *before* it's read, plus a decision on what
a user who logs in three times a day should see. The data-map already correctly flags that history can't
be reconstructed from `audit_logs` — so **WYWA is prospective only**: it produces nothing until the
watermark table plus a scheduled run have both been live for a while. That's a sequencing constraint, not
a bug, but it needs to be in the plan.

Related: there is **no cron job**. Every counter in the plan's WYWA mock ("41 deadlines monitored") comes
from run history that doesn't exist yet. Scheduling is a Phase 3 prerequisite, not a Phase 6
nice-to-have.

### 5. Tenant users can write and delete their own "AI findings"

The RLS on `intelligence_insights` and `intelligence_events` grants `INSERT` / `UPDATE` / `DELETE` to
Administrator, Compliance Manager and Consultant (DELETE to Administrator/CM). The tables are otherwise
well-locked — billing gate, write-lock, superadmin tenant gate, workspace restrictive select, all
correct.

But these tables hold statements the product attributes to *ComplyHub*, not to the user. As written, a
tenant Administrator can fabricate an insight, edit a severity, or delete the evidence of an overdue
action — and the "While You Were Away" log along with it. In an ASQA audit context, a fabricable and
deletable "the system monitored this" record is worse than no record.

**Fix:** revoke direct write access for tenant roles. Insights are system-authored (`service_role` /
`SECURITY DEFINER` only). Everything a user legitimately does — dismiss, snooze, mark not-relevant —
goes through a narrow RPC that writes `status`, `dismissed_by`, `dismissal_reason` and an audit row, and
nothing else. `intelligence_feedback` already has exactly the right shape (`user_id = auth.uid()`
enforced) — mirror it.

---

## What's genuinely good — keep doing this

- **The data-map-before-code discipline.** Phase 2 as a written, reviewable artefact with per-rule
  readiness, confidence and named limitations is the single best decision in this plan. The five
  "critical caveats" (the `/dashboard/governance/register` naming trap, the broken `status='active'`
  filter in `v_credential_expiry_alerts`, risk having no `review_date`, `ci_register.updated_at` not
  being a progress signal, WYWA not being reconstructible) are exactly the traps that cost weeks when
  discovered late.
- **Scoring authoritative in SQL, with the TS copy explicitly labelled a test-local mirror.** This is the
  right call and the discipline note in the PR body is correct — one scoring implementation, no drift.
- **Dismissal survives re-runs.** The rule function has a dedicated `status IN ('dismissed','superseded')`
  loop, so re-running doesn't resurrect what a user dismissed. That's the #1 noise-generator in systems
  like this and it was caught pre-merge (that's what the two `fix_..._dismissed_*` migrations are).
- **Failure preserves state.** Per-record `EXCEPTION WHEN OTHERS` that logs to `intelligence_runs.errors`
  and keeps the insight active, rather than resolving it on a lookup failure. Correct default — a
  transient error must never look like "problem solved."
- **Partial unique index on active insights only**, so history is retained and re-occurrence creates a new
  row. Right model.
- **Feature-flag gate deliberately avoids legacy `check_feature_flag`**, documented in a comment
  explaining why. Good.
- **Rollout is off-by-default and fails closed** (missing flag row = disabled). Correct for an 88-tenant
  production platform.

---

## Plan-level gaps

**No acceptance criteria anywhere.** Ten phases, zero measurable exit conditions. "Get those working well
before adding more" (Phase 6) is not testable. Each phase needs 2–3 numbers: e.g. Phase 3 = *"≥80% of
active tenants see ≥1 priority action; <5% dismissed as not-relevant in the first fortnight."* Note that
on today's data, Phase 3 would score **25%** on that first criterion.

**Phase 7 (Impact) is a compliance risk, not just a feature.** "ComplyHub saved you 8.2 hours" is a
quantified commercial claim made to an RTO. It needs: a versioned time-value table (not constants in
code), the version stamped on every recorded saving, an append-only ledger (never recomputed
retrospectively — otherwise last month's number silently changes), and a visible methodology page. The
plan says "keep the methodology transparent" — make that a schema requirement, not an intention.

**Phase 6 collides with what already runs.** There are already ~8 reminder/nudge crons in production
(`governance-meeting-reminders`, `weekly-credential-reminders`, `daily-trainer-report-reminders`,
`weekly-governance-nudges`, `cron_distribute_governance_outputs`, …) plus an `email_outbox` worker firing
every minute. "Automate overdue action reminders" as a new recipe will double-send unless recipes are
built as a **registry that adopts the existing crons**, with one send-suppression check. Getting this
wrong means emailing paying RTO clients twice — the most visible possible failure.

**"Human control retained" (Phase 5) isn't specified.** For each recipe: who can activate, who gets
notified, what the kill switch is, and whether it can ever write to a register. Strong recommendation:
**Release 1 automations may notify and flag, never mutate a register.** A compliance platform that
silently changes a compliance record is a much bigger trust problem than one that only nags.

**Two-and-a-half feature-flag systems.** `public.feature_flags` (row-per-flag, `tenant_id`),
`public.tenant_feature_flags` (JSON blob), and legacy `check_feature_flag`. Intelligence correctly uses
the first. Worth noting `feature_flags.feature_name` is `NOT NULL` with no default, so any enable path
must supply it — the working precedent is `GovernancePilotInviteButton.tsx` (upsert with
`onConflict: 'tenant_id,flag_key'`). **There is no enable UI for Intelligence yet** — that's the smallest,
highest-value next PR.

**Naming collision, already live.** `main` now contains `src/components/ComplianceIntelligence/`,
`src/pages/regulatory-intelligence/`, `src/pages/superadmin/regulatory-intelligence/`,
`WorkforceIntelligenceDashboard`, `usePortfolioIntelligence`, `useClauseIntelligence`,
`SuggestionIntelligencePanel`, `LicensingIntelligencePanel`, `UnitIntelligencePanel` — **and now**
`src/components/superadmin/intelligence/` + `src/lib/intelligence/` + `src/types/intelligence.ts`. Four
unrelated meanings of "intelligence" in one codebase. Pick a distinct internal namespace for this
programme now (`insights/`, or `chi/`) while it's a 41-file rename and not a 400-file one.

---

## Suggested resequencing

The plan's order is sound in principle — data before rules, rules before AI, value before upsell. Three
changes:

1. **Insert Phase 2.5 — Data Reality Pass (1–2 days).** Row counts and predicate-match counts per
   candidate source, per tenant. Then re-pick rules. On today's numbers the first three rules should be
   `tasks` overdue, `ci_register` overdue, `risk_register` review overdue — not the two that shipped.
2. **Pull scheduling forward into Phase 3.** A rule engine with no scheduler produces nothing, and every
   WYWA and Impact counter depends on run history accumulating. Follow the existing pattern (`pg_cron` →
   `net.http_post` → edge function with `x-cron-secret` **or** exact service-role bearer, per
   `complybot-monthly-report/auth.ts`).
3. **Fold Phase 8 into Phase 1, and Phase 9 into the existing ComplyBot.** The CEO Governance Portal is
   already live on 23 tenants and ComplyBot already exists with an `ExplainScorePanel`. Extending both is
   a fraction of the cost of a parallel Leadership View and a second chat surface — and avoids the fourth
   "intelligence" namespace.

**Immediate next steps, in order:**

1. Revoke tenant write access on `intelligence_insights`/`_events` (this gets harder the longer it's
   live, even at 0 rows).
2. Fix the scoring contract.
3. Build the enable-per-tenant UI.
4. Phase 2.5 — Data Reality Pass.
5. Retarget rules onto tables with data.
6. Then schedule.

---

## Open items for Brian

- Worktree A is still on PR #412's merged branch (`cursor/gov-overdue-action-v1-5f7c`) with uncommitted
  `html/` build artefacts, while `active-work.md` records it as `main` read-only. Decide whether to reset
  and update the registry block.
- Nothing in this document has been actioned. Each of the six "immediate next steps" needs its own FRAME
  before any branch work starts.

---
---

# Part 2 — Direction update, 13 August 2026 (Angela's MVP reframe)

> **Created:** 13 August 2026 · **Type:** read-only analysis and planning — no code, DB, or config
> changes were made in producing this section.
> **Status of Part 1:** unedited and still standing. Where Part 2 supersedes, downgrades, or elevates a
> Part 1 conclusion, it says so by name. Nothing above this line has been altered.
> **Evidence base:** Part 1's verified production findings, plus Angela's MVP statement and Brian's
> direction of 13 Aug 2026. Items marked **[UNVERIFIED]** are reasoning, not confirmed facts — they need
> a live check before anything is built on them.

---

## 1. The reframe

Angela's MVP statement for this programme:

> **Not the user working for ComplyHub — ComplyHub working for the user.**

Concretely: when someone logs in, the system tells them what needs their attention, what happened while
they were away, and what they specifically are responsible for in this tenant. Her worked example:

> A trainer submits a credential for verification. The Administrator is the one who must approve it. So
> when that Administrator next logs in, ComplyHub says *"X trainer just uploaded Y and needs your
> verification."*

This is a stronger organising idea than the current 10-phase plan's own framing, and it should sit above
the phases as the programme thesis rather than living inside Phase 1. Every phase can then be judged
against a single question: *does this make ComplyHub work for the user, or does it make the user work
for ComplyHub?*

**Confirmed with Brian, 13 Aug 2026:** this reframe is **additive, not a replacement**. Angela's instinct
that we also have to check what's late is correct and stays in scope. The homepage must answer both
"what is waiting on me right now" and "what has quietly gone overdue".

---

## 2. What this changes structurally — two engines, not one

The single most consequential finding of this session. What shipped in #411/#412 is a **state scanner**.
Angela's example requires an **event feed**. They are different machines that happen to share a screen.

| | **State scanner** (shipped in #412) | **Event feed** (required by the MVP) |
|---|---|---|
| Trigger | Scheduled run over table state | The moment the domain action occurs |
| Question answered | "What is overdue *right now*?" | "What happened, and whose job is it now?" |
| Source | `WHERE due_date < now()` predicates | Emitted inside the transaction that caused it |
| Resolution | Next scan observes it fixed | The obligation is explicitly discharged |
| Time semantics | Point-in-time snapshot; no history | Inherently timestamped and ordered |
| "While you were away" | Cannot be reconstructed | Falls out for free |
| Addressing | Tenant-wide | Person-specific |

You cannot produce the sentence *"X trainer **just** uploaded Y and needs **your** verification"* from a
nightly state scan. The scan loses the *just* (no event time — only "this row currently exists in a
pending state") and it loses the *your* (no routing — insights today are tenant-scoped, not
person-scoped).

**Both engines are required. Neither substitutes for the other.** Overdue detection genuinely needs
periodic scanning, because "nothing happened" is exactly the condition that makes something overdue —
there is no event to emit when a deadline passes unattended.

### Immediate open question **[UNVERIFIED]**

`intelligence_events` already exists from PR #411. It has **not** been confirmed whether that table is a
domain event stream (usable as the event feed's backbone) or an engine-run audit log (in which case the
event feed needs its own table). Part 1 describes it as engine-adjacent. **This must be checked before
any design is finalised** — it is the difference between extending a table and adding one.

---

## 3. Impact on Part 1's findings

### Supersedes — Part 1 § 4 ("While You Were Away has an unflagged hard blocker")

Part 1 correctly identified that `auth.users.last_sign_in_at` is overwritten at login, leaving no
"previous login" to diff against, and that history cannot be reconstructed from `audit_logs`.

**The per-user watermark half of that finding still stands** and still needs a new table. But the harder
half — *"there is no history to diff against"* — is **solved by the event feed**, not blocked by it.
Given a durable, timestamped event log plus a per-user watermark, "while you were away" is simply
*events since your watermark*.

**Revised status:** downgraded from *hard blocker* to *sequencing constraint*, conditional on emitters
shipping early (see § 6, G2). The event feed does not depend on Phase 4 — it **is** the mechanism that
makes Phase 4 possible.

### Elevates — Part 1 § 5 (tenant users can write and delete their own "AI findings")

Part 1 ranked this first of six immediate next steps. Under the MVP reframe it becomes a **hard
prerequisite**, not merely first-in-queue.

The reasoning hardens: the state scanner produces *derived observations* ("this action is overdue"),
which are re-derivable if tampered with — the next scan regenerates them. An event feed produces
*historical assertions* ("at 3:14 pm on 11 August, this trainer submitted this credential, and it sat
unactioned for nine days"). Those are **not re-derivable**. If a tenant Administrator can edit or delete
them, then a record the product attributes to ComplyHub can be silently rewritten by the party it
describes.

In an ASQA audit context that is materially worse than having no record at all — it is a monitoring
trail that cannot be relied upon, presented as though it can. Fix at 0 rows, before any emitter ships.

### Unchanged — Part 1 § 1 (both shipped rules run against empty tables)

Still true, still the largest single problem, and the MVP reframe does not rescue it. The Phase 2.5
"Data Reality Pass" recommendation stands, but it now needs **two** queries rather than one:

1. **Overdue volume** (as Part 1 specified) — rows matching each rule predicate, per tenant.
2. **Pending-state volume** (new) — how many records are currently sitting in a *submitted / awaiting
   someone* state, per tenant, per event type.

The second query decides which event types are worth building first. **Do not assume trainer credentials
carries the demo** — Part 1 found only 5 expired and 2 expiring-within-90-days credentials
platform-wide. It may still be the right *first* event type for narrative reasons, but that should be a
deliberate choice made against the number, not an accident.

### Unchanged — Part 1 § 3 (inverted scoring) and the scoring contract

Unaffected by the reframe, and arguably more urgent under it. If the homepage merges scanner insights and
feed events into one ranked list, then a shared 0–100 scale defined **once, centrally** is no longer a
nicety — the two engines produce fundamentally different kinds of item and they have to be comparable to
sit in one list. Define the contract before rule #3 *and* before event type #1.

---

## 4. The genuinely new problem — routing

Nothing in the existing plan or in the shipped code addresses this, and it is the load-bearing piece of
Angela's MVP. "This needs **you**" requires resolving three layers:

1. **Event type → responsible role.** Product knowledge, not engineering knowledge. This is Angela's to
   define (see § 7).
2. **Role → actual users in this tenant.** Resolved against `tenant_members`. **[UNVERIFIED]** — note
   that `tenant_members.role` is Proper Case in production today, not snake_case; the CLAUDE.md snake_case
   table is a future-migration target, not current state. Any routing resolver must be written against
   the casing that is actually live, and re-verified at build time rather than trusted from this document.
3. **Named assignee overrides role broadcast.** If a task has a specific assignee, it goes to them, not
   to everyone holding the role. Without this, every Administrator in a multi-admin tenant gets every
   item and the feature becomes noise on day one.

### The fallback chain — a product decision, not an engineering one

Many RTO tenants have one person wearing several hats, and some will have **zero** users holding a given
role. An unroutable obligation must not silently vanish. Proposed chain, to be confirmed by Angela:

> named assignee → users holding the responsible role → Administrator → tenant owner

### Negative routing — what a role must *not* see

Equally part of the matrix. A Trainer should not be shown "3 trainers have expired credentials". Scoping
rules are as much a part of the responsibility map as routing rules, and they are easier to get from
Angela up front than to retrofit after a scoping complaint from a client.

---

## 5. Supporting architecture decisions

### 5.1 Per-user delivery layer (new table required)

Insights today are tenant-scoped rows. Everything in the MVP framing is per-user: *is it mine, have I
seen it, did I act on it, what is new since I was last here.* Proposed shape:

`intelligence_user_delivery` — `user_id`, `tenant_id`, `insight_id` / `event_id`, `delivered_at`,
`seen_at`, `acted_at`, plus the per-user watermark (`last_seen_at`, `previous_seen_at`) Part 1 § 4 already
called for. Small table, but nothing in the MVP functions without it.

### 5.2 Emit from the RPC, not from database triggers

The tempting implementation is `AFTER INSERT` triggers on every relevant table. **Recommend against**, for
three reasons: trigger sprawl across a schema this size becomes impossible to reason about; triggers fire
during migrations and backfills, producing phantom "just happened" events for records that are years old;
and a trigger cannot easily know *who* performed the action in a way the feed can attribute.

Emit explicitly from the same function that performs the submit/approve/assign action, so the event is
written in the same transaction as the change that caused it.

### 5.3 Suppression against what already runs

Part 1 already flagged that Phase 6 collides with roughly eight existing reminder/nudge crons plus an
`email_outbox` worker firing every minute. Under the MVP this collision arrives **earlier**, because the
first event types we would pick are precisely the ones existing crons already nag about (credential
expiry, governance meetings, trainer reports).

**Rule:** if an existing cron already notifies about an event, the homepage card must be the *same*
event surfaced in a better place — never a second, independent notification. **[UNVERIFIED]** — whether
credential submission currently triggers an email to the Administrator has **not** been checked. It must
be, before that event type ships.

Double-emailing paying RTO clients is the most visible failure mode available to this programme.

### 5.4 Empty state as a first-class deliverable

Part 1 found that only 22 of 88 tenants have any overdue signal at all. Under the MVP framing this stops
being a gap and becomes an opportunity: *"ComplyHub checked 41 deadlines overnight — nothing needs you
today"* is arguably a **stronger** demonstration that the platform is working for you than a list of
problems is. But it only works if the monitoring counters are real, which means they depend on run
history, which means they depend on scheduling (Part 1's resequencing point 2). A blank card reads as
broken; a proof-of-monitoring card reads as the product doing its job.

---

## 6. Proposed groundwork sequence

Five items to complete **before** resuming the numbered phases. Three of them get materially harder the
longer they are deferred, which is the argument for doing them now rather than after the next visible
feature.

| | Item | Why now | Gets harder with time? |
|---|---|---|---|
| **G1** | Revoke tenant write/delete on insights + events; route user actions through a narrow RPC | Attribution integrity; audit defensibility (§ 3) | **Yes** — trivial at 0 rows, a data migration later |
| **G2** | Ship event emitters **dark** — recording only, nothing rendered | History cannot be reconstructed; WYWA needs accumulated history to have anything to show at launch | **Yes** — every day not emitting is a day of history permanently lost |
| **G3** | Data Reality Pass, both halves — overdue volume **and** pending-state volume, per tenant | Decides which rules and which event types are worth building; prevents a repeat of the empty-tables outcome | No, but it gates G5 |
| **G4** | Define the single scoring/ranking contract across both engines | Two engines merging into one ranked list; fixing the inversion and the unreachable `critical` threshold | **Yes** — every new rule written against the old contract adds migration cost |
| **G5** | Resolve the routing model — event → role → user, plus fallback chain and negative scoping | Load-bearing for the whole MVP; blocked on Angela's input | Blocked externally |

**G1, G2 and G4 are engineering-side and can start without Angela.** G5 is blocked on her responsibility
map. G3 is a read-only query exercise that can run in parallel with everything.

**Recommended order:** G1 → G3 (parallel with G4) → G2 once G3 has picked the first event types → G5 when
Angela's map arrives → then the homepage itself.

Each of these still needs its own FRAME and Brian's approval before any branch work starts — nothing here
is authorisation to begin.

---

## 7. What we need from Angela

Requested 13 Aug 2026. The ask is deliberately **not** "map out what each role does" — that returns prose,
and prose does not route notifications. What is needed is a responsibility matrix keyed to system events:

| What happened | Who must act | Who should know | How urgent | What goes wrong if ignored | Time to act |
|---|---|---|---|---|---|
| Trainer submits a credential for verification | Administrator | Compliance Manager | Normal | Trainer can't be scheduled; gap shows at audit | 5 business days |

Plus two judgement calls that are product decisions, not engineering ones:

1. **Who picks it up when nobody in the tenant holds the responsible role** (the fallback chain, § 4).
2. **What each role must not be shown** (negative scoping, § 4).

Optional but useful: mapping each situation back to the relevant **Critical Driver**, which would give a
natural grouping for how items are organised on screen and keeps the taxonomy tied to an existing frame
rather than inventing a new one.

---

## 8. What could happen — scenarios and failure modes

Written deliberately, because most of these are avoidable *only* if they are named before the build
starts.

### If the groundwork lands first (the good case)

The homepage launches onto a tenant that already has weeks of accumulated event history, so "while you
were away" has genuine content on day one rather than being an empty promise. Users see items addressed
to them personally, which is the entire difference between a dashboard and an assistant. Tenants with
nothing outstanding get a proof-of-monitoring message rather than a blank card, so the feature
demonstrates value on 88 tenants rather than on the 22 that have problems. And every record the system
attributes to itself is defensible in an audit because no tenant user could have written it.

### Failure modes, ranked by how likely and how visible

**1. Launch-empty.** Highest probability. If emitters ship at the same time as the UI, then on launch day
every "while you were away" panel is blank, because there is no history yet — the feature has to run for
weeks before it has anything to say. Users form their impression in the first session. *Mitigation: G2 —
emit dark, early.*

**2. Double-notification.** Highest visibility. Roughly eight reminder crons already email clients. If the
first event types duplicate what those already send, paying RTO clients get nagged twice about the same
thing by the same product. *Mitigation: § 5.3 — verify existing notification coverage per event type
before shipping it; one suppression check.*

**3. Repeat of the empty-tables outcome.** Moderate probability, low visibility until launch. Choosing
event types on schema quality rather than data volume is exactly the mistake that produced two rules that
cannot fire. The pending-state query in G3 exists specifically to prevent the same error recurring in the
event feed. *Mitigation: G3, and no event type promoted to "first to build" without its volume number
attached.*

**4. Notification fatigue and the dismissal spiral.** Moderate probability, slow-burn damage. If routing
broadcasts to every role-holder instead of the named assignee, three Administrators each receive every
item, all three assume one of the others has it, and the dismissal rate climbs. Once users learn to clear
the panel without reading it, the feature is dead and very hard to revive. *Mitigation: § 4 layer 3
(assignee overrides role) and an explicit dismissal-rate acceptance criterion — Part 1 already noted the
plan has no measurable exit conditions anywhere.*

**5. Role collapse in small tenants.** Moderate probability. One person holding Administrator, Compliance
Manager and Consultant receives the same item three times through three routing paths, or receives
nothing because the routing assumed distinct holders. *Mitigation: de-duplicate at the delivery layer, per
user, not per role — and confirm the fallback chain with Angela rather than inferring it.*

**6. Fabricable audit trail.** Low probability of exploitation, severe if it ever matters. Covered at § 3
and G1. The exposure is not primarily malice — it is a well-meaning Administrator tidying up a panel and
destroying the record that ComplyHub was monitoring at all.

**7. Angela's matrix arrives as prose.** Moderate probability, cheap to recover from but delays G5. This is
why the ask went out as a filled-in example table rather than an open question — a blank template comes
back blank.

**8. Namespace sprawl.** Already live, already noted in Part 1: four unrelated meanings of "intelligence"
in one codebase. The event feed adds a fifth surface. Still a 41-file rename today; it will not be for
long.

### The strategic risk if the groundwork is skipped

The programme ships a visible feature quickly, it demonstrates well on a prepared tenant, and it produces
nothing for the majority of real ones. The failure would not be loud — no errors, no outage. It would look
exactly like a working feature that users quietly stop opening. That is a much harder problem to detect
and a much harder one to argue for fixing than a delay of a fortnight is.

---

## 9. Open decisions for Brian

- **Sequencing conflict.** Part 1 recommended retargeting the rules onto `tasks` / `ci_register` /
  `risk_register` because that is where the data is. The MVP reframe pushes toward event-driven approval
  flows. These are not in conflict in principle, but they compete for the same build slot. **Recommendation:
  resolve with the G3 numbers rather than by preference** — build the event *infrastructure* against
  Angela's model, but populate the first homepage from whichever sources actually have rows.
- Whether the event feed extends `intelligence_events` or gets its own table — blocked on the
  **[UNVERIFIED]** check in § 2.
- Whether to commit to a timeframe for the groundwork. The message to Angela deliberately carries no dates.
- Whether the naming/namespace cleanup happens now, alongside the event feed, or is accepted as debt.
- Whether Release 1 automations may ever mutate a register. Part 1's recommendation stands and is
  strengthened under the MVP framing: **notify and flag, never mutate**. A compliance platform that
  silently changes a compliance record is a far bigger trust problem than one that only nags.

---

## 10. Verification still outstanding

Explicitly listed so nothing in Part 2 is mistaken for confirmed fact. None of these were checked in this
session:

- What `intelligence_events` actually holds — domain event stream or engine-run audit log (§ 2).
- Pending-state volumes per tenant, per candidate event type (§ 3, G3).
- Live `tenant_members` role coverage — how many tenants have zero holders of each role, and how many have
  one user holding several (§ 4).
- Whether trainer credential submission already triggers a notification through the existing cron/outbox
  path (§ 5.3).
- Whether any existing table already carries a per-user seen/read concept that the delivery layer could
  extend rather than duplicate (§ 5.1).

**Nothing in Part 2 has been actioned.** No code, database, configuration or branch work has been done.
Each groundwork item needs its own FRAME and Brian's explicit approval before anything starts.
