# Active Work — THE LEDGER (source of truth)

> Parked findings and follow-ups for a **later session** — not current in-progress work.
> Promote to a real task only via a new FRAME. See `CLAUDE.md` § "The Loop."

Last updated: 10 August 2026

---

## IN PROGRESS — PR review session (started 10 Aug 2026, resume here)

**Context:** Working through the 3 open rto-compass-hub PRs per `pr-review-open-prs.md` (workspace root) using the `/pr-review` skill and the Scout → Reviewer flow. Open PRs: #395, #396, #397 (see `pr-review-open-prs.md` for the full table — do not duplicate that tracking here, this section is just the resume pointer).

**Currently mid-review: PR #396** — "fix: qi_phase0_remap branch-DB crash + onboarding supervision silent resolve + extract-industry-themes inactive membership" (branch `cursor/critical-bug-investigation-2461`, tier-b). Scout recon is COMPLETE (all 3 fixes traced and confirmed correct at the code level). Stage 2 full Reviewer pass (mechanical gauntlet + adversarial review + verdict) has NOT been run yet.

**Open decision needed from Brian before Stage 2 can close out — Issue 2 (onboarding supervision fix) nav gap:**
- The fix correctly stops silently marking onboarding evidence "resolved" when a trainer supervision record wasn't actually created — it now routes those items to a `needs_review` state instead.
- BUT: traced the actual UI reachability and found the `needs_review` flag is only visible via one specific click path: Sidebar → Training & Assessment → Trainers Matrix → click a trainer → `TrainerProfileDrawer` → `OnboardingSummaryCard`.
- A SEPARATE, more obviously-named trainer management screen exists — Sidebar → VET Workforce → Profile Management (`/dashboard/trainers`) → click a trainer → `TrainerDrawer` → has a "Supervision" tab — but that drawer does NOT show the onboarding `needs_review` flag at all.
- Also found two unrelated supervision-related pages/routes (`registers/supervision`, `admin/trainers/supervision`) that exist in code but have NO click path from any menu — orphaned routes, not linked from `roleMenuConfigs.ts` or any sidebar config found.
- **Question for Brian:** do staff actually use the Trainers Matrix screen day-to-day (in which case the fix is fine as-is), or do they primarily use Profile Management (in which case the `needs_review` flag needs to be added to that drawer too before this PR can be called fully closed)? This should be resolved before finalizing the Stage 2 report and verdict for PR #396.
- The sibling backlog item found during this same Scout pass (~62 edge functions missing the same active-membership check as `extract-industry-themes`) is considered resolved/out-of-scope for #396 per Brian's 10 Aug 2026 confirmation — does not block this PR.

**Next steps on resume:**
1. Get Brian's answer on the Issue 2 nav-gap question above.
2. If Profile Management needs the flag too — scope that as either a small addition to this PR or its own follow-up (Brian's call).
3. Run the Stage 2 full Reviewer pass on PR #396 (mechanical gauntlet + adversarial review + verdict), incorporating the nav-gap finding as a MEDIUM issue in the report.
4. Then proceed to PR #395 and #397 (not yet started).


***********************

PR #395 — fix: re-land soak delete orphans + QI billing_gate write over-grant
Branch: cursor/critical-bug-investigation-c6f2
Verdict: REQUEST CHANGES — Severity: HIGH

Summary: The soak-bucket fix and the billing_gate security fix are both sound and verified against production, but a new DB read in the shared EvidenceUploader breaks the live AVR form, and the branch needs a real merge (not just edits) to clear two conflicts with main.

Issues found:

[HIGH] src/components/shared/EvidenceUploader.tsx:242-246 — new loadDbFileRefs DB read uses recordId as a UUID lookup. AVRForm.tsx:790 passes recordId="temp-id" → confirmed live against production this throws 22P02: invalid input syntax for type uuid. Result: AVR form now shows a spurious "Storage Error" toast on every open, and successful uploads show "Upload error" because persistFileRefs never runs. Blocker.
[MEDIUM] same function — maybeSingle() returning null, null (row invisible via RLS, or absent) falls through to a storage-only list, then persistFileRefs writes it — silently truncating the exact legacy-bucket paths this PR exists to preserve. The "never return [] on error" comment doesn't cover this null-row case.
[LOW] tests/storage/soakBucketCandidates.test.ts re-declares the map/function locally instead of importing — can't detect drift it exists to catch.
[LOW] consultation EvidenceUploader interpolates tenantId into a RegExp unescaped — safe today (UUIDs), fragile.
[LOW] migration filename timestamp (06 Aug) is behind 12 already-merged migrations — re-stamp before merge.
Schema verified: documents_register.custom_id NOT NULL/no-default confirmed (validates the #353 bug claim); documents_register_quality_area_check allowlist matches exactly; register id columns confirmed uuid (basis of the HIGH finding); qi_campaigns/qi_campaign_recipients/qi_distribution_events billing_gate confirmed live and PERMISSIVE FOR ALL in production right now — the over-grant is real. All 5 edge functions confirmed registered in config.toml.

Migrations: 1 file, 20260806130000_fix_qi_campaign_billing_gate_restrictive.sql — MIGRATIONS PRESENT, manual deployment required (interim procedure, not db push/apply_migration). Risk: LOW — idempotent, matches an existing precedent pattern, and every write path to these 3 tables is SECURITY DEFINER (RLS-bypassing) so the RESTRICTIVE policy can't break anything live. Verification SQL included in full review (checks 3 RESTRICTIVE rows exist, 0 old PERMISSIVE rows remain).

Build check: Vercel PASS. CI's own TS type-check is vacuous (tsconfig.json checks zero files) — flagged as a standing CI gap, not this PR's fault. Real signal: CI Edge Functions type-check PASS (covers all 5 changed functions), lint PASS, 9/9 relevant tests pass locally.

CI: Vercel pass / Supabase Preview fail (unexplained, doesn't correlate with migration presence across other open PRs — worth one manual log check, not necessarily this PR's bug).

Foresight:

Callers/contract: all other uploadDocumentFile callers pass no metadata, so the new custom_id guard can't break them; safeMeta allowlist is a genuine security improvement over the old raw ...metadata spread.
Live data: 58 of 83 tenants are inactive — the RESTRICTIVE policy also gates SELECT for them, currently harmless since nothing reads these tables yet, but will matter once QI UI ships.
RLS/roles: super_admin and consultant paths confirmed unaffected; specifically checked against the exact failure pattern that bit a similar restrictive-policy migration already on main (trainer_vet_currency owner-only break) — these 3 tables have no owner-only policies, so that failure mode doesn't apply here.
Dry-run PR → main: 2 conflicts (verified git status clean before/after, dry-run branch cleaned up) — evidenceService.ts (comment-only), register-evidence-manager/index.ts (real logical overlap with #368's already-merged narrower fix, but #395 is a confirmed strict superset — resolve in #395's favor).

Fixes needed before merge:

Guard loadDbFileRefs against non-UUID recordId (HIGH, blocker)
Close the maybeSingle() null-row truncation hole (MEDIUM)
Real merge commit from main to resolve the 2 conflicts (branch is 41 commits behind)
Fix the test to import real symbols instead of duplicating (LOW)
Re-stamp migration filename (LOW)
Post-merge: apply migration manually + verify, deploy all 5 edge functions

---

## Backlog — PARKED findings (NOT scheduled work)

_Adjacent issues surfaced during work but outside the task's Scope Line. Parked here so they
aren't lost and aren't chased. Promote to a real task only via a new FRAME._

_(All prior backlog items and the 6-item diagnosis/implementation batch from 07 Aug 2026, plus the
Document Register bulk-delete investigation, were confirmed done by Brian as of 10 Aug 2026 and
cleared from this ledger. See `complyhub-kb/audit/` and git history for that completed work if it
needs to be revisited.)_
