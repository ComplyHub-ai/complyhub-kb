# Deployment Runbook — Suggestion Intake Pipeline
**Date:** 22 June 2026  
**Owner:** Angela Connell-Richards  
**Deployer:** RJ Badua (edge function) + Angela (migration via MCP)

---

## What this ships

A fully automated pipeline that fires on every new suggestion INSERT:
1. **ACK email** → submitter (confirms receipt, links to dashboard)
2. **AI triage** → Claude Sonnet 4.6 (inline, no HTTP chain) → writes to `platform.suggestion_triage`
3. **Auto-assignment** → bug/error → Khian · feature/ux → RJ (written to `suggestions.assigned_to`)
4. **Dev notification** → `angela@complyhub.ai` with full triage summary and link

---

## Pre-deployment checklist

### Step 1 — Add `INTAKE_SECRET` as a Supabase project secret

In Supabase dashboard → Settings → Edge Functions → Secrets:

```
Name:  INTAKE_SECRET
Value: <generate a strong random string, e.g. openssl rand -hex 32>
```

Record this value — you'll need it in Step 2.

### Step 2 — Write `INTAKE_SECRET` and `suggestion_intake_url` into `app_config`

The trigger reads both values from `app_config` at runtime. Run via Supabase MCP `execute_sql`:

```sql
INSERT INTO public.app_config (key, value)
VALUES
  ('intake_secret', '<YOUR_INTAKE_SECRET_VALUE_HERE>'),
  ('suggestion_intake_url', 'https://<PROJECT_ID>.supabase.co/functions/v1/suggestion-intake')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

For **production**, `<PROJECT_ID>` is `gdwhlstfguxarnxasrrs`.

For a **branch DB** (QA), use the branch project ID shown in the Supabase dashboard when the PR is opened. See the Branch QA Setup section at the bottom of this runbook.

⚠️ `intake_secret` is stored plain-text in the DB. It is only readable by the trigger function
(SECURITY DEFINER) and by SuperAdmin. The value must exactly match the Supabase project secret.

### Step 3 — Confirm `ANTHROPIC_API_KEY` exists as a Supabase project secret

In Supabase dashboard → Settings → Edge Functions → Secrets, verify `ANTHROPIC_API_KEY` is set.
It should already be there from existing edge functions (`suggestion-triage`, `suggestion-diagnose`).

### Step 4 — Confirm `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM` are set

These should already be set. The edge function reads:
- `MAILGUN_API_KEY` (or `MAILGUN_KEY` as fallback)
- `MAILGUN_DOMAIN`
- `MAILGUN_FROM`

---

## Migration deployment

**File:** `migration_suggestion_intake_trigger.sql`

Run via Angela's Supabase MCP `apply_migration` call:

```
name: suggestion_intake_trigger
```

**What it does:**
- Adds `intake_dispatched_at timestamptz NULL` column to `public.suggestions`
- Creates `trg_suggestion_dispatch_intake()` trigger function (SECURITY DEFINER, `search_path = 'public', 'net', 'pg_catalog'`)
- Creates `trg_suggestion_on_intake` BEFORE INSERT trigger on `public.suggestions`
- Revokes anon + PUBLIC execute on the trigger function
- Runs `NOTIFY pgrst, 'reload schema'`

**Post-migration verification:**
```sql
-- Confirm trigger exists
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_table = 'suggestions' AND trigger_name = 'trg_suggestion_on_intake';

-- Confirm column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'suggestions'
  AND column_name = 'intake_dispatched_at';
```

---

## Edge function deployment

**Deployer:** RJ via Supabase Dashboard "Via Editor" method

**Function slug:** `suggestion-intake`  
**verify_jwt:** `false` (mandatory — trigger has no JWT to pass)

Files to deploy:
- `functions/suggestion-intake/index.ts`
- `functions/deno.json` (shared import map)

**Post-deployment verification:**

Test from Supabase Dashboard edge function Test panel with:
```json
{
  "suggestion_id": "<any existing suggestion UUID>",
  "tenant_id": null
}
```

Expected: `{"ok": true, "ack_sent": false, "triage_ran": true}` (no ACK because no email in test payload)

⚠️ The Test panel won't have the `x-intake-secret` header — this will return 401 unless you
temporarily add a test bypass or use a curl call with the correct header:

```bash
curl -X POST https://gdwhlstfguxarnxasrrs.supabase.co/functions/v1/suggestion-intake \
  -H "Content-Type: application/json" \
  -H "x-intake-secret: <YOUR_INTAKE_SECRET_VALUE>" \
  -d '{
    "suggestion_id": "<existing_suggestion_uuid>",
    "tenant_id": "<tenant_uuid_or_null>",
    "user_id": "<user_uuid>",
    "title": "Test suggestion",
    "type": "bug",
    "submission_type": "error",
    "urgency": "medium",
    "description": "Something is broken on the TAS Builder page"
  }'
```

---

## End-to-end test

After both migration and edge function are deployed:

1. Log in as a **tenant user** (e.g. hasitha@australiancollege.edu.au via impersonation)
2. Submit a new suggestion via the in-app feedback widget
3. Verify within ~10 seconds:
   - [ ] `suggestions.intake_dispatched_at` is populated for the new row
   - [ ] `platform.suggestion_triage` has a row for the suggestion
   - [ ] `suggestions.assigned_to` matches Khian (bug) or RJ (feature/ux)
   - [ ] ACK email arrives in the submitting user's inbox
   - [ ] Dev notification arrives at angela@complyhub.ai with triage summary

---

## Failure modes and mitigations

| Failure | Behaviour | Recovery |
|---------|-----------|----------|
| `suggestion_intake_url` not set in `app_config` | Trigger logs WARNING, skips silently, suggestion still saves | Insert the URL into app_config (see Step 2 or Branch QA Setup) |
| `intake_secret` not set in `app_config` | Trigger logs WARNING, `intake_dispatched_at` stays NULL, submission proceeds normally | Set the secret in app_config, re-submit test suggestion |
| Edge function returns 401 | pg_net logs error, no email sent | Check INTAKE_SECRET matches exactly in both places |
| Anthropic API down or key missing | `triage_ran: false`, ACK email still sent, dev notified without triage block | Manual triage via SuperAdmin → suggestion detail → Run AI Triage |
| Mailgun not configured | Email steps silently skipped, triage still runs | Check MAILGUN_* secrets in dashboard |
| Edge function cold start timeout | pg_net has 5000ms timeout; function may not respond in time → pg_net logs error | Function completes async; no retry mechanism. For retries, add a `suggestion_intake_queue` table in a future iteration |
| Suggestion submitted with NULL tenant_id (SA test submissions) | Tenant name shows "—", triage still runs, ACK sent to submitted_by_email | Expected behaviour |

---

## The `intake_dispatched_at` guard

The trigger fires BEFORE INSERT and stamps `NEW.intake_dispatched_at = now()`. This means:
- The column is non-null immediately on INSERT
- Any subsequent UPDATE or re-trigger won't re-fire (the function checks and returns early)
- Re-triage is still available via the SuperAdmin manual "Run AI Triage" button (which calls `suggestion-triage` directly)

---

## Branch QA Setup

When a PR is opened, Supabase automatically creates a branch database. If you want to QA the suggestion intake pipeline against that branch (not just production), run these two inserts in the **branch DB** before testing.

Get the branch project ID from Supabase Dashboard → Branches, or from the PR description.

```sql
-- Run in the branch DB via MCP (use the branch project ID, not production)
INSERT INTO public.app_config (key, value)
VALUES
  ('intake_secret', '<SAME_VALUE_AS_INTAKE_SECRET_SUPABASE_SECRET>'),
  ('suggestion_intake_url', 'https://<BRANCH_PROJECT_ID>.supabase.co/functions/v1/suggestion-intake')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

If these rows are not inserted, the trigger will silently skip — no emails will fire and no triage
will run. The suggestion itself will still save normally. This is the safe default for branch DBs
that don't need to test the intake pipeline.

---

## Do NOT

- Set `verify_jwt: true` on `suggestion-intake` — the trigger has no user JWT
- Store `INTAKE_SECRET` in the edge function code itself — use Supabase project secrets
- Call `suggestion-triage` from within `suggestion-intake` via HTTP — the triage logic is inlined
- Mix this migration with any other DDL change
- Run this migration while another team member is mid-migration on `public.suggestions`
