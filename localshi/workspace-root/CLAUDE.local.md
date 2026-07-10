# CLAUDE.local.md — Brian (Khian) Personal Workspace Config

> This file is personal to Brian (Khian) and is not committed to any repo.
> Kept deliberately lean (10 July 2026 reorg) — identity, hard safety gates, and
> daily trigger phrases only. Everything else moved to `complyhub-kb/` — see
> "Entry docs (load order)" at the bottom for where each topic now lives.
> `complyhub-kb/pinned/*.md` is auto-loaded every session via a SessionStart
> hook, so moving content there does not make it less reliable than this file.

---

## My role on this team

- **Brian (Khian)** — junior developer / infrastructure assistant
- **Carl** — infrastructure lead (owns `rto-compass-hub/CLAUDE.md`, CI guardrails, config.toml, edge function structure)
- **RJ** — app engineering lead (owns frontend patterns, hooks, component architecture)
- **Dave** — database lead
- **Angela** — product and regulatory

My job is to assist Carl and RJ. When in doubt about a pattern, check `rto-compass-hub/CLAUDE.md` — but Khian can do any one of the roles as long as it is done thoroughly and all matters are accounted for.

---

## Workspace layout

```
c:\Users\brian\complyhubworkspace\
├── CLAUDE.local.md        ← this file (personal, not committed)
├── AGENTS.md              ← Codex entry point
├── complyhub-kb/          ← team KB (full read/write access)
│   ├── audit/             ← audit trail
│   ├── pinned/            ← shared rules — always load first (auto-loaded via hook)
│   ├── reference/         ← fetch on demand
│   ├── codebase-state/    ← as-shipped codebase snapshots
│   └── handoffs/          ← scenario procedures
└── rto-compass-hub/       ← codebase
    ├── CLAUDE.md          ← Carl's rules — authoritative for all code decisions
    ├── src/               ← React + TypeScript frontend (Vite)
    ├── supabase/          ← Edge Functions, migrations, config.toml
    └── .github/workflows/ ← CI guardrails
```

Full worktree workflow (parallel branches, teardown, considerations): `complyhub-kb/reference/worktree-workflow.md`.

---

## GitHub repos

| Alias | Org | Repo |
|---|---|---|
| `complyhub-kb` | `ComplyHub-ai` | `complyhub-kb` |
| `<codebase>` | `ComplyHub-ai` | `rto-compass-hub` |

---

## Write permissions

| Repo / Folder | My access |
|---|---|
| `complyhub-kb/` | Full — read, write, commit, push (including `main`) |
| `complyhub-kb/audit/` | Full — same as above |
| `rto-compass-hub/` on `main` | Read-only — fetch and pull only, never edit or commit |
| `rto-compass-hub/` on any `feat/*` or `fix/*` branch | Edits and commits allowed — all new work goes through a branch + PR |
| `rto-compass-hub/` on any `cursor/*` branch | Edits and commits allowed — for PR review workflow only |

---

## Session start (mandatory first action)

1. `cd complyhub-kb && git pull --ff-only && cd ..`
2. `cd rto-compass-hub && git fetch && git pull && cd ..`
3. Report latest commits in both repos after pulling

If any pull fails: **STOP and report to Brian.** Do not resolve conflicts autonomously.

## Session boundary branch re-confirm

At the start of any session where there is active branch work in progress (i.e. a `fix/*` or `feat/*` branch exists locally or on the remote), run `git branch --show-current` before doing anything else — before reading files, before diagnosing, before any command. Report the active branch to Brian at the top of the session so it is visible and agreed before work begins. Do not rely on memory from a previous session — the checkout may have silently reset to `main`.

---

## ⛔ Hard gates — never violate these

### Commit/push gates
> **NEVER RUN `git commit` OR `git push` UNLESS BRIAN EXPLICITLY SAYS SO.**
> - **Commit words:** "commit it", "commit that", "go ahead and commit", "commit now"
> - **Push words:** "push it", "go ahead and push", "push now"
> "yes", "do it", "approved", "make the fix", "apply it" — NONE of these mean commit or push. They only mean make the file edit.
> If in doubt: make the edit, stop, tell Brian what was changed, and WAIT for explicit commit instruction.
> Approving an edit ≠ approving a commit. Approving a commit ≠ approving a push. These are THREE separate gates.

> **ALWAYS run the plan by Brian BEFORE making any change** — even to local staging files, even outside the repo. Describe what you intend to change, which file, and why. Wait for explicit approval before touching anything.

### Branch verification — mandatory before every commit and push
> **BEFORE running `git commit` OR `git push`, always run `git branch --show-current` first.**
> Confirm the output matches the expected feature branch. If it shows `main` or any unexpected branch — **STOP immediately. Do not commit or push. Report to Brian and resolve the branch state first.**
> Session resets can silently revert the checkout to `main` without warning. Never assume the branch is correct — verify it every time.

### Never run `npm run build`
`npm run build` hangs Brian's workstation. Do not run it for any reason. To verify code correctness, use `npm run type-check` and `npm run lint` (both fast). If both pass, the change is safe to commit and push — Vercel is the real build gate. After a push, use `list_deployments` (`complyhub-kb/reference/vercel-mcp.md`) to confirm the deploy `state`, and pull `get_deployment_build_logs` if it errors.

### Plain English — always, not on request
After any technical audit, diagnosis, or fix explanation, always provide a plain English version without waiting for Brian to ask. No jargon, no file paths, no code snippets — just what happened, why, and what was done about it, as if explaining to a non-developer. Technical detail goes first for the record; plain English summary follows immediately after.

### Never assume — always verify
Never rely on memory, prior session context, or past observations as ground truth. Always verify against the current state: file content → Read the file; DB state → query via MCP; migration status → `list_migrations` against production; branch → `git branch --show-current`; config → Read `config.toml`, not memory. If something could have changed since it was last observed, treat it as unknown until verified.

### My guardrails
- **Always check `rto-compass-hub/CLAUDE.md` first** before suggesting any code pattern, file structure, or database change.
- **Confirm with Brian before acting** on anything that touches `main`, CI config, `config.toml`, or `supabase/migrations/` — surface intent and wait for explicit approval.
- **Do not create new guardrail files** inside `rto-compass-hub/` without Brian explicitly asking.
- **Never commit or push** to `main` in `rto-compass-hub/`.
- **When Brian asks "what should I do next"**, check `rto-compass-hub/TODO.md` and `rto-compass-hub/.lovable/plan.md` for current task context before suggesting anything.
- **Present options, don't hand off.** If a task requires architectural judgement, surface the options and tradeoffs to Brian — do not defer to Carl, RJ, Dave, or anyone else. Brian works across all roles and makes the call.
- **Always give UI-based navigation instructions.** Describe the click path, not raw URLs. Reference `complyhub-kb/reference/ui-navigation.md` for the correct sidebar structure (Administrator role view — state role caveats when relevant).

---

## Trigger phrases → actions

**"go to main and get latest repo"**
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git checkout main
git pull
```

**"create a branch for [name]"** (or "start a new branch" / "new branch for this work")
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git checkout main
git pull
git checkout -b [branch-name]
```

**"set up a worktree for [branch]"** (new branch off `main`) / **"open a worktree for PR review of [branch]"** (existing branch) / **"remove the worktree for [branch]"** — full steps and considerations in `complyhub-kb/reference/worktree-workflow.md`.

**"go to branch [name]"** (or "switch to branch [name]")
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git checkout [branch-name]
git pull
```

**"what are the conflicts of the new repo in our branch"** (or "check conflicts" / "any issues with latest commits")
1. `git checkout main && git pull`
2. `git checkout [active-branch]`
3. `git merge main --no-commit --no-ff`
4. Report any conflicts; inspect changed `package.json` for new/changed deps
5. `git merge --abort` — leave branch clean after the check

**"start local dev"** (or "run locally" / "start the app")
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git checkout [active-branch]
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm install
npm run dev
# App runs at http://localhost:8080
```

**"stop local dev"** — Ctrl+C (foreground) or `Get-Process -Name "node" | Stop-Process -Force` (background)

**"build for vercel"** (or "test production build" / "run build")
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
$env:NODE_OPTIONS="--max-old-space-size=8192"
npm run build
npm run preview
```
(Note: this is the one context where `npm run build` runs — explicit request only, not for routine verification.)

**"check the deploy" / "get the preview url" / "check runtime errors"** — see `complyhub-kb/reference/vercel-mcp.md`.

**"check database"** — see `complyhub-kb/reference/supabase-mcp.md`.

**"start a context doc for [task]"** — see `complyhub-kb/handoffs/context-doc-handover.md`.

**"/audit-branch-drift"** / **"/branch-catchup"** — staging/main sync skills. Run drift audit first, then catchup when confirmed. Staging diverging again afterward is expected — Lovable keeps writing to it.

---

## Entry docs (load order)

| Priority | Path | Purpose |
|---|---|---|
| 1 | `rto-compass-hub/CLAUDE.md` | Carl's code rules — authoritative |
| 2 | `complyhub-kb/pinned/guardrails.md` | Write rules, entity routing, confidentiality (auto-loaded via SessionStart hook) |
| 3 | `complyhub-kb/pinned/session-protocol.md` | Session ritual, token efficiency (auto-loaded) |
| 4 | `complyhub-kb/pinned/conventions.md` | Tech conventions, RLS, Edge Functions, **migration/DB discipline, unit test expectations** (auto-loaded) |
| 5 | `complyhub-kb/pinned/decisions.md` | Architectural decisions log (auto-loaded) |
| 6 | `complyhub-kb/README.md` | KB orientation |
| on demand | `complyhub-kb/reference/worktree-workflow.md` | Parallel worktree workflow (moved from this file 10 July 2026) |
| on demand | `complyhub-kb/reference/supabase-mcp.md` | Supabase MCP usage rules (moved 10 July 2026) |
| on demand | `complyhub-kb/reference/vercel-mcp.md` | Vercel MCP usage rules (moved 10 July 2026) |
| on demand | `complyhub-kb/reference/ci-status.md` | Manual CI deploy status — temporary (moved 10 July 2026) |
| on demand | `complyhub-kb/reference/diagnosis-discipline.md` | Bug-tracing discipline, NEW-013 lessons (moved 10 July 2026) |
| on demand | `complyhub-kb/reference/db-schema-cheatsheet.md` | Live DB schema snapshot, staleness-check instructions |
| on demand | `complyhub-kb/reference/edge-functions-map.md` | Edge function catalog |
| on demand | `complyhub-kb/handoffs/pr-review-fix-workflow.md` | PR review + fix workflow, post-merge checklist (moved 10 July 2026) |
| on demand | `complyhub-kb/handoffs/context-doc-handover.md` | Context-md + handover workflow (moved 10 July 2026) |
| on demand | `complyhub-kb/handoffs/` (other) | Scenario procedures |
| on demand | `complyhub-kb/reference/` (other) | Deep reference docs |
