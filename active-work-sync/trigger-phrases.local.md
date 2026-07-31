# Trigger phrases → actions

> Extracted from `CLAUDE.local.md` (renamed `CLAUDE.md`) on 16 July 2026 to keep the always-loaded
> file smaller. Personal, not committed to any repo. Read this file directly when Brian actually uses
> one of the phrases below — don't pre-read it speculatively at session start.

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

**"sync work to home/work pc"** / **"push active work"** — copy the current workspace-root docs, `AGENTS.md`/`CLAUDE.md`, user-level Claude Code skills, and Claude Code memory files into `complyhub-kb/active-work-sync/`, then commit and push. Full mechanism: `complyhub-kb/active-work-sync/README.md`.

**"pull active work"** — `git pull` in `complyhub-kb`, then reconcile `active-work-sync/` back into this machine's own workspace-root files, user-level skills directory, and memory directory (diff before overwriting anything with local changes). Full mechanism: `complyhub-kb/active-work-sync/README.md`.

**"load openrouter"** / **"use openrouter"**
```bash
source /Users/khiansismundo/complyhubworkspace/.secrets/load-openrouter.sh
# then start Claude Code — /status should show https://openrouter.ai/api
```
Key file: `.secrets/openrouter.env` (workspace-local, never in a git repo). Full matrix: `complyhub-kb/reference/ai-model-routing.md`.
