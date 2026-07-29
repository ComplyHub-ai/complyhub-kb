---
name: complyhub-bug-fix
description: >
  Guides Khian (Brian) through the safe ComplyHub bug-fixing flow —
  one step at a time — to diagnose issues, check blast radius, verify
  database and security state, and deliver a branch + PR ready to ship.
  Trigger when Khian mentions a bug, says "fix this bug", "there's a problem", or
  asks how to start fixing something in ComplyHub. This skill is
  step-by-step and gates each stage before moving on.
---

# ComplyHub Bug Fix — Step-by-Step Guide for Khian

This skill walks Khian through diagnosing and fixing a bug safely on ComplyHub.
It is gated — each step must be confirmed complete before the next begins.
Never skip steps. Never combine steps.

ComplyHub is a multi-tenant SaaS platform for Australian RTOs. Data isolation,
billing gates, and role-based access are P0 concerns. The live database is always
the source of truth.

---

## The 9-Step Flow

```
1. Understand the bug
2. Check known decisions — is this a bug or by design?
3. Diagnose the issue
4. Blast radius check
5. DB & security safety checks
6. Write the fix plan in plain English
7. Apply the fix on a branch
8. Commit, push, and open a PR
9. Cross-check fix on Vivacity Testing Tenant
```

---

## How to run this skill

When this skill is triggered, ask Khian for the bug description first.
Then walk through each step below — one at a time. At the end of each step,
explicitly ask: "Done? Ready for Step N+1?" and wait for confirmation before
continuing.

Do not present all steps at once. Surface one step, help him complete it,
then move on.

---

## Step 1 — Understand the bug

Ask Khian to describe the bug in his own words. If Angela, Carl, or RJ reported
it, ask for the exact wording. Include any error messages or screenshots.

Extract and confirm:
- What is the expected behaviour?
- What is the actual behaviour?
- When does it occur? (specific page, route, or user action)
- Which user role sees it? (SuperAdmin, Tenant Administrator, Trainer, Consultant,
  Platform Operations — or all roles?)
- Which tenant type? (single RTO, multi-campus, consultant with multiple clients?)
- Is data being corrupted, or is this a display or access issue?
- Is there a browser console error? Any Supabase Edge Function logs?
- Has the bug appeared since a recent code change? Which branch?

Do not move to Step 2 until these are clear.

**Gate:** Summarise your understanding back to Khian in 2–3 sentences.
Ask him to confirm it is right before proceeding.

---

## Step 2 — Check known decisions (is this a bug or by design?)

**What we're doing:** Before diagnosing a fix, confirm the behaviour is actually
a bug and not an intentional product decision. This saves time and prevents us
from "fixing" something that is working as designed.

Check each of the following against the reported behaviour:

| Decision | Check |
|---|---|
| **PD-001 — AU RTOs only** | Is this AU-specific terminology, DD/MM/YYYY dates, or an ASQA/TGA reference? If so, it is intentional. |
| **PD-002 — Multi-tenant isolation (P0)** | Could this be data leaking between tenants? If yes, escalate immediately to RJ — do not attempt to fix autonomously. |
| **PD-003 — Role hierarchy** | Does the feature work for SuperAdmin but not Tenant/Trainer/Consultant? Test from each role before concluding it is broken. |
| **PD-004 — AI response variation** | Is the issue that the AI returns different text each time? That is normal. Only file a bug for crashes, empty responses, timeouts, or consistently wrong/harmful output. |
| **PD-005 — TGA data accuracy** | Does the data mismatch look like a TGA record discrepancy? Verify on training.gov.au before filing a bug. |
| **PD-006 — Billing gate** | Is the feature blocked for an account with an expired subscription? That is the billing gate working correctly. Only file a bug if an active subscriber is incorrectly blocked. |

Also check the open audit clusters in `AUDIT-REPORT.md` — if the bug is already
listed in Clusters 1–6, note which cluster it belongs to. That may affect who
owns the fix and whether it is already scheduled.

**Gate:** Confirm with Khian that the behaviour is a genuine bug, not a known
product decision. If it matches a known decision, close the investigation here
and explain why.

---

## Step 3 — Diagnose the issue

**What we're doing:** Finding where in the code or database the bug is actually
happening. We check the code files AND the live database state, because sometimes
they tell different stories.

**CODEBASE DIAGNOSIS:**

1. Which route shows the bug? Find the route in `src/AppRoutes.tsx` and trace
   back to the page component.
2. Which guard wraps that route? (TenantGuard, AdminRoute, SuperAdminGuard, etc.)
   Could the bug be a guard misbehaving rather than the page itself?
3. Where does that page get its data? (Supabase query, Edge Function call via
   `src/lib/callEdge.ts`, direct hook)
4. If an Edge Function is involved, find it in `supabase/functions/` — check
   whether auth is properly gated before any data access.
5. If Storage is involved, confirm the operation goes through the correct gateway
   (`src/lib/documentFiles.ts` for `documents` bucket,
   `src/lib/storage/trainerEvidenceDownload.ts` for `trainer-evidence` bucket).
   Never use direct `supabase.storage.from()` calls in frontend code — that is a
   known failure pattern.
6. Are there any recent commits to the affected files? (`git log -- [file]`)

**LIVE DATABASE STATE (Supabase MCP — read-only):**

7. Check the affected table structure:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = '[table]'
   ORDER BY ordinal_position;
   ```

8. Count affected rows:
   ```sql
   SELECT COUNT(*) FROM [table];
   ```

9. Sample buggy data if applicable:
   ```sql
   SELECT * FROM [table] LIMIT 5;
   ```

10. Check RLS policies on the affected table:
    ```sql
    SELECT policyname, cmd, qual, with_check FROM pg_policies
    WHERE tablename = '[table]';
    ```
    — Missing or misconfigured RLS is the most common cause of data access bugs
      on this platform.

11. Check tenant isolation — confirm the query is scoped by `tenant_id`:
    ```sql
    SELECT policyname, qual FROM pg_policies
    WHERE tablename = '[table]' AND qual LIKE '%tenant_id%';
    ```
    — If no policy scopes by `tenant_id`, this is a P0 isolation gap.
      Flag immediately to RJ.

**ROOT CAUSE HYPOTHESIS:**

Now identify where the bug originates:
- Frontend: wrong guard, missing TenantGuard, component rendering wrong state?
- Query: wrong table name, missing `.eq('tenant_id', ...)`, `.single()` on a
  multi-row result (known failure — use `.maybeSingle()` instead)?
- Edge Function: auth not gated before data access, `tenant_id` taken from
  request body without membership check?
- RLS: policy missing, wrong `qual`, or `is_superadmin()` vs `sec.is_super_admin()`
  function name mismatch?
- Credentials: hardcoded URL or key instead of `import.meta.env.VITE_SUPABASE_URL`
  / `import.meta.env.VITE_SUPABASE_ANON_KEY`?
- Storage: direct `supabase.storage.from()` call instead of gateway function?

**Gate:** Root cause must be clear. If it is unclear, run a second pass or check
Edge Function logs via Supabase MCP. Do not proceed to Step 4 until the root
cause is identified.

---

## Step 4 — Blast radius check

**What we're doing:** Before we fix the bug, we need to understand what else might
break if we change it. On a multi-tenant platform, a change that seems isolated
can affect every tenant silently.

Ask these questions:
- Does the bug appear on one page or many routes?
- Does anything else depend on the current (buggy) behaviour?
- Will fixing this change what data is shown — for all tenants or just one?
- Are there stat cards, counters, or summary numbers elsewhere that read from
  the same table?
- Are there realtime subscriptions that listen to this table?
- Does the fix touch an RLS policy? If so, it affects every row in that table
  for every tenant.
- Does the fix touch an Edge Function? Could changing auth logic break other
  callers of that function?
- Does the fix involve `cancel-subscription`, `change-plan`, or any billing
  function? Flag to Carl — billing bugs need extra care.
- Is the affected route one of the routes currently missing TenantGuard
  (documented in Cluster 4 of `AUDIT-REPORT.md`)? If so, the fix needs to
  coordinate with the TenantGuard sweep.
- Does the fix require a DB migration? If yes, identify whether the migration
  adds columns referenced by `seed.sql` — seed failures block all branch DBs.

List every place that could be affected. Flag anything that looks risky.

**Gate:** Present the blast radius to Khian. Ask him to review. If the blast
radius touches RLS, billing, or multi-tenant isolation, suggest looping in
Carl or RJ before proceeding.

---

## Step 5 — DB & security safety checks

**What we're doing:** Making sure the fix does not introduce a new security or
data integrity problem while solving the original bug.

Run these checks using the Supabase MCP (read-only):

**DB SAFETY CHECKS:**

1. Full table description:
   ```sql
   \d [table]
   ```

2. Constraints:
   ```sql
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = '[table]';
   ```

3. RLS policies — both SELECT and write:
   ```sql
   SELECT policyname, cmd, qual, with_check FROM pg_policies
   WHERE tablename = '[table]';
   ```

4. Triggers:
   ```sql
   SELECT trigger_name, event_object_table, action_statement
   FROM information_schema.triggers
   WHERE event_object_table = '[table]';
   ```

5. Sample the affected rows — how many are in the broken state?

6. Will old data still work after the fix? (backward compatibility)

**COMPLYHUB SECURITY CHECKLIST:**

Go through each item for this specific fix:

- [ ] Does the fix add or change an RLS policy? If yes — confirm it scopes by
      `tenant_id` and has both SELECT and write variants where needed.
- [ ] Does the fix touch an Edge Function? If yes — confirm auth is gated with
      a real JWT check before any data access, not just an optional header read.
- [ ] Does the fix pass `tenant_id` from a request body into a billing or
      admin function? If yes — confirm the authenticated `user.id` is verified
      as an Administrator of that `tenant_id` in `tenant_members`.
- [ ] Does the fix use JWT decoding? If yes — use `supabaseClient.auth.getUser()`
      not `atob(token.split('.')[1])`. Signature is never verified with `atob`.
- [ ] Does the fix use a hardcoded Supabase URL or anon key? If yes — replace
      with `import.meta.env.VITE_SUPABASE_URL` / `import.meta.env.VITE_SUPABASE_ANON_KEY`.
      Hardcoded credentials are Cluster 1 of the audit and are blocked.
- [ ] Does the fix call `.single()` on a query that could return multiple rows?
      If yes — use `.maybeSingle()` or `.limit(1)` instead.
- [ ] Does the fix add a new Storage call from the browser? If yes — route through
      the correct Edge Function gateway instead. Direct Storage calls are unreliable.
- [ ] Does the fix log user role, permissions, or session data to `console.log`
      without a `if (import.meta.env.DEV)` guard? If yes — add the guard.

**SUMMARY — Answer these:**
- Is the fix backward-compatible?
- Does it break any constraint?
- Does it touch or risk breaking any trigger?
- Could it cause data to leak between tenants?
- Does it introduce any of the patterns explicitly flagged as forbidden in the
  conventions (`pinned/conventions.md`) or the audit clusters?

**Gate:** All safety checks must pass. If any fails, stop and loop in Carl
(infrastructure/DB) or RJ (frontend/auth) before proceeding.

---

## Step 6 — Write the fix plan in plain English

**What we're doing:** Before touching any file, write out exactly what will change
and why. Khian must approve this plan before any edits are made.

**Structure the plan as:**

```
Branch name: fix/[short-description]  (e.g. fix/survey-public-link-routing)

Files to change:
- [path/to/file.ts] — lines [N–M] — what changes and why
- [repeat for each file]

DB migration required: Yes / No
  If yes:
  - Migration filename: [YYYYMMDDHHMMSS_description.sql]
  - What it does: [exact SQL change]
  - seed.sql impact: [does it add a column seed.sql references? Check and state.]

Test after applying:
- [Specific user action to confirm the fix]
- [Specific check to confirm nothing regressed]
- [Roles to test from]

Risk: [Low / Medium / High — and why]
```

**Gate:** Show Khian the full plan. Ask him to read every line and confirm it
matches the diagnosis and safety findings from Steps 3–5.
**Do not touch any file until Khian explicitly approves the plan.**

---

## Step 7 — Apply the fix on a branch

**What we're doing:** Creating a branch off `main`, applying the approved changes,
and verifying correctness — without committing yet.

**Branch setup:**
```powershell
cd c:\Users\brian\complyhubworkspace\rto-compass-hub
git checkout main
git pull
git checkout -b fix/[description]
```

**Apply changes:**
- Edit only the files approved in the Step 6 plan
- No extra cleanup, no refactoring beyond what the plan says
- If a DB migration is needed: write the `.sql` file in `supabase/migrations/`
  using the correct timestamp prefix

**Verify before committing:**
```powershell
npm run type-check   # TypeScript errors only
npm run lint         # ESLint
```

Both must pass. Do not run `npm run build` — it hangs the workstation.

**Present the diff to Khian:** Show what changed, file by file. Confirm it
matches the approved plan exactly. Ask Khian to review.

**Gate:** Khian must say "commit it" or equivalent explicit commit words before
any `git commit` runs. "yes", "looks good", "do it", "apply it" do NOT mean commit.

---

## Step 8 — Commit, push, and open a PR

**THREE SEPARATE GATES — never combine:**

### Gate 1 — Commit

Before running `git commit`:
1. Run `git branch --show-current` — confirm it shows the feature branch, NOT `main`
2. If it shows `main` or anything unexpected — **STOP. Report to Khian.**

Only proceed after Khian says "commit it" (or equivalent explicit commit instruction):
```powershell
git add [specific files — never git add -A or git add .]
git commit -m "fix: [short description]"
```

Report the commit hash to Khian. Then STOP and WAIT.

### Gate 2 — Push

Only proceed after Khian says "push it" (or equivalent explicit push instruction):
```powershell
git push -u origin fix/[branch-name]
```

Vercel will automatically create a preview URL. Report the PR link and the
Vercel preview URL to Khian. Then STOP and WAIT.

### Gate 3 — Merge

Khian opens the PR on GitHub and merges when QA on the Vercel preview passes.
Never push to `main` directly. Never merge without Khian's explicit instruction.

**If the fix includes a DB migration — QA flow before merging:**

Two independent systems must both go green before QA can start. Check them
separately — one being ready does NOT mean the other is.

1. Push the branch and open the PR
2. **Gate A — Vercel preview build:**
   - Use `list_deployments`, filter to the branch, check `state`
   - Must show `READY` before QA. If `ERROR` → pull `get_deployment_build_logs`
     and report the failing lines. If stuck `BUILDING` for an unusually long
     time, check `get_deployment_build_logs` anyway — a hang often shows a
     silent install/build step.
3. **Gate B — Supabase branch DB:**
   - Use `list_branches`, find the branch DB for this PR
   - Must show healthy status with no `MIGRATIONS_FAILED`. If stuck in
     `CREATING`/`MIGRATIONS_RUNNING` for an unusually long time, check
     `get_logs` for the branch DB to see what's actually hanging (often a
     `seed.sql` failure if a new column isn't in baseline yet — see the
     Baseline-first migration rule).
4. **Do not start QA until both Gate A and Gate B are green.** If only one is
   ready, say so explicitly — e.g. "Vercel preview is Ready, but the branch DB
   is still running migrations" — rather than assuming QA can proceed.
5. QA against the branch DB (not production) once both gates pass
6. Only merge once QA passes on the branch DB

**After Khian merges:**
1. `git checkout main && git pull` — confirm the fix commit is on main
2. Confirm the branch is gone from remote:
   ```powershell
   git ls-remote --heads origin fix/[branch-name]
   ```
   (empty = deleted)
3. Delete the local branch:
   ```powershell
   git branch -D fix/[branch-name]
   ```
4. **If the fix included a DB migration:** apply it to production immediately via
   MCP `apply_migration` — do NOT defer. Merging to main does NOT apply migrations
   to the production DB automatically. This is always a manual step.
5. Verify the DB object changed in production after applying.

**Gate:** Report the merge commit hash to Khian and confirm production is healthy.

---

## Step 9 — Cross-check fix on Vivacity Testing Tenant

**What we're doing:** After the merge is confirmed on `main` and the branch is
deleted, reproduce the exact bug scenario on production using the Vivacity Testing
Tenant. This is the final gate before closing the bug report.

**Vivacity Testing Tenant — test accounts (production DB):**

| Email | Role in tenant | Use for |
|---|---|---|
| briansismundo@gmail.com | Administrator | Primary QA — can create/edit any record |
| rjdbadua.works@outlook.com | Administrator | Secondary Admin QA |
| rjdb.prsnl@gmail.com | Trainer/Assessor | QA trainer-scoped features |
| khianbsismundo@gmail.com | Trainer/Assessor | QA trainer-scoped features |
| brian@vivacity.com.au | super_admin (platform only) | ⛔ Not for feature QA — RLS blocks tenant register access |

**Rules:**
- Always test from at least one Administrator account AND one Trainer/Assessor account
  when the fix touches a feature both roles can access
- `brian@vivacity.com.au` cannot see tenant registers — do not use it to verify
  tenant-scoped features
- If QA fails on the testing tenant, do not close the bug — open a follow-up fix
  branch immediately

**QA steps (adapt to the specific bug):**
1. Log in to rto.complyhub.ai with `briansismundo@gmail.com` (Administrator)
2. Reproduce the exact action that triggered the original bug
3. Confirm the bug is gone — the feature works as expected
4. Check that no regression is visible in adjacent features on the same page
5. Log out, log in as `rjdb.prsnl@gmail.com` (Trainer/Assessor), repeat the
   relevant steps from the Trainer perspective
6. Report outcome to Khian — pass or fail

**Gate:** Bug must be confirmed fixed from at least Administrator role before
closing. Trainer/Assessor check is required if that role could also trigger the bug.

---

## After the fix ships

Verify using both code inspection and database checks:

**CODE CHECKS:**
1. Does the change match what was planned?
2. If a DB structure change was made, did it apply correctly to production?
3. Test the bug manually — is it fixed?
4. Test the same feature from at least two different user roles.

**DATABASE CHECKS (if DB was touched):**
5. If data was corrupted, sample rows to confirm they are fixed:
   ```sql
   SELECT * FROM [table] LIMIT 5;
   ```
6. If RLS was changed, confirm the policy is correct:
   ```sql
   SELECT policyname, cmd, qual, with_check FROM pg_policies
   WHERE tablename = '[table]';
   ```
7. If a trigger was added or changed, confirm it is active:
   ```sql
   SELECT trigger_name, action_statement FROM information_schema.triggers
   WHERE event_object_table = '[table]';
   ```
8. If the bug was in an audit cluster, confirm it can be marked resolved in
   `AUDIT-REPORT.md`.

If anything does not match what was designed → flag to Carl immediately.

---

## Key rules to reinforce at every step

- **Multi-tenant isolation is P0.** Any data leakage between tenants is a
  critical incident — escalate to RJ before attempting any fix.
- **Never hardcode credentials.** No Supabase URL, anon key, or service-role
  key as string literals — even as a fallback. Use `import.meta.env` variables.
  This is Cluster 1 of the active audit.
- **Never use `.single()` on queries that could return multiple rows.** Use
  `.maybeSingle()` or `.limit(1)`. The `fetchEffectiveRole()` pattern is a
  known example of this failure.
- **Never add direct Storage calls from the browser.** Always use the gateway
  functions (`documentFiles.ts`, `trainerEvidenceDownload.ts`).
- **All Edge Function auth must be a gate, not optional.** JWT must be verified
  before any data access. `atob()` decoding is not verification.
- **RLS policy changes affect every tenant.** Never touch an RLS policy without
  blast-radius analysis and Carl's sign-off.
- **Never commit or push without Khian's explicit words.** Edit → commit → push
  are THREE separate gates. "yes" or "looks good" do not trigger any of them.
- **Always verify the branch before committing.** Run `git branch --show-current`
  immediately before `git commit`. If it shows `main` — STOP.
- **Migrations are NOT auto-applied on merge.** After every PR that includes a
  migration merges to `main`, apply it to production via MCP immediately.
  Never defer.
- **Never read `supabase/migrations/_archive/`.** That folder contains 3,600+
  dead Lovable-era files. They do not run. Only read files directly in
  `supabase/migrations/` (not subdirectories).
- **Vercel preview and Supabase branch DB are two independent readiness
  gates.** Never assume one being ready means the other is. Check both via
  MCP before telling Khian QA can start.
- **The live database is the source of truth.** If the code and the database
  disagree, trust what is actually in the database right now.
- **Check `AUDIT-REPORT.md` clusters first.** If the bug is already documented
  in Clusters 1–6, the fix path and ownership are already decided. Do not
  duplicate or conflict with that work.
- **Do not run `npm run build`.** It hangs the workstation. Use
  `npm run type-check` and `npm run lint` instead. Vercel is the build gate.
