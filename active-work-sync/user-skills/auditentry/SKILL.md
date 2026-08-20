---
name: auditentry
description: Create a durable, technical audit entry in complyhub-kb/audit/ for a merged (or about-to-merge) PR — problem statement, commit history, fixes shipped, review rounds, production rollout, manual QA checklist, still-open follow-ups. Trigger when Brian says "/auditentry", "create audit entry", "create an audit for this PR", or "write the audit doc".
---

# auditentry

Writes a durable, technical audit record to `complyhub-kb/audit/` for a PR — the permanent,
searchable history of what was broken, what was fixed, how it was verified, and what's still open.
This is NOT the changelog (`/changelog`) — that's a short plain-English summary for humans outside
engineering. This is the detailed record Carl/RJ/Dave/future-you reads to understand what actually
happened, technically, and to know what's still owed (manual QA, soak, follow-ups).

---

## How to trigger

```
/auditentry
/auditentry PR #490
```

If no PR is named, use whatever this conversation just shipped. If ambiguous, ask which PR.

---

## Step 1 — Confirm write access and read the existing convention fresh

- `complyhub-kb/` is full read/write/commit/push access per `AGENTS.md` — confirm this hasn't
  changed by checking `complyhub-kb/pinned/guardrails.md` if unsure.
- Read 2-3 of the most recent files in `complyhub-kb/audit/` (sorted by filename date, they're
  named `YYYY-MM-DD_prNNN_slug.md`) to match current structure/tone — the template below is a
  starting point, not gospel; the convention may have drifted since this skill was written.

## Step 2 — Gather facts (don't write from conversation memory alone)

- `gh pr view <number> --json title,body,files,additions,deletions,mergeCommit,baseRefName,headRefName,mergedAt`
  for the real PR metadata.
- `gh pr view <number> --json files --jq '.files[].path'` for the full touched-file list.
- `git log --oneline origin/main..<branch>` (or the merge commit's full ancestry if already merged:
  `git log --oneline <merge-commit>^1..<merge-commit>^2`) for the real commit history — read each
  commit's full message (`git log -1 --format=%B <sha>`), don't rely on headlines alone.
- Check for migrations: any `supabase/migrations/*.sql` in the touched-file list. If present, note
  whether they were applied via `execute_sql` + `migration repair` (per the interim procedure in
  `AGENTS.md`) or via `supabase db push`, and confirm via `list_migrations` (Supabase MCP) that the
  ledger reflects it.
- Check for edge functions: any `supabase/functions/*/index.ts` in the touched-file list. If
  present, confirm the GitHub Actions "Deploy Edge Functions" workflow run succeeded
  (`gh run list --workflow=deploy-edge-functions.yml` or similar) and note the run URL, or confirm
  via Supabase MCP `get_edge_function` that the live source matches git.
- Check the actual production deploy: Vercel MCP `list_deployments` (project `complyhub-rto`,
  team `complyhub` — confirm these haven't changed via `list_projects`/`list_teams` if unsure)
  filtered to the merge commit SHA; confirm `target: production` and `state: READY`. If not
  `READY`, pull `get_deployment_build_logs` and flag it prominently — don't write a rollout section
  claiming success without checking.
- If a fresh-eyes/adversarial review ran during the work (check conversation context, or ask
  Brian), fold its confirmed findings into the Problem Statement and Review Rounds sections —
  don't just describe the original ask, describe what was actually found and fixed, including bugs
  introduced and caught mid-session.
- Check `active-work.md`'s worktree registry for whether a worktree needs releasing/updating as
  part of this PR's post-merge state.

## Step 3 — Write the file

Path: `complyhub-kb/audit/YYYY-MM-DD_prNNN_short-slug.md` (today's date, the PR number, a short
kebab-case description). Structure (adapt section presence/order to what's actually relevant — a
tiny PR doesn't need every section at full length, but don't invent a section with nothing to say):

```markdown
# Audit — PR #<number>

> **Date:** <date written>; **Merged:** <merge date/time UTC>
> **Scope:** <one-line description>
> **Project:** `<supabase project id>` · **Living doc:** <name, or "none — <how work was tracked>">

---

## Summary

<2-4 paragraphs: what this PR was for, what a review process (if any) caught, the headline
numbers — files changed, +/- lines, migrations, edge functions. Call out the single most
important/risky behavioural change if there is one.>

**Branch:** `<branch>` (merged; remote deleted/kept) · **Merge commit:** `<sha>` ·
**PR:** <url>

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| ... | ... | ... |

(Mark any row that came from a review/fresh-eyes pass rather than the original ask, e.g.
"**(fresh-eyes finding)**" prefix on the Area column, so it's clear what was caught mid-session.)

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `<sha>` | <what it did> |

---

## Fixes shipped

### <grouping by area, e.g. "Frontend — X", "Edge functions", "Database">

- **`file.tsx`** — <what changed, why>

### Database

<"None." if no migrations, or the migration filename(s) + how they were applied + ledger
verification.>

### Edge functions

<"None touched, none redeployed." if none, or the function name(s) + deploy verification.>

---

## Review rounds

<Numbered list of every review pass that actually happened — manual audit, fresh-eyes subagent,
Bugbot, ci-gate/type-check/lint. What each one found or confirmed clean.>

---

## Production rollout (post-merge)

1. **Vercel production** — deployment id, state, verified how.
2. **Edge functions** — deployed how, verified how (or "none").
3. **Migrations** — applied how, verified how (or "none").
4. **Worktrees** — which worktree(s) were released/updated, registry state.

---

## Manual QA checklist (post-merge — Brian-gated)

<Checkbox list of what a human still needs to click through for real, before trusting this is
actually working live. Be honest if this hasn't been done yet — say so explicitly, don't imply
it's done just because the code review passed.>

---

## Still open / follow-up

<Anything deliberately deferred, parked, or not fully resolved — with enough context that a
future session can pick it up cold.>

---

## Soak status

<Feature flag or not; what to watch for; risk tier.>

---

## References

- PR: <url>
- Merge commit: `<full sha>`
- Related deployments/workflow runs: <urls>
- Source audit/living doc, if any: `<filename>`
- Active work ledger: `active-work.md`
```

## Step 4 — Report back, don't auto-commit

Tell Brian the file path and give a one-paragraph summary of what's in it. **Do not** `git add`/
`git commit`/`git push` in `complyhub-kb/` unless Brian explicitly says so in this same request —
"create audit entry" is a write-the-file instruction, not a commit instruction, same as every other
commit/push hard gate in `AGENTS.md`. Full write access to `complyhub-kb/` does not change that gate.
