# Audit — PR #107 & #112: Bulk Evidence Upload Silent Save Failures + AI Analysis Rework

**Date:** 03 July 2026
**Branches:** `fix/bulk-evidence-silent-save-failures` (PR #107), `fix/analyze-trainer-evidence-batch-failures` (PR #112)
**Merged by:** Brian (Khian)
**Merge commits:** `b153a8b72` (#107), `d8777fe41` (#112)
**Reported by:** AJ Delostrico (Consultant Assistant, Vivacity) — flagged that a bulk credential upload for a trainer at Newcastle Rescue looked successful but most files never appeared
**Trainers involved (test data, Newcastle Rescue tenant):** David Arthur, John Owen

---

## What was fixed

### PR #107 — Bulk evidence upload silently losing records

- Root cause: the bulk-upload wizard's reconciliation step (`useTrainerOnboarding.ts` → `confirmAndSave`) marked an uploaded file's `evidence_documents` row as `disposition: 'created_new_record'` based on whether a record had been *proposed* for it, not whether the database insert actually *succeeded*. Confirmed against real data: John Owen had 13 PD certificates stamped "created_new_record" in `evidence_documents` with **zero** matching rows in `trainer_pd`.
- Evidence-only files (low AI confidence, no record of their own) were also being attached to whichever record happened to be created *first* in the batch, regardless of whether it matched the file's actual type — a genuinely unrelated certificate could get linked to an arbitrary credential.
- The "already uploaded" duplicate check (file-hash match) trusted that a matching hash meant the file was fully handled, even when no real record existed for it — so a previously-failed save could never be retried, only re-flagged as "already uploaded."
- Fixes:
  - A file is now only marked `created_new_record` after its insert is confirmed. Failed inserts are marked `save_failed` / `needs_review` with the real database error attached.
  - Evidence-only files now only link to a record of their own predicted type.
  - The duplicate-hash check now confirms a real record (or a deliberate no-record disposition) exists before treating a file as resolved.
  - Bulk upload is now scoped per tab (Credentials / Currency / PD). The tab is a hard expectation — if the AI's classification disagrees with it, the file is forced to manual review instead of being silently auto-created under the wrong category or dropped. The header button is relabelled per tab and hidden on tabs it doesn't apply to (Units/TGA Units have their own tools; PD already had its own dedicated button).
- Files: `src/hooks/useTrainerOnboarding.ts`, `src/lib/evidence/evidenceService.ts`, `src/lib/evidence/evidenceNormalisation.ts`, `src/components/trainer-matrix/TrainerProfileDrawer.tsx`, `src/components/trainer-matrix/onboarding/TrainerOnboardingWizard.tsx`, `src/types/trainer-onboarding.ts`, `src/pages/admin/trainers/TrainerMatrixEngine.tsx`

### PR #112 — AI evidence analysis: read real documents, isolate per-file failures

Found while QA-testing the #107 fix live: uploading 39 files for John Owen returned 0% confidence / "AI analysis failed" for 35 of them.

- Root cause: `analyze-trainer-evidence` classified every file from its **filename alone** — it never actually read the certificate. The `EvidenceFile` interface had an unused `base64Content` field and a system prompt written as if real content was being read, but the actual request body only ever contained `fileName` + `fileType`. The sibling function `analyze-credential-certificate` (used by the single-file "Add Credential" AI Analyze button) already reads real document content correctly — this function never got the same treatment. Judged as an incomplete build, not a deliberate cost/speed tradeoff (no comment justifying it, unused field left in place, prompt inconsistent with actual behaviour).
- It also batched 5 files per AI call — one malformed response failed all 5 files together with a generic "AI analysis failed," no real reason surfaced.
- Fixes:
  - Reworked to process one file per call. PDFs and images are downloaded from Storage and sent to Claude as real document/image content (same pattern as `analyze-credential-certificate`). Word docs (`.doc`/`.docx`) have no native Claude equivalent and keep the filename-only fallback — called out explicitly in code.
  - A failure now only affects the one file that failed.
  - `useTrainerOnboarding.ts` calls the function once per file (3 concurrent) via `callEdge` (was raw `supabase.functions.invoke()`, a banned pattern). Exposes live `analysisProgress` so the UI shows "14 of 39 analysed" instead of a static spinner.
  - Fixed a flexbox bug in the analysis review cards: the file-info wrapper was missing `min-w-0`, pushing the classification dropdown/delete button off the edge of the card on narrower screens. Row now stacks the actions below the file info on narrow screens.
- Files: `supabase/functions/analyze-trainer-evidence/index.ts`, `src/hooks/useTrainerOnboarding.ts`, `src/components/trainer-matrix/onboarding/TrainerOnboardingWizard.tsx`, `src/components/trainer-matrix/onboarding/steps/AIAnalysisStep.tsx`

---

## Bot findings cleared (pre-merge, PR #112, second commit)

Three Cursor Bugbot findings raised against the first #112 commit. All confirmed genuine (verified against current HEAD, not the stale reviewed commit — none were false positives).

| Finding | Severity | Resolution |
|---|---|---|
| `btoa(String.fromCharCode(...new Uint8Array(buffer)))` spreads every byte as an individual function argument — throws `RangeError` for any real certificate file (100–300KB), silently downgrading real-document analysis back to filename-only for most uploads | High | Encode in 8192-byte chunks instead. Consolidated into new `supabase/functions/_shared/base64.ts` rather than leaving the fix duplicated |
| `runAIAnalysis` marked every `uploadedFiles` entry as `analyzing`, but only files not already in `error` status were ever moved out of it — an errored file got bumped to `analyzing` and stuck there forever | Medium | Scoped the `analyzing`/rollback status changes to only the files actually sent for analysis |
| When a supported file type's Storage download failed, the fallback prompt still said "unsupported file type: application/pdf" — blaming the format for what was actually a storage problem | Medium | Track *why* content couldn't be attached (`unreadableReason`) and message each case accurately |

**Found during the same pass, not originally bot-flagged:** the identical base64-spreading bug also existed in `analyze-credential-certificate/index.ts` and `ingest-trainer-credentials/index.ts` (both download and encode arbitrary-size files). Both now use the same `_shared/base64.ts` helper. Two other files with a similar-looking pattern (`generate-secure-token/index.ts`, `_shared/jwtRotation.ts`) were checked and left alone — they encode a fixed 32-byte HMAC signature, not a file, so there's no overflow risk.

Also improved while addressing the labeling finding: the edge function's outer catch-all and the client-side per-file fallback both now include the real error message instead of the same generic "AI analysis failed" sentence every time.

---

## Post-merge live QA finding — not a bug

After both PRs were live, Brian ran a real bulk-upload test against Newcastle Rescue (John Owen) and every file failed with a 403 on the final "Create Records" step, with the new honest "No records saved" toast (from the #107 fix) correctly surfacing the failure instead of a false success.

**Root cause, confirmed against the live DB:** Newcastle Rescue's Stripe subscription lapsed (`paid_through_date: 2026-07-01`, two days before the test). The tenant's `write_locked` flag flipped to `true`, and every table that creates real records (`trainer_matrix_credentials`, `trainer_onboarding_sessions`, etc.) has a restrictive RLS policy — `USING (NOT sec.is_tenant_write_locked(tenant_id))` — that blocks all writes once a tenant is write-locked, regardless of role. This is unrelated to either PR's code; it's the intended billing safeguard, working as designed.

**Confirmed intentional by Brian — no action taken.** Left as-is. Notable side effect: this incident is a real-world demonstration that the #107 fix works — before it, this exact scenario (every single insert rejected) would have been reported to the user as a false "success."

Unrelated noise seen in the same console log, not investigated as part of this work: `rpc/lkl_get_clause_with_audit_status` returning 404, and `rpc/validate_evidence_mapping` returning 400 ("malformed array literal: legacy_path_differs"). Pre-existing, unrelated to bulk upload.

---

## Files changed (both PRs combined)

| Area | File |
|---|---|
| Onboarding hook — save tracking, AI analysis, progress state | `src/hooks/useTrainerOnboarding.ts` |
| Evidence service — dedupe/resolution check | `src/lib/evidence/evidenceService.ts` |
| Evidence normalisation — tab-expectation mismatch handling | `src/lib/evidence/evidenceNormalisation.ts` |
| Trainer profile drawer — bulk upload button scoping/labels | `src/components/trainer-matrix/TrainerProfileDrawer.tsx` |
| Onboarding wizard — mode titles, progress prop threading | `src/components/trainer-matrix/onboarding/TrainerOnboardingWizard.tsx` |
| AI analysis step — progress bar, layout fix | `src/components/trainer-matrix/onboarding/steps/AIAnalysisStep.tsx` |
| Onboarding types — new modes, expected-category map | `src/types/trainer-onboarding.ts` |
| Trainer matrix engine page — bulk upload mode routing | `src/pages/admin/trainers/TrainerMatrixEngine.tsx` |
| Edge function — real document analysis, per-file isolation | `supabase/functions/analyze-trainer-evidence/index.ts` |
| Edge function — base64 fix | `supabase/functions/analyze-credential-certificate/index.ts` |
| Edge function — base64 fix | `supabase/functions/ingest-trainer-credentials/index.ts` |
| New shared helper | `supabase/functions/_shared/base64.ts` |

---

## Decisions recorded

| Decision | Outcome |
|---|---|
| Fix "AI reads filename only" vs leave as-is | Fixed. Judged an incomplete build (unused `base64Content` field, prompt inconsistent with behaviour, working sibling function already existed), not a deliberate design choice. Approved before implementation given the cost/latency tradeoff of real document analysis. |
| One file per AI call vs keep batching | One file per call. Gives per-file failure isolation, real live progress, and a clean point to attach real document content — solves three separate asks (real reading, progress counter, no shared-blast-radius failures) with one architectural change. |
| Word document (.doc/.docx) real-content reading | Explicitly out of scope for this fix — Claude has no native document type for Word files, would need a separate text-extraction step. Kept on filename-only fallback, called out in code. |
| Tab-scoped bulk upload restriction | The launching tab is a hard expectation, not a suggestion — AI disagreement forces manual review rather than silent auto-create under the wrong category or silent drop. |
| Fix sibling `analyze-credential-certificate` base64 bug in this branch | Yes, same bug, same fix, low risk — expanded scope slightly rather than deferring to a separate PR. Also swept the whole `supabase/functions/` tree for the same pattern and found + fixed one more real instance (`ingest-trainer-credentials`). |
| Newcastle Rescue write-lock (post-merge QA finding) | Confirmed intentional by Brian. No fix applied — working as designed. |

---

## Notes

- No migration required for either PR — all changes are frontend + edge function code.
- John Owen's 13 originally-lost PD certificates (the trigger for this whole investigation) still need manual re-entry — neither PR recovers already-lost data, only prevents recurrence.
- Branch DBs cannot exercise the AI-analysis path end-to-end — `ANTHROPIC_API_KEY` is a Tier-1 secret not currently configured for branch databases (see `complyhub-kb/localshi/qr_work/BRANCH-SEEDING-SECRETS-INVENTORY.md`). Both PRs' AI-dependent code paths were verified by manual code trace + live production QA after merge, not branch QA.
