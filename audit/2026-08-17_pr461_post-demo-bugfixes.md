# Audit — PR #461

> **Date:** 17 August 2026 (audit written); **Merged:** 17 August 2026 03:42 UTC
> **Scope:** Post-demo bugfixes across SSO (interventions, student detail, deep links), trainer portal
> (team messages, compliance checklist, Help Centre nav), and governance meetings (start/close
> attestation, PDF minutes analysis, minutes draft AI path, edge-function error surfacing)
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — worked from fresh-eyes review +
> Bugbot follow-ups in session; no intermediate workspace `.md` file

---

## Summary

Follow-up to the SSO showcase / governance demo path shipped in PR #428 and related August work.
Brian ran a **fresh-eyes** adversarial review on branch `fix/bugfixesafterdemo` before merge; confirmed
bugs were fixed in-branch, then **Cursor Bugbot** on commit `8b9a62693` surfaced two more items
(interventions overdue filter semantics, trainer review draft corruption / stale close copy) addressed in
`a0e6b777b` before merge.

PR #461 touched **29 files** (+1,822 / −815 lines), **no migrations**, and **two edge functions**
redeployed automatically by CI on merge. Behaviour change with highest compliance impact: governance
meetings **warn** on start when trainer reports are missing but **block close** until reports are in or
a human attests review — **auto-mark reviewed on close removed** from both Live Meeting tab and
Meeting Status Manager.

**Branch:** `fix/bugfixesafterdemo` (merged; remote deleted) · **Merge commit:** `3773dcfc3` ·
**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/461

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| SSO student detail | Page froze / infinite re-render on student route | `SsoStudents.tsx` effect loop on student detail fetch |
| SSO interventions | Placeholder or wrong list behaviour | Not wired to shared `InterventionsList`; overdue deep link did not filter correctly |
| SSO at-risk / dashboard | Deep links landed on wrong filter/action | URL params (`filter=overdue`, `action=new`) not synced on load |
| Trainer team messages | Product-request feedback missing or wrong | `useTrainerTeamMessages` joined `trainer_product_requests` on `tp_trainers.id` instead of trainer `user_id` |
| Trainer compliance | Checklist stale after profile/doc edits | Missing invalidation / profile field coverage |
| Trainer nav | Help Centre hard to find | Removed from primary nav; only in quick actions in some builds |
| Governance close | Trainer reports auto-marked reviewed on close | `LiveMeetingTab` / `MeetingStatusManager` set review flag without human attestation — compliance gap |
| Governance close (Bugbot) | Same auto-mark path in status manager | `MeetingStatusManager` still had `auto_mark_trainer_reports_reviewed` on close |
| Governance start | Missing reports blocked meeting start entirely | Start gate too strict for demo/product intent |
| Governance review form | Partial edits corrupted on save | Review form re-seeded from DB while user still editing |
| Governance minutes upload | Scanned PDF minutes failed silently or with opaque errors | Analyser had no PDF text extraction; client did not surface edge-function errors clearly |
| Governance minutes draft | Executive summary truncated / wrong model tier | Two-call draft path + Haiku downgrade + silent truncation on regenerate |
| Interventions filter (Bugbot) | “Overdue” filter matched wrong field | Filter used `item.status === 'overdue'` instead of overdue follow-up date |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `8b9a62693` | **Main batch.** SSO interventions + student detail + deep links; trainer team messages + compliance checklist + Help Centre quick action; governance PDF extraction, single-call minutes draft, warn-only start / attested close, `extractEdgeFunctionError`, trainer report polling, bulk-merge visibility guard; fresh-eyes fixes (lint, banned patterns, hook error handling). |
| `10422590e` | Merge `origin/main` into branch (includes PR #459 migration drift reconciliation + PR #460 Smart Alerts fix). |
| `a0e6b777b` | **Bugbot follow-up.** Overdue intervention filter by follow-up date + dropdown label; trainer review form uses edit session seeded from DB baseline; convert modal remount on open; updated missing-reports banner copy; removed trainer auto-mark from `MeetingStatusManager` close path. |

Merge commit: `3773dcfc3` (PR #461).

---

## Fixes shipped

### Frontend — SSO

- **`SsoInterventions.tsx`** — uses shared `InterventionsList` instead of placeholder content.
- **`SsoStudents.tsx`** — student detail route with dedicated case fetch; fixed infinite render loop;
  risk summary and case links; lint fixes from fresh-eyes.
- **`InterventionsList.tsx`** — honours `?filter=overdue` and overdue follow-up date semantics
  (post-Bugbot: filters by overdue follow-up, not status label); “Overdue follow-up” filter option.
- **`SsoAtRisk.tsx`** — deep links sync to interventions list filters/actions.

### Frontend — trainer portal

- **`useTrainerTeamMessages.ts`**, **`trainerTeamMessagesHelpers.ts`** — team messages feed on
  credential health (document reviews, improvement plans, notifications, product requests, etc.);
  corrected FK for product-request rows (`user_id` not `tp_trainers.id`).
- **`trainerComplianceChecklist.ts`**, **`CredentialHealthReport.tsx`**, profile/doc tabs — extended
  checklist (WWCC, first aid, document categories); invalidates on profile/document changes.
- **`roleMenuConfigs.ts`** — Help Centre restored in trainer quick actions.

### Frontend — governance

- **`LiveMeetingTab.tsx`** — start: warn when trainer reports missing (meeting still starts); close:
  blocked until reports in or manual attestation; **removed auto-mark reviewed on close**.
- **`MeetingStatusManager.tsx`** — aligned close path; **removed auto-mark reviewed** (Bugbot fix).
- **`TrainerReportsPanel.tsx`** — dirty review state (`reviewEditSession` from DB baseline);
  convert modal remount when opened; clearer missing-reports banner copy.
- **`TrainerReportReadinessPanel.tsx`**, **`useTrainerReportMeetingSummary.ts`** — summary polling when
  tab visible; monthly report submit invalidates meeting summary.
- **`BulkMergePlansPanel.tsx`** — renders only when pending duplicate candidates exist.
- **`MeetingMinutesSection.tsx`**, **`MeetingMinutesUploadModal.tsx`** — clearer errors via
  `extractEdgeFunctionError`.
- **`src/lib/governance/extractEdgeFunctionError.ts`** — shared edge-function error extraction helper.

### Edge functions (auto-deployed on merge)

| Function | Change |
|---|---|
| `governance-meeting-analyser` | PDF text extraction via pdfjs; structured logging; clearer failure paths for unsupported/corrupt uploads |
| `governance-minutes-draft` | Restored `claude-sonnet-4-6`; single AI call with `stop_reason` check; 120s timeout; passes `tenant_id`; preserves existing executive summary on regenerate when new summary missing |

**Deploy:** GitHub Actions workflow **Deploy Edge Functions** run
[#31991994450](https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/31991994450) — **success**
17 Aug 2026 03:42 UTC (~45s after merge). Log confirms deploy to `gdwhlstfguxarnxasrrs`:
`governance-meeting-analyser` (960 kB), `governance-minutes-draft` (755 kB). **No manual
`supabase functions deploy` required.**

### Database

**None.** No migration files in PR. No `execute_sql` or `migration repair` post-merge step for this PR.

### Tests added/updated

- `tests/lib/extractEdgeFunctionError.test.ts`
- `tests/components/MeetingMinutesUploadModal.test.tsx`
- `tests/supabase/governance-meeting-analyser-fixes.test.ts`
- `tests/supabase/governance-minutes-draft-tenant-scope.test.ts`
- `tests/trainers/trainerComplianceChecklist.test.ts`

Targeted vitest: **32 tests passing** at pre-merge ci-gate (branch scope).

---

## Review rounds

1. **Fresh-eyes adversarial review** (pre-merge, branch `fix/bugfixesafterdemo`) — drove SSO loop fix,
   trainer FK fix, governance close attestation, minutes draft truncation guard, lint/banned-pattern
   cleanup, and hook error surfacing before first push.
2. **Cursor Bugbot** (commit `8b9a62693`) — interventions overdue filter, trainer review draft state,
   convert modal reset, stale copy, MeetingStatusManager auto-mark — fixed in `a0e6b777b`.
3. **ci-gate / pre-push** — eslint on changed ts/tsx, type-check, security guards; branch merged with
   `origin/main` twice before final merge.
4. **Supabase Preview CI** — failed on PR with `20260731100000` duplicate `schema_migrations_pkey`
   (preview ledger drift — same class as PR #398 audit). **Not caused by PR #461** (zero migrations);
   does not block production merge or edge deploy.

---

## Production rollout (post-merge)

1. **Vercel production** — auto-deploy on merge to `main` at `3773dcfc3` (frontend `src/**` changes).
2. **Edge functions** — auto-deploy via `.github/workflows/deploy-edge-functions.yml` (see above).
3. **Migrations** — none; ledger unchanged by this PR.
4. **Worktrees** — worktree C pulled to `3773dcfc3` on `main`; worktree A registry marked unclaimed
   post-ship (`active-work.md` 17 Aug 2026).

---

## Behaviour notes (intentional product change)

| Action | Before (problematic) | After (PR #461) |
|---|---|---|
| Start meeting with missing trainer reports | Could block or confuse operators | **Warn only** — meeting starts |
| Close meeting with missing trainer reports | Sometimes auto-marked reviewed | **Blocked** until all reports in **or** manual “trainer reports reviewed” attestation |
| Live Meeting / Status Manager close | Auto-mark reviewed flag | **Removed** — human attestation required |

This is stricter on **close** than some pre-428 copy implied; aligns with compliance intent from
fresh-eyes review (do not certify review without a human act).

---

## Manual QA checklist (post-merge — Brian-gated)

On **Vivacity Testing Tenant** (or ComplyHub Demo) on production (`rto.complyhub.ai`):

- [ ] SSO Interventions — list loads; `?filter=overdue` shows overdue follow-ups only; `?action=new` opens create flow
- [ ] SSO student detail — click through from list; page loads without freeze
- [ ] Trainer credential health — team messages show; product-request items link correctly
- [ ] Trainer profile/doc change — compliance checklist refreshes
- [ ] Help Centre — reachable from trainer quick actions
- [ ] Governance live meeting — **start** with missing trainer reports (warning only, meeting runs)
- [ ] Governance live meeting — **close** blocked until reports submitted or attestation ticked; no silent auto-mark
- [ ] Upload scanned PDF minutes — analyses or shows friendly error; DOCX/TXT still work
- [ ] Regenerate meeting minutes draft — executive summary not silently truncated

---

## Still open / follow-up

- **Manual QA** — checklist above not signed off in this audit session.
- **Supabase Preview ledger drift** — environmental; separate from this PR; blocks preview CI only.
- **Worktree A local branch** — may still checkout `fix/bugfixesafterdemo` at merge commit; safe to
  `git checkout main && git pull` when reclaiming worktree A.

---

## Soak status

No feature flag. Governance close-gate behaviour change affects all tenants immediately — watch for
operators unable to close meetings without attestation (expected) vs false-positive missing-report
counts. Edge-function AI path changes (PDF extraction, single-call draft) — watch minutes upload/analysis
failures and draft timeouts on large packs. Frontend SSO/trainer changes are lower risk once Vercel prod
is READY.

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/461
- Merge commit: `3773dcfc398c89045e16c7bca0ac1497f26cd1f2`
- Edge deploy run: https://github.com/ComplyHub-ai/rto-compass-hub/actions/runs/31991994450
- Related prior audits: `2026-08-13_pr428_sso-showcase-demo-bugs.md`,
  `2026-08-14_pr438_trainer-support-governance-meeting-workflows.md`,
  `2026-08-11_pr408_governance-meeting-analysis-foolproof-fix.md`
- Active work ledger: `active-work.md` (worktree registry updated 17 Aug 2026)
