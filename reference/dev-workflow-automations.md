# Developer Workflow Automations — Brian (Khian)

> **Created:** 2 July 2026
> **Author:** Fable (claude-fable-5) session with Brian
> **Context:** Brian's regular work loop — merging PRs, triaging ComplyHub tickets (ticket → AI → plan → branch), fixing bugs, shipping features. This doc captures automation ideas for that loop, cross-referenced against `audit/security_audit_july02.md`, `audit/automation-02-07-2026-session-1.md`, and `audit/action-plan-02-07-2026.md`.
> **Status:** Ideas / planning only — nothing here is built. Items touching CI workflows, `config.toml`, Sentry or cron schedules are Carl's domain and must be flagged before merge.

---

## First — the two planned automations are mostly already built

### Ticket auto-response bot: ~80% exists

The suggestion-intake pipeline (PRs #58/59/62, June 2026) already does this — when a user submits a ticket, a `pg_net` trigger fires an edge function that runs Claude triage (bug/feature classification, severity) and sends **both** an auto-acknowledgement email to the user **and** the dev-team alert email Brian already receives.

What's genuinely missing is the *follow-through*:

- **SLA escalation** — a cron that finds tickets with no human response after 24 h and escalates (flagged as a gap in the audit log)
- **Close-the-loop notifications** — the user who reported a bug never hears "this was fixed" (see idea 3 below)

### Stripe payment checking: already automated at the data layer

The Stripe webhook → `billing.entitlements` → tenant state machine is one of the best-built parts of the platform. What's missing is *scheduling and visibility*:

- `billing.revenue_audit()` exists but is never run (AUTO OPP-001)
- Nobody is told when a payment fails (AUTO OPP-003)

Don't build a checker — schedule the audit that exists and add the notification layer. Already specced as **Goal G2** in `audit/action-plan-02-07-2026.md`.

---

## Automating the daily loop

### 1. Ticket → context → plan → branch, as one command

Currently manual: read email, copy ticket info, feed to AI, make a plan, create a branch. The triage AI has *already* classified the ticket and written a diagnosis into `suggestion_triage` before the ticket is even opened.

**Build:** a Claude Code skill (e.g. `/ticket 123`) that:

1. Pulls the ticket + AI triage from the DB (read-only Supabase MCP — already configured)
2. Greps the codebase for the components/routes the ticket mentions
3. Applies the diagnosis discipline rules from CLAUDE.local.md (trace from the user action, grep callers, check DB state early — the NEW-013 lessons)
4. Outputs the plan and creates `fix/sugg-123-description` off fresh `main`

Turns a 20-minute ritual into one command, with the diagnosis lessons applied every time instead of only when remembered.

### 2. Pre-review guardrail bot on PRs

Already noted in CLAUDE.local.md as "Pre-push verification agent (future consideration)": CI only fires against `main`, so branch pushes get no checks.

**Build:** a GitHub Action on every PR that greps the diff for Carl's rules:

- `.single()` (use `.maybeSingle()`)
- `supabase as any` / `as any` on Supabase calls
- Hardcoded Supabase URLs / project IDs
- Raw `console.*` in `src/`
- Hooks over ~150 lines
- Migration files without a rollback plan
- New edge function without a `config.toml` entry

The security audit found 370 `.single()` and 755 `as any` already in the codebase; a **diff-only** linter stops the count growing without boiling the ocean. Cheap (shell script + grep in an Action). Brian drafts, Carl approves.

### 3. Close the loop: ticket → branch → PR → user notification

If branches embed the ticket ID (`fix/sugg-123-...`), a GitHub Action on merge to `main` can:

1. Look up ticket 123
2. Post "fixed in PR #NNN" to the ticket's chat tab (`suggestion_comments` table already exists)
3. Flip the ticket status
4. Queue an email to the reporter via the existing `email_outbox`

Users who report bugs and then *hear back when it ships* — a retention feature disguised as a dev automation, with zero ongoing effort once built.

### 4. Post-merge audit entry generation

The mandatory post-merge checklist ends with writing an audit entry in `complyhub-kb/audit/` (root cause, files changed, PR number, date). Nearly all of that is derivable from the PR.

**Build:** a skill like `/audit-entry 104` that drafts the entry from `gh pr view` + the diff, in the established format. 15-minute chore → 2-minute review-and-commit.

### 5. Wire up Sentry — production errors become pre-reported tickets

`src/lib/logger.ts` says `logger.error → Sentry when wired`. It was never wired. Once it is, Sentry alerts can pipe into the same suggestion-intake pipeline — bugs are discovered *before users file tickets*, with a stack trace instead of a vague description. Changes triage from reactive to proactive. **Needs Carl's sign-off (infra).**

### 6. Preview-URL smoke tests per PR

Every push already gets a Vercel preview URL. A Playwright job that logs in as each role and hits the main routes against the preview would have caught recent nav/guard bugs (PR #102 redirect loop, broken nav paths) before manual QA.

Start tiny: login + dashboard render per role. Later: the cross-tenant RBAC matrix test the audit log wants (query each register as each role, assert tenant scoping).

### 7. Quality-of-life

- **Session-start hook** — the mandatory pull ritual (`complyhub-kb` + `rto-compass-hub` + report commits) as a SessionStart hook in Claude Code settings, so it runs automatically. Same for the branch re-confirm check (`git branch --show-current`).
- **Trigger phrases → real skills** — "check conflicts", "start local dev", etc. are documented phrases in CLAUDE.local.md; making them slash commands in `.claude/skills/` makes them deterministic instead of interpreted. Precedent exists: Carl's `.claude/skills/verify-bot-fix/` is now on `main`.
- **Types regeneration on migration merge** — an Action that runs `supabase gen types typescript` when a PR touches `supabase/migrations/` and commits the updated `types.ts`. The 755 `as any` casts partly exist *because* types drift from schema.
- **Scheduled nightly PR-conflict check** — a scheduled Claude agent (or plain Action) that checks open PRs for merge conflicts against latest `main` and comments on them, so the day starts knowing which branches went stale overnight.

---

## Where to start (value ÷ effort)

1. **`/ticket` skill** — most frequent workflow; everything it needs already exists; nobody's sign-off required
2. **PR guardrail Action** — gap already self-identified; protects Carl's rules on every PR
3. **Ticket close-the-loop Action** — small, delightful for users, zero ongoing cost

**Ownership boundary:** CI workflows, `config.toml`, Sentry, cron schedules → Carl's domain (draft on a branch, flag before merge). The `/ticket` and `/audit-entry` skills and session hooks are personal tooling — no sign-off needed.
