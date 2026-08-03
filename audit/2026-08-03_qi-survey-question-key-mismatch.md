# Audit — QI Public Survey Success State (Item 1) — Question Key Mismatch

**Date:** 3 August 2026
**Branch:** `fix/qi-survey-question-key-mismatch`
**PR:** opened (pre-filled link), merge pending
**Source:** RJ's daily ticket batch, Item 2 — "QI success state — DB bug is fixed, just needs the success state in the frontend. Test slug: demo-rapid-learner-2026."

## What was actually wrong

The ticket's framing turned out to be only half right. The originally-fixed DB bug (a wrongly-added `UNIQUE` constraint on `qi_responses.survey_slug`, dropped 31 July) was real and is fixed. But investigating further surfaced that **the live `public_get_qi_survey_by_slug`/`public_submit_qi_survey` RPCs have been completely rewritten in production with no corresponding migration file in git at all** — pure undocumented drift, same pattern seen elsewhere this week (trainer monthly reports, assessment tools). The git-tracked versions (2-arg `public_submit_qi_survey`, direct `qi_responses` lookup) do **not** reflect what's actually running.

The live rewrite itself is architecturally sound — it resolves the slug via `qi_survey_links` (one row per slug, no ambiguity) and inserts a fresh `qi_responses` row per submission, rather than looking up and updating a specific pre-assigned response row. This sidesteps the "many respondents share one slug" ambiguity problem entirely.

**The actual live bug:** `public_get_qi_survey_by_slug()` builds each question's JSON with verbose/prefixed keys (`question_code`, `question_text`, `response_type`, `question_order`, `response_options`, `is_required`), but the frontend's `QiQuestion` contract (`src/types/qi-survey.ts`) — and every component built against it (`QiSurveyPage.tsx`) — expects short keys (`code`, `text`, `type`, `order`, `options`, `required`). Only `section` happened to match.

**Confirmed effect, live, before the fix:**
- `currentQ.code` was `undefined` for every question → `handleSetResponse(currentQ.code, value)` stored every answer under the literal object key `"undefined"`. Verified against an actual submitted row: `responses = {"undefined": "Test"}`.
- `currentQ.type` was also `undefined` → `QuestionField`'s switch always fell through to a plain text input, regardless of the question's real type (`star5`, `likert4`, etc.) — so a 5-star satisfaction question rendered as a free-text box.
- `currentQ.required` was `undefined` (falsy) → the required-questions validation never actually blocked anything.
- Every `rapid_*` analytics column (`rapid_overall_satisfaction`, `rapid_trainer_quality`, etc.) stayed `null` regardless of what was answered, because `public_submit_qi_survey` reads `p_responses->>'Q1'..'Q8'`, and those keys never existed in the payload.
- The success screen still rendered and a row still got created — so a shallow test ("does it show success, does a row appear") would have looked like a pass while the actual data capture was completely broken. This was caught by inspecting the submitted row's contents, not just the screen.

This affects all three public QI survey types (`rapid_learner`, `acer_learner`, `acer_employer`) — they all share this RPC and the `QiQuestion` contract.

## What was fixed

Renamed the `jsonb_build_object` output keys in `public_get_qi_survey_by_slug` to match the frontend contract (`code`, `text`, `type`, `order`, `options`, `required`). No column, join, or ordering logic changed — confirmed via diff against the live `pg_get_functiondef` output before writing the patch, verifying it was the only functional change.

Applied directly to production (Supabase SQL Editor, RJ ran it — same interim procedure as the trainer report fix, since direct DDL against prod is blocked for Claude by Claude Code's auto-mode safety classifier). Confirmed live via `pg_get_functiondef` post-apply.

**End-to-end verified:** resubmitted the test slug (`/survey/qi/rapid/demo-rapid-learner-2026`, incognito) after the fix — real question text rendered ("How satisfied were you with the quality of training you received?"), correct `star5` widget instead of a text box, "Question 1 of 8" reflecting the real question count. Completed the full 8-question flow and confirmed the resulting `qi_responses` row has real `Q1`–`Q8` keys in `responses` and every `rapid_*` column correctly populated.

## Ownership — RJ drove this fix directly

Same standing exception as the 31 July trainer-report fix and today's `submit_trainer_monthly_report_full` fix: this is DB work, which the default policy routes to Dave since Claude did the root-causing, not RJ independently. RJ explicitly chose to drive this one himself again — recorded as a repeated in-the-moment exception, not a change to the standing policy.

## Blast radius

- `public_get_qi_survey_by_slug` (function only — no schema/table change)
- Consumed by `QiSurveyPage.tsx` (shared by `QiSurveyRapidPage`, `QiSurveyLearnerPage`, `QiSurveyEmployerPage`) — all three public survey types affected identically, only `rapid_learner` individually re-tested so far
- `public_submit_qi_survey` was inspected but not changed — it was already correct once given a properly-keyed payload

## DB/RLS impact

None beyond the function body change itself — no schema change, no RLS involved. The underlying `qi_survey_questions` table columns (`question_code`, `question_text`, etc.) are unchanged; only the JSON output labels changed.

## Files changed

- `supabase/migrations/20260803105045_fix_qi_survey_question_key_mismatch.sql` (new — also reconciles git to the live, previously-undocumented rewrite of this function)

## Not yet done

- `acer_learner` / `acer_employer` survey types not individually re-tested (same RPC and contract, so expected to be fixed identically, but not confirmed live).
- Migration ledger repair (`supabase_migrations.schema_migrations` insert/`supabase migration repair`) not yet done for this migration's version — same manual step as the 31 July fix, since the Supabase CLI isn't available.
- The `submit_trainer_monthly_report_full` advisory-lock fix (separate incident, same session, Australian Academy Pty Ltd) is applied live and confirmed via `pg_get_functiondef`, but its migration file + audit entry are still outstanding — pending final confirmation that the affected trainer's resubmission succeeded.
