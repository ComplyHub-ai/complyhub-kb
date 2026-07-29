---
name: ci-gate-skill
description: Location and purpose of the ci-gate skill (renamed from cichecker 29 Jul 2026) run before commit/push/PR on rto-compass-hub branches
metadata: 
  node_type: memory
  type: project
  originSessionId: 9bdb04f8-b84d-4967-9a40-bf6ddcc3487d
  modified: 2026-07-29T07:37:55.896Z
---

The `ci-gate` skill (renamed from `cichecker` on 29 Jul 2026 — it was too easily confused with the
similarly-named `fresh-eyes` skill, formerly `checker`) is a **user-level** skill — it lives at
`C:\Users\brian\.claude\skills\ci-gate\SKILL.md` on this machine, not inside `rto-compass-hub`. A stale,
erroneously-committed copy of the old `checker` skill also exists at
`rto-compass-hub/.claude/skills/checker/SKILL.md` on `main` — do not treat that as current or as this
skill's real location.

**Why:** Cross-references every file changed on a branch against every check the real CI workflow (`.github/workflows/ci.yml`) runs — lint, type-check, `.single()` guard, migration guards, exhaustive service-role-key security check (see [[feedback_cichecker_exhaustive_service_role_check]]), role-casing checks (see [[feedback_role_casing_proper_case]]) — and confirms the branch is up to date with `main`, merging `origin/main` in automatically if behind and the tree is clean. Entirely read-only — no code edits, no commits, no pushes.

**How to apply:** Run via the Skill tool (`ci-gate`) right before the commit/push/PR hard gates, on any `rto-compass-hub` branch about to ship. Mandatory step in the living-doc workflow (see [[feedback_living_doc_decision_tracking]]) and standard practice for any PR, not just multi-item bodies of work.
