---
name: feedback-one-branch-per-session
description: "Don't create a new git branch for each task/fix within a session — confirm and reuse a single session branch unless Brian says otherwise"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: f792c3f5-e20a-4e0d-94b5-ee03f28691fb
  modified: 2026-08-05T02:15:32.076Z
---

Don't spin up a new `fix/*` branch every time a new task or bug starts within the same working
session. Brian corrected this sharply on 05 Aug 2026 ("WHY ARE YOU CREATING ANOTHER BRANCH< YOU
ALWAYS DO THIS> SAME BRANCH ALWAYS UNLESS I SAY DIFFERENTLY") after a new branch
(`fix/meeting-artefacts-tenant-path`) was created mid-session for a second item, even though the
prior instruction was "let's do both in 1 branch 1 by 1."

**Why:** `rto-compass-hub` already has 30+ stale local `fix/*`/`cursor/*` branches from past
sessions (confirmed via `git branch -vv` 05 Aug 2026) — one-branch-per-task habit is producing real
branch sprawl, not just a one-off annoyance.

**How to apply:**
- At the start of any body of work, ask (or confirm from context) which branch all fixes/edits in
  this session should land on, rather than defaulting to `git checkout -b` per new task/fix.
  Confirmed for 05 Aug 2026 session: `fix/meeting-artefacts-tenant-path`.
- Only create a new branch when Brian explicitly says to (a new branch name, "start a new branch",
  etc.) — never infer it from task-shape alone (e.g. "this is a different bug, so it needs its own
  branch" is NOT sufficient justification on its own).
- If no branch is currently checked out or the checked-out branch's PR already merged, ask which
  branch to use rather than silently creating one.
- This applies within one sitting/session; a brand-new session starting fresh work may still need
  its own branch decision made explicitly at the start (per [[feedback_the_loop_and_no_popups]]'s
  session-boundary branch re-confirm habit) — but should ask, not assume "make a new one."
