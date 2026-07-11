> **Last updated:** 11 July 2026 · **Confidence:** high — Cursor Desktop parallel + maximize guide for Brian's ComplyHub loop.

# Cursor workflow — parallel work + maximize features

Companion to `worktree-workflow.md` (git) and `ai-model-routing.md` (Scout/Hound/Compass/Maker crew). This page is **Cursor-specific**.

## Parallel work in Cursor — three levels

### Level 1 — Light (same folder, same branch)

Use when only **one** agent is writing code.

| Tool | How | Safe for edits? |
|---|---|---|
| Second Agent chat | New Agent thread in the same window | Only if one chats is Ask/Plan/read-only |
| Side chat | `/side` or select text → Ask in Side Chat | Read/explore while parent codes — good |
| Agents Window | `Cmd+Shift+P` → **Open Agents Window** | Same isolation rules as chats |
| Queue | Enter queues; `Cmd+Enter` interrupts | Sequential by default |

**Rule:** parallel **thinking** = OK. Parallel **writing** into the same checkout = collision risk. Don't run two Agents that both edit `rto-compass-hub` on the same branch.

### Level 2 — Safe dual (recommended for you)

Matches the KB worktree layout: **one Cursor window per worktree**.

```
complyhubworkspace/
├── .cursor/rules/ai-orchestration.mdc   ← loads when you open the WORKSPACE root
├── complyhub-kb/                        ← shared
├── rto-compass-hub/                     ← Window A: bug fix / feat branch
└── rto-compass-hub-<slug>/              ← Window B: PR review branch
```

1. Create worktree (see `worktree-workflow.md`).
2. **File → New Window** (or `cursor /path/to/rto-compass-hub-<slug>`).
3. Root that window on the **worktree folder**, not the workspace root.
4. Run a separate crew in each window (intake → Scout → …).
5. When B merges first: A catch-up = `merge origin/main` on A's branch (see routing doc). Tear down B's worktree.

Each window = own Agent chats, own dirty tree, own branch. One branch checked out in only one worktree (including `main`).

### Level 3 — Hands-free / fleet

| Feature | Use for |
|---|---|
| `/multitask` | Async subagents in parallel (Agents Window). **Does not** isolate git by itself — pair with worktrees if both write. |
| `/worktree <task>` | Cursor-native isolated checkout; `/apply-worktree` to bring back; `/delete-worktree` when done |
| `/best-of-n sonnet,gpt,composer <task>` | Same prompt, one worktree per model — pick a winner |
| Cloud Agents / `/in-cloud` | Long PR babysit, CI fix, exploratory branch while laptop stays on active feat |
| `/babysit` | Cloud watches a PR (feedback, conflicts, checks) |

**ComplyHub sweet spot:** Window A local Agent on `fix/*` + Window B `/pr-review` on a worktree, *or* local Maker + Cloud `/babysit` on another PR.

## Rules / skills loading (important gap)

| Kind | Applies when |
|---|---|
| User Rules (Cursor Settings) | **Every** window — best place for always-on orchestration voice |
| `complyhubworkspace/.cursor/rules/` | Only when the opened root is the **workspace** |
| `rto-compass-hub/.cursor/rules/` (if present on branch) | When window root is that repo/worktree |
| `~/.cursor/skills/`, `~/.cursor/agents/` | Global — all windows |
| Cloud Agents | Repo rules in git only — **not** your local `~/.cursor` hooks |

**Action for Brian:** User Rules now include **ComplyHub orchestration + bug-fix** (applies to every window, including worktree-only roots). Keep project rule `.cursor/rules/ai-orchestration.mdc` in sync when the workspace root is open.

### Bug fixes

Always load **`complyhub-bug-fix`** (Claude: `~/.claude/skills/…`; Cursor: `~/.cursor/skills/complyhub-bug-fix/SKILL.md` symlink). Gated 9 steps — Scout/Hound/Compass/Maker map to steps 3–7. See `ai-model-routing.md` § Bug fixes.

## Maximize Cursor for your loop

### Modes (match the crew)

| Mode | Maps to | When |
|---|---|---|
| **Ask** | Scout / read-only | "Where is X?", map paths — don't burn Agent edits |
| **Plan** | Compass | Multi-file / ambiguous — research → plan → you approve → Build |
| **Agent** | Maker (+ orchestrator) | Implement approved plan or small known fix |
| **Debug** | Hound | Failing repro, runtime evidence |

`Shift+Tab` cycles modes. Default loop: Ask/Scout → Plan/Compass → you yes → Agent/Maker → `/pr-review` (Tinker + Sentinel).

### Context (stay lean — saves Team limits)

- Prefer `@file` / `@folder` / `@code` over dumping the whole repo.
- `@Past Chats` / side-chat mention to pull Scout findings into Maker without re-exploring.
- Always-Apply rules: keep thin (orchestration). Heavy policy stays in KB `@`-mentioned when needed.
- Don't re-read pinned KB docs the SessionStart hook already injects in Claude Code; in Cursor, `@complyhub-kb/reference/...` on demand.

### Delegation (Task subagents)

Orchestrator stays lean; spawn by callsign/model from `ai-model-routing.md`:

- Scout → `kimi-k2.7-code` or `composer-2.5-fast`
- Hound → `gpt-5.3-codex`
- Compass → `gpt-5.5-medium` (hard: `glm-5.2-high` / Opus-high)
- Maker → `claude-4.6-sonnet-medium-thinking`
- Tinker / Sentinel for `/pr-review`

Slash skills you already use: `/pr-review`, Bugbot + security-review in parallel on PRs, `/worktree`, `/babysit`.

### Checkpoints vs git

- Chat **Checkpoints** = undo Agent edits without git thrash.
- Real history = git commits only on your explicit "commit it".

### Daily stacks that fit ComplyHub

1. **Single ticket:** one window on workspace or primary repo — Ask → Plan → Agent; Scout via Task.
2. **Bug + PR:** two worktree windows (Level 2).
3. **Long PR babysit:** Cloud `/babysit` while local window stays on active feat.
4. **Compare approaches:** `/best-of-n` with worktree isolation, then pick winner.

## Catch-up reminder

When the other window's PR merges first: behind is normal; push usually OK; before merge to `main` run `git fetch` + `merge origin/main` on the feature branch. Full detail: `ai-model-routing.md` § Parallel workflows.

## Related

- `complyhub-kb/reference/worktree-workflow.md` — create/teardown worktrees
- `complyhub-kb/reference/ai-model-routing.md` — crew, models, cost/limits
- `complyhub-kb/handoffs/pr-review-fix-workflow.md` — PR fix loop
- `.cursor/rules/ai-orchestration.mdc` — Cursor always-apply (workspace root)
