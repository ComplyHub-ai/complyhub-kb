# ComplyHub Workspace — Codex Adapter

> Full rules, guardrails, and session protocol live in the shared KB.
> See `complyhub-kb/pinned/guardrails.md` and `complyhub-kb/pinned/session-protocol.md`.
> For Claude Code, see `CLAUDE.md` at this workspace root.

## Repos

| Name | Path | Notes |
|------|------|-------|
| `complyhub-kb` | `./complyhub-kb/` | Team KB — full read/write access |
| `rto-compass-hub` | `./rto-compass-hub/` | Codebase — branch-aware (see Write permissions below) |

## Workspace layout

```
complyhubworkspace/
├── CLAUDE.md          ← Claude Code entry point
├── AGENTS.md          ← Codex entry point (this file)
├── complyhub-kb/      ← team KB (full read/write access)
│   ├── audit/         ← audit trail (inside KB repo)
│   ├── pinned/        ← shared rules, always load first
│   ├── reference/     ← fetch on demand
│   ├── codebase-state/← as-shipped codebase snapshots
│   └── handoffs/      ← scenario procedures
└── rto-compass-hub/   ← codebase (branch-aware — see Write permissions)
```

## Session start (mandatory first action)

Run these shell commands before any other work:

```bash
cd complyhub-kb && git pull --ff-only && cd ..
cd rto-compass-hub && git fetch && git pull && cd ..
```

Report latest commits in both repos after pulling. If any pull fails, stop and report — do not resolve conflicts autonomously.

Full session protocol (start, end, notes, token efficiency): read `complyhub-kb/pinned/session-protocol.md`

## Write permissions

| Repo/Folder | Access |
|---|---|
| `complyhub-kb/` | Full — read, write, commit, push (including `main`) |
| `complyhub-kb/audit/` | Full — same as above |
| `rto-compass-hub/` on `main` | Read-only — fetch and pull only, never edit or commit |
| `rto-compass-hub/` on any `feat/*` or `fix/*` branch | Edits and commits allowed — all new work goes through a branch + PR |
| `rto-compass-hub/` on any `cursor/*` branch | Edits and commits allowed — for PR review workflow only |

Full rules, entity routing, and confidentiality: read `complyhub-kb/pinned/guardrails.md`

## Codebase write restriction

Before editing any file in `rto-compass-hub/`, run `git branch --show-current` first. If it shows `main`, stop — do not edit or commit. Report the branch and ask the user to create or switch to a `feat/*`/`fix/*`/`cursor/*` branch first.

On an appropriate branch, edits and commits are allowed, but **never** run `git push` or `git commit` unless the user explicitly says so in that turn (see the commit/push gates in `CLAUDE.local.md` — approving an edit is not approving a commit, approving a commit is not approving a push).

If codebase changes are needed but no suitable branch exists and the user hasn't asked to create one:

- **If Claude Desktop is also active this session:** produce a prompt the user can run in Claude Desktop.
- **Otherwise:** produce a prompt to give to Lovable.

## Entry docs (load order)

| Priority | Path | Purpose |
|---|---|---|
| 1 | `complyhub-kb/pinned/guardrails.md` | Write rules, entity routing, confidentiality |
| 2 | `complyhub-kb/pinned/session-protocol.md` | Session ritual, Claude Desktop sync, token efficiency |
| 3 | `complyhub-kb/pinned/conventions.md` | Tech conventions, RLS, Edge Function patterns |
| 4 | `complyhub-kb/pinned/decisions.md` | Architectural decisions log |
| 5 | `complyhub-kb/README.md` | KB orientation |
| on demand | `complyhub-kb/handoffs/` | Scenario procedures |
| on demand | `complyhub-kb/reference/` | Deep reference docs |

## GitHub org/repo values

| Alias | Org | Repo |
|---|---|---|
| `complyhub-kb` | `ComplyHub-ai` | `complyhub-kb` |
| codebase | `ComplyHub-ai` | `rto-compass-hub` |

## Database diagnostic trigger

When the user says `check database` (or equivalent phrasing), treat it as an instruction to run a Supabase MCP diagnostic workflow by default.

Default behavior:
- Use Supabase MCP first for database inspection.
- In this workspace, use MCP server `supabase` for all database checks.
- Do not use MCP server `supabase-unicorn` unless the user explicitly requests a cross-project check.
- Keep all operations read-only by default.
- Do not run write SQL, migrations, or schema changes unless the user explicitly asks.
- Default project target is **ComplyHub Project** with project ID `gdwhlstfguxarnxasrrs`.
- If the user does not specify a project, assume `gdwhlstfguxarnxasrrs`.
- Only switch projects when the user explicitly names a different project.

Diagnostic workflow:
1. Identify the target table(s), view(s), or feature area from the request.
2. Inspect schema shape first (tables, columns, types, relationships relevant to the issue).
3. Run focused read-only queries needed to validate the issue.
4. Summarize findings and likely root cause.
5. Propose the smallest safe fix path (without executing writes unless explicitly approved).

Response format for `check database`:
- What was checked
- Key findings
- Likely root cause
- Recommended next step

Session-start verification prompt:
- `Before any database work, confirm you will use MCP server supabase and show the target project_ref.`
