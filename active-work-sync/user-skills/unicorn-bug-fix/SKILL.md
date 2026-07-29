---
name: unicorn-bug-fix
description: >
  Guides Khian (Brian) through the safe Unicorn 2.0 bug-fixing flow —
  one step at a time — to diagnose issues, check blast radius, verify
  database state, and deliver a safe Lovable prompt. Trigger when Khian
  mentions a bug, says "fix this bug", "there's a problem", or asks how
  to start fixing something. This skill is step-by-step and gates each
  stage before moving on.
---

# Unicorn Bug Fix — Step-by-Step Guide for Khian

This skill walks Khian through diagnosing and fixing a bug safely on Unicorn 2.0.
It is gated — each step must be confirmed complete before the next begins.
Never skip steps. Never combine steps. Data integrity and Carl's workflow
depend on the order being respected.

---

## The 7-Step Flow

```
1. Understand the bug
2. Diagnose the issue
3. Blast radius check
4. Database & Dave Standard checks
5. Implications and tradeoffs
6. Confirm fix is safe
7. Write the Lovable prompt
```

---

## How to run this skill

When this skill is triggered, ask Khian for the bug description first.
Then walk through each step below — one at a time. At the end of
each step, explicitly ask: "Done? Ready for Step N+1?" and wait for
confirmation before continuing.

Do not present all steps at once. Surface one step, help him complete it,
then move on.

---

## Step 1 — Understand the bug

Ask Khian to describe the bug in his own words. If Angela or Carl reported it,
ask for the exact wording. Include any error messages or screenshots.

Extract and confirm:
- What is the expected behavior?
- What is the actual behavior?
- When does it occur? (specific page, action, or flow)
- Which user role sees it? (Vivacity staff only, client RTOs, or both?)
- Is data being corrupted, or just a display issue?
- Are there any error messages in browser console or Supabase logs?

Do not move to Step 2 until these are clear.

**Gate:** Summarise your understanding back to Khian in 2-3 sentences.
Ask him to confirm it's right before proceeding.

---

## Step 2 — Diagnose the issue

**What we're doing:** Finding where in the code or database the bug is actually
happening. We check both the code files AND what's stored in the database right
now, because sometimes they don't match and one or the other is the real problem.

Using both the codebase and Supabase MCP, pinpoint the root cause.

**CODEBASE DIAGNOSIS:**
We're looking at the code to see if the bug is in how the app works. Ask yourself:
1. Are there any warnings or error messages related to the affected feature?
2. Which page or screen shows the bug?
3. Where does that page get its information from? (Find the code that loads the data)
4. Have any files in this area been changed recently? (Check the last few commits)
5. Is any AI logic or background processing involved? (Check for edge functions)

**LIVE DATABASE STATE (Supabase MCP):**
We're looking at the actual database to see if the data is wrong or corrupt. This
is important because sometimes the code is fine but the database has bad data.

6. Check what the table actually looks like right now:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = '[table]'
   ORDER BY ordinal_position;
   ```
   — This shows us every column in the table and what type of data it holds

7. How much data is in this table?
   ```sql
   SELECT COUNT(*) FROM [table];
   ```

8. If the data looks wrong, grab a few examples:
   ```sql
   SELECT * FROM [table] LIMIT 5;
   ```

9. Check the access rules for this table (this is critical for data safety):
   ```sql
   SELECT policyname, cmd, qual, with_check FROM pg_policies
   WHERE tablename = '[table]';
   ```
   — These rules control who can see what data. If they're wrong, it could explain
     the bug or cause bigger problems if we're not careful.

**ROOT CAUSE HYPOTHESIS:**
Now, think: where is the bug coming from?
- Is the code doing something wrong? (frontend or backend)
- Is the data in the database corrupted or wrong?
- Is something running in the background (edge function) that's broken?
- Is there a timing issue? (something happening out of order)
- Did someone run an update to the database structure (migration) that didn't work?

**Gate:** Root cause must be clear. If it's unclear, run a second diagnostic pass
or ask to check the error logs. Do not proceed to Step 3 until the root cause is
identified.

---

## Step 3 — Blast radius check

**What we're doing:** Before we fix the bug, we need to understand what else might
break if we change it. Sometimes a bug is being relied on elsewhere without
realizing it, or fixing one thing breaks something else.

Think of it like this: if part of the system is buggy but another part depends on
it being buggy, fixing the first part will break the second part. We need to map
all those connections.

Ask these questions:
- Does just one page show the bug, or many?
- Does anything else depend on the current buggy behavior? (Are there other features
  that would break if we change this?)
- Will fixing this change what data is shown or how it's calculated?
- Are there numbers displayed anywhere (stat cards, counters) that might be affected?
- Do any automatic updates (realtime handlers) depend on this data?
- Does this involve access control rules (RLS), background jobs (edge functions),
  or database automation (triggers)?

**Example:** A while back, when the teams/people list was fixed to show the right
number of rows, the total count numbers on the dashboard suddenly showed 100
instead of the real number, because they were counting rows in a different way.
That's a blast radius issue — the fix in one place broke something else.

List all the places that could be affected. Flag anything that looks risky or
complicated.

**Gate:** Present the blast radius to Khian. Ask him to review and confirm nothing
obvious was missed. If many things could be affected, suggest checking with Carl
before proceeding.

---

## Step 4 — Database & Dave Standard checks

**What we're doing:** Making sure the database won't break if we apply the fix.
We're checking for common pitfalls like data rules we might violate, automation
that might stop working, or situations where old data would become unreadable.

The "Dave Standard" is a checklist of things that have broken production before,
so we always check them now before shipping anything.

Run these checks using the database tool to ensure the fix is safe:

**DAVE STANDARD CHECKS:**

1. Full view of the affected table:
   ```sql
   \d [table]
   ```
   — This shows every column, what type of data goes in it, what default values
     are set, and what rules exist. We're looking for anything that might conflict
     with our fix.

2. Check the data rules (constraints):
   ```sql
   SELECT constraint_name, constraint_type, table_name
   FROM information_schema.table_constraints
   WHERE table_name = '[table]';
   ```
   — These rules say things like "this data must be unique" or "this has to match
     another table". If our fix violates these rules, it will fail.

3. Access control rules (RLS policies):
   ```sql
   SELECT policyname, cmd, qual, with_check FROM pg_policies
   WHERE tablename = '[table]';
   ```
   — These rules control which users can see which rows. If they're broken or
     missing, data could leak between organizations or users could see things
     they shouldn't.

4. Automation (triggers):
   ```sql
   SELECT trigger_name, event_object_table, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = '[table]';
   ```
   — These are automated actions that happen when data changes (like automatically
     updating "last modified" timestamps). We need to make sure our fix won't
     break them.

5. Sample the affected data:
   — Run a query that shows the buggy data. How many rows have the problem?
     Is it 1 row or 10,000? This helps us understand the scope.

6. Will old broken data still work?
   — After we fix this, will data that was stored the old (broken) way still work?
     Or will the fix silently corrupt it? We need to know.

**SUMMARY — Answer these:**
- Is the fix backward-compatible? (will old data still work with the new code?)
- Will the fix break any data rules (constraints)?
- Will the fix stop any automation (triggers)?
- Could the fix cause data to leak between organizations or users?

**Gate:** All Dave Standard checks must pass. If we find problems (broken rules,
missing access control, automation that would fail), stop and loop in Carl before
proceeding.

---

## Step 5 — Implications and tradeoffs

**What we're doing:** Making sure we understand what will change for users and
whether there are any downsides to this fix that we should know about.

Ask Khian these questions:
- What will change for the people using the system? (What will they see or be able
  to do differently?)
- Will this make the system faster, slower, or stay the same?
- Do we need to clean up bad data that was already created? How much manual work
  would that be?
- Will users have to redo anything after the fix ships?
- If this fix causes new problems, how would we roll it back?

Document what will change. If the fix is complicated or affects many users,
suggest checking with Angela or Carl.

**Gate:** Summarise the implications and tradeoffs to Khian. Ask him to confirm
this is acceptable before moving to Step 6.

---

## Step 6 — Confirm fix is safe

**What we're doing:** Final safety check before we send the fix to Lovable. We're
making sure we've done all the right steps and that everything makes sense before
we commit to the fix.

Confirm with Khian:
- [ ] Root cause is understood (Step 2)
- [ ] Blast radius is mapped (Step 3)
- [ ] Dave Standard checks passed (Step 4)
- [ ] Implications are acceptable (Step 5)
- [ ] Carl has been looped in if the fix is risky or touches access control

If anything is unclear or risky, stop and ask Khian to get Carl's approval
before continuing.

**Gate:** Khian must explicitly confirm all items above are done and safe
before Step 7 begins.

---

## Step 7 — Write the Lovable prompt

**What we're doing:** Creating a clear instruction set that tells Lovable (the
AI that writes code) exactly what to fix, what not to touch, and what edge cases
to handle.

Based on the confirmed diagnosis and safety checks, write a precise prompt.
A good bug-fix prompt always includes:

**Structure:**
```
Bug: [One sentence describing the bug and its impact]

Root cause: [Where in the codebase/database the bug originates]

Expected fix:
- [Exact file/component to change or database query to fix]
- [What the fix does — be specific]
- [Any data cleanup needed to fix existing bad data]
- [If access control rules are being changed: write them out explicitly. If not, state "Do NOT change existing access control rules"]

Affected areas (do NOT break these):
- [List components that depend on this data]
- [List any count displays or stat cards]
- [Client portal things to exclude if needed]

Edge cases to handle:
- [What happens to old/buggy data after the fix?]
- [Any backward compatibility concerns?]
- [Any date/time, locale, or organization isolation issues?]

Do not:
- [List anything Lovable must NOT do — e.g., "do not add new tables", "do not change access control"]
```

**The Dave Standard — mandatory for any bug fix touching the database or data:**

If the fix involves a database structure change, access control rules, data
rules (constraints), automation (triggers), or data cleanup, end the prompt with:

> *"Please take your time and conduct a thorough deep dive covering every
> nuance of the codebase and database structures this fix touches. Identify
> all gaps, improvements, shortcomings, issues, bugs, and conflicts. Ensure
> the fix is backward-compatible, audit-complete, and production-ready.
> Confirm it does not negatively impact any existing functionality, access
> control rules, data rules, or automation. Test the fix with both buggy and
> clean data. Finish with a summary of changes, benefits, and a risk
> assessment."*

For UI-only fixes with no database changes, the Dave Standard is optional but
recommended for complicated components.

Source: `unicorn-kb/handoffs/lovable-production-db-change.md`

**Gate:** Show Khian the full prompt. Ask him to read it carefully and confirm
every line matches the diagnosis and safety findings from Steps 2–4. Only then
does it go to Lovable.

---

## After Lovable ships

Once Lovable commits the fix, verify using both code inspection and database checks:

**CODE CHECKS:**
1. Show the change Lovable made — does it match what we asked for?
2. If there's a database structure change, did it apply correctly?
3. Test the bug manually — is it fixed?

**DATABASE CHECKS:**
4. If data was corrupted, grab a few rows to confirm they're fixed:
   ```sql
   SELECT * FROM [table] LIMIT 5;
   ```
5. If access control rules changed, confirm they're correct:
   ```sql
   SELECT policyname, cmd, qual, with_check FROM pg_policies
   WHERE tablename = '[table]';
   ```
6. If automation was added or changed, confirm it's working:
   ```sql
   SELECT trigger_name, action_statement FROM information_schema.triggers
   WHERE event_object_table = '[table]';
   ```

If anything doesn't match what we designed → flag to Carl immediately before
proceeding.

---

## Key rules to reinforce at every step

- **The Dave Standard applies to all bug fixes touching database structure,
  access control, or data.** Never skip it.
- **Blast radius is non-negotiable.** Always map what else could break.
- **Access control rules must have both parts.** Missing one is a silent failure
  that can expose data. (ADR-005)
- **Never touch Carl's audit repository.** Read it for context, never write to it.
- **Never commit to the main code repository from Claude Code.** Lovable owns that.
  Claude Code is not allowed to write there per the workspace rules.
- **The live database is the source of truth.** If the code and database don't
  match, trust what's actually in the database right now.
- **Lovable ships directly to production.** No safety review gates. The diagnosis
  and safety checks we do here are the only safety net.
