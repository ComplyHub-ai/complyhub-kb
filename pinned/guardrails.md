> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** high — canonical rules for all AI tools in this workspace.

# Guardrails

Rules that apply to every AI tool (Claude Code, Codex, Claude Desktop) in this workspace. Non-negotiable.

## Write permissions

| Repo/Folder | Access level |
|---|---|
| `complyhub-kb/` | Full — read, write, commit, push to any branch including `main` |
| `complyhub-kb/audit/` | Full — same as above; lives inside the same repo |
| `rto-compass-hub/` | Read-only — `git fetch` and `git pull` only; no commit, no push, no file edits |

Feature branch naming for `complyhub-kb/` where used: `fix/<slug>`, `kb/<slug>`, `adr-<NNN>`, `restructure/<slug>`

## Absolute never-do

- Never edit files in `rto-compass-hub/` — read and fetch only
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

`rto-compass-hub/` is read-only for this workflow. If a task requires editing codebase files, do not proceed autonomously. Instead, offer the appropriate option based on context:

- **If working across Claude Desktop and Claude Code in the same session:** offer a prompt for the user to run in Claude Desktop.
- **If working with Claude Code or Codex alone (Claude Desktop not active):** offer a prompt to give to Lovable.

Canonical instructions always belong in `complyhub-kb/` and are manually mirrored elsewhere only when needed.
