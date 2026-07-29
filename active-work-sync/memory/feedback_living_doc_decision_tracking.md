---
name: feedback-living-doc-decision-tracking
description: "Preferred workflow for any multi-item, multi-session body of work — root-level living .md file, one-at-a-time locked decisions, disposable lifecycle, cichecker before commit/push/PR"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 23130ed2-a290-402c-b00b-0b0be7fec09e
  modified: 2026-07-27T02:36:03.873Z
---

Brian's preferred workflow for any multi-item, multi-session body of work — not just bug tracking. This applies to bug investigations, feature planning, migration/audit work, or any task with several discrete open items that need deciding over more than one sitting.

**The pattern:**
1. Create a single living `.md` file **in the workspace root** (`/Users/khiansismundo/complyhubworkspace/`, not inside `rto-compass-hub/` or `complyhub-kb/`) as the one source of truth for the whole body of work.
2. Work through open items **one at a time** — investigate/diagnose, discuss, reach a decision, then move to the next. Don't dump a big batch task list at once.
3. Every locked decision gets **written into the file itself** — reasoning, evidence, and the concrete fix/implementation plan — not just stated in chat. Brian's own words: "when I mean lock it in I meant put in @<file>.md what decision we will do for each issue."
4. Once every item is locked, a **brand-new chat with no prior context** should be able to read the file cold and go straight to implementation. This is the actual point of the pattern — it removes dependence on any single conversation's context window.
5. Once implementation lands and is done (merged, deployed, or otherwise complete), Brian will separately ask for an audit file to be created, and the working `.md` file gets **deleted** — it's disposable/session-scoped by design, not a permanent record. Don't treat it as something to preserve indefinitely, and don't reference it by name in durable docs (like CLAUDE.md) since it won't exist for long.

**Stale/contradictory content rule:** while reading or working in such a living doc, if a section is found to be stale or contradicts a later locked decision (e.g. leftover text from before a correction), flag it to Brian explicitly and ask permission before editing/removing it. Never silently clean it up unprompted — even though the file is disposable, edits to it still go through the normal edit-approval gate.

**Implementation handoff step — `/cichecker`:** once a fresh chat implements the locked decisions on a branch, before commit/push/PR, run the `cichecker` skill (`rto-compass-hub/.claude/skills/cichecker/SKILL.md`) — it cross-references the files touched on the branch against every check the real CI workflow runs (lint, type-check, `.single()` guard, migration guards, security guards, config/edge coverage) and confirms the branch is up to date with `main`, all read-only. Only proceed to the existing commit/push/PR gates (see [[user_role]] and the hard gates in `complyhubworkspace/CLAUDE.md`) once cichecker reports clean.

**Why:** keeps decisions durable independent of context/session resets, removes the pressure to hold an entire investigation "in memory" during a long back-and-forth, and gives Brian a clean point to hand off to a fresh session for implementation.

**How to apply:** whenever a task has multiple distinct open items that need deciding and Brian is working through them iteratively (not a single quick fix), proactively suggest or default to this pattern — root-level file, one-at-a-time decisions, decisions written into the file, cichecker before the commit/push/PR gate, delete-after-audit lifecycle.
