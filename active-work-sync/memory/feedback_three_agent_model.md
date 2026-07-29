---
name: feedback-three-agent-model
description: "Collapsed the 6-callsign orchestration crew to 3 agents — Scout, Fixer, Reviewer"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 30f85dde-4201-4336-ae0c-667f8d536609
---

Brian felt 6 callsigns (Scout/Hound/Compass/Maker/Tinker/Sentinel/Checker) was too many to track. Collapsed 20 Jul 2026 to 3:

- **Scout** — read-only recon. Absorbs old Scout (map the code) + Hound (root-cause trace) + Compass (propose approaches when ambiguous). One recon beat, one report.
- **Fixer** — plans + writes the fix + commits/pushes. **Always Claude Code, never delegated to any agent.** This is the old "Maker."
- **Reviewer** — read-only adversarial review. Absorbs old Checker (fresh-eyes review incl. live DB) + Tinker (mechanical gauntlet: type-check/lint/dry-run-merge/banned patterns) + Sentinel (final SHIP/NEEDS-WORK verdict). One review beat, one verdict.

**Why:** too many named roles to hold in his head; also wanted a clear answer to "who fixes bugs" (always Fixer/Claude Code, never Scout or Reviewer — a finding agent never edits).

**How to apply:** Loop is FRAME → Scout → (Claude plans) → Fixer → Reviewer → SHIP. Both Scout and Reviewer can run via Claude mode (Agent tool) or cursor CLI (token-budget handoff) — same Scope Line/STOP boundary rules apply to both regardless of engine. See [[feedback_the_loop_and_no_popups]] for the Scope Line rule and `CLAUDE.md` § "The Loop" / `.cursor/orchestrate/roles.md` for exact prompts.
