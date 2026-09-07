# Investigation — Louisa Gatto: "a whole bunch of survey responses lost or disappeared" (7 September 2026)

**Status:** Closed — probable cause identified and already fixed elsewhere; not conclusively confirmed against her specific tenant.
**Reported by:** RJ, relaying a client complaint from Louisa Gatto.
**Tenants scanned:** Real Estate Training Solutions (`3fcb3f9d-28da-4ac3-9746-393a2890f5fa`), Real Estate Institute NSW Ltd (`3caf2272-bdfb-4c11-9780-9b6fbbb721bc`), Think Real Estate (`a6a60268-f437-48ad-8d12-b597e8bfdfb4`).

## What was investigated

RJ initially named "Real Estate Training Solutions" + "Real Estate Institute NSW Ltd" as the two tenants Louisa belongs to. Live data investigation found:

- Zero rows in every survey-shaped table (`surveys`, `survey_responses`, `survey_questions`, `survey_response_sessions`, `survey_cycles`, `survey_templates`, `industry_consultation_surveys`, `nps_surveys`, `surveys_itn`, `qi_campaigns`, `qi_responses`) for both tenants.
- No survey-related entries in `tenant_audit_log` or `immutable_audit_log` for either tenant (these tables are only populated by explicitly-instrumented app code — no automatic trigger logs a plain row delete on any survey table, so their emptiness doesn't rule out a prior deletion).

Cross-checking `louisa@rets.com.au` / `louisa@thinkrealestate.net.au` (provided by RJ) showed these resolve to **two separate user accounts** (different `user_id`s), each Administrator of one tenant:
- `louisa@rets.com.au` → **Real Estate Training Solutions** (currently **suspended**)
- `louisa@thinkrealestate.net.au` → **Think Real Estate** — not one of RJ's original two tenants

Re-running the investigation against the corrected pair found two real candidates tied to her Think Real Estate account:
1. **"Trainer Effectiveness Survey"** (`public.surveys`, id `1baae943-0768-46df-853d-702d6747fe6e`) — still `status = draft`, `created_by` null, 0 responses/sessions ever recorded. Structurally can't have received public responses while in draft (submission RLS requires `status = 'published'`).
2. **An Industry Consultation Survey** (`industry_consultation_surveys`, id `2cf1eff3-2f57-469c-97c2-fc725af4e80d`, qualification CPP51122, industry sector Real Estate) — created by her account 27 May 2026, active, not expired. Its response table (`industry_consultation_survey_responses`) showed **zero rows**.

## Probable cause (not conclusively confirmed)

While re-syncing `rto-compass-hub` after this investigation, a migration landed the same day (`20260907033006_fix_ic_survey_itn_write_lock_blocks_public.sql`) fixing `trg_ic_survey_response_to_itn` — the `SECURITY DEFINER` trigger that fires on every insert into `industry_consultation_survey_responses` (exactly candidate #2's table). The bug: the trigger wrongly raised `'Tenant is write locked'` for legitimate anonymous public submissions. A trigger exception rolls back the entire transaction, so the original response row itself would never be saved — the respondent would just see a generic "Failed to submit survey" toast, with nothing persisted anywhere.

This matches Louisa's symptom shape exactly (responses appearing to vanish, when in fact they were rejected before ever being saved) — but it was **not confirmed against her tenant specifically**. This bug's discovery/fix originated from a separate, unrelated investigation (`complyhub-kb/active-work-sync/industry-consultation-survey-fix.md`, now deleted post-fix) tracing back to a different tenant ("Vivacity Testing Tenant") and a different specific error (a `custom_id` collision, not the write-lock variant — that variant was found separately during a fresh-eyes/Copilot review of the same PR). There is no historical audit trail for Think Real Estate's billing/write-lock state (`tenant_audit_log` is empty for this tenant), so whether it was actually write-locked at the time Louisa expected responses cannot be verified after the fact.

## Why closed without full confirmation

- The relevant bug is already fixed as of today — no further code/migration action needed regardless of whether it was the exact cause here.
- No further forensic signal is available (no soft-delete, no delete-triggers, no audit trail on these tables) to push the investigation further without new input from Louisa (approximate dates, respondent count, any error she or a respondent saw).
- Recommended forward-looking verification (not yet done): have someone submit a real test response to her CPP51122 survey link now and confirm it lands in `industry_consultation_survey_responses` / the Consultation Register.

## If this resurfaces

Reopen with: (a) confirmation the test submission above was tried, (b) Louisa's recollection of dates/volume, (c) whether Think Real Estate's billing history (Stripe/Dave) shows a grace or suspended window during the period she expected responses.
