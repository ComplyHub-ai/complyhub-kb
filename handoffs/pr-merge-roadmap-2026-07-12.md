# PR merge roadmap — July 2026

> Human-readable plan for clearing the open PR queue and making Angela's merge
> process safe to rely on. Lives at workspace root with `pr-review-open-prs.md`
> (queue log) and `pr-process-automation-audit-2026-07-11.md` (technical audit).
>
> **Queue status (single source of truth):** `pr-review-open-prs.md` — update that
> file as each PR is reviewed, merged, or closed.
>
> **Update — 13 July 2026: Part 2 (Steps A, B, C) is done — see "Progress update"
> section near the end.** Went further than originally scoped in Step A (full CI
> re-enabled with per-PR scoping, not just a minimal type-check gate). Step D
> (clearing the queue PR-by-PR) is next and still outstanding — this doc's plan
> otherwise stands as written below.

---

## Why this document exists

We have a large pile of open pull requests and a new faster merge process Angela
set up. The new process is a good idea, but a few safety nets are not fully
connected yet. This roadmap is the order of work — what to do now, what to do
while clearing the queue, and what to do after the queue is empty.

---

## Part 1 — Checks before merge (CI): where we are today

### What's working

- **Risky changes are protected.** Anything touching the database, billing,
  login, or tenant data needs approval from RJ or Khian before it can merge.
  That part is real and was verified on live pull requests.

- **Vercel still builds every PR** so we get a preview of the app before merge.

### What's not working (or is turned off)

- **The full automated test suite on GitHub is switched off.** It was using too
  many GitHub Actions minutes because every pull request ran many heavy jobs,
  and most were already failing on old code anyway.

- **What "green" means today is too weak for automatic merges.** A simple-looking
  pull request could pass checks even though deeper checks (types, lint, tests)
  were never run or required.

- **Old pull requests were never fully tagged** with the new risk labels or
  reviewer requests. The new automation mostly applies to newer activity.

### Plain summary

Think of it like a building with a good lock on the server room (risky PRs) but a
cheap alarm on the front door (simple PRs). The server room lock works. The front
door alarm is not fully wired. We are not turning on "merge yourself when green"
for simple PRs until we fix that.

---

## Part 2 — What to do **now** (before and while clearing PRs)

**Goal:** Stay safe without trying to fix every broken check at once.

### Step A — Turn on a **small** required check (not the whole suite)

Add one lightweight gate that runs on pull requests and must pass to merge:

- Does the code still type-check?
- Quick safety scans (patterns we already ban in reviews)
- If the PR adds a database migration file, basic rules on that new file only

**Do not** require yet: full lint across the whole repo, full unit test suite,
full production build in GitHub, or migration drift on every branch push.

**Why:** Those are the jobs that burned minutes and stay red on legacy code.
Requiring them now blocks everything and does not help clear the queue.

### Step B — Small tweaks to Angela's automation (when she approves)

These are quick configuration fixes, not a redesign:

- "Do not merge" / "blocked" labels should actually stop auto-merge from arming
- Fix the dependency auto-merge script (it sits in a folder GitHub never runs)
- Optionally: delete branches after merge, require branch to be up to date with main

**Angela's Tier A / Tier B policy stays.** RJ and Khian stay the reviewers for
risky work. We are tightening the wiring, not throwing away her system.

### Step C — Park the backlog safely

Before draining the queue:

- Do **not** let old PRs auto-merge while safety nets are incomplete
- Mark uncertain ones as draft or "do not merge" until reviewed
- Optionally push or reopen so new labels and reviewer requests fire

### Step D — Clear PRs **one at a time**

For each pull request:

1. Read its status in `pr-review-open-prs.md`
2. Run a proper review (human + agent checklist)
3. Fix on branch if needed; merge only when safe
4. Update `pr-review-open-prs.md` with outcome
5. Verify production after merge if it touched database or backend functions

**Tier B (risky) PRs:** Can be merged now with manual review and manual checks
on your machine — the approval gate already works.

**Tier A (simple) PRs:** Do not rely on unattended auto-merge until Step A is done.

---

## Part 3 — What to do **after all PRs are merged**

Once the open queue is empty and `main` is calm:

### Phase 1 — Bring back the heavier checks slowly

Re-enable one job at a time. Fix or baseline legacy failures before making each
job **required**:

| Order | Check | Notes |
|-------|--------|--------|
| 1 | Lint | Fix or allowlist legacy issues in dedicated PRs |
| 2 | Unit tests | Fix failures; don't require until green on new PRs |
| 3 | Full build in GitHub | Optional if Vercel already builds; heaviest on minutes |
| 4 | Migration drift | Only on PRs that touch migrations, or on a schedule — not every push |

### Phase 2 — Make the full suite required

When new PRs stay green on those jobs, add them to the required merge checks.

### Phase 3 — Trust Tier A auto-merge fully

Only then does "passes checks → can merge itself" match what the team expects
for simple content and UI changes.

### Phase 4 — Optional improvements (later)

- Extra labels for mixed PRs (UI + database in one change)
- Written team policy doc in the repo
- Export branch protection settings so they cannot drift silently

---

## Part 4 — Full sequence (one page)

```
NOW
├── A. Small required check (type-check + quick scans) — cheap gate
├── B. Tighten automation knobs (with Angela's OK)
├── C. Park backlog — no surprise auto-merges
└── D. Review and merge PRs one by one → log in pr-review-open-prs.md

AFTER QUEUE IS EMPTY
├── 1. Re-enable lint → fix debt → require when green
├── 2. Re-enable tests → fix debt → require when green
├── 3. Re-enable build/drift carefully (path filters or schedule)
└── 4. Full Tier A auto-merge is safe to lean on

ONGOING
└── pr-review-open-prs.md = only place for queue status and verdicts
```

---

## Who does what

| Role | Responsibility |
|------|----------------|
| **Angela** | Approve automation/CI config changes; set queue priority |
| **RJ / Khian** | Approve Tier B (risky) PRs; help define small CI gate |
| **Khian** | Drive queue drain, update `pr-review-open-prs.md`, run reviews |
| **Everyone** | Keep PRs small; don't open new ones if review queue is already full (~5 target) |

---

## What we are **not** doing

- Throwing away Angela's two-tier process
- Re-enabling all CI at once (minutes and false reds)
- Auto-merging the legacy backlog before Steps A–C
- Using a second spreadsheet for PR status (only `pr-review-open-prs.md`)

---

## Related files

| File | Purpose |
|------|---------|
| `pr-review-open-prs.md` | Open queue, verdicts, merge history |
| `pr-process-automation-audit-2026-07-11.md` | Technical audit + recommendations for Angela — see its "Remediation log (13 July 2026)" for full fix detail |
| `complyhub-kb/handoffs/pr-review-fix-workflow.md` | Step-by-step review procedure for agents |

---

## Progress update (13 July 2026)

**Step A — done, and further than originally scoped.** This doc originally
recommended a *minimal* gate (type-check + quick scans only) to avoid blocking
everything on legacy debt. What actually shipped ([PR
#188](https://github.com/ComplyHub-ai/rto-compass-hub/pull/188)) is the full
CI workflow, re-enabled and **scoped to only the files a PR changes** (lint,
`.single()` guard, security checks, edge-function type-check) so legacy issues
elsewhere in the repo can't fail an unrelated PR — the same outcome the minimal
gate was meant to achieve, done more completely. `main`'s required checks now
include type-check, lint, the `.single()` guard, migration guards, and security
checks. `unit-tests` was **deleted from CI entirely** (Carl's call), not just
left out of required checks — it had 8 pre-existing failures unconnected to
any specific PR.

**Step B — done** ([PR #192](https://github.com/ComplyHub-ai/rto-compass-hub/pull/192)):
`blocked`/`wip`/`do-not-merge` now actually stop both `auto-merge.yml` and the
newly-fixed `dependabot-auto-merge.yml` (which was dormant in the wrong folder
before this). `strict_required_status_checks_policy` and
`delete_branch_on_merge` are both `true`. Two Cursor Bugbot findings caught
real follow-on bugs in the label-honouring logic itself (a stale/missing label
read on non-`pull_request` trigger events, and a missing `unlabeled` trigger
that meant removing a stop label never re-armed auto-merge) — both fixed same
day. A labeler case-sensitivity bug was also found and fixed along the way
(not in the original audit): `auth`/`billing`/`tenant`/etc. keyword patterns
were lowercase-only and silently missed most PascalCase-named sensitive files.

**Step C — done, interim form.** Rather than reopening/pushing every legacy PR
to trigger real mechanical classification, all 19 previously-unlabelled open
PRs were blanket-labeled `tier-b` (forces human review, errs safe) and the 5
open Dependabot PRs got `do-not-merge`. This is a safety net, not equivalent to
each PR having been properly reviewed — re-tier individual PRs down to
`tier-a` only as they're actually looked at.

**Step D — not started.** The ~30-PR backlog itself hasn't been drained yet.
This is the next actionable piece of this roadmap; `pr-review-open-prs.md`'s
own "recommended order" section is the place to pick up from.

**Not done from Part 3 (expected — queue isn't empty yet):** ruleset still
isn't version-controlled anywhere (Phase 4 item); `unit-tests` was deleted
rather than fixed-and-re-enabled, so re-adding a real test gate later is now
a fresh piece of work, not a "re-enable" — worth remembering before assuming
Phase 1's "re-enable tests" step is a small lift.

---

*Last updated: 13 July 2026*
