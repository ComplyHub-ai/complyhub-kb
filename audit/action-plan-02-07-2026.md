# ComplyHub Consolidated Action Plan — 2 July 2026

**Compiled by:** Fable (claude-fable-5), for Brian
**Sources cross-referenced:**
- `audit/security_audit_july02.md` (32 findings across security, code quality, performance, SEO, KB)
- `audit/automation-02-07-2026-session-1.md` (27 automation opportunities across 5 phases)

**Purpose:** Turn two separate audits into one sequenced set of goals the team can actually execute, with the dependencies between them made explicit. Nothing here has been built or committed — this is a planning artifact for Carl, RJ, Dave and Angela to triage.

> **Ownership rule (from CLAUDE.local.md + guardrails):** everything touching `main`, `config.toml`, `supabase/migrations/`, `vercel.json`, `.gitignore` or the DB is Carl's or Dave's domain and must be confirmed before any change. Brian can draft, diagnose and prepare PRs on branches; he does not decide these.

---

## The one insight from cross-referencing both audits

The security audit and the automation discovery are not two separate workstreams — **they share a keystone.** The automation program's flagship items (scheduling the dormant functions, nightly TGA sync, onboarding pre-population) are *blocked* by the security audit's Critical findings, because you cannot safely put a cron trigger or a chained automation onto an edge function that has no authentication. And the fix the security audit recommends for those functions — a verified JWT or a shared `CRON_SECRET` header — is *exactly* the "cron-caller pattern" the automation doc lists as its top infrastructure prerequisite.

**One artefact solves both problems.** Building a shared, authenticated invocation pattern for service-role functions (Goal 1) simultaneously:
- closes Security Findings 001, 002, 003, 005, 006, 016 (the unauthenticated-function class), and
- unlocks Automation OPP-001, 004, 014 (everything that needs a safe way to fire a function on a schedule or from another function).

That is why Goal 1 below is the single highest-leverage piece of work on the platform right now. It is not "security *or* automation" — it is the thing both depend on.

Two more shared blockers fall out of the cross-reference:
- **The failed index sweep** (Security 009/010) must complete *before* the daily compliance sweeps (Automation OPP-002/024) go live, or every reminder scan becomes a full-table scan on trainer tables at scale.
- **The `_shared/` middleware epic** unifies three asks that were written separately: `_shared/cors.ts` (Security 023), the edge-function auth checklist (Security KB-IMP-005), and `_shared/aiUsage.ts` metering (Automation OPP-007). One epic, three payoffs.

---

## Goal ladder (sequenced — later goals depend on earlier ones)

| Goal | Title | Primary owner | Unblocks | Source findings/opps |
|---|---|---|---|---|
| **G1** | Close the unauthenticated-function class + build the authenticated caller pattern | Carl | G2, G6, most of automation | SEC 001–006, 016; AUTO OPP-001/004/014 prereq |
| **G2** | Complete the index sweep, then switch on the dormant automation layer | Carl + Dave | G3 | SEC 009/010; AUTO OPP-001/002/003 |
| **G3** | Ship the compliance deadline notification engine | Brian (drafts) + Carl/Dave (schema/cron) + Angela (policy) | — | AUTO OPP-002/009/010/013/015/016/017/024; SEC 008 (render safety) |
| **G4** | Fix the tenant-isolation regressions | Carl + RJ | trust; G9 | SEC 004/007/011 |
| **G5** | `_shared/` hardening + AI instrumentation epic | Carl | proactive AI (G8) | SEC 023, KB-IMP-005; AUTO OPP-007 |
| **G6** | Same-day security quick wins | Carl/RJ | — | SEC 001/007/008/018 |
| **G7** | Data lifecycle & retention | Carl + Dave | — | AUTO OPP-023; SEC 009 |
| **G8** | Proactive AI (gated behind G5) | Brian (drafts) + Angela (policy) | — | AUTO OPP-020/021/022/027 |
| **G9** | Consultant portfolio + tokenised sharing (new features) | RJ + Carl + Angela | — | AUTO OPP-005/019; SEC 011 dependency |
| **G10** | SEO / marketing surface | Carl | growth | SEC 015/025 |
| **G11** | KB reconciliation (single pass over both audits' KB-IMPROVE lists) | Brian | future sessions | both audits' KB sections |

---

## G1 — Close the unauthenticated-function class and build the authenticated caller pattern

**Why first:** highest-severity security exposure on the platform *and* the gate for the entire automation program. Do not schedule or chain any automation until this lands.

**Outcome:** no service-role edge function is reachable without either a verified JWT + tenant-membership check, or a validated `CRON_SECRET` header for internal/cron callers. A documented `_shared/` helper makes the correct pattern the path of least resistance.

**Tasks:**
1. **Delete or gate `rename-user-email`** (SEC 001, Critical — unauthenticated account-takeover primitive). Preferred: delete; it is leftover one-shot tooling still declared in `config.toml`. — *< 1 hour, Carl.*
2. **Fix `api-v1-router` JWT verification** (SEC 002, Critical). Replace `atob`-decoded, signature-unverified `tenant_id` with `auth.getUser`/`getClaims`, then derive tenant from verified claims. — *half day, Carl.*
3. **Authenticate `tga-rto-sync`** (SEC 003, Critical) — this is the same function blocking AUTO OPP-004 and OPP-014. Require JWT + membership for user-triggered sync, or `CRON_SECRET` for the nightly job. — *half day, Carl.*
4. **Add membership check to `tas-create`** (SEC 005, High — cross-tenant IDOR) and sweep siblings (`generate-tas-section`, `tas-fetch-labour-market`, `connector-sync`). — *full day incl. sweep.*
5. **Authenticate `api-v1-webhook-dispatch`** (SEC 006, High) and **`ops-run-diagnostics` / `enforce-billing-compliance`** (SEC 016 — the last is a billing-DoS vector *and* a function AUTO OPP-001 wants to schedule). — *half day.*
6. **Build the `CRON_SECRET` caller pattern in `_shared/`** — the reusable artefact. This is AUTO infrastructure prerequisite #2. Header validation helper + env-var URL resolution (never hardcoded — the `20260622000000` outbox-cron lesson) + branch-DB env guard so crons don't fire from branch databases. — *half day, Carl.*
7. **Full sweep of all 122 `verify_jwt = false` functions** for internal auth (SEC KB-IMP-005). Track as an epic, not one PR; write the `handoffs/` procedure for it (SEC KB-IMP-008). — *multi-day.*

**Cross-reference callout:** completing tasks 3, 5 and 6 is the literal precondition for Goal 2. Sequence them together.

---

## G2 — Complete the index sweep, then switch on the dormant automation layer

**Why second:** the automation logic already exists and is in production — only the timers are missing (AUTO found exactly one pg_cron job in the whole repo). But scheduling daily scans onto unindexed trainer tables would turn each scan into a full-table scan (SEC 009), so the index sweep must land first.

**Outcome:** trial expiry, invite expiry, trainer reminders and the revenue audit run on schedule; the credential-expiry reminder and payment-failure email — the two highest-value nudges — are live.

**Tasks:**
1. **Complete the failed 22 Aug 2025 index sweep** (SEC 009) — non-transactional migration with `CREATE INDEX CONCURRENTLY`, then re-run the advisor to confirm `indisvalid = true`. **Verify SEC 010's candidate list against production `pg_indexes` first** (the automated cross-reference over-reports). — *full day, Dave/Carl.*
2. **Schedule the four dormant functions** (AUTO OPP-001), using the G1 `CRON_SECRET` pattern: `trial-expiry-scanner` (daily 06:00 AEST — also closes the server-side trial-lock hole where client-side polling is the only enforcement today), `cron-expire-invites`, `process_trainer_report_reminders` (daily 08:00 AEST), `billing.revenue_audit()`. — *half day, Carl.*
3. **Credential/currency expiry reminder pipeline** (AUTO OPP-002, flagship) — daily cron → RPC over the existing `v_credential_expiry_alerts` view at T-90/30/7 → `email_outbox` + `in_app_notifications`, idempotency key `(credential_id, threshold)`. — *full day.*
4. **Payment-failure & billing-lifecycle emails** (AUTO OPP-003) — queue emails from the existing Stripe webhook handlers on `payment_failed` / grace / suspension / recovery. Closes a silent-churn hole: today a failed card locks a tenant with no email. — *full day.*

**Cross-reference callout:** AUTO OPP-013 (trainer reports) also needs Angela to lift the reminder allowlist off its single test address and fix the "month" wording — fold into G3.

---

## G3 — Compliance deadline notification engine

**Outcome:** the platform proactively tells the right person before every compliance deadline it already knows about — the core "it knows and doesn't tell anyone" gap.

**Tasks:**
1. **Schema migrations for the missing date columns** (AUTO OPP-015/016/017, all `SCHEMA-GAP-BLOCKS-AUTOMATION`; rollback plan mandatory per guardrails, and SEC 028 notes most migrations lack one — set the example here): `next_pd_review_due` on `tp_trainers`; `last_review_date`/`next_review_due` on `training_products`; `next_asqa_audit_date` on `tenants`. Wire the unused `tenants.trainer_pd_review_cadence`. — *Dave/Carl.*
2. **Extend the daily sweep** to PD-due, training-product-review, ASQA-audit and assessment-tool-validation thresholds (AUTO OPP-017/016/015/024). OPP-024 is < 1 hour once the sweep exists. — *incremental.*
3. **Evidence workflow notifications** (AUTO OPP-009/010) — trigger on `evidence_documents` status changes: notify reviewer on `needs_review`, notify trainer on submitted/accepted/rejected.
4. **Trainer report lifecycle** (AUTO OPP-013) — auto-draft on meeting creation, submission confirmation, overdue escalation; lift allowlist + fix wording (Angela).
5. **Welcome email** (AUTO OPP-011) on account/tenant creation.

**Cross-reference callout — SEC 008 (stored XSS in governance minutes) and SEC 031 (invitations may not actually send email):** notification content that renders tenant-supplied text must pass through `sanitizeHtml`; and before building *more* email flows, confirm the existing invite email actually sends (SEC 031 flags `InvitationManager.tsx:121` as a stub). A notification engine built on a broken send path is worthless — verify the send path as task 0.

**Decision needed (Angela):** reminders opt-out or opt-in? Default thresholds? (AUTO decisions list #1.)

---

## G4 — Fix the tenant-isolation regressions

**Why it matters:** these are trust/correctness, and PD-002 makes tenant isolation the highest-severity category. Also a dependency for G9 (consultant features need the consultant RLS story settled).

**Tasks:**
1. **Flip `superadmin_tenant_gate` no-active-tenant branch to `RETURN false`** (SEC 004, Critical — regression of the 19 June incident; contradicts Carl's CLAUDE.md). Inverts production behaviour → **Carl sign-off required**; new migration, append-only. Record the intended boundary as a PD (SEC KB-IMP-003). — *< 1 hour to write, needs sign-off.*
2. **`queryClient.clear()` on tenant switch** (SEC 007) instead of invalidating three keys — closes the client-side stale-cross-tenant-render window. — *< 1 hour, RJ.*
3. **Document the Consultant→Administrator parity elevation** in `has_tenant_role` (SEC 011) as an explicit decision, or switch registers that must exclude consultants to `has_tenant_role_strict`. Confirm intent with Carl/RJ. — *needs discussion.*

---

## G5 — `_shared/` hardening + AI instrumentation epic

**Outcome:** one shared middleware layer that fixes systemic CORS debt, enforces the auth checklist, and meters AI spend per tenant — the prerequisite for any proactive AI.

**Tasks:**
1. **`_shared/cors.ts` with an origin allowlist** (SEC 023 — 324 functions on wildcard CORS); prioritise public/admin/billing functions.
2. **Edge-function auth checklist convention** in `conventions.md` (SEC KB-IMP-005) — the reusable rule G1 established.
3. **`_shared/aiUsage.ts` metering + per-tenant budget/tier gate** (AUTO OPP-007) — 87 AI functions currently call LLMs with no token accounting or quota; one busy starter-tier tenant can run unbounded Anthropic spend. Fits Carl's Milestone-4 `_shared/` plan; adopt function-by-function as files are touched.
4. **`ai-router` timeout + provider URL** (SEC 012) — no `AbortController`, and it calls the decommissioned Lovable AI gateway. Fold in while touching AI functions.

**Decision needed (Angela):** AI allowances per subscription tier (AUTO decisions list #5).

---

## G6 — Same-day security quick wins (do these immediately, independent of everything else)

Each is under an hour and needs no dependency:
- **`rename-user-email`** delete/gate (SEC 001) — also G1 task 1; do it today.
- **`queryClient.clear()`** on tenant switch (SEC 007) — also G4 task 2.
- **`sanitizeHtml` on governance meeting minutes** (SEC 008, stored XSS).
- **`.env` → `.gitignore` + `git rm --cached .env`** (SEC 018) — only public keys today, but the next secret added leaks; Carl's domain.

---

## G7 — Data lifecycle & retention

**Tasks (AUTO OPP-023):** nightly purge of rows past `hard_delete_after`; retention windows for `auth_activity_log`, `activity_log`, `ai_tagging_audit`(verify it exists — AUTO KB-IMP-002), `email_events`, sent `email_outbox` rows. Each a small SECURITY DEFINER cleanup RPC on a shared nightly schedule. **Dave/Angela sign-off on windows** (some AI audit trails may be compliance evidence needing longer retention). Depends on G2's index work for the log-query performance.

---

## G8 — Proactive AI (gated behind G5)

**Tasks:** auto unit-risk scoring on TAS approval (AUTO OPP-020) → feeds G3's validation deadlines; auto governance-meeting analysis on close with review panel retained (OPP-021); persist document auto-tagging on upload (OPP-022). **All gated behind G5's metering.**

**Decision needed (Angela) — do first, it's cheap:** the human-review policy (AUTO OPP-027) — which AI outputs may write to compliance records without confirmation? Recommend: none. `audit-ai-processor` and `parse-meeting-notes-ai` (`commit=true`) currently write directly. Log as a PD.

---

## G9 — Consultant portfolio + tokenised sharing (new features)

**Tasks:** consultant portfolio compliance digest + aggregated overdue-items view (AUTO OPP-005) — depends on G3's expiry data and on G4 task 3 (consultant RLS story settled); tokenised shareable compliance reports for governing persons without logins (AUTO OPP-019), cloning the proven `qi_survey_links` pattern with snapshot-at-share-time isolation. **Angela decision required** — this deliberately exposes tenant-derived data outside auth.

---

## G10 — SEO / marketing surface

**Tasks (SEC 015/025):** serve a real indexable marketing page at `/` (today it 307-redirects to `/login` and the body is an empty `<div id="root">` — the platform is essentially invisible to crawlers in a ~4,000-provider high-intent market); prerender public routes; add self-referencing canonical tags; fix the broken non-blocking-CSS plugin. All Carl's domain (`vercel.json`/build config).

---

## G11 — KB reconciliation (one pass over both audits)

Merge the two KB-IMPROVE lists so future sessions load accurate context:
- Edge-function count: KB says 196/209, actual **345** (SEC KB-IMP-001).
- `known-issues.md` stale — move SUSPECTED-003 to Resolved, re-verify BUG-001/002 (SEC KB-IMP-002).
- Add missing PDs: super_admin↔tenant-content boundary (SEC KB-IMP-003), Consultant parity (SEC KB-IMP-004), AI human-review policy (AUTO OPP-027).
- Fill `conventions.md` scaffolding + add edge-function auth checklist and the notification-rails pattern (SEC KB-IMP-006, AUTO KB-IMP-001).
- Correct `architecture.md`'s cron claim — it lists scheduled functions that aren't actually scheduled (AUTO KB-IMP-003) — and refresh `codebase-map.md` (both audits flag it stale, SEC KB-IMP-007 / AUTO KB-IMP-005).

Brian can own this end-to-end — it is pure KB work, full write access, no code risk.

---

## Suggested first two weeks (concrete)

- **Today:** G6 (four quick wins) + G4 task 2. Brian can prep the branches; Carl merges.
- **This week:** G1 tasks 1–6 (the auth class + `CRON_SECRET` pattern) and G4 task 1 (superadmin gate, after Carl sign-off). Start G11 in parallel (no code risk).
- **Next week:** G2 (index sweep → schedule dormant functions → credential reminders → payment-failure emails). This is where the automation program visibly switches on.
- **Angela, this fortnight:** three cheap decisions that unblock later goals — reminder opt-in/out (G3), AI human-review policy (G8), AI tier allowances (G5).

---

*Compiled from two 2 July 2026 audits. Not committed. Raise G1 and G4/G6 security items with Carl and RJ before anything else — they are live exposures, not just planning.*
