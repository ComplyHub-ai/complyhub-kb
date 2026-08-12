> ## ⚠️ SUPERSEDED — historical record, not current policy
> Written 11 July 2026 around **six named callsigns** (Scout/Hound/Compass/Maker/Tinker/Sentinel).
> Collapsed 20 Jul 2026 to **three agents** — Scout, Fixer, Reviewer — because six roles was too many
> to hold in your head and caused inconsistency about who was allowed to fix a bug. See `CLAUDE.md`
> § "The Loop" for the current model and rationale, and `.cursor/orchestrate/roles.md` /
> `.cursor/rules/ai-orchestration.mdc` for the current agents + model routing. Everything below this
> banner is kept **as-is for its cost-modeling methodology and the cursor-agent shell-out proof** — the
> callsign names in it are retired and should not be followed. Mapping if you need it while reading:
> Scout stays Scout; Hound + Compass fold into Scout; Maker → Fixer; Tinker + Sentinel + Checker fold
> into Reviewer.

> **Last updated:** 11 July 2026 · **Confidence:** high — Brian's dual-surface model routing policy.
> **Verified live:** 11 July 2026 — OpenRouter Anthropic Messages skin GREEN for Anthropic + DeepSeek + Kimi + GLM + Qwen; Cursor Task slugs GREEN for `composer-2.5-fast`, `gpt-5.3-codex`, `gpt-5.5-medium`, `claude-4.6-sonnet-medium-thinking`, `claude-opus-4-8-thinking-high`, `glm-5.2-high`, `kimi-k2.7-code`, `grok-4.5-high`.

> ## ✅ Claude Code gap SOLVED via cursor-agent shell-out (15 July 2026)
> The per-callsign multi-model routing below was long documented as Cursor-desktop-only, because
> Claude Code's own Agent tool `model` parameter only accepts `sonnet`/`opus`/`haiku`/`fable` — true,
> and still the case. But Claude Code can **shell out to the Cursor CLI** (`cursor-agent`, a separate
> terminal tool from Cursor desktop, installed via WSL — see `complyhub-kb/reference/cursor-workflow.md`
> for setup) as a headless subprocess pinned to any model on the account's Cursor plan. This was built
> and empirically proven end-to-end on 15 July 2026:
> - `cursor-agent --print --output-format json --model <id> "<prompt>"` runs one-shot, non-interactively,
>   returns parseable JSON. Confirmed working from Claude Code's Bash tool via `wsl.exe -e bash -lc`.
> - Real available models on the account (not the DeepSeek/OpenRouter list below, which Cursor CLI does
>   NOT have access to): `kimi-k2.7-code`, `composer-2.5-fast`, `gemini-3-flash`/`3.5-flash`,
>   `glm-5.2-high`, `gpt-5.4-mini` (cheap tier); `gpt-5.3-codex`, `claude-4.5-sonnet`, `gemini-3.1-pro`
>   (mid); `claude-opus-4-8-*` (premium). Full list: `cursor-agent models`.
> - A cheap model (`kimi-k2.7-code`) run as an **adversarial fresh-eyes checker** — fresh context, told
>   to assume something is broken — caught real, project-aware bugs on a live edge function twice
>   (banned `.single()` usage, swallowed DB errors, wrong Deno version, wrong response shape) purely
>   from reading code and this repo's own `CLAUDE.md` conventions.
> - The Supabase MCP **does** work from `cursor-agent`, contra earlier assumption — but only when: (a)
>   invoked from the actual workspace root (not a subrepo with its own `.cursor/mcp.json.example`), and
>   (b) both `--approve-mcps` (approves the server) AND `--force` (approves each tool call — otherwise
>   silently `User rejected MCP`) are passed. Once working, the checker confirmed a real production bug
>   live: `superadmin_active_tenant` — referenced by two edge functions — **does not exist** in the
>   `public` schema at all (not just undocumented drift; the table is fully absent). Noted for the
>   bug-fix flow, not yet actioned as of this writing.
> - Safety: the Supabase MCP for this path is deliberately scoped tighter than Claude Code's own,
>   full-access `.mcp.json` — `.cursor/mcp.json` uses `--project-ref gdwhlstfguxarnxasrrs --features
>   database,docs,debugging --read-only`. Empirically confirmed against live prod: `apply_migration`
>   is hard-rejected (`"Cannot apply migration in read-only mode."`), and the `--features` scoping
>   removes the `account`/`branching`/`functions`/`storage` tool groups entirely (verified via direct
>   MCP protocol probe: 29 tools → 8). `execute_sql` remains reachable but forces `read_only:true` at
>   the query layer. `--force` on the dispatch command widens what the subprocess *could* ask
>   permission for generally, but the DB tool it actually has access to structurally cannot write.
> - Practical architecture: Claude Code stays the **orchestrator + Maker** (all edits, all commit/push
>   gates). Cheap `cursor-agent` subprocesses handle all five other callsigns — **Scout** (recon),
>   **Hound** (root-cause tracing on bug reports), **Compass** (planning/tradeoffs), **Tinker**
>   (mechanical PR gauntlet), **Sentinel** (merge-gate verdict), and **Checker** (fresh-eyes review incl.
>   live-DB verification) — never edits, on all six. Scout/Checker were proven with full real-task runs
>   on 15 July 2026 (including the live-DB capstone above); Hound/Compass/Tinker/Sentinel were confirmed
>   wired via lightweight dispatch smoke test the same day — same mechanism, so no separate mechanical
>   risk to re-prove, but none of the four has yet been run against a real task end-to-end the way
>   Scout/Checker were. See `.cursor/orchestrate/dispatch.sh` and `.cursor/orchestrate/roles.md` for the
>   working implementation, prompt templates per role, and exact gotchas hit during setup.
> - This supersedes the OpenRouter-based plan below for reaching non-Anthropic cheap models from
>   Claude Code — OpenRouter is still valid for other uses, but the Cursor CLI path is what's actually
>   built and proven for the Scout/Checker roles.

# AI model routing — orchestrator + role matrix

Token-efficient workflow for Cursor and Claude Code. One policy, two adapters. Default effort is **medium** (explore/shell **low**). Never use high/xhigh effort as the default. Speed is **not** a priority — pick quality-per-dollar, not the fastest tier.

## The crew (callsigns)

| Callsign | Role | Job |
|---|---|---|
| **Scout** | Explorer | Read-only recon: grep, find, map write/read paths |
| **Hound** | Debugger | Root-cause scent tracker (diagnosis-discipline) |
| **Compass** | Planner | Route mapper, tradeoffs, writes the plan |
| **Maker** | Executor | Code from approved plan (edits only, no commit) |
| **Tinker** | PR Dry-runner | Mechanical gauntlet (git/tsc/greps) |
| **Sentinel** | PR Reviewer | Merge gate verdict |

Agent files: `.claude/agents/*.md`. Claude Code invokes by name; Cursor uses Task `subagent_type` + `model`.

## Intake voice (orchestrator → Brian)

Brian often pastes issues from teammates ("Dave said I did X but it isn't showing in Y"). The orchestrator must **not** silently grind through tools. Respond like a lead who knows the playbook:

1. Classify (bug / feature / PR / infra).
2. Name the path with callsigns + any skill (`diagnosis-discipline`, `/pr-review`).
3. Ask to run the **next callsign** — e.g. *"Excellent — want me to run **Scout** to map where X is written and where Y reads it?"*
4. After each phase: plain-English findings + offer the next callsign.

Example:

> Got it — display/data path bug (write succeeded, UI empty).
> Path: **Scout** → **Hound** (diagnosis-discipline) → **Compass** → **Maker** (after you approve).
> Want me to run **Scout** first?

| Signal | First move |
|---|---|
| "did X / isn't showing in Y" / bug / "fix this" | Load **`complyhub-bug-fix`** → Scout → Hound |
| new feature / change behaviour | Scout → Compass |
| PR number / `/pr-review` | Tinker → Sentinel |
| deploy / drift / conflicts | matching skill, then report |

## Bug fixes — `complyhub-bug-fix` skill (mandatory)

Canonical skill (Claude Code + Cursor share one file):

- `~/.claude/skills/complyhub-bug-fix/skill.md`
- Symlinked for Cursor: `~/.cursor/skills/complyhub-bug-fix/SKILL.md`

Gated 9-step flow — one step at a time; ask "Done? Ready for Step N+1?" before continuing. Never skip. Never freestyle past the skill when the ask is a bug.

| Steps | Callsign |
|---|---|
| 1–2 Understand + PD-001..006 | Orchestrator + Brian |
| 3 Diagnose | Scout → Hound (+ `diagnosis-discipline.md`) |
| 4–5 Blast radius + DB/security | Hound |
| 6 Plain-English plan | Compass (Brian approves before edits) |
| 7 Apply on `fix/*` | Maker |
| 8 Commit / push / PR | Orchestrator — three separate gates |
| 9 Vivacity Testing Tenant QA | After merge |

Intake line for bugs:

> Got it — bug path. I'll follow **complyhub-bug-fix**. Path: Steps 1–2 with you → **Scout** → **Hound** → **Compass** → **Maker**.
> Excellent — want me to start Step 1 (understand the bug) / run **Scout** for Step 3?

## Mid-loop re-entry (the gap you asked about)

A phase isn't a prison. Any agent can hit a gap and call for backup:

- **Compass** mid-plan: "I assumed X is still called from Y — I need **Scout** to confirm before I finalize the plan."
- **Maker** mid-execute: "The file doesn't match the plan — I need **Scout** to map the real shape, or **Compass** to clarify."
- **Hound** mid-trace: "The trail goes cold at this RPC — I need **Scout** to find all callers."

Protocol:
1. The stuck agent returns `BLOCKED: need <callsign> to <task>` and pauses.
2. The orchestrator spawns the requested callsign, feeds the result back, and resumes the original phase.
3. Agents **never** spawn their own subagents (no recursion).
4. **Cap: 2 re-entries per phase.** After that, stop and ask Brian — something bigger is wrong.
5. Surface re-entry in plain English: *"Compass hit a gap — sending Scout to confirm X, then resuming the plan."*

Re-entry is a feature, not a failure. It's how the loop stays honest without burning the expensive model on guesses.

## Parallel workflows (two loops at once)

Brian often runs **Workflow A** (e.g. `/pr-review`) and **Workflow B** (e.g. bug fix) at the same time via git worktrees — see `complyhub-kb/reference/worktree-workflow.md`.

### What "behind main" means

| Action | Fails because the other workflow merged to `main`? |
|---|---|
| Keep editing in worktree A | No |
| Commit on `fix/A` | No |
| Push `fix/A` | Usually **no** — you update *your* branch tip |
| Merge `fix/A` into `main` / GitHub "branch out of date" | **Yes** — catch up first |

**Behind ≠ can't push.** Behind = can't cleanly land on `main` until you catch up.

```
Both start from main tip T0
Workflow B merges → main is now T1
Workflow A (still on branch from T0) is "behind"
→ Keep working / push A fine
→ Before A's PR merges: merge origin/main into A (preferred) or rebase
```

### Catch-up ritual (prefer merge, not rebase)

Matches `/pr-review` dry-run style and the "check conflicts" trigger:

```bash
# In the mid-branch worktree (the one that fell behind)
git fetch origin
git merge origin/main --no-commit --no-ff   # dry-run: inspect, then abort if only checking
# When ready for real catch-up:
git merge origin/main --no-ff
# resolve conflicts on the feature branch, commit the merge, push
```

- **Merge** = team default (safer if branch was already pushed).
- **Rebase** = only if Brian explicitly asks (rewrites history).
- After the faster workflow merges: tear that worktree down (`git worktree remove …`) — don't park it on `main` (locks `main` for the other worktree).

### Orchestrator behaviour with two crews

- One worktree = one crew (separate chat/window). Don't mix branches in one agent session.
- Before Maker's final push advice or Sentinel's merge go-ahead: run catch-up dry-run against current `origin/main`.
- If the other workflow already landed: say plainly — *"Main moved under you — want me to merge `origin/main` into `<branch>` and report conflicts?"*

## Cost & limit savings (vs all-day Sonnet medium)

Brian's pain: **Cursor Team plan** — sessions and weekly limits max out when everything runs on Sonnet medium. Routing doesn't just save API dollars; it **moves volume off the premium pool**.

### Two bills (don't mix them)

| Surface | Who bills | What routing saves |
|---|---|---|
| **Cursor Team** | Company Cursor plan (session / weekly premium usage) | Scout/Tinker off Sonnet → fewer premium requests → less weekly max-out |
| **Claude Code + OpenRouter** | OpenRouter credits (workspace `.secrets/`) | Real USD/AUD on API tokens — measurable in OpenRouter dashboard |

Cursor Team pricing is **not** the same as OpenRouter $/token. Below: (1) OpenRouter **dollar** estimate for Claude Code, (2) Cursor **limit-relief** estimate.

### Live OpenRouter prices used (fetched 11 July 2026, USD per 1M tokens)

| Model | Input | Output | Blended 80/20 in/out |
|---|---|---|---|
| Claude Sonnet 4.6 | $3.00 | $15.00 | **$5.40** |
| Claude Opus 4.6 | $5.00 | $25.00 | **$9.00** |
| DeepSeek V4 Pro | $0.435 | $0.87 | **$0.52** |
| DeepSeek V4 Flash | $0.077 | $0.154 | **$0.09** |
| Kimi K2.7-code | $0.72 | $3.49 | **$1.27** |
| GPT-5.3 Codex | $1.75 | $14.00 | **$4.20** |
| GPT-5.5 | $5.00 | $30.00 | **$10.00** |
| GLM-5.2 | $0.35 | $1.10 | **$0.50** |

Blended = `0.8×input + 0.2×output` (agent loops are input-heavy: tool results, file reads).

### Assumed heavy workday token mix (Brian maxing sessions)

| Phase | Share of tokens | Why |
|---|---|---|
| Scout + Tinker (explore / greps / dry-run) | **55%** | Most of a day is search + mechanical |
| Maker (execute) | **20%** | Writing code |
| Hound (debug) | **10%** | Root-cause when bugs |
| Compass (plan) | **10%** | Architecture |
| Sentinel (PR verdict) | **5%** | Occasional |

If your days are even more recon-heavy (typical when maxing limits), Scout can be **~70%** — see aggressive row below.

### Claude Code / OpenRouter — cost per 1M blended tokens

| Workflow | Blended $/1M | vs all-Sonnet |
|---|---|---|
| **Old: 100% Sonnet 4.6** | $5.40 | baseline |
| **New routed** (55% DeepSeek Pro + 10% Sonnet Hound + 10% Opus Compass + 20% Sonnet Maker + 5% Opus Sentinel) | **~$3.26** | **~40% cheaper** |
| **New routed, recon-heavy** (70% DeepSeek Pro, rest same proportions scaled) | **~$2.35** | **~57% cheaper** |

### Heavy week example (5 days × 10M tokens/day = 50M tokens)

Assumption: a maxed-out week looks like ~10M tokens/day of agent traffic. Scale to your real OpenRouter usage.

| | Old (all Sonnet) | Routed (~40% save) | Routed recon-heavy (~57% save) |
|---|---|---|---|
| **USD / week** | ~$270 | ~$163 | ~$118 |
| **AUD / week** (~1.50) | ~$405 | ~$245 | ~$177 |
| **Saved USD / week** | — | **~$107** | **~$152** |
| **Saved AUD / week** | — | **~$160** | **~$228** |

Monthly (×4 heavy weeks): roughly **~$430–610 USD** / **~$640–910 AUD** saved on OpenRouter *if* that volume was previously all Sonnet via API. If you were on Cursor-only before, the OpenRouter line is **new spend** — but Cursor premium pressure drops (next section).

AUD uses ~1.50 AUD per 1 USD (ballpark; check bank rate).

### Cursor Team — why you stop maxing weekly limits

Cursor Team bills **premium model usage / session limits**, not OpenRouter $. The win is **share of work that no longer hits Sonnet**:

| Phase | Old | New (Cursor) | Premium Sonnet load |
|---|---|---|---|
| Scout 55% | Sonnet | `kimi-k2.7-code` / `composer-2.5-fast` | **Removed from Sonnet pool** |
| Tinker | Sonnet | `composer-2.5-fast` | **Removed** |
| Hound 10% | Sonnet | `gpt-5.3-codex` (often different pool / cheaper tier) | Reduced |
| Compass 10% | Sonnet | `gpt-5.5-medium` / `glm-5.2-high` | Reduced (Opus only when hard) |
| Maker 20% | Sonnet | Sonnet medium | Same |
| Sentinel 5% | Sonnet | Opus (rarer, higher) | Slightly up when reviewing |

**Rough Cursor premium relief:** if ~55–70% of tokens were Scout/Tinker grinding on Sonnet, routing them off Sonnet can cut **Sonnet-shaped usage by roughly half to two-thirds** on a recon-heavy day — the usual reason weekly limits max out.

Exact Cursor Team $/request accounting depends on the company plan tier (not visible from this workspace). Track after 1–2 weeks: session length before "limit", weekly bar %, and whether Scout/Maker splits keep you under the weekly ceiling.

### How to measure for real (do this after a week)

1. **OpenRouter:** Activity dashboard → filter by model → compare DeepSeek/Kimi volume vs Sonnet/Opus $.
2. **Cursor:** note weekly usage % before vs after routing (same workload type: PR week vs bug week).
3. Update this section with measured numbers when you have them — replace the 10M/day assumption with your actuals.

## How model switching works

One agent does **not** hot-swap its own model mid-turn. The orchestrator **hands off** to a subagent pinned to the right model:

```
Scout (cheap) → Compass (Opus medium) → Brian approves → Maker (Sonnet medium) → Sentinel (Opus medium)
```

- **Cursor:** main chat = orchestrator; Task tool spawns subagents with `model` per role.
- **Claude Code:** Agent tool + `.claude/agents/*.md` `model:` frontmatter; OpenRouter env slots for Opus/Sonnet/Haiku.
- **Fallback:** if Cursor Task model pinning flakes, use separate Plan vs Agent chats with the same matrix.

## Default loop — models per phase

### Cursor (native Task slugs)

| Phase | Callsign | Cursor `model` | Effort |
|---|---|---|---|
| Explore | Scout | `kimi-k2.7-code` (quality) or `composer-2.5-fast` (high-volume cheap) | low |
| Debug | Hound | `gpt-5.3-codex` → escalate `claude-opus-4-8-thinking-high` | medium |
| Plan | Compass | `gpt-5.5-medium` (default); `glm-5.2-high` or `claude-opus-4-8-thinking-high` (hard architecture) | medium |
| Execute | Maker | `claude-4.6-sonnet-medium-thinking` | medium |
| PR dry-run | Tinker | `composer-2.5-fast` | low |
| PR verdict | Sentinel | `claude-opus-4-8-thinking-high` (or `gpt-5.5-medium` if cost-bound) | medium |

### Claude Code (OpenRouter, Anthropic Messages skin — all verified)

> ⚠️ **Not achievable per-subagent in Claude Code today** — see the configuration gap note at the top of this doc. This table describes the target policy if `.claude/agents/*.md` role files existed and the Agent tool accepted arbitrary model strings; neither is true as of 13 July 2026. Treat this as aspirational for Claude Code until that's built, not as current behaviour.

| Phase | Callsign | OpenRouter model | Effort |
|---|---|---|---|
| Explore | Scout | `deepseek/deepseek-v4-pro` (best $/quality, 80.6% SWE-bench) — alt `moonshotai/kimi-k2.7-code` for agentic repo scans | low |
| Debug | Hound | `anthropic/claude-sonnet-4.6` → escalate `anthropic/claude-opus-4.6` | medium |
| Plan | Compass | `anthropic/claude-opus-4.6` | medium |
| Execute | Maker | `anthropic/claude-sonnet-4.6` | medium |
| PR dry-run | Tinker | `deepseek/deepseek-v4-flash` (mechanical, cheapest) | low |
| PR verdict | Sentinel | `anthropic/claude-opus-4.6` | medium |

### Why these picks (quality-first, speed not a priority)

- **Scout (Claude Code):** DeepSeek V4 Pro = 80.6% SWE-bench Verified at $0.46/$0.92 per M tokens — same quality as Gemini 3.1 Pro at ~1/13th the price. Kimi K2.7-code is the coding-specialist alt for long agentic repo scans.
- **Scout (Cursor):** `kimi-k2.7-code` is a coding specialist — quality without tradeoff. Drop to `composer-2.5-fast` only when Scout is running high-volume mechanical greps.
- **Compass (Cursor):** `gpt-5.5-medium` handles routine architecture. Escalate to `glm-5.2-high` (reasoning model, cheaper than Opus-high) or `claude-opus-4-8-thinking-high` for hard architecture only.
- **Hound (Cursor):** `gpt-5.3-codex` is built for tracing code. Escalate to Opus-high only if stuck.
- **Maker / Sentinel:** Stay Anthropic — Claude Code is most reliable on Anthropic for full agent/tool loops, and merge-critical reasoning earns the premium.
- **No fast mode by default.** Speed isn't the constraint; cost-per-correct-answer is.

## Secrets (OpenRouter)

Keys live at workspace root, **outside both git repos**: `complyhubworkspace/.secrets/openrouter.env`. Load with `source .secrets/load-openrouter.sh` (wired into `~/.zshrc` 11 July 2026). See `.secrets/README.md`. Never commit the key.

`complyhub-kb/.gitignore` belts `.secrets/` / `openrouter.env` / `.env*` against accidental copies into the KB. Do **not** edit `rto-compass-hub/.gitignore` on `main` — use a `chore/*` PR if a belt is needed there.

## /pr-review stage runners

Checklist in `.claude/commands/pr-review.md` is the authority on *what* to check. Runners:

| Stage | Runner |
|---|---|
| Mechanical Stage 1 (fetch, diff, tsc, dry-run merge, banned-pattern/BOM greps) | Tinker (cheap, low) |
| Reasoning Stage 1 (7c blast-radius, 7e deletion, live-data) + Stage 2 verdict | Sentinel (Opus medium) |
| Automated passes | `bugbot` + `security-review` in parallel |
| Assemble single Stage 2 report; commit/push gates | Orchestrator only |

## Guardrails

- Subagents **never** `git commit` or `git push`
- Orchestrator always runs `git branch --show-current` before commit/push
- No `npm run build`; never edit `rto-compass-hub` on `main`
- Plain-English summary after every technical output
- Approving an edit ≠ approving a commit ≠ approving a push

## Adapters

| Surface | File |
|---|---|
| Cursor rule | `.cursor/rules/ai-orchestration.mdc` |
| Claude Code agents | `.claude/agents/*.md` |
| Claude Code pointer | `CLAUDE.local.md` (Entry docs) |
| Secrets bootstrap | `complyhub-kb/pinned/machine-bootstrap.md` + `.secrets/README.md` |
| Cursor parallel + maximize | `complyhub-kb/reference/cursor-workflow.md` |
