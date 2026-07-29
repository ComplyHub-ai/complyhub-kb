---
name: feedback-no-askuserquestion
description: Never use the AskUserQuestion, Monitor, or ScheduleWakeup tools with this user — present options as plain text, and check status manually instead of long-running watch loops or self-scheduled wakeups
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8a54b806-3fb2-4bcf-9c0a-0422ab71d49a
  modified: 2026-07-27T02:35:52.204Z
---

Never use the AskUserQuestion tool. Present choices/options as plain text in the response instead and
let the user reply normally.

Never use the Monitor tool (or similar long-running background-watch constructs) either. When waiting
on something like CI checks, either check status once with a direct command (e.g. `gh pr checks`) and
report it, or wait for the user to ask again — don't spin up a persistent watcher that fires background
notifications.

Never use ScheduleWakeup either — same category as Monitor: a self-triggered future wakeup to re-check
something (CI, a deploy, a long-running job) without the user asking for it. If a task needs a follow-up
check, wait for the user to prompt it, or do a single direct check now and report — don't schedule the AI
to wake itself up later.

**Why:** Brian explicitly said "I explicitly said to always remember NOT TO DO askuserquestions" (22 Jul
2026) — a repeated, firm instruction, not a one-off preference. On 23 Jul 2026 he extended this
explicitly to Monitor too: "things like monitor or askuserquestions shouldnt be done by AI" — framed as
a general category (AI shouldn't use tools that interrupt/notify autonomously on the user's behalf), not
specific to one tool. On 24 Jul 2026 he extended it again explicitly to ScheduleWakeup. Treat any similar
future tool in this same category (autonomous interactive prompts, autonomous background notification
loops, self-scheduled future wakeups) with the same default-off posture unless the user asks for it
directly.

**How to apply:** Any time a decision point comes up that would normally warrant AskUserQuestion (e.g.
choosing between remediation paths, confirming scope), lay out the options as numbered/bulleted plain
text and ask the user to pick. Any time you'd normally reach for Monitor or ScheduleWakeup to watch or
revisit something async (CI runs, deploys, long-running jobs), do a single direct check instead and
report the result — re-check only when asked, or via a normal foreground wait the user has explicitly
requested. Never schedule a future self-wakeup as a substitute for the user prompting again.

**Recurrence (24 Jul 2026):** violated this during the PR #310 CI-fix session — used Monitor to watch PR
checks after a push, producing a stream of background notifications the user never asked for. Caught only
because the user hadn't objected yet, not because the rule was checked first. Root cause: this memory
wasn't consulted before reaching for Monitor in the moment. Reinforcing here — check this memory
proactively before using Monitor, ScheduleWakeup, or AskUserQuestion, don't rely on remembering the rule
unprompted.
