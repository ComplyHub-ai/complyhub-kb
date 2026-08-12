---
name: sync-kb-clones
description: Sync the complyhub-kb/active-work-sync/ mirror (root .md files, memory files, and user-level skills) so it matches the real workspace root, ~/.claude memory, and ~/.claude/skills. Read/diff first, report, then write only with Brian's go-ahead. Trigger when Brian says "/sync-kb-clones", "sync the kb clones", "update the kb mirror", "sync active-work-sync", or "push the workspace md files to the kb".
---

# sync-kb-clones

`complyhub-kb/active-work-sync/` is a git-tracked mirror of three things that otherwise live outside
`complyhub-kb/` (so Carl/RJ/Dave/Angela can see them without cloning Brian's whole machine):

1. **Workspace-root `.md` files** — `CLAUDE.md`, `AGENTS.md`, `active-work.md`, `crosstenantleak.md`,
   `pr-review-open-prs.md`, `support-tickets-triage.md`, `trainer-report-period-resync-gap.md`, and any
   other `.md` file that lives directly in `c:\Users\brian\complyhubworkspace\`.
2. **Personal memory** — `C:\Users\brian\.claude\projects\c--Users-brian-complyhubworkspace\memory\` →
   mirrored into `complyhub-kb/active-work-sync/memory/`.
3. **User-level skills** — `C:\Users\brian\.claude\skills\` → mirrored into
   `complyhub-kb/active-work-sync/user-skills/`.

There is no separate user-level slash-command directory on this machine — `pr-review` (previously
mirrored as `user-commands/pr-review.md`) is actually the `pr-review` skill under
`C:\Users\brian\.claude\skills\`, already covered by category 3. The `user-commands/` mirror folder and
its "2d" diff step were removed 12 Aug 2026 as a result — don't recreate either unless Brian says a real
user-level commands directory exists on this machine.

This mirror drifts because Brian edits the real files (root `.md`s, memory, skills) far more often than
he remembers to update the KB copy. This skill is the **one-way sync**: real workspace → KB mirror.
Never the other direction — the KB mirror is a read reference for the team, not a second source of
truth to edit directly.

---

## How to trigger

```
/sync-kb-clones
```

---

## Step-by-step process

### Step 1 — Pull latest KB state first

```bash
cd complyhub-kb && git pull --ff-only && cd ..
```

If this fails, stop and report — don't diff against a stale local KB checkout.

### Step 2 — Diff each category

**2a. Root `.md` files.** List every `.md` directly in `c:\Users\brian\complyhubworkspace\` (not in a
subfolder) and compare each by content against its same-named file in
`complyhub-kb/active-work-sync/`. Three outcomes per file:
- Exists in both, content differs → **update** (needs sync)
- Exists at root only → **new** (needs to be added to the mirror)
- Exists in mirror only, no longer at root → flag as **orphaned** — do NOT delete automatically, ask
  Brian first (may mean a doc was intentionally moved/renamed/retired).

**2b. Memory files.** Compare every file in
`C:\Users\brian\.claude\projects\c--Users-brian-complyhubworkspace\memory\` (including `MEMORY.md`)
against `complyhub-kb/active-work-sync/memory/` the same way — updated / new / orphaned.

**2c. User-level skills.** Compare every `SKILL.md` (and any other files) under each subdirectory of
`C:\Users\brian\.claude\skills\` against `complyhub-kb/active-work-sync/user-skills/<skill-name>/` —
updated / new / orphaned. A skill directory present on disk but missing entirely from the mirror is a
**new skill** — call this out explicitly, since that's the case most likely to matter to Brian (a whole
capability the team KB doesn't know exists yet).

### Step 3 — Report in plain English before touching anything

Summarise, per category:
- How many files are new, how many changed, how many orphaned
- Name each one (short list, not full diffs) so Brian can sanity-check at a glance
- For anything orphaned, explicitly ask whether to remove it from the mirror or leave it

Then **wait for Brian's go-ahead** — this is a `complyhub-kb/` write (commit + push to `main` is within
existing full-access permissions for that repo per `CLAUDE.md`, but per the "always run the plan by
Brian before making any change" hard gate, confirm before writing/copying files, and confirm again
before commit/push per the commit/push hard gates).

### Step 4 — Copy files (only after go-ahead)

For every file flagged new/updated: copy the real file's content into the corresponding
`complyhub-kb/active-work-sync/...` path exactly (verbatim copy, no transcription/rewriting — this is a
mirror, not a summary). Create the destination directory if it doesn't exist yet (e.g. a brand-new
skill folder).

Do not touch orphaned files unless Brian explicitly said to remove them in Step 3.

### Step 5 — Commit and push (only if Brian says so)

Same hard gates as everywhere else in this workspace: do not `git commit` or `git push` unless Brian
uses explicit commit/push words. When he does, commit with a message summarising what was synced (e.g.
"sync: update active-work-sync mirror — 2 root docs, 1 new skill, 3 memory files").

---

## Rules

- One-way only: real workspace/memory/skills → KB mirror. Never read from the KB mirror to "restore"
  the real files.
- Never delete an orphaned mirror file without Brian's explicit confirmation.
- Verbatim copy, not paraphrase — the mirror's value is being an exact reflection, not a summary.
- Respect all existing hard gates in `CLAUDE.md`: confirm before writing, confirm again before
  commit, confirm again before push. These are three separate approvals, same as everywhere else.
- If the real workspace root, memory directory, or skills directory can't be read (path wrong, moved),
  stop and report rather than guessing a path.
