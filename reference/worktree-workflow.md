# Parallel worktree workflow

> Moved from `CLAUDE.local.md` (10 July 2026) to shrink that file to identity + hard gates only. Content unchanged from the original.

When Brian has multiple independent tasks queued up (e.g. several bug fixes), a second `git worktree` can be spun up so two branches are worked on at the same time in two separate VS Code windows — no stashing, no switching, no risk of one branch's edits landing on the other.

**This is a repeatable, on-demand workflow — not tied to any fixed branch name.** Create one whenever there's a genuine second task ready to go; tear it down once that task's PR is merged.

**Common case: active dev in one worktree, PR review in the other.** The two worktrees don't have to both be Brian's own fresh work — one can stay on an in-progress `fix/*`/`feat/*` branch while the second checks out whatever's being reviewed (a colleague's branch, a `cursor/*` PR branch). This avoids stashing or switching out of active work just to review, test, or fix a PR — follow the normal PR review + fix workflow (`complyhub-kb/handoffs/pr-review-fix-workflow.md`) in that second worktree, entirely independent of what's checked out in the first.

**Layout — always a sibling folder inside `complyhubworkspace`, never elsewhere:**

```
c:\Users\brian\complyhubworkspace\
├── CLAUDE.local.md          ← shared — found automatically by both windows (upward directory lookup)
├── AGENTS.md                ← shared
├── complyhub-kb\             ← shared — reachable by absolute or relative path from either worktree
├── rto-compass-hub\          ← primary worktree (main checkout)
└── rto-compass-hub-<slug>\   ← secondary worktree, e.g. rto-compass-hub-2 or rto-compass-hub-fix2
```

Keeping the new worktree nested inside `complyhubworkspace` (as a sibling of `rto-compass-hub`, not a folder elsewhere on disk) is what makes `CLAUDE.local.md` and `complyhub-kb` work automatically in the second window — no duplication or copying needed for those.

**Creation steps:**
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git checkout main
git pull
git worktree add ..\rto-compass-hub-<slug> -b fix/or/feat-branch-name
```
Then open a second VS Code window rooted directly at `rto-compass-hub-<slug>` (not the `complyhubworkspace` root — opening the root would show both `rto-compass-hub` folders nested together, which is cluttered though not broken).

**Considerations every time one of these is created:**
- **`npm install` is required separately in the new worktree** — `node_modules` is never shared between worktrees (it's build output, not something to copy — `npm install` regenerates it, same as `dist/`, `.husky/_/`, `tsconfig.tsbuildinfo`).
- **`rto-compass-hub/.env` must be copied manually into the new worktree.** It's gitignored (holds the live `VITE_SUPABASE_URL` / publishable key) and `git worktree` only carries tracked files, so it will NOT appear automatically. `.env.example` exists as a template but has no real values — copy the actual `.env` from the primary `rto-compass-hub` folder. Without it, `npm run dev` won't connect to Supabase.
- **`.mcp.json` does NOT need copying.** It lives at the `complyhubworkspace` root (outside `rto-compass-hub` entirely, not part of that git repo), so it's already visible to every worktree automatically — confirmed 08 July 2026 (an earlier version of this doc wrongly assumed it lived inside `rto-compass-hub` and was gitignored there).
- **`.cursor/mcp.json`** (Cursor-side Supabase MCP config, separate from the root `.mcp.json` above) — check whether it exists in the primary worktree before assuming it needs copying. As of 08 July 2026 it doesn't exist yet (only the `.cursor/mcp.json.example` template does); if RJ/Carl ever populate a real one, copy it the same way as `.env`.
- **Local dev servers**: if running `npm run dev` in both worktrees at once, they need different ports — Vite will usually auto-bump the port if 8080 is taken, but confirm rather than assume.
- **`complyhub-kb` needs nothing at all.** It's a fully separate git repo at the `complyhubworkspace` root (not nested inside `rto-compass-hub`), has no `.gitignore` and no hidden files — confirmed 08 July 2026. Both worktrees already point at the exact same single copy; there is no duplication concept to manage here.
- **Only one worktree can have a given branch checked out at a time — this includes `main`.** If a second worktree finishes its task and its VS Code window is left on (or manually switched to) `main`, the primary `rto-compass-hub` folder (or any other worktree) will be BLOCKED from checking out `main` until that second worktree either checks out something else or is removed. This caused real confusion on 08 July 2026 — a session working in the primary folder couldn't switch back to `main` for routine cleanup because the finished `rto-compass-hub-staging-sync` worktree was still parked on it. **Rule: the moment a worktree's task is merged, remove the worktree (`git worktree remove ..\rto-compass-hub-<slug>`) — don't just leave it "parked" on `main` or any other branch "to be safe."** A removed worktree holds no branch lock at all.

**If a worktree finishes and immediately needs its NEXT task (not ready to be removed yet):** do not check out local `main` in it at all — the primary `rto-compass-hub` folder normally lives on `main` by default (session-start ritual), so a second worktree trying to also land on `main` will hit this same block from the other direction. Branch directly off `origin/main` instead, skipping the local `main` checkout entirely:
```powershell
git fetch origin
git checkout -b feat/next-thing origin/main
```
This never checks out local `main` in that worktree, so it can never collide with wherever the primary or any other worktree currently sits.
- All the usual per-branch rules still apply independently in each worktree: branch verification before commit/push, never edit `main` directly, PR review + fix workflow, migration discipline, etc. Treat each worktree as its own fully independent branch workflow — the only thing shared is the underlying git history and the root-level docs/KB.

**Teardown (after that branch's PR is merged):**
```powershell
Set-Location "c:\Users\brian\complyhubworkspace\rto-compass-hub"
git worktree remove ..\rto-compass-hub-<slug>
```
Never just delete the worktree folder manually — `git worktree remove` keeps the main repo's worktree metadata clean. If it refuses due to uncommitted changes, resolve those first (report to Brian, don't discard silently).

## When the other worktree merges first (catch-up)

If worktree B's PR lands on `main` while worktree A is still mid-branch: **A is behind — that is normal.** You can usually still commit and push A's feature branch. The problem appears when merging A into `main` (or when GitHub requires the branch to be up to date).

Catch-up on A's feature branch (prefer **merge**, not rebase):

```powershell
git fetch origin
git merge origin/main --no-ff
# resolve conflicts on the feature branch if any, then push
```

Full orchestration notes (parallel crews, dry-run first, cost savings): `complyhub-kb/reference/ai-model-routing.md` §§ "Parallel workflows" and "Cost & limit savings".

**Trigger phrases** (kept in `CLAUDE.local.md` since they're used every session):
- "set up a worktree for [branch]" / "open a worktree for PR review of [branch]" / "remove the worktree for [branch]"
