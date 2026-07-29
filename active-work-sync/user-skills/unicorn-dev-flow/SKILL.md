---
name: unicorn-dev-flow
description: >
  Guides Khian (Brian) through the safe Unicorn 2.0 feature development
  flow — one step at a time — to avoid data loss, RLS failures, or damage
  to Carl's KB and audit workflow. Trigger this skill whenever Khian mentions
  a new feature, a task he's been assigned, "what do I do next", "how do I
  build X", or asks how to start any development work on Unicorn. Also trigger
  when he says "start the flow", "dev flow", or "new feature". This skill
  is step-by-step and will not rush — it gates each stage before moving on.
---

# Unicorn Dev Flow — Step-by-Step Guide for Khian

This skill walks Khian through building a feature safely on Unicorn 2.0.
It is gated — each step must be confirmed complete before the next begins.
Never skip steps. Never combine steps. Data integrity and Carl's workflow
depend on the order being respected.

---

## The 7-Step Flow

```
1. Understand the task
2. Get KB context (Claude Project chat)
3. Diagnose the codebase (Claude Code)
4. Design the change (Claude Project chat)
5. Write the Lovable prompt
6. Verify after Lovable ships
7. Flag KB drift to Carl
```

---

## How to run this skill

When Khian triggers this skill, ask him for the feature or task description
first. Then walk him through each step below — one at a time. At the end of
each step, explicitly ask: "Done? Ready for Step N+1?" and wait for
confirmation before continuing.

Do not present all steps at once. Surface one step, help him complete it,
then move on.

---

## Step 1 — Understand the task

Ask Khian to describe the feature or task in his own words. If it was given
to him by Angela or Carl, ask him to paste the exact wording.

Extract and confirm:
- What is the user-facing outcome? (what will someone be able to do?)
- Who uses it — Vivacity staff only, client RTOs, or both?
- Does it touch existing data or create new data?
- Is there any AI logic involved?

Do not move to Step 2 until these are clear.

**Gate:** Summarise your understanding back to Khian in 2-3 sentences.
Ask him to confirm it's right before proceeding.

---

## Step 2 — Get KB context (here in Claude Project chat)

Using the GitHub MCP, fetch the relevant KB files based on the feature.
Always check in this order:

1. **`pinned/decisions.md`** — has this already been decided? Is there an
   ADR that covers this area?
2. **`codebase-state/module-status.md`** — what's the status of the module
   this feature touches? Is it 🟢 stable, 🟡 partial, or 🔴 blocked?
3. **`codebase-state/codebase-map.md`** — which pages, components, hooks,
   and tables are relevant?
4. **`pinned/conventions.md`** — any conventions that apply (RLS ritual,
   edge function pattern, coercion triggers, etc.)?
5. **`reference/decision-trail.md`** — if the feature touches RLS, auth,
   or schema, fetch ADR-005 and ADR-008. These are the two failure modes
   that keep recurring.

Report back to Khian:
- Which files are relevant
- What existing patterns apply
- Any red flags spotted in the KB (past failures, open decisions, stale docs)

**Gate:** List the relevant files and patterns found. Ask Khian to confirm
before moving to Step 3.

---

## Step 3 — Diagnose the codebase (Claude Code + Supabase MCP)

This step happens in Claude Code — not here. Khian now has Supabase read
access via the local MCP wrapper, so diagnosis uses **two sources in
parallel**: the codebase files AND the live database state. Use both —
they catch different things.

**Why both matter:**
- Codebase (migrations, source files) tells you what was *intended* to be built
- Supabase MCP tells you what *actually exists* in production right now
- They can disagree — Lovable sometimes ships schema changes without a clean
  migration, or an old migration is stale. The live DB wins.

Provide a ready-to-paste Claude Code prompt like this:

```
I need to understand the current state of [feature area] before
building a new feature. Please run both codebase and Supabase checks:

CODEBASE CHECKS:
1. Find the current schema for [table name] — check supabase/migrations/
   for how it was created and any recent changes to it
2. Show me what [relevant component/hook] currently does
3. Search for any client-facing pages or components that reference [table]
4. Show me the most recent migration to understand what's been changed lately

SUPABASE MCP CHECKS (use the local Supabase MCP wrapper):
5. Run: SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = '[table]'
        ORDER BY ordinal_position;
   — confirm the live schema matches what the migrations say
6. Run: SELECT schemaname, tablename, rowsecurity
        FROM pg_tables
        WHERE tablename = '[table]';
   — confirm RLS is actually enabled on the live table (not just in the migration)
7. Run: SELECT policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE tablename = '[table]';
   — list every live RLS policy; confirm both tenant-read SELECT and
     staff ALL (is_vivacity()) are present
8. If the feature involves messaging or cross-tenant data, also run:
   SELECT policyname, cmd, qual FROM pg_policies
   WHERE tablename IN ('[relevant tables]');
   — verify no policy is broader than it should be

Flag any mismatch between codebase and live DB immediately.
```

Tailor the prompt to the specific feature. Be precise about table names
from what was found in Step 2.

Tell Khian: "Run this in Claude Code — both the file checks and the
Supabase MCP queries — and paste the key findings back here. We need
the real live state before we design anything. The KB and even the
migrations can be stale between Lovable remixes; the Supabase MCP
is ground truth."

**Gate:** Khian must paste Claude Code's findings (both codebase and
Supabase MCP results) back into this chat before Step 4 begins.
Do not proceed without them. If codebase and live DB disagree,
flag to Carl before designing anything.

---

## Step 4 — Design the change (back here in Claude Project chat)

Using KB context (Step 2) + Claude Code diagnosis (Step 3), design the
full change. Work through these questions with Khian:

**Schema:**
- Use the live schema from Supabase MCP (Step 3) as the source of truth —
  not just the migrations. If they disagreed, resolve that first.
- Does this need a new table or a new column on an existing table?
- If new table → run the full New Table Checklist (see below)
- If new column → is it NOT NULL? If yes, does Lovable write to it?
  If both yes → coercion trigger is mandatory (ADR-008)
- Is the column optional (nullable)? → no trigger needed

**RLS — mandatory check for every schema change:**
- Is this data Vivacity-staff-only? → only needs `is_vivacity()` ALL policy
- Is this data mixed staff + client? → needs BOTH:
  - Tenant-read SELECT via `tenant_members` check
  - Staff ALL via `is_vivacity()`
  - PLUS `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` — explicitly
- Never skip the explicit ENABLE — missing it is a silent failure (ADR-005)

**Edge functions:**
- Is there any AI logic? → must be an edge function, never frontend
- Can an existing edge function be reused? → check the 117 functions list
  in `codebase-state/architecture.md` before creating a new one
- If new edge function needed → follow canonical pattern from
  `supabase/functions/invite-user/index.ts`

**Client portal:**
- If the feature has staff-only data → explicitly confirm which client-facing
  pages or components must NOT render it
- Check `docs/client-portal/` for the client data-access checklist

**Output of this step:** A written design summary covering schema changes,
RLS policies, edge functions (existing or new), and client-portal exclusions.

**Gate:** Present the full design to Khian. Ask him to confirm it looks right,
and suggest he share it with Carl if any RLS or schema decisions feel uncertain.
Do not write the Lovable prompt until the design is confirmed.

---

### New Table Checklist (run this in Step 4 if a new table is needed)

Work through every item explicitly. Do not assume any item is handled.

- [ ] Does the table already exist? (search migrations + codebase first)
- [ ] `tenant_id int NOT NULL REFERENCES tenants(id)` — included?
- [ ] `created_at timestamptz NOT NULL DEFAULT now()` — included?
- [ ] `updated_at timestamptz NOT NULL DEFAULT now()` — included?
- [ ] `updated_at` trigger wired up?
- [ ] Tenant-read SELECT policy written (via `tenant_members` check)?
- [ ] Staff ALL policy written (via `is_vivacity()`)?
- [ ] `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` — explicitly included?
- [ ] Any NOT NULL columns that Lovable forms write to? → coercion trigger?
- [ ] Does the client portal need to be blocked from this table?

Source: `pinned/conventions.md → New table checklist`

---

## Step 5 — Write the Lovable prompt

Based on the confirmed design from Step 4, write a precise Lovable prompt.
A good Lovable prompt always includes:

**Structure:**
```
[One sentence describing the user-facing feature]

Schema change:
- [Exact SQL or description of what to add/alter]
- [RLS policies written out explicitly if a new table]
- [State explicitly: "Do NOT change existing RLS policies" if touching existing table]

Frontend changes:
- [Exact component or page file to modify]
- [What to add and where]
- [Staff-only gate if needed: "Only render when profile.tenant_id === 6372"]
- [Client portal exclusion if needed: "Do NOT render in src/pages/client/ or src/components/eos/client/"]

Edge functions:
- [Use existing function X — do not create a new one]
  OR
- [Create new edge function named X following the canonical pattern in supabase/functions/invite-user/index.ts]

Do not:
- [List anything Lovable must not do — AI in frontend, new tables without RLS, etc.]
```

Be explicit. Vague prompts let Lovable make decisions you didn't intend,
and those decisions land directly on main with no review gate.

**The Dave Standard — mandatory for any schema-touching change:**

Every Lovable prompt that generates a migration, modifies RLS policies,
touches FK constraints or triggers, or involves a data fix must end with
this paragraph:

> *"Please take your time and conduct a thorough deep dive covering every
> nuance of the codebase and database structures this plan touches. Identify
> all gaps, improvements, shortcomings, issues, bugs, and conflicts. Ensure
> the implementation is backward-compatible, audit-complete, and
> production-ready. Confirm it does not negatively impact any existing
> functionality, RLS policies, or FK constraints. Finish with a summary of
> changes, benefits, and a risk assessment."*

For UI-only changes with no migration, the Dave Standard is optional but
recommended for any change touching complex components.

Source: `unicorn-kb/handoffs/lovable-production-db-change.md`

**Gate:** Show Khian the full prompt. Ask him to read it carefully and confirm
every line matches the design from Step 4. Only then does it go to Lovable.

---

## Step 6 — Verify after Lovable ships

After Lovable commits, Khian should verify in Claude Code using **both**
codebase inspection and Supabase MCP live checks. The Supabase MCP is
the fastest way to confirm RLS actually landed correctly — don't rely on
reading the migration file alone.

```
"Lovable just shipped [feature name]. Please run both checks:

CODEBASE CHECKS:
1. Show me the migration it created — does it match what we designed?
2. Does the frontend gate staff-only content correctly?
3. Are there any client-facing pages that now reference [table] unexpectedly?

SUPABASE MCP CHECKS (use the local Supabase MCP wrapper):
4. Run: SELECT schemaname, tablename, rowsecurity
        FROM pg_tables WHERE tablename = '[table]';
   — confirm RLS is enabled on the live table right now
5. Run: SELECT policyname, cmd, qual, with_check
        FROM pg_policies WHERE tablename = '[table]';
   — confirm both tenant-read SELECT and staff ALL policies exist exactly
     as designed in Step 4
6. If a new column was added: SELECT column_name, data_type, is_nullable
        FROM information_schema.columns WHERE table_name = '[table]';
   — confirm the column is present with the right type and nullability
7. If this feature touches messaging or cross-tenant data: run a quick
   check that a test row inserted for tenant A is NOT visible when queried
   as tenant B's user (if you can do this safely with test data)"
```

If anything doesn't match the design from Step 4 → flag to Carl immediately
before proceeding with any further work.

**Gate:** Confirm all codebase and Supabase MCP verification checks passed.
If they didn't, stop and loop in Carl before Step 7.

---

## Step 7 — Flag KB drift to Carl

After Lovable ships and verification passes, tell Carl what changed so he
can update the KB. Khian does not update the KB himself — he flags it.

Message to send Carl (draft this for Khian):
```
"Hey Carl — Lovable just shipped [feature name]. Changes:
- New table: [name] / New column: [table.column]
- New edge function: [name] (or: reused existing [name])
- Pages affected: [list]
- codebase-state/ likely needs updating — module-status and codebase-map
  at minimum"
```

Carl reconciles `codebase-state/` and writes an audit entry if needed.
Khian's job ends at the flag.

---

## Key rules to reinforce at every step

These come from `pinned/conventions.md` and the ADR history. Remind Khian
of whichever are relevant as each step surfaces them:

- **AI logic → edge functions only.** Never in the frontend. Ever.
- **RLS three-step ritual.** Both policies + explicit ENABLE. Missing any
  one is a silent failure. (ADR-005)
- **Coercion triggers for NOT NULL + frontend writes.** Column defaults
  don't protect against explicit NULL from Lovable forms. (ADR-008)
- **Lovable pushes direct to main.** No review gate. The design step is
  the only safety net.
- **Never touch unicorn-audit/.** That's Carl's repo. Read it for context,
  never write to it.
- **Never commit to the codebase repo (unicorn-cms-f09c59e5/) from
  Claude Code.** Lovable owns that. Claude Code is forbidden from writing
  there per CLAUDE.md → Write permissions.
- **KB changes go via PR against unicorn-kb/ only.** And only when Carl
  asks Khian to make them.
- **The Dave Standard applies to all schema-touching Lovable prompts.**
  Never skip it for migrations, RLS changes, FK constraints, or data fixes.
  Source: `unicorn-kb/handoffs/lovable-production-db-change.md`
