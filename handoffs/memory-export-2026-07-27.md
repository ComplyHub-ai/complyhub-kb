# Memory Export — 2026-07-27

> Cross-machine transfer file. Brian's Claude Code memory system
> (`~/.claude/projects/-Users-khiansismundo-complyhubworkspace/memory/`) lives outside any git repo,
> so it doesn't sync between the home PC and work PC on its own. This file is a full snapshot of that
> memory directory as of 27 Jul 2026, placed in `complyhub-kb/` so it travels with a normal `git pull`.
>
> **This is a one-time transfer artifact, not a permanent record.** Regenerate/replace it whenever a
> fresh sync is needed — don't treat it as a durable reference doc like the other files in this folder.

## Import instructions (for a fresh Claude Code session on the destination machine)

1. For each `## File: <filename>` section below, take the exact content inside the fenced code block
   (including the `---` frontmatter) and write it verbatim to that filename inside your own local memory
   directory (the one described in your own system prompt/instructions this session).
2. After all files are written, update your local `MEMORY.md` index so it has one line per file, matching
   the format already used in the `MEMORY.md` section below (title link + one-line hook, under ~150 chars).
   If a local `MEMORY.md` already exists with different/additional entries, merge — don't overwrite entries
   that aren't part of this export.
3. Known gap, carried over as-is: `MEMORY.md`'s index (below) references a `user_role.md` file, but that
   file did not exist in the source memory directory at export time — only the 13 files below actually
   existed. Don't fabricate a `user_role.md` to fill the gap; just note the same dangling reference exists
   in the destination copy too, consistent with how the memory system already tolerates unresolved
   `[[name]]` links (see `feedback_living_doc_decision_tracking.md`'s own description of that convention).
4. `[[name]]` cross-references inside file bodies are preserved verbatim in this export and will resolve
   correctly once all 13 files are re-created, since they reference each other's `name:` frontmatter slugs,
   not file paths.

---

## MEMORY.md (source index, for reference — see step 2 above for how to apply this)

```markdown
# Memory Index

- [Brian's Role and Team](user_role.md) — junior dev / infra assistant; Carl=infra lead, RJ=app lead, Dave=DB, Angela=product
- [Fable Audit Prompt](project_fable_audit.md) — full-spectrum audit prompt for Fable at complyhub-kb/reference/fable-audit-prompt.md
- [Connection Test Preference](feedback_connection_tests.md) — use minimal read calls (e.g. get_project_url) to test MCP connections, not list_tables/data pulls
- [Handover Scope](feedback_handover_scope.md) — handover text = next single step/PR only, never restate the full remaining roadmap
- [PR Audit Functional Deps](feedback_pr_audit_functional_deps.md) — check runtime/build dependencies between PRs, not just file-line conflicts
- [Multi-Item Fix Completeness](feedback_multi_item_fix_completeness.md) — before shipping a multi-part fix, re-derive the original full list, don't trust conversation memory
- [CREATE OR REPLACE: Check Git History Too](feedback_create_or_replace_check_git_history_too.md) — live pg_get_functiondef can itself be stale vs git; check migration history for the function before replacing it
- [No AskUserQuestion / No Monitor](feedback_no_askuserquestion.md) — never use AskUserQuestion or Monitor tools; plain-text options, single direct status checks instead of watch loops
- [Living Doc Decision Tracking](feedback_living_doc_decision_tracking.md) — root-level .md per body of work, one-at-a-time locked decisions written into file, cichecker before commit/PR, delete after audit
- [Cichecker: Exhaustive Service-Role Check](feedback_cichecker_exhaustive_service_role_check.md) — grep ALL changed edge functions for SUPABASE_SERVICE_ROLE_KEY in one pass, never a remembered subset
- [Role Casing: Proper Case, Not Snake_case](feedback_role_casing_proper_case.md) — tenant_members.role is Proper Case today; CLAUDE.md's snake_case table is a future-migration target, not current state
- [generate-audit-pack Role Bug](project_generate_audit_pack_role_bug.md) — casing bug (lowercase vs Proper Case) + profiles.role staleness confirms 403 for every real Admin/CM, corrected 27 Jul 2026
- [Tenant Context Race in Effects](feedback_tenant_context_race_effect_deps.md) — tenant-scoped fetch effects must depend on useEffectiveRole's ready + effectiveTenantId, not just route params
- [Status Enum vs CHECK Constraint](feedback_status_enum_vs_check_constraint.md) — grep the table's CHECK constraint for the full status enum before trusting a copied allowlist; Checker missed this on PR #311 too
- [Cichecker Skill](project_cichecker_skill.md) — location/purpose of the cichecker skill at rto-compass-hub/.claude/skills/cichecker/SKILL.md, run before commit/push/PR
```

---

## File: `project_fable_audit.md`

```markdown
---
name: fable-audit-prompt
description: Location and purpose of the Fable full-platform audit prompt in the KB
metadata: 
  node_type: memory
  type: project
  originSessionId: 5dc01108-2f74-4fcc-8ceb-b274fbd3e23b
---

A comprehensive audit prompt for Fable (claude-fable-5) was created on 2 July 2026.

**File:** `complyhub-kb/reference/fable-audit-prompt.md`

**Why:** To run periodic full-spectrum audits of the ComplyHub platform covering security (RLS, Edge Functions, auth, OWASP), code quality, performance, SEO (https://rto.complyhub.ai), and KB gaps — all cross-referenced against the team's knowledge base.

**How to apply:** When Brian wants to run a platform audit, direct him to this file. Paste everything below the maintenance notes section into a fresh Fable session. Output lands in `complyhub-kb/audit/audit-[DD-MM-YYYY]-session-[N].md`.

**Key features of the prompt:**
- Loads KB (pinned/, codebase-state/, audit/) before auditing to avoid re-reporting known issues
- Labels each finding: NEW / KNOWN-OPEN / INTENTIONAL / CARL-RULE-VIOLATION / ADR-CONFLICT / KB-IMPROVE
- Session continuity: if context limit is reached, saves progress and auto-generates a continuation prompt
- 5 phases: Security → Code Quality → Performance → SEO → KB Gap
- P0 cross-tenant leakage findings surfaced immediately, not held for final output

**Last audit run:** Not yet run — prompt created 2 July 2026.
```

---

## File: `feedback_connection_tests.md`

```markdown
---
name: feedback-connection-tests
description: "When testing an MCP connection (Supabase, Vercel, etc.), use the lightest possible read call — not a data/schema-listing call."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 12c9f65a-e9ee-4f9e-8cf6-e6266643ab5f
---

When Brian asks to "test" a connection (e.g. Supabase, Vercel), use the smallest, cheapest read-only call available to confirm reachability — e.g. Supabase `get_project_url` — not something that pulls real schema or data like `list_tables`.

**Why:** Brian pushed back when Claude called `list_tables` just to verify the Supabase MCP server was connected ("why would u list all tables, just test something simple"). A connectivity check should prove the server is authenticated and reachable, not enumerate production data.

**How to apply:** For any "test the connection" / "is X connected" request against Supabase, Vercel, or similar MCP servers, default to a minimal metadata-only call first. Only escalate to broader reads (`list_tables`, `list_deployments`, etc.) if the user asks for something beyond a basic connectivity check.
```

---

## File: `feedback_handover_scope.md`

```markdown
---
name: feedback-handover-scope
description: "Handover text must cover only the next single step/PR, not the full remaining roadmap"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 44ba1363-2be5-4375-8cca-ab1bae04c032
---

When giving a handover text block (see the general handover-prompt practice) during multi-PR work like the rto-compass-hub PR cleanup, scope it to ONE step or ONE PR (or however many PRs make up the *next* discrete unit of work) — never restate the entire remaining queue/roadmap.

**Why:** Brian explicitly corrected this — the full plan already lives in the tracking doc (`pr-review-open-prs.md`); repeating it in every handover is noise he has to read past each time, and defeats the point of a lightweight handover.

**How to apply:** A handover should say: what was just done, what the single next action is (name the PR(s) involved in just that step), and where the full plan/doc lives if more context is needed. Do not list "then #X, then #Y, then #Z..." for everything still pending — that belongs only in the tracking doc, not the handover.
```

---

## File: `feedback_pr_audit_functional_deps.md`

```markdown
---
name: feedback-pr-audit-functional-deps
description: "PR cross-referencing must check functional/runtime dependencies between PRs, not just file-line conflicts"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 44ba1363-2be5-4375-8cca-ab1bae04c032
---

When auditing multiple open PRs against each other (see [[project_pr_review_open_prs]]), checking for git merge-tree conflicts and file overlap is NOT enough. A PR can dry-run merge perfectly clean and still be unmergeable/broken on its own because it depends on something (a hook, a type, a helper, a migration, an edge function) that only exists in a *different* open PR, not yet on `main`.

**Why:** Brian caught this directly — #165 was rated "clean, no real overlap with #166 (just a trivial adjacent-import conflict)" but actually could not be merged/build without a fix that only existed in #166. The original audit treated file-overlap as the only signal of cross-PR relationship and missed the functional dependency.

**How to apply:** For every PR in a batch review, beyond `git merge-tree` diffing:
1. Check whether the PR's diff *references* anything (imports, hook calls, RPC/edge function names, types) that doesn't already exist on `main` and isn't added within that same PR's diff — if so, check every other open PR to see if it's the source.
2. When two PRs touch the same feature area (e.g. same module/page), don't stop at "do they conflict on the same lines" — ask "would PR A actually build/run correctly on `main` alone, without PR B."
3. Where feasible, actually attempt a build/typecheck of the dry-run-merged result rather than trusting a clean text merge as proof of mergeability.
```

---

## File: `feedback_multi_item_fix_completeness.md`

```markdown
---
name: feedback-multi-item-fix-completeness
description: "Always re-check a multi-part fix against the original full list of affected items before applying/shipping, not a mental list built partway through the conversation"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 41caf249-3ab1-4ae6-a63a-d9dab9d674de
---

When a diagnosis identifies N broken items (e.g. N functions/files all referencing the same bad reference), and the conversation then spends most of its time deep-diving a subset of them (because that subset raised a harder decision), do not let that subset become the de facto "fix list." Before writing/applying the actual fix, re-grep or re-list against the *original* full finding — do not rely on memory of "the ones we've been discussing."

**Why:** On the ComplyHub `email_domain_rules` cleanup (10 July 2026), 5 functions were correctly identified as referencing a dropped table. Discussion focused on 3 of them (a harder call: retire vs rebuild a feature) plus a 4th got folded in. The 5th — `find_tenant_by_email_domain`, the original function that started the whole investigation — had already been explained earlier and was mistakenly treated as "already handled." It was left out of the migration, which was then applied to production, still leaving the original reported bug unfixed. Caught only because the user asked for a post-fix verification grep.

**How to apply:** For any fix spanning multiple items (files, functions, PRs, findings), before marking it complete:
1. Re-derive the original full list (grep/list again — don't trust notes from earlier in the conversation).
2. Diff it against what the actual fix/migration touches.
3. Only after they match, apply/ship, then verify directly against the live system (not just "the diff looks right") — e.g. re-query the DB for any remaining bad references after applying a migration, as was done successfully once this was caught.

This applies especially in long conversations where the main gathered context has been summarized/compacted — a stale mental list is easy to trust when the full derivation is not re-run.
```

---

## File: `feedback_create_or_replace_check_git_history_too.md`

```markdown
---
name: feedback-create-or-replace-check-git-history-too
description: "Before any CREATE OR REPLACE FUNCTION on a live Supabase function, check git migration history for that function name in addition to fetching the live pg_get_functiondef — the live DB can itself be behind what's merged in git."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 363be5c4-e1b1-48f6-90c4-458948d10958
  modified: 2026-07-21T04:21:39.834Z
---

When replacing a Postgres function (`CREATE OR REPLACE FUNCTION ...`) in rto-compass-hub, `rto-compass-hub/CLAUDE.md` requires reading the *live* function definition first and preserving every guard it has. That rule is necessary but not sufficient — it only protects against the AI dropping something itself. It does not protect against the live database already being behind what's sitting merged in git (a `supabase/migrations/` file merged to `main` but never actually applied to production).

**What happened (21 Jul 2026, PR #279, `rpc_tas_create_draft`):** fetched the live function via `pg_get_functiondef`, copied it faithfully into a new migration per the CLAUDE.md rule, and shipped a fix. Cursor Bugbot + Vercel's bot both flagged that the replacement "dropped" a tenant_scope_items upsert path. Investigation showed the live database itself had been missing that logic since a July 16 migration (`20260716090000`) was merged to `main` but never deployed — confirmed by a version gap in `supabase_migrations.schema_migrations` (jumped straight past that version). The bots caught this because they diff against git history, not the live DB, so they saw exactly what a live-only check structurally can't: git said the function should look one way, and the live copy — which I trusted as ground truth — didn't match.

**Why:** `pg_get_functiondef` tells you what's *true right now*, not what's *supposed to be true per the merged history*. A single live-state fetch is a snapshot with no way to detect that the snapshot itself is stale relative to git.

**How to apply:** before writing any `CREATE OR REPLACE FUNCTION` migration for an existing function, in addition to fetching the live definition, run `git log --oneline -- 'supabase/migrations/*<function_name>*'` (or grep migration filenames/content for the function name) to see its recent history in git. If a migration touching that function was merged more recently than what the live version reflects, treat it as a red flag — check `list_migrations` / `schema_migrations` for a version gap before treating the live fetch as ground truth. This is a cheap, fast check worth doing by default whenever a `CREATE OR REPLACE` targets a function with recent git history, not just when something goes wrong.

See also [[feedback_pr_audit_functional_deps]] — same underlying theme of checking dependencies/history beyond the immediate diff before trusting a single point-in-time read.
```

---

## File: `feedback_no_askuserquestion.md`

```markdown
---
name: feedback-no-askuserquestion
description: Never use the AskUserQuestion, Monitor, or ScheduleWakeup tools with this user — present options as plain text, and check status manually instead of long-running watch loops or self-scheduled wakeups
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 8a54b806-3fb2-4bcf-9c0a-0422ab71d49a
  modified: 2026-07-24T00:50:23.228Z
---

Never use the AskUserQuestion tool. Present choices/options as plain text in the response instead and
let the user reply normally.

Never use the Monitor tool (or similar long-running background-watch constructs) either. When waiting
on something like CI checks, either check status once with a direct command (e.g. `gh pr checks`) and
report it, or wait for the user to ask again — don't spin up a persistent watcher that fires background
notifications.

Never use ScheduleWakeup either — same category as Monitor: a self-triggered future wakeup to re-check
something (CI, a deploy, a long-running job) without the user asking for it. If a task needs a follow-up
check, wait for the user to prompt it, or do a single direct check now and report — don't schedule the AI
to wake itself up later.

**Why:** Brian explicitly said "I explicitly said to always remember NOT TO DO askuserquestions" (22 Jul
2026) — a repeated, firm instruction, not a one-off preference. On 23 Jul 2026 he extended this
explicitly to Monitor too: "things like monitor or askuserquestions shouldnt be done by AI" — framed as
a general category (AI shouldn't use tools that interrupt/notify autonomously on the user's behalf), not
specific to one tool. On 24 Jul 2026 he extended it again explicitly to ScheduleWakeup. Treat any similar
future tool in this same category (autonomous interactive prompts, autonomous background notification
loops, self-scheduled future wakeups) with the same default-off posture unless the user asks for it
directly.

**How to apply:** Any time a decision point comes up that would normally warrant AskUserQuestion (e.g.
choosing between remediation paths, confirming scope), lay out the options as numbered/bulleted plain
text and ask the user to pick. Any time you'd normally reach for Monitor or ScheduleWakeup to watch or
revisit something async (CI runs, deploys, long-running jobs), do a single direct check instead and
report the result — re-check only when asked, or via a normal foreground wait the user has explicitly
requested. Never schedule a future self-wakeup as a substitute for the user prompting again.

**Recurrence (24 Jul 2026):** violated this during the PR #310 CI-fix session — used Monitor to watch PR
checks after a push, producing a stream of background notifications the user never asked for. Caught only
because the user hadn't objected yet, not because the rule was checked first. Root cause: this memory
wasn't consulted before reaching for Monitor in the moment. Reinforcing here — check this memory
proactively before using Monitor, ScheduleWakeup, or AskUserQuestion, don't rely on remembering the rule
unprompted.
```

---

## File: `feedback_living_doc_decision_tracking.md`

```markdown
---
name: feedback-living-doc-decision-tracking
description: "Preferred workflow for any multi-item, multi-session body of work — root-level living .md file, one-at-a-time locked decisions, disposable lifecycle, cichecker before commit/push/PR"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 23130ed2-a290-402c-b00b-0b0be7fec09e
  modified: 2026-07-23T02:02:55.413Z
---

Brian's preferred workflow for any multi-item, multi-session body of work — not just bug tracking. This applies to bug investigations, feature planning, migration/audit work, or any task with several discrete open items that need deciding over more than one sitting.

**The pattern:**
1. Create a single living `.md` file **in the workspace root** (`/Users/khiansismundo/complyhubworkspace/`, not inside `rto-compass-hub/` or `complyhub-kb/`) as the one source of truth for the whole body of work.
2. Work through open items **one at a time** — investigate/diagnose, discuss, reach a decision, then move to the next. Don't dump a big batch task list at once.
3. Every locked decision gets **written into the file itself** — reasoning, evidence, and the concrete fix/implementation plan — not just stated in chat. Brian's own words: "when I mean lock it in I meant put in @<file>.md what decision we will do for each issue."
4. Once every item is locked, a **brand-new chat with no prior context** should be able to read the file cold and go straight to implementation. This is the actual point of the pattern — it removes dependence on any single conversation's context window.
5. Once implementation lands and is done (merged, deployed, or otherwise complete), Brian will separately ask for an audit file to be created, and the working `.md` file gets **deleted** — it's disposable/session-scoped by design, not a permanent record. Don't treat it as something to preserve indefinitely, and don't reference it by name in durable docs (like CLAUDE.md) since it won't exist for long.

**Stale/contradictory content rule:** while reading or working in such a living doc, if a section is found to be stale or contradicts a later locked decision (e.g. leftover text from before a correction), flag it to Brian explicitly and ask permission before editing/removing it. Never silently clean it up unprompted — even though the file is disposable, edits to it still go through the normal edit-approval gate.

**Implementation handoff step — `/cichecker`:** once a fresh chat implements the locked decisions on a branch, before commit/push/PR, run the `cichecker` skill (`rto-compass-hub/.claude/skills/cichecker/SKILL.md`) — it cross-references the files touched on the branch against every check the real CI workflow runs (lint, type-check, `.single()` guard, migration guards, security guards, config/edge coverage) and confirms the branch is up to date with `main`, all read-only. Only proceed to the existing commit/push/PR gates (see [[user_role]] and the hard gates in `complyhubworkspace/CLAUDE.md`) once cichecker reports clean.

**Why:** keeps decisions durable independent of context/session resets, removes the pressure to hold an entire investigation "in memory" during a long back-and-forth, and gives Brian a clean point to hand off to a fresh session for implementation.

**How to apply:** whenever a task has multiple distinct open items that need deciding and Brian is working through them iteratively (not a single quick fix), proactively suggest or default to this pattern — root-level file, one-at-a-time decisions, decisions written into the file, cichecker before the commit/push/PR gate, delete-after-audit lifecycle.
```

---

## File: `feedback_cichecker_exhaustive_service_role_check.md`

```markdown
---
name: feedback-cichecker-exhaustive-service-role-check
description: "cichecker's service-role-key security check must scan every changed edge function file in one grep pass, never a manually-recalled subset"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 67b8eb46-7fd2-4721-bf9a-f02ed9b2a0aa
  modified: 2026-07-24T00:47:21.421Z
---

When running cichecker's Step 5.2 (exposed service-role key check), build the full list of changed
`supabase/functions/**` files first, then grep `SUPABASE_SERVICE_ROLE_KEY` against that *entire* list in
one pass — never substitute a subset recalled from memory of "which functions I added new service-role
code to this session."

**Why:** on PR #310 (24 Jul 2026, cross-tenant leak fix), `ci-overdue-check/index.ts` was in the branch's
changed-file set because a `isScheduledInvocation` auth gate was added in front of its *pre-existing*
service-role client — the service-role usage itself wasn't new. When manually re-running the security
check, only the 3 files with genuinely new service-role code were grepped (`clause-matcher`,
`generate-meeting-pack`, `tenant-documents-list`), and `ci-overdue-check` was skipped because it "wasn't
one I added service-role code to." CI's actual `security-guards` job doesn't reason about *why* a file
changed — it mechanically greps every changed file — so it failed on `ci-overdue-check` after the PR was
already pushed, a gap that should have been caught locally first.

**How to apply:** the correct check is always:
```bash
CHANGED_FN=$(git diff "$BASE"...HEAD --name-only --diff-filter=ACMR -- 'supabase/functions/**')
ALLOWED=$(grep -o 'ALLOWED="[^"]*"' .github/workflows/ci.yml | sed 's/ALLOWED="//;s/"$//')
grep -Hn "SUPABASE_SERVICE_ROLE_KEY" $CHANGED_FN 2>/dev/null | grep -v "README" | grep -vE "$ALLOWED"
```
Run this exact command against the full `$CHANGED_FN` list — don't hand-pick which files to check.
This has been folded into `rto-compass-hub/.claude/skills/cichecker/SKILL.md` Step 5.2 directly, so
following the skill's literal instructions (not an ad-hoc approximation of them) closes this gap.

See also [[feedback_role_casing_proper_case]] — found via the same PR's CI failure investigation.
```

---

## File: `feedback_role_casing_proper_case.md`

```markdown
---
name: feedback-role-casing-proper-case
description: "rto-compass-hub currently stores tenant_members.role as Proper Case strings, not the snake_case shown in CLAUDE.md's future-enum-migration table — always verify against src/lib/constants/roles.ts before hardcoding"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 67b8eb46-7fd2-4721-bf9a-f02ed9b2a0aa
  modified: 2026-07-24T00:47:33.788Z
---

`rto-compass-hub/CLAUDE.md`'s "Roles and permissions" section has a role-values table explicitly labeled
"as they will exist post-migration" (snake_case: `administrator`, `compliance_manager`, etc.) — but the
role enum migration has NOT landed yet. **Today, `tenant_members.role` / `tenant_members.roles[]` hold
Proper Case strings** (`'Administrator'`, `'Compliance Manager'`, `'Governing Person'`, etc.) — confirmed
against `src/lib/constants/roles.ts`'s `ROLES.*` values and `supabase/functions/_shared/roleGates.ts`'s
own header comment ("Role strings are Proper Case to match the values stored in
public.tenant_members.role").

**Why this matters:** on PR #310 (24 Jul 2026), a new edge-function role gate for `tas-export-pdf` was
written comparing `membership.role` against `['administrator', 'compliance_manager']` (lowercase) — Vercel's
bot flagged it, since it would 403 every real Administrator/Compliance Manager. The mistake came directly
from reading CLAUDE.md's role table too literally without cross-checking `roles.ts`/`roleGates.ts` for
the *actual current* stored casing.

**Worse: the file this gate was modelled on (`generate-audit-pack/index.ts`) has the same bug already
live** — it checks `profile.role` against lowercase `'administrator'/'compliance_manager'`, guaranteeing
a mismatch since `profiles.role` is stored Proper Case (confirmed live: 183 real users hold values like
`'Administrator'`, contradicting an earlier, now-corrected claim that this field is platform-level only
— see [[project_generate_audit_pack_role_bug]] for the full corrected diagnosis, including a separate
staleness issue with this same field). Not yet fixed (outside the diff of the PR that found it).

**How to apply:** before writing ANY role-name comparison in a new edge function or migration, check
`src/lib/constants/roles.ts` for the actual `ROLES.*` value — never infer casing from CLAUDE.md's
canonical-values table alone, since that table describes a future state. `CLAUDE.md` and the cichecker
skill were both updated 24 Jul 2026 with an explicit ❌/✅ example covering this.
```

---

## File: `project_generate_audit_pack_role_bug.md`

```markdown
---
name: project-generate-audit-pack-role-bug
description: "generate-audit-pack + generate-board-report 403 every real Administrator/Compliance Manager — confirmed casing bug (lowercase vs Proper Case) plus profiles.role staleness, corrected 27 Jul 2026"
metadata: 
  type: project
  originSessionId: 67b8eb46-7fd2-4721-bf9a-f02ed9b2a0aa
  modified: 2026-07-27T00:00:00.000Z
---

`supabase/functions/generate-audit-pack/index.ts` (~line 43) and `generate-board-report/index.ts`
(~line 36) both gate access with:
```ts
if (!['administrator', 'compliance_manager'].includes(profile.role || '')) throw new Error('Insufficient permissions');
```

**Corrected 27 Jul 2026 — an earlier version of this memory claimed `profile.role` (from the `profiles`
table) is platform-level only, always `'super_admin'` or `NULL`. That claim was wrong and has been
disproven by a live query** — see [[feedback_role_casing_proper_case]] and the full corrected diagnosis
in `bug3-stale-tenant-id.md` Decision 5 (a session-scoped living doc, may be deleted after its
implementation session — this memory should stand on its own).

**What's actually true, verified against live data:**
1. `profiles.role` commonly DOES hold real tenant-role strings in Proper Case (`'Administrator'`,
   `'Compliance Manager'`, `'Trainer/Assessor'`, `'Governing Person'`, `'Student Support Officer'`) for
   183+ real users — written by self-service signup, not just `'super_admin'`/`NULL`.
2. The two functions' actual bug is a **casing mismatch**: they compare against lowercase snake_case
   (`'administrator'`, `'compliance_manager'`), but the field is stored Proper Case. A case-sensitive
   `.includes()` never matches, so both functions 403 every real Administrator/Compliance Manager,
   confirmed, not theoretical.
3. **Separately**, `profiles.role` is also a stale snapshot — set once at signup, never kept in sync
   with `tenant_members.role` afterward (`accept_tenant_invitation` confirmed not to touch it). A live
   query found 27 real users today with `profiles.role` genuinely diverged from their active tenant's
   true current role. So even a casing-only fix on this same field would leave those users with a wrong
   verdict.

**Verified correct fix (already implemented once in this codebase):**
`supabase/functions/tas-export-pdf/index.ts:78-94` — bypass when `profile.role === 'super_admin'` (that
value is reliable), else query `tenant_members.role` fresh for the caller's tenant (`status='active'`)
against Proper Case `['Administrator', 'Compliance Manager']`. This resolves both the casing bug and the
staleness bug at once, since `tenant_members` is the live source of truth.

**How to apply:** flag to Brian as a fix candidate. Not yet implemented as of 27 Jul 2026 — tracked
alongside a broader stale-`tenant_id` sweep in branch `fix/cross-tenant-batch-2` (same files also read
stale `profile.tenant_id`, fixed in the same pass). When implementing, use the `tas-export-pdf` pattern
as the template, not a same-field casing patch.
```

---

## File: `feedback_tenant_context_race_effect_deps.md`

```markdown
---
name: feedback-tenant-context-race-effect-deps
description: "any useEffect that fetches tenant-scoped data must depend on tenant-context readiness (useEffectiveRole's ready + effectiveTenantId), not just route params, or it races the context resolving on first mount"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 67b8eb46-7fd2-4721-bf9a-f02ed9b2a0aa
  modified: 2026-07-24T00:47:55.456Z
---

A `useEffect` that fetches a tenant-scoped record and is keyed only on a route param (e.g. `[id]`) will
often fire on first mount *before* `useEffectiveRole()`/`useAppContext()` has resolved — `ready` is still
`false` and `effectiveTenantId` is still `null` at that point. If the fetch adds an
`.eq('tenant_id', effectiveTenantId)` filter (as defence-in-depth tenant-scoping patches do), the query
runs with a null tenant_id, returns zero rows, and a perfectly valid record gets treated as "not found" —
often triggering a redirect-away before the tenant context ever gets the chance to resolve and retry.

**Why:** confirmed real bug on PR #310 (24 Jul 2026, cross-tenant leak fix), `EditCAA.tsx` — flagged by
Cursor Bugbot. The effect had always been keyed on `[id]` alone; adding the tenant_id filter (closing the
cross-tenant leak) was correct, but exposed this pre-existing race for the first time, since previously
the query had no tenant dependency to race against.

**How to apply:** any effect fetching tenant-scoped data should depend on both readiness and the tenant id
itself, and should short-circuit (stop loading, don't redirect) rather than fetch while not ready:
```ts
const { ready, effectiveTenantId } = useEffectiveRole();
useEffect(() => {
  if (!id || !ready) return;
  if (!effectiveTenantId) { setLoading(false); return; }
  fetchRecord();
}, [id, ready, effectiveTenantId]);
```
This pattern (plus the ❌/✅ example) was added to `rto-compass-hub/CLAUDE.md`'s frontend hard-rules
section on 24 Jul 2026 — check there first, this may already be documented in more detail.
```

---

## File: `feedback_status_enum_vs_check_constraint.md`

```markdown
---
name: feedback-status-enum-vs-check-constraint
description: "When writing or reviewing a status-string allowlist/branch, grep the table's CHECK constraint for the full enum before trusting a copied subset"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1e62b449-4100-4bb8-844c-6659577d8b41
  modified: 2026-07-24T02:52:38.640Z
---

When code branches on a status string (e.g. `['submitted', 'committed'].includes(report.status)`),
verify that literal array against the table's actual `CHECK` constraint (or enum type) in
`supabase/migrations/00000000000000_baseline.sql` — grep `<table>_status_check` — before treating the
list as exhaustive. Don't assume an existing literal array in the code already covers every valid value.

**Why this was needed:** on PR #311 (`fix/monthly-reports-trainer-lock`, 24 Jul 2026), a fix to
`src/hooks/governance/reportMonitoringUtils.ts`'s `computeDisplayStatus` replaced a lock_deadline-based
fallback with an unconditional `return 'Overdue'` for anything not in `['submitted', 'committed']`. The
real status enum per `trainer_monthly_reports_status_check` is
`draft | submitted | reviewed | approved | committed` — so `reviewed`/`approved` reports (further along
than submitted, not less) were miscounted as Overdue on the Compliance Manager dashboard. Both Cursor
Bugbot and the Vercel bot caught it; I (Sonnet) had carried forward the original code's narrow
`['submitted', 'committed']` check without checking it against the schema, and a separate Checker
(pr-reviewer/Sentinel) pass earlier in the same PR reviewed this exact function (its Finding 2) but also
didn't cross-check the literal array against the real enum — it verified the *shape* of the fix (removing
the `lock_deadline` dependency) without verifying the *values* inside the new conditional.

**How to apply:** any time a fix touches a `status`/enum-like string comparison against a Supabase table
column — whether writing it directly or reviewing it as Checker/Sentinel — grep the table's CHECK
constraint or generated TS enum type first, and explicitly confirm every one of its values is correctly
classified by the new code, not just the values already exercised by tests or the original code. Fold this
into the Checker dispatch prompt whenever a diff includes a status-based conditional: "list every value in
the column's CHECK constraint and confirm each one hits the intended branch."

Related: [[feedback_role_casing_proper_case]] (a similar class of bug — code assuming a narrower/different
value set than what's actually live).
```

---

## File: `project_cichecker_skill.md`

```markdown
---
name: cichecker-skill
description: Location and purpose of the cichecker skill run before commit/push/PR on rto-compass-hub branches
metadata:
  type: project
---

The `cichecker` skill lives at `rto-compass-hub/.claude/skills/cichecker/SKILL.md`.

**Why:** Cross-references every file changed on a branch against every check the real CI workflow (`.github/workflows/ci.yml`) runs — lint, type-check, `.single()` guard, migration guards, exhaustive service-role-key security check (see [[feedback_cichecker_exhaustive_service_role_check]]), role-casing checks (see [[feedback_role_casing_proper_case]]) — and confirms the branch is up to date with `main`, merging `origin/main` in automatically if behind and the tree is clean. Entirely read-only — no code edits, no commits, no pushes.

**How to apply:** Run via the Skill tool (`cichecker`) right before the commit/push/PR hard gates, on any `rto-compass-hub` branch about to ship. Mandatory step in the living-doc workflow (see [[feedback_living_doc_decision_tracking]]) and standard practice for any PR, not just multi-item bodies of work.
```
