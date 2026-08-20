---
name: changelog
description: Generate a plain-English, copy-paste-ready changelog for a PR or branch's changes, in bullet format. No jargon, no file paths, no code snippets — just what changed, for a non-developer reader. Trigger when Brian says "/changelog", "create a changelog", "changelog for this PR", or "summarize this PR for the changelog".
---

# changelog

Produces a plain-English bullet-point changelog Brian can copy-paste straight into a release note,
Slack message, or handover — for whatever PR/branch is currently in scope in the conversation, or
one Brian names explicitly (a PR number, a branch name).

This is NOT the audit entry (`/auditentry`) — that's a durable, technical record in
`complyhub-kb/audit/`. This is a short, disposable, user-facing summary. Don't write it to a file
unless Brian asks — just output it as chat text ready to copy.

---

## How to trigger

```
/changelog
/changelog PR #490
/changelog fix/some-branch
```

If no PR/branch is named, use whatever this conversation just shipped (the PR just merged, or the
branch just pushed). If genuinely ambiguous (nothing shipped yet this session, no PR/branch named),
ask which PR/branch before proceeding.

---

## Step 1 — Gather what actually changed

Don't write from memory of the conversation alone — pull the real source:

- If a PR exists: `gh pr view <number> --json title,body,commits --jq '.commits[].messageHeadline'`
  (and `.commits[].messageBody` if headlines are too terse to work from) for the real commit list,
  not just what was discussed in chat.
- If no PR yet (still local): `git log --oneline <base>..<branch>` and read each commit's full
  message (`git show --stat <sha>` for the files touched, `git log -1 --format=%B <sha>` for the
  full message).
- Cross-check against the actual diff if a commit message looks incomplete or vague —
  `git diff <base>...<branch> --stat` to catch anything a terse commit message undersold.

## Step 2 — Write the changelog

Rules, non-negotiable:

- **Plain English.** No file names, no function names, no jargon, no code. Someone with zero
  technical background should understand every line.
- **Bullet format**, one line per user-facing change. Group by area only if there are more than
  ~8 bullets and a grouping is obvious (e.g. "Surveys", "Consultation Plans") — otherwise a flat
  list is fine.
- **Say what changed and why it matters**, not how it was implemented. "Fixed X so Y now works" —
  not "changed the token generator to use crypto.randomUUID()".
- **Not too much explanation.** One line per item, occasionally two if the "why it matters" genuinely
  needs it. This is a changelog, not an audit — don't restate root causes or file paths.
- **Skip pure internal cleanup** (lint fixes, merge reconciliation, refactors with no user-visible
  effect) unless Brian specifically asks for a technical/internal changelog instead of a
  user-facing one.
- Order roughly by what a user would notice first / care about most, not commit order.

## Step 3 — Output

Output the changelog as plain text in the chat response, in a form ready to copy-paste directly
(no surrounding commentary needed beyond a one-line intro if useful). Do not wrap it in a code block
unless Brian asks — a code block adds copy-paste friction for prose text in most clients; plain
markdown bullets are fine.

Do not write this to a file unless Brian explicitly asks for one.
