---
name: enumtodd
description: Guided, plain-English enum-to-dd migration flow for Unicorn. Trigger when Khian says "enumtodd", "enum to dd", "enum migration", or asks to run enum migration phases.
---

# Enum to dd Migration Skill

This skill walks through enum-to-dd migrations one phase at a time.
It is designed for non-technical stakeholders first, with technical detail second.
**It never moves to the next phase without explicit user confirmation.**

---

## How this skill works

1. You start by naming an enum target (e.g. `feature_flag`, `sch_booking_status`).
2. The skill runs **Phase 0 only**, then stops and waits.
3. After each phase, it shows a **Phase Complete** summary and asks: _"Ready to move to Phase N? Say yes to continue, or ask questions first."_
4. Nothing is applied to the database until Phase 7 and only after explicit approval.

---

## Plain-English mode (default)

Every phase output must follow this order, without exception:

1. **Plain-English summary** — what is happening, in everyday language, no jargon
2. **What this means for you** — business/user/risk implications
3. **Technical evidence** — raw queries, file refs, dependency lists

If a phase produces a finding that changes the risk picture, state it plainly in bold before continuing.

---

## Phase selector (optional override)

If the user explicitly wants to jump to a specific phase:

- `phase:<N>` — run one phase only (e.g. `phase:4`)
- `phase:<A>,<B>` — run selected phases only

Default when no selector is given: **start at Phase 0 and pause after each phase.**

---

## Safety rules (mandatory, non-negotiable)

1. Never bundle enum families in one migration stream.
2. Never start with high-risk access/role families unless Carl + Dave explicitly approve.
3. Never drop the legacy enum until Phases 4 and 5 are clean and user confirms. When retiring, move to the `archive` schema first — do not `DROP TYPE` directly. Back up any column data to an `archive` table before dropping the column. The `archive` schema is excluded from Lovable's active DB scans.
4. Always include a rollback path before any implementation prompt.
5. Always complete blast-radius (Phase 4) and Dave Standard (Phase 5) before generating SQL.
6. State scope lock explicitly at Phase 0 — in scope and out of scope.
7. Preserve machine values byte-identical. This migration changes where the allowed-value list lives, not what the app stores or compares against.
8. Keep stored values and display labels separate. `value` must match the existing enum label exactly; friendly wording goes in `label` only.
9. Treat value renames as a separate high-risk migration. Any proposed rename requires a full caller audit before any SQL is planned.
10. If a codebase search is not possible in the current session, state that clearly and block Phase 7 until it is done.
11. **CRITICAL:** In Phase 1, always sample actual data from columns that store/read this enum value. Do NOT assume enum labels match stored data — compare them explicitly. Flag casing drift, inconsistencies, or data quality issues immediately. If found, these become separate migration scope (data reconciliation + normalization) and require Phase 0 restart with updated scope.

**High-risk families (require Carl + Dave sign-off before Phase 6):**
- `tenant_user_role`, `unicorn_role`, `user_type_enum`, `staff_team_type`
- All notification enums
- `tenant_type`, `billing_status`, `meeting_status`, `eos_issue_status`

---

## Phase 0: Orientation

**Goal:** Establish shared understanding before any database queries run.

**Plain-English first:** Explain in 2–3 plain sentences what this enum is, what problem it was solving, and why we are migrating it.

**Output required:**
- What this enum is and what it controls (plain English)
- Current status (from EnumToDdInventory.md — used/unused, risk label, phase assignment)
- Scope lock table:

| In scope | Out of scope |
|---|---|
| ... | ... |

- High-risk flag: if this is a high-risk family, display a bold red-flag warning and block progression past Phase 5 without named approvals.

**End of phase:** Display a progress bar and pause prompt (see template below).

---

## Phase 1: Discovery Snapshot

**Goal:** Pull live facts from the database. No assumptions — only verified evidence.

**Run these checks (in parallel where possible):**
- Exact enum values from `pg_enum`
- Table columns typed as this enum (`information_schema.columns`)
- SQL functions referencing this enum (`information_schema.routines`)
- RLS policies referencing this enum (`pg_policies`)
- Triggers referencing this enum (`information_schema.triggers`)
- Views referencing this enum (`information_schema.views`)
- `pg_depend` non-implicit dependents (anything the DB knows depends on this type)
- Whether a matching `dd_` table already exists
- Row counts for any column that stores this enum's values (data volume)
- Codebase search: run **two separate greps** across `unicorn-cms-f09c59e5/` — both in the same phase, never deferred:
  1. **Enum name grep:** grep for the enum name (e.g. `eos_participant_role`) across `**/*.{ts,tsx,sql}`. Also check for `Enums["<enum_name>"]` TypeScript references.
  2. **Value literal grep:** grep for each enum value as a standalone string literal across `**/*.{ts,tsx}` — e.g. `'Leader'`, `'Member'`, `'Observer'`. Use a targeted pattern such as `role.*'<value>'|'<value>'.*role|'<value1>' \| '<value2>'` to catch hand-written TS union types and plain string comparisons that do not mention the enum name at all. **If grep output is large or truncated in preview, read the full saved output file before declaring the search complete.** Truncated previews have caused missed findings in the past.

**CRITICAL DISCOVERY CHECKS (must not skip):**
- **Sample actual stored data:** Query any column that reads/writes this enum value (even if column is typed `text`, not the enum). Run: `SELECT DISTINCT col_name FROM table_name WHERE col_name IS NOT NULL LIMIT 20;` for each identified column. Compare actual values against enum labels — **do they match exactly or is there casing drift?**
- **Read function logic in detail:** For any function that references the column, read the WHERE clause and comparison values (not just find the function name). What value does it actually check for? Does it match the enum labels?
- **Parse RLS policies in full detail:** Don't just search for the enum name. Run `SELECT policyname, qual FROM pg_policies WHERE tablename = 'X'` and read what values each policy actually checks. **Are they checking for values that exist in the actual data?**
- **Cross-reference enum definition vs. actual data:** Create a side-by-side comparison: enum labels vs. distinct values actually in the database. Flag any mismatch, casing drift, or inconsistency.
- **Check data quality:** Are there typos, mixed casing, or unexpected values in columns that should only contain enum values? Example: enum says `ADMIN` but data has `admin`, `Admin`, `ADMINISTRATOR`.

**Plain-English first:** Summarise what was found in 2–3 sentences before showing the table.

**Output required:**
- Evidence table (each check: what was searched, what was found, row count if applicable)
- **Data quality findings:** Distinct actual values in each column + comparison to enum labels (flag mismatches in bold)
- **Function logic summary:** For each function that reads the column, state what value it checks for (e.g., "is_tenant_admin() checks for 'admin' (lowercase)" or "RLS policy checks for 'Admin' (capital A)")
- **Casing/consistency issues:** Flag any drift between enum definition and actual stored/checked values
- Risk label: `low` / `medium` / `high` — with a one-sentence plain-English reason
- Codebase search result: summarise what was found (or `nothing found`) for the enum name and each value across TypeScript, SQL, and generated types. This is done in Phase 1 — it is never deferred. Explicitly call out:
  - Generated type references (`Database["public"]["Enums"]["<name>"]`)
  - **Hand-written TS union literals** that mirror the enum values (e.g. `role: 'Leader' | 'Member' | 'Observer'`) — these do not reference the enum name and are only caught by the value literal grep
  - Plain string comparisons (e.g. `=== 'Leader'`) — note each file and line
  - Whether the full grep output was read (not just the preview)

**BLOCKER CONDITION:** If actual stored values do NOT match enum labels, or if RLS policies/functions check for values that don't exist in the data, flag this as a **data reconciliation issue** and state plainly that Phase 2 cannot proceed until this is resolved. This may indicate a data quality bug that must be fixed before any migration.

**End of phase:** Progress bar and pause prompt.

---

## Phase 2: Before/After Proposal

**Goal:** Show exactly what changes in the database model — concept only, nothing applied.

**Plain-English first:** "Right now the database stores X as a locked type. After this migration it will store X as a row in a lookup table."

**Output required:**
- Before SQL (current state)
- After SQL (proposed state — concept only, not to be applied yet)
- Side-by-side table:

| | Before | After |
|---|---|---|
| Where allowed values live | PostgreSQL enum type | `dd_` table rows |
| How new values are added | DB migration required | Insert a row |
| Stored value in columns | enum label | text matching `dd_.value` |
| Display label for users | same as stored value | `dd_.label` (can differ) |

- Value handling statement (mandatory): _"The `value` column will be seeded with `[list exact values]` byte-identical to the current enum labels."_ OR _"A value rename is being proposed — this requires a separate approved migration."_
- Options if there are multiple valid paths (e.g. drop vs convert for unused enums)

**End of phase:** Progress bar and pause prompt.

---

## Phase 3: Implications

**Goal:** Answer "if we do this, what happens?" for every audience.

**Output required (plain English throughout):**

| Audience | Impact |
|---|---|
| End users | What they see or don't see change |
| Operations / support | What workflows or admin processes change |
| Developers | What generated types, hooks, or comparisons change |
| Reporting | What queries or dashboards change |
| Rollback | How to undo this if something goes wrong |

- Call out any implication that upgrades the risk label from Phase 1.

**End of phase:** Progress bar and pause prompt.

---

## Phase 4: Blast Radius Check (mandatory safety gate)

**Goal:** Find every consumer of this enum across the entire system. Nothing may be missed.

**Plain-English first:** "Before we touch anything, we need to know everything that reads or writes this value. Here is everything we found."

**Must check:**
- DB columns, indexes, constraints, defaults
- SQL functions and stored procedures
- Triggers
- RLS policies
- Views
- Edge functions (search codebase for enum name and each value string)
- React Query hooks and components (search codebase)
- Generated Supabase TypeScript types
- RPC signatures
- Tests
- Any code doing a string comparison against enum values (e.g. `=== 'eos_qc'`)

**Output required:**
- Consumers table:

| Layer | Consumer | Risk if broken |
|---|---|---|
| DB column | ... | ... |
| Edge function | ... | ... |
| App hook | ... | ... |
| Generated type | ... | ... |

- Break-risk list: what would break and what the user/system symptom would be
- Value-rename risk finding: explicit `NONE FOUND` or `WARNING: rename risk detected at [location]`
- Codebase search status: completed / not completed / partial (list what was searched)

**If any consumer is found that was not expected from Phase 1:** upgrade the risk label, state it in bold, and ask the user whether to continue before proceeding.

**End of phase:** Progress bar and pause prompt.

---

## Phase 5: Dave Standard Check (mandatory safety gate)

**Goal:** Verify that the proposed migration meets Dave's production database safety standard.

**Plain-English first:** "This is our safety checklist before writing any migration SQL. Each item must pass before we proceed."

**Checklist (show pass / fail / n/a for each):**

| Check | Result | Notes |
|---|---|---|
| Target `dd_` table follows `dd_accounting_system` shape exactly | | |
| `value` column is `text NOT NULL UNIQUE` | | |
| `label` column is `text NOT NULL` | | |
| `sort_order`, `is_active`, `created_at` present with correct defaults | | |
| All existing enum values are present in seed data | | |
| Stored values are byte-identical to current enum labels | | |
| FK (if added) references `dd_.value`, not `dd_.id` | | |
| RLS policies on the new `dd_` table are defined | | |
| Legacy enum retained for rollback (not dropped in this migration) | | |
| Rollback plan is written and explicit | | |
| Post-deploy verification queries are defined | | |
| No breaking change to existing stored data | | |

**Output required:**
- Full checklist with results
- Any failed check is a blocker — state the blocker in bold and do not proceed to Phase 6 until resolved
- Plain-English consequence for each failed check

**End of phase:** Progress bar and pause prompt.

---

## Phase 6: Recommended Actions

**Goal:** Give a clear, prioritised recommendation for what to do next.

**Plain-English first:** "Based on everything we found, here is what we recommend and why."

**Output required:**
- Recommendation (top option first, labelled **Recommended**)
- Each option includes:
  - What it does (plain English)
  - Why it is or is not the safest choice right now
  - Any condition that must be true first
- Go/No-Go decision:

| | |
|---|---|
| **Decision** | Go / No-Go / Conditional Go |
| **Conditions** | What must be true before proceeding |
| **Blocked by** | Any open items from Phases 4–5 |
| **Approvals needed** | Named people if high-risk |

**End of phase:** Progress bar and pause prompt.

---

## Phase 7: Migration-Ready Handoff

**Goal:** Produce paste-ready prompts. Nothing is applied — these are handed to Lovable or the migration runner.

**This phase is only available when:**
- Phases 4 and 5 are complete with no open blockers
- Codebase search is confirmed complete
- User has said "go" at Phase 6

**Output required — three separate prompts:**

### Prompt A: Audit-only
Ask Lovable to audit the codebase for all references to this enum name and each value. Do not change anything. Report every file and line found.

### Prompt B: Implementation plan
Ask Lovable to produce a step-by-step implementation plan (no SQL, no code changes). Include:
- do-not-touch list (every UI element and hook that must produce identical output after migration)
- dependency notes (every consumer found in Phase 4)
- value-preservation instruction (seed `dd_.value` rows byte-identical to existing enum labels)
- rollback plan
- post-deploy verification checklist

### Prompt C: SQL generation
Ask Lovable to generate the migration SQL only. Include:
- create `dd_` table (exact `dd_accounting_system` shape)
- seed rows (values byte-identical to enum labels)
- column type change (if applicable)
- retain legacy enum (do not drop)
- safety checks: verify row counts before and after, no nulls introduced
- rollback SQL

**Each prompt must be wrapped in a code block and be self-contained — no cross-prompt dependencies.**

**End of phase:** Final status summary (see template below).

---

## Phase progress display (mandatory after every phase)

After every phase, display this block before the pause prompt:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Enum migration: [ENUM_NAME]
  ✅ Phase 0  Orientation
  ✅ Phase 1  Discovery Snapshot
  ⬜ Phase 2  Before/After Proposal
  ⬜ Phase 3  Implications
  ⬜ Phase 4  Blast Radius Check  [SAFETY GATE]
  ⬜ Phase 5  Dave Standard Check [SAFETY GATE]
  ⬜ Phase 6  Recommended Actions
  ⬜ Phase 7  Migration-Ready Handoff
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Risk label: LOW / MEDIUM / HIGH
  Codebase search: complete / not complete
  Open blockers: none / [list]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Then end with:

> **Phase [N] complete.** Ready to move to Phase [N+1]? Say **yes** to continue, or ask questions first.

For Phase 4 and Phase 5 (safety gates), use this instead:

> **Phase [N] complete — safety gate.** This is a mandatory checkpoint. Review the findings above carefully before continuing. Ready to move to Phase [N+1]? Say **yes** to continue, or ask questions first.

---

## Guardrail language (use verbatim when relevant)

- "This phase is planning-only. No migration is being applied in this step."
- "We are preserving behaviour parity. The migration changes where the allowed-value list lives, not what the app stores or compares against."
- "Legacy enum is retained for rollback safety. It will not be dropped in this migration."
- "This change is blocked until blast-radius and Dave Standard checks are complete."
- "Display labels can become friendlier, but `value` must stay byte-identical unless a separate value-rename migration is explicitly approved."
- "Codebase search has not been completed. Phase 7 is blocked until this is done."

---

## Definition of done

A phase is complete only when:
1. Plain-English summary is present and non-technical.
2. All required output for that phase is produced.
3. Evidence is sourced from live DB queries or explicit codebase search — not assumed.
4. Any finding that changes the risk label is called out in bold.
5. The progress block is shown.
6. The pause prompt is shown and the skill stops.

Phase 7 is the only phase that produces actionable prompts. All earlier phases are analysis only.
