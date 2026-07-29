---
name: feedback-the-loop-and-no-popups
description: The Loop orchestration workflow + state-and-proceed (no AskUserQuestion popups) + Scope Line anti-rabbit-hole rule
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 30f85dde-4201-4336-ae0c-667f8d536609
---

Brian consolidated the sprawling six-callsign/two-mode orchestration into **The Loop** on 20 Jul 2026: one flow (FRAME → RECON → PLAN → MAKE → CHECK → SHIP), one ledger (`active-work.md` at workspace root — source of truth for worktree/branch/stage + parked backlog), one rule (the Scope Line).

**Why:** the old system was too big to hold in his head; Scout/agents found adjacent issues and everyone went down rabbit holes; he juggles 1-2 worktrees and lost track of state; and he dislikes AskUserQuestion popups.

**How to apply:**
- **No AskUserQuestion popups for routine flow.** State the call in prose and proceed (state-and-proceed); Brian redirects if wrong. Commit/push hard gates are still absolute and separate.
- **Scope Line:** at FRAME state what's IN and OUT. Anything found outside gets PARKED in `active-work.md` Backlog — never chased. Scope only expands via a new FRAME.
- **A finding beat (Scout/Hound/Checker/Tinker) never fixes — it reports; Claude (Maker) edits.** No "just have Scout fix it" shortcut.
- **Two engines, one switch:** Claude mode default when tokens healthy; cursor CLI is a first-class token-budget handoff (Brian keeps it — used when almost out of tokens), NOT removed. Safe because prompts carry the STOP/Scope boundary (see `.cursor/orchestrate/roles.md` top block).
- Read `active-work.md` at session start; update it at every beat.

Related: [[feedback_orchestration_intake_voice]], [[feedback_plain_english_always]].
