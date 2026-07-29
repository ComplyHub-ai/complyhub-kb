---
name: cichecker-skill
description: Location and purpose of the cichecker skill run before commit/push/PR on rto-compass-hub branches
metadata: 
  node_type: memory
  type: project
  originSessionId: 9bdb04f8-b84d-4967-9a40-bf6ddcc3487d
  modified: 2026-07-27T02:36:49.156Z
---

The `cichecker` skill lives at `rto-compass-hub/.claude/skills/cichecker/SKILL.md`.

**Why:** Cross-references every file changed on a branch against every check the real CI workflow (`.github/workflows/ci.yml`) runs — lint, type-check, `.single()` guard, migration guards, exhaustive service-role-key security check (see [[feedback_cichecker_exhaustive_service_role_check]]), role-casing checks (see [[feedback_role_casing_proper_case]]) — and confirms the branch is up to date with `main`, merging `origin/main` in automatically if behind and the tree is clean. Entirely read-only — no code edits, no commits, no pushes.

**How to apply:** Run via the Skill tool (`cichecker`) right before the commit/push/PR hard gates, on any `rto-compass-hub` branch about to ship. Mandatory step in the living-doc workflow (see [[feedback_living_doc_decision_tracking]]) and standard practice for any PR, not just multi-item bodies of work.
