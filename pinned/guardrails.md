> **Last updated:** 29 July 2026 · **Reconsider by:** 29 Jan 2027 · **Confidence:** high — canonical rules for all AI tools in this workspace.

# Guardrails

Rules that apply to every AI tool (Claude Code, Codex, Claude Desktop) in this workspace. Non-negotiable.

## Write permissions

| Repo/Folder | Access level |
|---|---|
| `complyhub-kb/` | Full — read, write, commit, push to any branch including `main` |
| `complyhub-kb/audit/` | Full — same as above; lives inside the same repo |
| `rto-compass-hub/` on `main` | Read-only — `git fetch` and `git pull` only; no commit, no push, no file edits |
| `rto-compass-hub/` on `fix/local-run` | Edits and commits allowed — this is the active Vercel migration working branch |

Feature branch naming for `complyhub-kb/` where used: `fix/<slug>`, `kb/<slug>`, `adr-<NNN>`, `restructure/<slug>`

## Absolute never-do

- Never edit files in `rto-compass-hub/` on `main` — read and fetch only on that branch
- Never commit or push directly to `main` in `rto-compass-hub/`
- Never paste API keys, service-role keys, OAuth secrets, or database passwords into conversations or files
- Never cross-reference one tenant's data into another's work (multi-tenant platform)

## Secrets and credentials

All credentials come from environment variables only — no fallback string literals. See `pinned/conventions.md` "Never hardcode service URLs or credentials" for the full rule and code examples.

## Entity routing

Two legally separate Australian businesses share this workspace. Route all financial, invoicing, and client-facing content to the correct entity before proceeding. If ambiguous, ask.

| Entity | ABN | Used for |
|---|---|---|
| Vivacity Coaching & Consulting | 40 140 059 016 | RTO governance advisory and consulting |
| ComplyHub.ai Pty Ltd | — confirm with user | SaaS compliance platform |

## Data confidentiality

- ComplyHub is strictly multi-tenant. Never cross-reference one tenant's data into another's work.
- De-identify examples in anything shareable externally.
- Team composition, performance management, and internal investigations are confidential — keep out of any external-facing output.

## Codebase write restriction

There is no Lovable-prompt workflow anymore (retired, confirmed 22–23 Jul 2026) — do not offer a "prompt for Lovable" or a "prompt for Claude Desktop" for codebase edits.

`rto-compass-hub/main` is read-only — no direct edits, commits, or pushes. All code changes reach it via the 7-step gated dev workflow (raise → findings → plan → build/ship only after RJ's explicit go-ahead, then branch + commit + push + PR) — see the workspace `CLAUDE.md` section 3 for the full loop.

`rto-compass-hub/fix/local-run` allows edits and commits directly. All code changes on this branch must follow the rules in `rto-compass-hub/CLAUDE.md` (Carl's file) — that file is authoritative for all code decisions. Do not create guardrails or patterns that conflict with it.

## Database migrations

Every migration must be accompanied by a rollback plan before it is considered complete. No exceptions.

A rollback plan is one of:
- A down migration file (e.g. `YYYYMMDDHHMMSS_rollback_<slug>.sql`) that reverses the up migration exactly — drops added columns, restores dropped columns, reverts function changes
- An explicit written rollback procedure documented in the PR description or a companion note, for cases where a SQL rollback is not possible (e.g. destructive data transforms, irreversible enum changes)

**What counts as a migration:** any file in `supabase/migrations/` — schema changes, RLS policy changes, function definitions, index additions, data backfills.

**Why:** Supabase migrations are applied in strict timestamp order and cannot be unapplied automatically. A migration with no rollback plan leaves the team with no safe recovery path if the migration causes a production incident. This was reinforced during PR #36 review where a missing `config.toml` entry and a type mismatch were caught — the same discipline applies to the database layer.

**At review time:** if a PR contains a migration file and no rollback plan is present, flag it as a blocker before approving.
