---
name: cursor-flag-review
description: >
  Handles a specific finding that Cursor's bot (Bugbot / PR review comment) raised
  on an open ComplyHub PR. Verifies the flagged claim against the actual code and
  live database before treating it as real — Cursor's bot can false-positive — then
  either fixes it on the existing PR branch following the standard commit/push gates,
  or explains why it's a false positive and replies on the PR thread. Trigger when
  Brian says "cursor flagged this", "cursor bot flagged", "bugbot flagged this",
  "address the cursor comment on PR #[N]", or "check what cursor found".
---

# cursor-flag-review

Cursor's automated PR review bot sometimes leaves a comment flagging a possible
issue on an open `rto-compass-hub` PR. This skill handles exactly one flagged
comment at a time — it does not replace the full `/pr-review` workflow, and it
does not run automatically just because a PR exists. It only runs when Brian
explicitly points at a specific Cursor comment.

**Core principle: verify before trusting.** Cursor's bot can be wrong — flag a
non-issue, misread the diff, or miss context that makes the "bug" intentional.
Treat every flag as a claim to investigate, not a fact to act on.

---

## How to trigger

Brian says something like: "cursor flagged this on PR #145" or pastes the bot's
comment text directly.

If Brian doesn't paste the comment text, fetch it:
```bash
gh pr view [PR number] --json comments --jq '.comments[] | select(.author.login | test("cursor"; "i"))'
```

---

## Step 1 — Understand the claim

Read the flagged comment carefully. Extract:
- Which file(s) and line(s) does it point at?
- What is the claimed problem, in one sentence?
- What does Cursor say the consequence is (crash, data leak, wrong behaviour, etc.)?

Do not proceed until the claim itself is unambiguous. If the comment is vague,
open the PR diff at that file/line to get the actual surrounding code.

---

## Step 2 — Verify the claim against real code and real data

This is the step that separates this skill from "just do what the bot says."

1. Open the actual file at the actual line on the PR branch (not `main`) — read
   enough surrounding context to understand intent, not just the flagged line.
2. **Grep callers** of any function/symbol Cursor flagged — is the claimed failure
   mode actually reachable from how it's called in this codebase?
3. If the claim involves data (null values, missing rows, a specific column
   assumption) — check it against the live database via Supabase MCP (read-only),
   don't take the bot's assumption at face value:
   ```sql
   SELECT column_name, is_nullable FROM information_schema.columns
   WHERE table_name = '[table]' AND column_name = '[column]';
   ```
4. If the claim involves RLS or tenant isolation — check the actual policy:
   ```sql
   SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = '[table]';
   ```
5. Check `rto-compass-hub/CLAUDE.md` and `AUDIT-REPORT.md` — is this a known,
   already-decided pattern (see PD-001–PD-006 in the `complyhub-bug-fix` skill)?
   If so, the flag may be a false positive by design.

**Gate:** Reach one of three verdicts before moving on:
- **CONFIRMED** — the claim is real, reproduce the exact failure scenario in one sentence
- **FALSE POSITIVE** — explain specifically why the flagged code is actually safe/intentional
- **NEEDS BRIAN'S JUDGEMENT** — ambiguous, present both sides and ask

Report the verdict to Brian in plain English before doing anything else. Do not
skip straight to a fix "just in case."

---

## Step 3 — If FALSE POSITIVE

- Do not change any code.
- Draft a reply comment for the PR thread explaining specifically why the flagged
  code is safe (cite the line, the actual behaviour, and — if relevant — the
  known decision or the DB/RLS check that disproves the claim).
- Only post the reply after Brian confirms: `gh pr comment [PR number] --body "[reply]"`

## Step 4 — If CONFIRMED

Follow the exact same gated fix flow as the rest of the branch work protocol —
this is not a shortcut path:

1. Check out the PR's branch (not a new branch — this fix belongs on the existing PR):
   ```powershell
   git checkout [pr-branch-name]
   git pull
   ```
2. Run `git branch --show-current` — confirm it matches the PR branch, not `main`.
3. Write the fix plan in plain English (what changes, which files, why) — same
   structure as Step 6 of `complyhub-bug-fix`. Present it to Brian.
4. **Gate:** wait for Brian's explicit approval before touching any file.
5. Apply only the fix needed to resolve the flagged issue — no unrelated cleanup.
6. Verify:
   ```powershell
   npm run type-check
   npm run lint
   ```
   If the fix touches real logic (not just wording), add or update a unit test
   that would fail without the fix — same standard as any other logic change.
7. Present the diff to Brian.
8. **Gate 1 — Commit:** only after Brian says "commit it".
9. **Gate 2 — Push:** only after Brian says "push it".
10. Once pushed, reply on the PR thread confirming the fix:
    ```bash
    gh pr comment [PR number] --body "Fixed in [commit hash] — [one-line summary]"
    ```
11. Do not approve or merge the PR as part of this skill — that still goes through
    the normal `/pr-review` Stage 4/5 flow or Brian's direct merge decision.

---

## Rules

- Never trust a Cursor flag at face value — Step 2 verification is mandatory,
  not optional, even when the flag "looks obviously right."
- Never commit or push without Brian's explicit words — same three-gate rule
  as every other branch workflow (edit ≠ commit ≠ push).
- Never open a *new* branch for this — the fix belongs on the PR's existing branch.
- Never merge or approve the PR from within this skill.
- If verification surfaces a DIFFERENT, unrelated issue than what Cursor flagged,
  report it separately — do not silently fix things outside the scope of the
  flagged comment without telling Brian first.
- If the claim touches multi-tenant isolation, RLS, or billing — treat a CONFIRMED
  verdict as P0 and say so explicitly, same severity language as `complyhub-bug-fix`.
