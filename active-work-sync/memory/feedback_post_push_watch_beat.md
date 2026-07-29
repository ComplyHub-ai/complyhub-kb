---
name: feedback-post-push-watch-beat
description: "Added a WATCH beat to The Loop for post-push CI/Bugbot handling — no eager polling, verify-bot-fix guard, mandatory living-rules step"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 30f85dde-4201-4336-ae0c-667f8d536609
---

Brian flagged three pain points around PRs on 20 Jul 2026: (1) CI reruns everything on every push even for already-passed jobs, (2) he had to manually relay Cursor Bugbot findings / CI failures into Claude Code and didn't want eager polling right after push since CI takes real time, (3) wanted the loop to actually learn from recurring Bugbot findings across PRs.

**Resolved:**
1. Added `concurrency: cancel-in-progress` to `rto-compass-hub/.github/workflows/ci.yml` — stops duplicate CI runs stacking when a fix is pushed before the prior run finishes. True "skip a job that already passed" isn't safely buildable on GitHub Actions without weakening the CI safety guarantee (a stale-cache bug could let a broken check through) — deliberately not pursued.
2. Added a **WATCH beat** to The Loop (`CLAUDE.md` § "Post-Push Watch") — after SHIP/push, use ScheduleWakeup timed to real CI duration (never poll immediately), then check `gh pr checks` + Bugbot threads on wake, capped at 3 re-checks.
3. Every bot finding MUST go through the repo's existing `rto-compass-hub/.claude/skills/verify-bot-fix` skill first (CONFIRMED/FALSE_POSITIVE/ALREADY_FIXED against current HEAD, not the stale commit the bot reviewed) — only CONFIRMED findings get fixed.
4. **Mandatory living-rules step:** after any CONFIRMED fix, append one line to `rto-compass-hub/AGENTS.md`/`CLAUDE.md` (repo-wide pattern) or the relevant scoped `.cursor/rules/*.mdc` file (area-specific pattern) — this is the actual cross-PR learning mechanism, not model fine-tuning. This mechanism already existed as `rto-compass-hub/AGENTS.md` agent behavior #6, but was only referenced from the workspace `CLAUDE.md`, not stated there directly. **Brian asked (20 Jul 2026) for it to be spelled out as a first-class instruction in `CLAUDE.md` itself, not just a pointer to `AGENTS.md`** — done: `CLAUDE.md` § "Post-Push Watch" step 5 now states the rule in full (which file to update depending on scope, mandatory before WATCH is reported done, no exceptions for a "small" finding) and credits `AGENTS.md` behavior #6 as the origin of the convention rather than the sole authority for it.

**Why:** Cursor desktop already had an equivalent hook-based loop (`.cursor/hooks.json` → `after-git-push-bugbot.mjs` / `stop-bugbot-loop.mjs`) but that mechanism is Cursor-only and doesn't reach Claude Code sessions — this closes that gap on the Claude Code side. Brian's follow-up ("what about in memory?") is itself an instance of the same instinct: durable rules should live where they're actually read from (CLAUDE.md, and this memory file), not only in one place that requires a hop to find.

**How to apply:** Whenever driving a PR from Claude Code, treat WATCH as a real beat, not optional — don't ask Brian to paste Bugbot output, go get it via `gh`. See [[feedback_the_loop_and_no_popups]] and [[feedback_three_agent_model]] for the rest of The Loop.
