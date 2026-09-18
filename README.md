# ComplyHub — Knowledge Base

Companion KB to `rto-compass-hub/docs/kb/README.md`, which is the main frame for
engineering-initiative work (planning, phases, packets, evidence, registers). This repo holds the
guardrails, entity routing, audit trail, and cross-tool process that apply regardless of which
initiative or codebase area the work touches — it does not compete with `docs/kb`, it wraps around
it. Lightened 18 Sep 2026: `active-work-sync/`, `codebase-state/`, `localshi/`, and `role-audit/`
were removed once their content was either superseded by `docs/kb` or genuinely stale; `audit/`
stays here permanently.

| Repo/Folder | Purpose |
|-------------|---------|
| `complyhub-kb/` | This repo. Guardrails, decisions, patterns, handoffs. |
| `complyhub-kb/audit/` | Audit trail — one markdown file per audit event. |
| `rto-compass-hub/` | The codebase — `docs/kb/` inside it is the main engineering frame. |

## Folder structure
complyhub-kb/
├── audit/      ← audit trail, permanent
├── pinned/     ← guardrails.md, session-protocol.md, conventions.md — auto-loaded every session
├── reference/  ← remaining codebase-specific reference docs not yet folded into docs/kb
└── handoffs/   ← scenario-specific procedures, not live status

## Source precedence

1. Pinned KB → 2. `complyhub-kb/` → 3. `rto-compass-hub/docs/kb/` → 4. inference (flagged)

When pinned KB and a repo disagree, the repo wins. `docs/kb` is canonical for initiative decisions
specifically (scope, sequencing, acceptance criteria) even where this KB's precedence order would
otherwise put `complyhub-kb/` first.

## How to update

- Conventions, decisions, patterns → PR against `complyhub-kb/` on a branch
- Audit entries → `complyhub-kb/audit/`, one file per event, named
  `YYYY-MM-DD-<slug>.md`
- Non-git stakeholders → paste into the designated Claude Project inbox thread

## What's NOT here

- Secrets, API keys, Supabase service-role keys, Stripe keys (never)
- Raw migration SQL (link to `supabase/migrations/` in codebase repo)
- Personal identifying info about clients beyond role names
