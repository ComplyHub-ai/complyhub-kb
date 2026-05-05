# ComplyHub — Knowledge Base

Source of truth for the ComplyHub Claude Project's knowledge layer.
Two-repo model: KB and codebase only. Audit trail lives inside the KB.

| Repo/Folder | Purpose |
|-------------|---------|
| `complyhub-kb/` | This repo. Team opinion, decisions, patterns, handoffs. |
| `complyhub-kb/audit/` | Audit trail — one markdown file per audit event. |
| `rto-compass-hub/` | The codebase. |

## Folder structure
complyhub-kb/
├── audit/         ← audit trail (inside KB repo, not separate)
├── pinned/        ← uploaded to the Claude Project (always in context)
├── reference/     ← fetched via GitHub MCP on demand
├── codebase-state/ ← fetched via GitHub MCP; as-shipped state of codebase
└── handoffs/      ← scenario-specific procedures

## Source precedence

1. Pinned KB → 2. `complyhub-kb/` via GitHub MCP →
3. `rto-compass-hub/` via GitHub MCP → 4. inference (flagged)

When pinned KB and the repo disagree, the repo wins.

## How to update

- Conventions, decisions, patterns → PR against `complyhub-kb/` on a branch
- Module status / codebase map / architecture → `complyhub-kb/codebase-state/`
- Audit entries → `complyhub-kb/audit/`, one file per event, named
  `YYYY-MM-DD-<slug>.md`
- Non-git stakeholders → paste into the designated Claude Project inbox thread

See `pinned/kb-hygiene.md` for shelf life, review cadence, and what
never goes in.

## What's NOT here

- Secrets, API keys, Supabase service-role keys, Stripe keys (never)
- Raw migration SQL (link to `supabase/migrations/` in codebase repo)
- Personal identifying info about clients beyond role names
