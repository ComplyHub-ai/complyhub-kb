# Audit — PRs #147 + #150: suggestion-intake silent hang, platform schema grants, rto.complyhub.ai DMARC quarantine (08 July 2026)

**Date:** 08 July 2026
**Branches:** `fix/suggestion-intake-timeout-hardening` (PR #147) · `fix/platform-schema-service-role-grants` (PR #150)
**PRs:** #147 · #150 — both merged
**Merged by:** Brian (Khian)
**Merge commits:** `81cab3e97` (PR #147) · `beddf1646` (PR #150)

Trigger: Angela reported devs stopped receiving email notifications for new suggestions/tickets around 4 July, despite this having worked since the feature launched (~24 June, worked fine through ~1 July). Turned into a three-layer investigation — a real code bug, a real database permissions bug, and (the actual root cause of the reported symptom) a DNS/DMARC misconfiguration entirely outside git.

---

## Root cause #1 — suggestion-intake silently hangs, never times out (PR #147)

### Diagnosis

Live test insert into `public.suggestions` on production, then inspected `net._http_response` for the pg_net trigger's own call: `status_code: null`, `error_msg: "Timeout of 5000 ms reached... Total time: 5000.267ms"`. No ACK email, no dev-team email — not even the first, fastest step. Ruled out (with evidence, not assumption): trigger config (`app_config.suggestion_intake_url`/`intake_secret` both set, unchanged since 24 June), deployed code matching git (byte-identical `get_edge_function` pull), general pg_net/network health (other functions invoked the same way responded normally throughout).

**Actual cause:** `supabase/functions/suggestion-intake/index.ts` makes three sequential external calls (Mailgun ACK email, Anthropic AI triage, Mailgun dev notification) with **no timeout on any of them** — `fetch()` has no default timeout in Deno. A slow/hung call anywhere in that chain freezes the whole pipeline with nothing logged (the code never reaches a `log.error()` call). Trigger's own `net.http_post` timeout is a fixed 5000ms, unrelated to and shorter than the function's actual worst-case runtime.

**Separately confirmed, pre-existing since the function's first commit (23 June):** `MODEL = "claude-sonnet-4-6"` is not a real Anthropic model ID — AI triage has never once succeeded in production. Unrelated to the email hang (dev notification sends regardless of triage success/failure) but degrading the feature silently the whole time.

### Fix

- Added a 4s `AbortController` timeout to the shared Mailgun sender (`_shared/mailgun.ts`, also used by `enhanced-signup`) and the Anthropic call.
- Fixed the model string to `claude-haiku-4-5-20251001` (matches the correct pattern already used in the sibling `suggestion-triage` function).
- Added start/finish structured log lines with duration for each of the 3 steps.
- New migration `20260708150000_add_suggestion_intake_log.sql` — `platform.suggestion_intake_log`, written unconditionally on every invocation (success, partial failure, or exception), so a future delivery problem can be diagnosed from one table instead of a live reproduction.

### Verification

Type-check/lint clean. Live test insert after merge confirmed the function now completes in ~6-12s (vs indefinite hang before) and returns `200`.

---

## GitHub Actions billing outage — blocked the normal deploy path (discovered mid-session)

Merging PR #147 to `main` did **not** auto-deploy the edge function — the org-wide GitHub Actions billing outage (documented in `CLAUDE.local.md` since 7 July) meant `deploy-edge-functions.yml` never ran. Confirmed via `get_edge_function`: production was still running the pre-fix code (version 6) after the merge.

**Manually deployed via Supabase `deploy_edge_function` MCP tool**, using the exact content already committed on `main` (per the standing outage workaround). First attempt (**version 7**) used an invalid file-naming convention for the multi-file deploy (`"../_shared/log.ts"` as a literal file name, instead of mirroring the real folder structure) — this caused the bundle to fail import resolution and the function to never boot at all, with zero trace in any log (no request-log line is emitted if the isolate never starts). Corrected to `"functions/_shared/log.ts"`-style paths matching the original working deployment's structure — **version 8** deployed and confirmed working via a live test (function completed in 5.9s, status 200).

---

## Root cause #2 — `service_role` has zero grants on the entire `platform` schema (PR #150)

### Diagnosis

While verifying PR #147's fix, the new `suggestion_intake_log` table received zero rows despite the function completing successfully. Checked `information_schema.role_table_grants` and `has_schema_privilege('service_role', 'platform', 'USAGE')` directly against production: **false**, and **zero grants for `service_role` on any of the 24 tables in the `platform` schema**, including pre-existing ones (`ai_triage_runs`, `suggestion_triage`) — confirming this is not specific to the new table, but a gap since the schema itself was created (`20260624101231_expose_platform_schema_to_postgrest.sql` granted `authenticated` but never `service_role`).

**Effect:** every service-role write from any edge function to any table in `platform` has been silently failing with a permission error since the schema was created — invisible because the only place the error surfaced was in a response body nobody could read (same pg_net-timeout-swallows-the-response mechanism as root cause #1). AI triage results have never actually been persisted to the database, even on the rare occasion the (broken) model string didn't block it.

### Fix

`GRANT USAGE ON SCHEMA platform TO service_role` + `GRANT ALL PRIVILEGES` on all existing tables/sequences + `ALTER DEFAULT PRIVILEGES` so future tables in `platform` inherit the grant automatically. `service_role` already bypasses RLS everywhere else and is server-side only — this doesn't loosen anything reachable by an end user.

### Verification

Applied to production via `apply_migration`, then verified directly (not just trusted the "success" response): `has_schema_privilege('service_role', 'platform', 'USAGE')` → `true`; `has_table_privilege('service_role', 'platform.ai_triage_runs'/'suggestion_intake_log'/'suggestion_triage', 'INSERT')` → `true` for all three.

---

## Root cause #3 (the actual explanation for the reported symptom) — `rto.complyhub.ai` had no SPF/DKIM/DMARC, root domain enforces `p=quarantine`

### Diagnosis

After PR #147 + the manual deploy, a live test still produced **zero emails** — Mailgun's own delivery log showed both the ACK and dev-notification test emails as **"Delivered"** to the recipients' Microsoft 365 mailboxes, timed exactly to the test runs. Recipient confirmed not in Inbox, Junk/Spam, or Microsoft 365's personal Blocked Senders list.

Git history for `suggestion-intake/index.ts`, `_shared/mailgun.ts`, and the trigger migration showed **zero commits between 24 June and 3 July** — ruling out a code regression as the cause of the reported "worked until ~1 July, broke by 4 July" timeline. A repo-wide sweep of every migration/commit in that window found nothing touching `public.suggestions`, `app_config`, or any GRANT/REVOKE either.

Checked live public DNS (via `nslookup` against both Google's and Cloudflare's resolvers) for the domain Mailgun's delivery log showed as the sender (`noreply@rto.complyhub.ai`):
- SPF TXT on `rto.complyhub.ai`: **none**
- DMARC TXT on `_dmarc.rto.complyhub.ai`: **NXDOMAIN**
- Both DKIM CNAMEs (`pdk1`/`pdk2._domainkey.rto.complyhub.ai`): **NXDOMAIN**

`rto.complyhub.ai` also carries an A record to `76.76.21.21` (Vercel) — confirming it's the app's production hosting domain, not a dedicated mail subdomain someone deliberately set up for Mailgun. The root domain `complyhub.ai` has its own DMARC record with **`p=quarantine`**, which per spec applies to all subdomains lacking their own DMARC record. Cloudflare's own DNS dashboard independently flagged a related, separate problem: `mg.complyhub.ai` (an older, previously-configured Mailgun sending domain) has **two conflicting SPF TXT records**, which breaks SPF for that host just as thoroughly as having none.

**Conclusion:** Mailgun genuinely handed the email off successfully (accounting for "Delivered" being accurate from Mailgun's side), but since `rto.complyhub.ai` had no way to prove the mail was legitimately from that domain, it failed DMARC alignment and was quarantined by Microsoft 365 before reaching any user-visible folder — consistent with, and explaining, the reported symptom exactly. Not a code bug, not a Supabase bug, not an M365 admin policy change — a DNS/domain-authentication gap on infrastructure outside this repo, invisible to git history by nature.

### Fix

Added 4 DNS records to `rto.complyhub.ai` directly in Cloudflare (Brian, with guidance): SPF TXT (`v=spf1 include:mailgun.org ~all`), 2 DKIM CNAMEs (`pdk1`/`pdk2._domainkey` → Mailgun's EU DKIM targets), DMARC TXT (`p=none`, monitor-only, matching Mailgun's own generated recommendation). Confirmed live via the same public-resolver DNS lookups within minutes of saving.

**Not fixed in this round:** the duplicate-SPF issue on `mg.complyhub.ai` (Cloudflare's own banner recommendation — remove one of the two `v=spf1` TXT records on that host) and `cms.complyhub.ai`'s DNS (used by `sa_resend_invite` and `contact-support`, which hardcode that domain instead of reading the shared secret — not affected by this specific incident, never checked).

### Verification

Live test insert after the DNS change — recipient confirmed the email actually arrived in their inbox.

---

## Blast radius — every other feature sharing `MAILGUN_DOMAIN`

`MAILGUN_DOMAIN` is a single project-wide Supabase Edge Function secret, not per-function. A grep across `supabase/functions/` for Mailgun usage returned 43 files; cross-referenced each against `supabase/config.toml`, the repo's own `function-registry/index.ts`, and real call sites in `src/` to separate genuinely live features from Lovable-era duplicates.

**~24 live, real user-facing features were silently failing the identical way** for as long as `rto.complyhub.ai` lacked authentication, all fixed by the same DNS change with zero code changes: password reset (`password-reset-request`), team invitations (`send-invitation-resend` — the actual canonical invite path in production, not the several superseded `-v2`/`send-invite`/`invites-send` variants the registry already marks legacy), magic-link login (`send-magic-link`), join-request approve/reject notifications (`notify-join-request`), governance meeting emails, domain verification codes, trial/demo signup emails (`send-admin-trial-notification`, `send-trial-denial-notification`, `create-self-service-demo`, `trial-offer-emails`, `trial-request-reminders`, `trial-email-automation`), billing (`send-test-invoice`, `weekly-billing-health-report`), and several cron-driven internal digests (`complybot-monthly-report`, `send-trainer-report-reminder`, `send-orphan-recovery-invites`, `invite-cleanup-daily-summary`, `health-email`, `demo-signup-health`, `enhanced-signup`, `send-mailgun-email`, `send-custom-email`, `email-resend`, `check-mailgun-status`).

**Unaffected by this specific bug** — hardcode `cms.complyhub.ai` instead of reading the shared secret: `sa_resend_invite`, `contact-support`. That domain's own DNS was not checked as part of this incident.

**Confirmed dead/legacy, not worth further attention:** `send-invitation-email`, `send-invitation-email-v2` (registry-flagged legacy, only referenced in a static hardcoded display list, no real invoke), `invites-send` (test-utility-only), `mailgun-link`/`test-mailgun` (registered but zero `src/` references), `send-document-notification` (explicitly unimplemented, invoke call commented out with a TODO).

---

## Files changed across #147/#150

| File | PR | Change |
|---|---|---|
| `supabase/functions/suggestion-intake/index.ts` | #147 | Timeout hardening, model fix, step timing logs, unconditional diagnostic log write |
| `supabase/functions/_shared/mailgun.ts` | #147 | 4s `AbortController` timeout on the Mailgun POST |
| `supabase/migrations/20260708150000_add_suggestion_intake_log.sql` | #147 | New table, RLS, super-admin-only policy |
| `supabase/migrations/20260708160000_grant_service_role_platform_schema.sql` | #150 | `service_role` grants + default privileges on `platform` schema |

**Not tracked in git — Cloudflare DNS zone for `complyhub.ai`:** added SPF TXT, 2 DKIM CNAMEs, DMARC TXT for `rto.complyhub.ai`.

---

## Notes

- Both migrations applied to production and verified directly via `information_schema`/`has_*_privilege` queries — not assumed from migration success alone.
- `suggestion-intake` was manually deployed to production twice this session due to the ongoing GitHub Actions billing outage (see `CLAUDE.local.md`) — version 7 (broken file-naming, never booted) then version 8 (corrected, confirmed live). Exact content matched what was already committed on `main` both times, per the standing outage workaround.
- **Not resolved in this round:** duplicate SPF on `mg.complyhub.ai` (flagged by Cloudflare, not fixed); `cms.complyhub.ai` DNS never checked; the GitHub Actions billing outage itself (needs Carl); the local worktree conflict discovered post-merge (`rto-compass-hub-staging-sync` already had `main` checked out, blocking normal branch cleanup in the primary worktree — left as-is pending Brian's input on what that worktree is for).
