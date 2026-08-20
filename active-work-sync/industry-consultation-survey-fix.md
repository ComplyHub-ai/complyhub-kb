# Industry Consultation Survey — Submission Fix

Living doc for a confirmed two-part production bug in the "Send Online Survey" flow under
Industry Engagement → Consultation Plans → Engage step. Delete this file once both fixes are
implemented and shipped.

## Background (confirmed via live DB investigation, 19 Aug 2026)

Angela clicked "Send Online Survey" on a Consultation Plan's Engage step, copied the link
(`https://rto.complyhub.ai/survey/ic-<slug>`), and had it answered in the "Vivacity Testing
Tenant" (`bc515b64-d24f-4e9d-811b-1f5c0f62a3f7`). The submission failed with:

```
code: "23505"
message: "duplicate key value violates unique constraint \"idx_surveys_itn_tenant_custom_id\""
details: "Key (tenant_id, custom_id)=(bc515b64-d24f-4e9d-811b-1f5c0f62a3f7, ITN0001) already exists."
```

The public survey page (`src/pages/public/IndustrySurvey.tsx`) inserts into
`industry_consultation_survey_responses`. Two triggers fire on that insert, in alphabetical
order by trigger name:

1. `trg_ic_response_to_itn` (fires first) — writes an unrelated ITN skills-gap snapshot into
   `surveys_itn`, generating its `custom_id` from a per-tenant Postgres sequence
   (`custom_id_seq_<tenant_id>_ITN`) created fresh via `CREATE SEQUENCE IF NOT EXISTS ... START 1`.
   This tenant already has a `surveys_itn` row with `custom_id = 'ITN0001'` from 15 May 2026,
   predating this trigger. Because the sequence always starts at 1 regardless of existing data,
   the first fire for this tenant collides and raises a unique-violation exception.
2. `trg_survey_response_to_icr` (fires second, never reached) — this is the trigger that's
   *supposed* to auto-populate the Consultation Register (`industry_consultation_records`) from
   the survey answers, via `fn_survey_responses_to_icr_fields`. This is the mechanism Angela
   correctly expected results to appear in.

Because both triggers run inside the same transaction as the original insert, trigger 1's
exception rolls back everything — the original survey response row, the ITN snapshot, and the
Register entry that should have followed. The respondent only sees a generic "Failed to submit
survey. Please try again" toast.

**Separately confirmed:** even after fixing the crash, `fn_survey_responses_to_icr_fields`'s
field mapping has drifted from the live question template (`src/pages/registers/
industry-consultation/constants/consultationQuestions.ts`). Several question IDs the function
reads no longer exist in the template (`survey_purpose`, `survey_missing_training`,
`survey_recruitment`, `survey_training_areas`, `survey_delivery_modes`,
`survey_upskilling_frequency`, `survey_provider_improvements`, `survey_partner_rto`,
`survey_work_placement`), and several real question IDs in the template are never read by the
function at all (`survey_role`, `survey_experience`, `survey_org_size`, `survey_skills_gap`,
`survey_emerging_drivers`, `survey_graduate_readiness`, `survey_graduate_strengths`,
`survey_rto_support_needed`, `survey_further_contact`). So a fixed-but-unmapped submission would
reach the Register but with roughly half the real answers silently missing.

## LOCKED Decision 1 — fix the custom_id collision in `trg_ic_response_to_itn`

Change the ID-generation step in `trg_ic_response_to_itn` (function
`public.trg_ic_survey_response_to_itn`) so it seeds from the tenant's actual existing max
`surveys_itn.custom_id` instead of blindly trusting a fresh sequence starting at 1 — the same
safe pattern `trg_survey_response_to_icr` already uses for its own `ICR-####` IDs (`SELECT
COALESCE(MAX(...), 0) + 1 FROM ... WHERE tenant_id = ...`). Ship as a new migration in
`rto-compass-hub/supabase/migrations/` (read `supabase/migrations/CLAUDE.md` fresh before
naming/writing it). No frontend changes needed for this part.

## LOCKED Decision 2 — fix the stale field mapping in `fn_survey_responses_to_icr_fields`

Update `fn_survey_responses_to_icr_fields` to read the current, real question IDs from
`consultationQuestions.ts`'s `ONLINE_SURVEY_TEMPLATE` (listed above under "Separately
confirmed") instead of the stale ones. Ship as part of the same migration (or an immediately
following one) as Decision 1, since both trigger functions are being touched in the same body
of work. Re-verify the question ID list against `consultationQuestions.ts` fresh at
implementation time in case the template has changed again since 19 Aug 2026 — don't trust this
doc's snapshot blindly.

## Implementation notes for a fresh session picking this up

- This is `rto-compass-hub` work — confirm which worktree owns it via `active-work.md`'s
  worktree registry before branching.
- Follow the standard commit/push hard gates (CLAUDE.md) — plan → edit → wait for explicit
  commit/push instruction from Brian.
- Verify the SQL actually executes (branch DB or `execute_sql`) before calling either migration
  edit verified — text-pattern checks don't catch a live syntax/logic error.
- Once both fixes are implemented and shipped, and Brian has requested an audit doc, delete this
  file.
