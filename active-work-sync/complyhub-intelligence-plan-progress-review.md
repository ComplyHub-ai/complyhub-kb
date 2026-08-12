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
