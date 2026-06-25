# Suggestions Intake Pipeline — Work Reference
**Created:** 22 June 2026  
**Owner:** Angela Connell-Richards (built the files)  
**Deployers:** RJ Badua (edge function) + Angela (migration via MCP)  
**Reference folder:** `c:\Users\brian\complyhubworkspace\Suggestions Triage\`

---

## What Angela Built

Angela designed and wrote a fully automated pipeline that fires the moment any tenant user submits a suggestion. The four files she delivered are:

| File | Purpose |
|---|---|
| `migration_suggestion_intake_trigger.sql` | Adds a column to the suggestions table and creates a database trigger |
| `index.ts` | The edge function (`suggestion-intake`) that runs on every new submission |
| `deno.json` | Config file for the edge function |
| `suggestion-intake-runbook.md` | Step-by-step deployment guide |

### What the pipeline does when live

Every time someone submits a suggestion, three things happen automatically within seconds:

1. **ACK email** — the person who submitted gets an email confirming receipt, with a link to track it in their dashboard
2. **AI triage** — Claude Sonnet 4.6 reads the suggestion and classifies it (bug, feature, UX issue etc.), estimates effort, identifies which part of the app is affected, and proposes a fix
3. **Dev notification** — Angela gets an email at `angela@complyhub.ai` with the full AI triage summary and a link to review it in the SuperAdmin panel. The suggestion is also automatically assigned: bugs go to Khian, feature/UX requests go to RJ.

---

## Current State of the Codebase (as at 22 June 2026)

### What already exists — no action needed

| Item | Status |
|---|---|
| `supabase/functions/deno.json` | Already exists, Angela's copy is identical — nothing to do |
| `platform.suggestion_triage` table | Already in the database with all correct columns |
| `platform.ai_triage_runs` table | Already in the database |
| `public.app_config` table | Already in the database |
| `supabase/functions/_shared/log.ts` | Already exists — shared logging utility |
| `supabase/functions/_shared/mailgun.ts` | Already exists — shared Mailgun email utility |

### What is missing — must be deployed

| Item | Status |
|---|---|
| `intake_dispatched_at` column on `public.suggestions` | Does NOT exist yet — migration needed |
| `trg_suggestion_on_intake` trigger | Does NOT exist yet — migration needed |
| `suggestion-intake` edge function | Does NOT exist yet — deployment needed |
| `suggestion-intake` entry in `supabase/config.toml` | Does NOT exist yet — must be added |
| `INTAKE_SECRET` stored in `app_config` | Does NOT exist yet — must be inserted before migration runs |

---

## Issues Found & Resolution Status

---

### Issue 1 — BLOCKER: Secret setup instructions didn't match the trigger code
**Status: ✅ FIXED**

**What the problem was:**
The runbook told you to store the secret password by inserting a row into the `app_config` database table. But the trigger code Angela wrote didn't read from that table — it was looking in a completely different place (a PostgreSQL system setting). If deployed as-is, the trigger would go looking for the password, find nothing, and silently skip every single time. The whole pipeline would be installed but completely dead — no emails, no AI triage, no errors shown.

**What was changed:**
One line in `migration_suggestion_intake_trigger.sql`. The trigger now reads the secret directly from the `app_config` table, which is exactly where the runbook tells you to store it.

```sql
-- Before (looking in wrong place)
v_secret := nullif(current_setting('app.intake_secret', true), '');

-- After (reads from app_config table — matches the runbook)
SELECT value INTO v_secret FROM public.app_config WHERE key = 'intake_secret';
```

**File changed:** `Suggestions Triage/migration_suggestion_intake_trigger.sql`

---

### Issue 2 — `.single()` used (Carl's hard ban)
**Status: ✅ FIXED**

**What the problem was:**
The edge function had three places where it queried the database using a method called `.single()`. Carl has a rule banning this across the entire codebase because it crashes the whole function if the database returns zero rows — instead of handling it gracefully. For a background function like this one that nobody is watching in real time, a silent crash is very hard to debug.

**What was changed:**
All three `.single()` calls replaced with `.maybeSingle()` in `index.ts`. The difference: `.single()` throws an error on empty results, `.maybeSingle()` returns null and lets the code handle it cleanly. The null-handling logic was already there — only the method name needed changing.

**Locations fixed:**
- Suggestions table fetch (line ~436)
- Profiles table fetch (line ~455)
- Tenants table fetch (line ~470)

**File changed:** `Suggestions Triage/index.ts`

---

### Issue 2b — Improved error messages across the whole function
**Status: ✅ DONE (added on top of Issue 2 work)**

**What the problem was:**
Edge function errors show up as shallow, vague messages in logs. When something goes wrong in a background function like this, you need to know exactly what failed and where — otherwise diagnosing it means guessing.

**What was improved:**

1. **Auth errors** now tell you specifically what went wrong:
   - Was `INTAKE_SECRET` never set up in Supabase secrets at all?
   - Or was it set, but the value doesn't match what's in `app_config`?

2. **Suggestion not found** now includes the suggestion ID it was looking for and the actual database error if one came back — so you can tell whether it was a timing issue or a real DB failure.

3. **ACK email failures** now tell you exactly why it was skipped: no email address found, Mailgun not configured, or Mailgun returned an error with the HTTP status code.

4. **DB write failures** (saving triage results to the database) are now collected into a `db_errors` list that appears in every response, so partial failures are visible even when the function technically completed.

5. **Step tracker** — a variable follows the function through every stage. If it crashes anywhere, the error tells you exactly which step it died on: `"Intake failed at step 2: ai triage"` instead of just `"Intake failed"`.

6. **Success response** is now much richer. Every completed run tells you the full story:
```json
{
  "ok": true,
  "suggestion_id": "abc-123",
  "step_completed": "complete",
  "ack_sent": true,
  "ack_error": null,
  "triage_ran": true,
  "triage_error": null,
  "db_errors": null
}
```

**File changed:** `Suggestions Triage/index.ts`

---

### Issue 3 — Raw `console.*` calls throughout (Carl's hard ban)
**Status: ✅ FIXED**

**What the problem was:**
The file had 18 raw `console.log`, `console.error`, and `console.warn` calls. Carl bans these in edge functions because they produce unstructured plain text in logs — hard to search, filter, or route to a monitoring tool.

**What was changed:**
- Added `import { log } from "../_shared/log.ts"` at the top of the file
- Added a `ctx` object at the top of the handler holding `fn: "suggestion-intake"` and a `correlation_id` derived from the request header (or a fresh UUID). This gets spread into every log call so all lines from one request are traceable together.
- Replaced all 18 `console.*` calls with the equivalent structured `log.*` calls (`log.info`, `log.warn`, `log.error`). The "suggestion-intake:" prefix was removed from message strings — it now lives in `ctx.fn` instead.

**File changed:** `Suggestions Triage/index.ts`

---

### Issue 4 — Inline Mailgun helper duplicates `_shared/mailgun.ts`
**Status: ✅ FIXED (staging folder) — one branch action required**

**What the problem was:**
The file had its own full Mailgun send function written inline. The shared one at `_shared/mailgun.ts` already exists and does the same job. Duplicating it violates the shared module pattern and inflated the file length.

**What was changed in the staging file:**
- Removed the inline `sendMailgunEmail` function entirely
- Added `import { sendEmailViaMailgun } from "../_shared/mailgun.ts"`
- Removed `mgFrom` from the env var block (shared function uses a hardcoded from address)
- Updated both call sites (ACK email + dev notification) to use `sendEmailViaMailgun(to, subject, html)`
- Adapted response checks from `result.ok` → `result.success` and `result.body` → `result.error`

**Branch action required — fix EU endpoint in `_shared/mailgun.ts`:**
The shared `_shared/mailgun.ts` currently calls `api.mailgun.net` (US region). ComplyHub's Mailgun account is EU — the correct URL is `api.eu.mailgun.net`. When we create `feat/suggestion-intake`, we fix this one line in the repo's `_shared/mailgun.ts` at the same time. This corrects the bug for every function using that shared module, not just suggestion-intake.

**Files changed:** `Suggestions Triage/index.ts` + `_shared/mailgun.ts` (on branch)

---

### Issue 5 — File is too long (744 lines, max 500)
**Status: ✅ FIXED**

**What the problem was:**
The file was 744 lines, over Carl's 500-line hard limit for edge function `index.ts` files.

**What was changed:**
Created a new `email-templates.ts` file in the same folder. Moved `TriageOutput` interface, `BASE_URL` constant, `escapeHtml` helper, `buildAckEmailHtml`, and `buildDevNotificationHtml` into it. Added one import line to `index.ts`.

**Result:** `index.ts` is now 466 lines. `email-templates.ts` is 298 lines. Both under the 500-line limit.

**Files changed:** `Suggestions Triage/index.ts` + new `Suggestions Triage/email-templates.ts`

---

### Issue 6 — `config.toml` entry missing
**Status: ✅ FIXED (on branch)**

Added to `supabase/config.toml` when the branch was created:
```toml
[functions.suggestion-intake]
verify_jwt = false
```
`verify_jwt = false` is mandatory — the database trigger has no user login session to pass a JWT.

---

### Issue 7 — Supabase library version mismatch
**Status: ✅ FIXED**

**What the problem was:**
`index.ts` imported `@supabase/supabase-js@2.81.0` but `deno.json` only mapped `@2.51.0`. Deno matches import map entries by exact URL string — the version mismatch meant the map was ignored entirely and Deno fetched `2.81.0` directly from esm.sh, bypassing the import map.

**What was changed:**
One line in `index.ts` — version changed from `@2.81.0` to `@2.51.0`. `deno.json` already had the correct entry.

**File changed:** `Suggestions Triage/index.ts`

---

### Issue 8 — Hardcoded production URL in migration SQL
**Status: ✅ FIXED**

**What the problem was:**
Line 35 of the migration SQL had the production Supabase project ID hardcoded. If the trigger fired in a branch DB it would call the production edge function, potentially sending real emails during QA.

**How it was fixed:**
Queried the production database and found that `app_config` already stores an edge function URL this way — `invites_send_url` follows the exact same pattern. So instead of hardcoding the URL, the trigger now reads it from `app_config` at runtime:

```sql
SELECT value INTO v_edge_url FROM public.app_config WHERE key = 'suggestion_intake_url';
IF v_edge_url IS NULL OR v_edge_url = '' THEN
  RAISE WARNING '... skipping ...';
  RETURN NEW;
END IF;
```

If the row doesn't exist (e.g. in a branch DB that hasn't been set up for QA), the trigger skips silently — same safe behaviour as the missing `intake_secret` guard.

**Branch QA:** Insert both `intake_secret` and `suggestion_intake_url` into the branch DB's `app_config` using the branch project ID. Instructions are in the runbook under "Branch QA Setup".

**Files changed:** `Suggestions Triage/migration_suggestion_intake_trigger.sql` + `Suggestions Triage/suggestion-intake-runbook.md`

---

## Work Done So Far (Summary)

| What | File | Done? |
|---|---|---|
| Fix secret mechanism (trigger reads from app_config) | `migration_suggestion_intake_trigger.sql` | ✅ |
| Replace `.single()` with `.maybeSingle()` (3 places) | `index.ts` | ✅ |
| Improve all error messages + add step tracker | `index.ts` | ✅ |
| Replace console calls with shared logger | `index.ts` | ✅ |
| Replace inline Mailgun helper with `_shared/mailgun.ts` | `index.ts` | ✅ |
| Split email templates to reduce file length | `index.ts` + new `email-templates.ts` | ✅ |
| Add `config.toml` entry | `supabase/config.toml` | ✅ |
| Fix Supabase library version | `index.ts` | ✅ |
| Fix hardcoded URL — read from `app_config` instead | `migration_suggestion_intake_trigger.sql` + runbook | ✅ |

---

## Deployment Order (Once All Issues Fixed)

1. Generate a strong random secret string (e.g. `openssl rand -hex 32`)
2. Add `INTAKE_SECRET` to Supabase Dashboard → Settings → Edge Functions → Secrets
3. Insert the same value into `app_config`: `INSERT INTO public.app_config (key, value) VALUES ('intake_secret', '<value>') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;`
4. Angela runs the migration via Supabase MCP `apply_migration`, name: `suggestion_intake_trigger`
5. Verify migration: confirm `intake_dispatched_at` column and `trg_suggestion_on_intake` trigger exist
6. RJ deploys `suggestion-intake/index.ts` via Supabase Dashboard with `verify_jwt: false`
7. End-to-end test (see checklist below)

---

## End-to-End Test Checklist

After deployment, submit a test suggestion as a tenant user and verify:
- [ ] `suggestions.intake_dispatched_at` is populated immediately on the new row
- [ ] `platform.suggestion_triage` has a new row for the suggestion
- [ ] `suggestions.assigned_to` = Khian's UUID for bugs, RJ's UUID for features/UX
- [ ] ACK email arrives in the submitting user's inbox
- [ ] Dev notification arrives at `angela@complyhub.ai` with triage summary

---

## Key UUIDs (hardcoded in `index.ts`)

| Person | UUID | Auto-assigned for |
|---|---|---|
| Khian (Brian) | `50c4768c-0aaa-4995-a762-bff661a26fe7` | Bug / error type suggestions |
| RJ Badua | `805c9b7f-366c-479f-b382-5fd68f3ea016` | Feature / UX type suggestions |

---

## Failure Modes Reference

| What goes wrong | What happens | How to recover |
|---|---|---|
| `intake_secret` not in `app_config` | Trigger logs WARNING, skips silently, suggestion still saves | Insert the secret into `app_config`, re-submit a test suggestion |
| Edge function returns 401 — secret missing | Error says `INTAKE_SECRET not set in Supabase secrets` | Add `INTAKE_SECRET` in Supabase Dashboard → Settings → Secrets |
| Edge function returns 401 — secret mismatch | Error says `x-intake-secret did not match` | Ensure `app_config` value and Supabase secret are identical |
| Anthropic API down or key missing | Triage skipped, ACK email still sent, `triage_error` shows reason | Manual triage via SuperAdmin → suggestion detail → Run AI Triage |
| Mailgun not configured | `ack_error` shows which secret is missing, triage still runs | Check `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` in Supabase secrets |
| Cold start timeout (>5s) | pg_net times out, function completes but no retry | Known limitation — retry queue is future work |
| Partial DB write failure | `db_errors` field in response lists what failed | Check Supabase logs for the suggestion_id, re-run triage manually |
