---
name: checker
description: >
  Spawns a fresh-eyes, adversarial reviewer as a genuine Claude Agent subagent —
  no cursor-agent, no WSL, no prior conversation context — to review a whole
  branch (not just the diff hunks) against this repo's CLAUDE.md/AGENTS.md
  rules, check that changed pieces integrate correctly with each other, and
  verify code-to-database and code-to-edge-function connections against the
  LIVE Supabase project rather than assuming the code is right. Trigger when
  Brian says "/checker", "spawn checker", "run checker on this", "fresh eyes
  review", or "adversarial review this branch". Read-only — never edits,
  commits, or pushes.
---

# Checker — Fresh-Eyes Adversarial Branch Review

This skill spawns a single-purpose reviewer with **no memory of this conversation** —
it starts cold, reads the branch and the repo's own rules, and reports back. That's the
point: it can't inherit any blind spot from the work session that produced the branch.

It never fixes anything. It reports findings in three buckets — confirmed, worth a
second look, cleared — and stops. Brian decides what gets fixed and when.

---

## When to use

- Before opening a PR, once a branch's changes are in place
- After pushing, before merging, if something feels worth a second opinion
- Any time Brian says one of the trigger phrases above

Not a replacement for `cichecker` (which runs CI's own mechanical checks — lint,
type-check, migration/security guards) or `verify-bot-fix` (which triages bot review
threads). Checker is a human-shaped adversarial read of the whole branch — the "does
this actually hang together and do what it claims" pass.

---

## Step 1 — Gather context (do this yourself, don't ask the subagent to guess)

1. Confirm the branch: `git branch --show-current`
2. Confirm the base: default `main` unless Brian says otherwise
3. Get a short factual description of what the branch is meant to do — from:
   - what Brian's told you in this conversation, or
   - the PR description if one is already open (`gh pr view --json body`), or
   - the branch's commit log (`git log --oneline {{BASE}}..{{BRANCH}}`) if neither exists
4. Confirm the Supabase project id for this repo (`gdwhlstfguxarnxasrrs` as of this
   writing — check `supabase/config.toml` or ask if unsure, don't assume it's unchanged
   forever).

Do not skip straight to dispatching — a vague or missing description of "what this branch
does" produces a shallow review, because the subagent has to guess at intent instead of
checking it.

---

## Step 2 — Dispatch the subagent

Use the Agent tool with `subagent_type: pr-review-toolkit:code-reviewer`,
`run_in_background: false` (you want the result before continuing this conversation).

Fill in the template below completely — every `{{PLACEHOLDER}}` — and pass it as the
`prompt`. Do not paraphrase or shorten it; the specificity is what makes the review
actually adversarial instead of a generic pass.

```
You are reviewing a git branch in the repo at c:\Users\brian\complyhubworkspace\rto-compass-hub
(Windows path — use /c/Users/brian/complyhubworkspace/rto-compass-hub for POSIX-style tools).

Branch: `{{BRANCH_NAME}}`, based on `{{BASE_BRANCH}}`. Compare with
`git diff {{BASE_BRANCH}}...{{BRANCH_NAME}}` to see the full changeset — do not rely on any
summary, read the actual diff and the full content of every changed file yourself.

Context: this repo is ComplyHub, a multi-tenant Supabase + React/TypeScript compliance
platform. Read `rto-compass-hub/CLAUDE.md` and `rto-compass-hub/AGENTS.md` first — they contain
this repo's hard rules (banned patterns like `.single()`, `as any` on Supabase calls, hardcoded
URLs, `Math.random()` for IDs, raw `console.*`, role-casing conventions, etc.) and architectural
conventions. Treat these as the standard to review against.

What this branch is meant to do:
{{BRIEF_DESCRIPTION_OF_THE_BRANCH}}

Your job: be an adversarial, fresh-eyes reviewer with NO assumption that the prior work is
correct. Don't just check that the diff hunks look locally sane — look at the WHOLE picture:

CODE-LEVEL REVIEW
- Does every touched file still make sense end to end as a whole (full render tree/control
  flow, no orphaned imports/state, nothing left dangling from what was removed)?
- Do the changed pieces integrate correctly with each other and with what they weren't touching
  (props, shared constants/ids, consistent assumptions across files changed in the same branch)?
- Any banned pattern from CLAUDE.md/AGENTS.md anywhere in the diff — not just newly added lines,
  check if a changed file's surrounding context now contains something that should have been
  caught?
- Any type-cast or suppression that papers over a real bug rather than just satisfying the
  compiler?
- Any place where two pieces of this diff "miscommunicate" — a prop/type one file expects that
  another file in the same diff doesn't provide, a shared helper duplicated instead of reused, an
  assumption in one file falsified by another file changed in the same branch?

CODE-TO-DATABASE / CODE-TO-EDGE-FUNCTION VERIFICATION — mandatory, do not skip
For every Supabase RPC call, direct table read/write, or edge-function invocation touched or
added in this branch, verify against the LIVE project (`{{SUPABASE_PROJECT_ID}}`) instead of
trusting the code's own assumptions. Use ToolSearch to find and use the read-only Supabase MCP
tools (`execute_sql`, `list_migrations`, `get_edge_function`, `get_advisors`) — never
`apply_migration`, this is a read-only review.
- For any RPC called: pull its live definition (`SELECT pg_get_functiondef(oid) FROM pg_proc
  WHERE proname = '...'`) and confirm every field the client sends is actually read/set by the
  function — a client sending a field the RPC silently ignores is a real, confirmed bug.
- For any direct table write: pull the live RLS policies on that table (`SELECT polname,
  pg_get_expr(polqual, polrelid), pg_get_expr(polwithcheck, polrelid) FROM pg_policy WHERE
  polrelid = '...'::regclass`) and confirm the roles/conditions the client-side code assumes are
  allowed actually match what the policy permits — do not assume they agree just because the
  code has its own permission check.
- For any `SECURITY DEFINER` function touched: confirm it performs its own authorization check
  (not just `auth.uid() IS NOT NULL`) — a `SECURITY DEFINER` function bypasses RLS entirely, so
  if it has no independent role/tenant check, anyone authenticated can call it directly
  regardless of what the UI allows.
- For any edge function touched or called: pull its live deployed source (`get_edge_function`)
  and confirm it matches what's in git — a PR can silently assume a deployed function still
  matches its git source when it doesn't.
- If a migration is included in this branch: confirm it's idempotent (safe to run twice) and
  that it re-implements every guard of any function/policy it replaces (read the function's
  prior definition via git history, not just the live version, per this repo's CREATE OR REPLACE
  discipline).

Report every finding as a concrete bullet: file:line (or SQL object name), what's wrong, why it
matters (concrete failure scenario, not vague concern). Separate "confirmed bug" from "worth a
second look" from "checked and cleared." Do not fix anything — read-only review only, no edits,
no writes to the database.
```

---

## Step 3 — Report back

Present the subagent's findings in three buckets, same structure every time:

1. **Confirmed bugs** — verified against the live database/edge functions where applicable,
   not just read from the diff.
2. **Worth a second look** — plausible but not fully nailed down, or a judgment call.
3. **Checked and cleared** — explicitly verified and ruled out, so nothing gets silently
   re-litigated later.

Follow with a plain-English summary per the standing workspace rule — what was found, why it
matters, in non-technical terms, without waiting to be asked.

**Do not fix anything from this report on your own initiative.** Ask Brian which confirmed
findings (and which worth-a-second-look items) to act on, same as every other review pass in
this workspace — approving a review is not approval to edit, and editing is not approval to
commit or push.
