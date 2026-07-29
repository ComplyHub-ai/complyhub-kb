---
name: feedback-no-autonomous-ci-polling
description: "Don't use ScheduleWakeup to auto-poll CI/PR status, and don't act on a stale scheduled wakeup once the situation has moved on — only check when Brian explicitly asks."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a4edc567-e86a-4a37-b4cb-62adbbb6b720
---

Don't proactively schedule `ScheduleWakeup` calls to check CI status, PR checks, or "let me check back
in N seconds" after a push — and if a previously-scheduled wakeup fires with an outdated instruction
(e.g. "check CI on PR #266" after #266 is already merged), recognize it's stale and don't just execute
it anyway.

**Why:** Called out directly, at least 3 separate times across sessions now — Brian had already said
not to do this kind of polling/CI-checking unless he says so. During the PR #259/#266 session, a
scheduled wakeup fired with instructions to check `gh pr checks` on a PR that had already merged and had
its migration applied, and instead of noticing the situation had changed, the check ran anyway and
re-reported stale-context CI results — this happened twice in the same session. It happened again on
20 Jul 2026 during the PR #272 migration-reconciliation session, immediately after this exact memory
should have applied — the root cause that time was `CLAUDE.md`'s own "Post-Push Watch (WATCH beat)"
section, which at the time literally instructed calling `ScheduleWakeup` after every push. Two
contradictory instructions existed at once (this memory said don't; `CLAUDE.md` said do), and the wrong
one won because it was newer/louder in context. **`CLAUDE.md` has now been corrected (20 Jul 2026) to
remove the ScheduleWakeup-after-push instruction entirely** — the WATCH beat now says report-and-stop,
check only on Brian's explicit request. That fix is what actually closes this loop; this memory
existing wasn't enough on its own because a standing project doc contradicted it.

**How to apply:** After a `git push` or PR action, report what was done and stop — don't schedule a
follow-up check. If Brian wants CI/deploy status confirmed, he'll ask for it directly. If a stale
scheduled wakeup does fire, check current reality first (has the PR merged? has the task already
moved on?) before acting on the wakeup's original instructions — a wakeup's instructions are a snapshot
from when it was scheduled, not necessarily still relevant. If any future edit to `CLAUDE.md`'s WATCH
beat section reintroduces autonomous scheduling, that's a regression — flag it rather than following it.
See [[feedback_post_push_watch_beat]] for the WATCH-beat design this modifies — Brian's guidance here
narrows it further: no autonomous scheduling at all, full stop, unless he asks.
