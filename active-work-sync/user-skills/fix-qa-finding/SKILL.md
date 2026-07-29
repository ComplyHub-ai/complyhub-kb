---
name: fix-qa-finding
description: Diagnose and fix a QA finding from the ComplyHub seed QA log. Trigger when Khian says "/fix-qa-finding", "fix NEW-XXX", "diagnose NEW-XXX", "fix finding", or names a specific finding number from the QA log. Runs the full diagnosis → fix → findings doc update → commit cycle.
---

# fix-qa-finding

Given a finding ID (e.g. `NEW-006`, `NEW-007`, `NEW-011`), this skill runs the full ComplyHub bug-fix cycle:

1. Read the finding from `complyhub-kb/reference/seed-qa-findings.md`
2. Diagnose the root cause in the codebase
3. Determine if it is a real bug, by-design behaviour, or a seed gap
4. If a real bug: make the smallest safe fix, following `rto-compass-hub/CLAUDE.md` rules
5. Update the finding status in `seed-qa-findings.md` and `seed-qa-checklist.md`
6. Commit and push both repos

---

## How to trigger

```
/fix-qa-finding NEW-006
/fix-qa-finding NEW-007
/fix-qa-finding          ← will ask which finding to fix
```

---

## Step-by-step process

### Step 1 — Read the finding
Read `c:\Users\brian\complyhubworkspace\complyhub-kb\reference\seed-qa-findings.md`.
Find the finding by ID. Extract:
- What page/route is affected
- What the error message says exactly
- What the expected behaviour is
- What the actual behaviour is
- The root cause hypothesis (if any)

### Step 2 — Diagnose
Search `rto-compass-hub/src/` for the relevant code. For console errors, search for the exact error string first:
```
Grep pattern: "Error fetching X" / "Failed to fetch X"
```
Then find the hook or component that contains it. Read the full function. Answer:
- What triggers the error?
- Is there a missing null/tenantId guard?
- Is this an empty-state handling problem (returns error instead of empty array)?
- Is this by-design (e.g. a feature not yet built)?

Always read `rto-compass-hub/CLAUDE.md` before making any fix.

### Step 3 — Classify
- **Real bug** → fix it
- **By-design / feature not built** → close the finding with explanation, no code change
- **Seed gap** → identify which table needs data, apply via Supabase MCP to branch DB `agcdvmrwzzgnlmfyrxtb`

### Step 4 — Fix (if real bug)
Rules from `CLAUDE.md`:
- No `.single()` — use `.maybeSingle()`
- No raw `console.error` — use `logger` from `@/lib/logger`
- No `supabase.from()` in component body — fetch belongs in a hook
- One focused change — do not refactor surrounding code
- Present the plan to Khian before editing, get explicit approval

For empty-state console errors the standard fix is:
```tsx
// Add tenantId guard before the fetch:
if (tenantId) fetchSomething();

// Or handle the empty case silently in the service:
if (error) return []; // not console.error
```

### Step 5 — Commit
```
git add <changed files>
git commit -m "fix(<area>): <what was fixed> (<finding ID>)"
git push
```
Branch: `fix/local-run`. Never push to `main`.

### Step 6 — Update docs
In `complyhub-kb/reference/seed-qa-findings.md`:
- Change the finding status to ✅ Fixed or ✅ Closed by design
- Add a "Fix applied" section with file + commit hash
- Update the R6 column in the summary table

In `complyhub-kb/reference/seed-qa-checklist.md`:
- Update the relevant checklist item

Commit and push `complyhub-kb` main.
Sync both files to `rto-compass-hub/docs/qa/` and push.

---

## Rules
- Always read `rto-compass-hub/CLAUDE.md` before touching any code
- Always present the diagnosis and proposed fix to Khian before making edits
- Never push to `main` in `rto-compass-hub`
- Supabase project for `fix/local-run` branch: `agcdvmrwzzgnlmfyrxtb`
- If the fix touches a DB table, flag to Dave/Carl — do not apply migrations autonomously
- NEW-014 (P0 — SA reads PDR data) is a Dave fix — do not attempt RLS changes without Dave
