# Audit — PR #800

> **Date:** 26 August 2026 (audit written); **Merged:** 26 August 2026 06:12 UTC
> **Scope:** Resources > Fees "Edit Fee" modal autosave; `generate-tas-sections` Section 6
> (Delivery Methodology) prompt fix — Facility/Resources and fee-flag data that was already
> fetched from the database but never referenced in the prompt sent to Claude
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — scoped directly from Brian's
> two-item request in-session (worktree C)

---

## Summary

Two independent TAS Engine fixes requested together: (1) the Fees modal required an explicit
"Update" click to save, with no autosave and no save-state feedback; (2) the AI section-generation
edge function was silently dropping Facility/Resources and Assessment Conditions data — and fee
refundable/payment-plan flags — that had already been fetched from the database into its own
context object but never referenced in the prompt text sent to Claude, so generated TAS documents
never reflected them.

Both were scouted read-only first (`Explore` agents mapping the modal's save flow and the
generation pipeline) before any code was written. A fresh-eyes adversarial review (`checker`
skill) was run against the full working-tree diff before push, including live-DB verification of
schema/RLS/triggers and a diff of the live deployed `generate-tas-sections` source against git. It
found three confirmed bugs — including one that would have broken the build entirely and one real
infinite-loop bug — plus four second-look items, all fixed before this PR was opened. Without that
review, this branch would not have compiled.

**Branch:** `feat/tas-fees-autosave-and-tas-gen-audit` (merged; not yet confirmed deleted) ·
**Merge commit:** `a1a7807e5` · **Migrations:** 0 · **Edge functions:** 1
(`generate-tas-sections`, +1 new helper file) · **Frontend:** 2 files
(`AddFeeDialog.tsx`, `useTasBuilderFees.ts`)

**PR:** https://github.com/ComplyHub-ai/rto-compass-hub/pull/800

---

## Problem statement (what was broken)

| Area | Symptom | Root cause (confirmed) |
|---|---|---|
| Fees "Edit Fee" modal | Editing a fee required an explicit "Update" click; no autosave, no save-state feedback | No autosave existed on this modal at all — the payment-plan row "save" icon only flipped a local `saved` flag gating form validity, it never touched the database. The rest of the codebase already had a working debounced-autosave pattern (`useAutoSave.ts`, used by the Delivery & Assessment Plan page) that this modal simply didn't use. |
| `generate-tas-sections` Section 6 prompt | Generated TAS documents' "Student Resources" text was invented by Claude with no basis, and never referenced fees' refundable/payment-plan status | `build.resources.summary` (Facility/Resources + Assessment Conditions items, captured via "Fetch Assessment Conditions"/"Pull Facility and Resources") and the `is_refundable`/`payment_plan_included` fee columns were both already fetched into the function's context object (`build` via `select('*')`, fees via an explicit column list) but never interpolated into the Section 6 prompt string sent to Claude. |
| **(fresh-eyes finding)** `AddFeeDialog.tsx` `buildPayload` | Branch did not compile — `tsc` failed with `TS2322`/`TS2345` | Extracting the fee-record-building logic out of `handleSubmit` into its own function lost the `if (!type) return` narrowing TypeScript relied on; `type: FeeType \| ''` no longer satisfied `CreateFeePayload.type: FeeType`. This also silently broke the pre-existing manual-submit path, not just the new autosave one. |
| **(fresh-eyes finding)** `AddFeeDialog.tsx` autosave + `useTasBuilderFees.ts` | Infinite autosave loop + toast storm on one specific dialog-open path | Opening "Add Fees" and having it auto-detect an existing payment plan (a pre-existing app behaviour, not new) sets `editingFeeId` via a hydration effect keyed on a `useMemo` over the refetched `fees` list. Autosave → mutation success → query invalidation → refetch returns a new array reference → the `useMemo` produces a new object → the hydration effect re-fires → new `ppItems` array identity → autosave's dependency array sees a "change" → repeat, with no user input, forever. The explicit row-click edit path (`editFee` prop, a stable snapshot) was never affected. |
| **(fresh-eyes finding)** `useTasBuilderFees.ts` `update` mutation | Every autosave popped a "Payment plan updated" toast, even for non-payment-plan fee types | The mutation's `onSuccess` toasted unconditionally — fine for the old click-once-per-save manual flow, wrong once autosave could fire every 800ms of typing. |
| **(fresh-eyes finding, worth-a-second-look, fixed)** `AddFeeDialog.tsx` autosave timer | A stale scheduled save could persist an invalid mid-edit row | Validity (`amountValid`/`itemsValid`) was checked only at `scheduleSave()` time, not at the moment the debounced callback actually fired — if the user made a row invalid within the 800ms window, the save still ran against current (invalid) state. | 
| **(fresh-eyes finding, worth-a-second-look, fixed)** `AddFeeDialog.tsx` Cancel button | "Cancel" no longer reliably discarded changes in edit mode | With autosave active, edits older than 800ms were already persisted by the time Cancel was clicked, but the button still read "Cancel", implying full discard. |
| **(fresh-eyes finding, worth-a-second-look, fixed)** `formatDeliveryContext.ts` | Resources-summary prompt text referenced a `location` field that doesn't exist in any live record | Written against an assumed shape rather than the real one; live-DB check across 657 summary elements showed no `location` key at all, while `units` (linking a resource to specific unit codes) existed on 627 of them and was unused. |
| **(fresh-eyes finding, worth-a-second-look, deliberately not fixed — separate scope)** `formatDeliveryContext.ts` `formatFeesLine` | Payment-plan/additional fee amounts render as `$null` in the generated prompt text | Pre-existing: `amount` is `NULL` in `q1_tas_builder_fees` for those two fee types (real amounts live in `description.items`), and this PR only touched the refundable/payment-plan-included flags, not the underlying amount source. Parked, not part of this PR's scope. |

---

## Commit history (substantive only)

| Commit | Summary |
|---|---|
| `c9fc87a8a` | All work for this PR — fees modal autosave, `generate-tas-sections` prompt fix, and every fresh-eyes-confirmed fix (compile error, infinite loop, toast suppression, stale-timer revalidation, Cancel label, `location`→`units` swap) — squashed into a single commit before push, since the compile-breaking intermediate state was fixed pre-commit rather than shipped as its own commit. |
| (merge, `a1a7807e5`) | `origin/main` merged into the branch before push (PR #798 had landed since branch-off) — no conflicts, own files confirmed unaffected by the merge; then PR merged to `main`. |

---

## Fixes shipped

### Frontend — Fees modal autosave

- **`AddFeeDialog.tsx`** — added debounced autosave (via the existing `useAutoSave` hook) with a
  "Saving… / All changes saved" indicator next to the dialog title. Scoped strictly to
  `isExplicitEditMode` (`!!editFee`, i.e. the user clicked a fee row to edit it) — the
  auto-detected "existing payment plan" branch keeps its manual Submit button, since autosaving
  there would loop (see Problem statement). Autosave is gated behind the same `amountValid &&
  itemsValid` checks the manual Update button always used, re-checked at save-fire time (not just
  schedule time) so a mid-edit invalid row can't sneak through. `buildPayload` now takes an
  explicit `FeeType` parameter to restore the type narrowing lost in the original extraction.
  Cancel button now reads "Close" in edit mode (autosave means it's no longer a true discard).
- **`useTasBuilderFees.ts`** — `update` mutation accepts an optional `silent` flag; when set (used
  by the new autosave path), the success toast is suppressed so a user typing doesn't get a popup
  every 800ms.

### Edge functions

**`generate-tas-sections`** (`supabase/functions/generate-tas-sections/index.ts`, +1 new file) —
Section 6 (Delivery Methodology) prompt now includes:
- Fee refundable/payment-plan-included flags, via the new `formatFeesLine` helper.
- Facility/Resources + Assessment Conditions summary items (`build.resources.summary`, already
  fetched, previously unused), via the new `formatResourcesSummaryLine` helper — using the real
  `units` field (linking a resource to specific unit codes) rather than the non-existent
  `location` field the first draft assumed.

Both helpers were extracted into a new `formatDeliveryContext.ts` specifically to keep `index.ts`
under the repo's 500-line edge-function cap (it hit 517 lines inline; 499 after extraction). No
new database queries — `build` was already fetched via `select('*')` earlier in the same function.

### Database

None. All migration files present in the branch's diff against `main` were inherited from PR
#798's own work (merged into this branch to catch up before push), not authored by this PR.

---

## Review rounds

1. **Scout (read-only recon), 2 parallel agents** — one mapped the Fees modal's save flow and
   confirmed an existing autosave-with-indicator convention already existed elsewhere in the
   codebase to reuse; one traced the TAS generation pipeline (`generate-tas-sections` vs.
   `export-tas-document`, two independent edge functions chained through the `tas_draft_sections`
   table) and confirmed exactly which builder sections were/weren't reaching the generated
   document.
2. **Scoped `tsc` compile check** (isolated tsconfig limited to the touched files, never the
   full-codebase `tsc --build` per the repo's hang-risk rule) — confirmed clean after the
   fresh-eyes-found compile error was fixed.
3. **`eslint`, scoped to touched files** — clean throughout, before and after the fresh-eyes
   fix round.
4. **Fresh-eyes adversarial review** (`checker` skill, `pr-review-toolkit:code-reviewer`
   subagent, live-DB verification against `gdwhlstfguxarnxasrrs`) — found 3 confirmed bugs
   (compile error, infinite autosave loop, wrong toast) and 4 worth-a-second-look items (all
   fixed except the pre-existing `$null` payment-plan amount, deliberately parked). Also
   confirmed: no banned patterns introduced, file-size caps respected, `q1_tas_builder_fees`
   schema/RLS/triggers match what the code assumes, and the live deployed
   `generate-tas-sections` source matched git's pre-change version (confirming this was a
   genuinely unreleased diff, not overlapping unrelated drift).
5. **Post-fix re-verification** — scoped `tsc` re-run confirmed the fresh-eyes-found compile
   error was actually resolved (not just superficially patched); lint re-run clean.

---

## Production rollout (post-merge)

1. **Vercel production** — deployment `dpl_73jm77Bhf1pmEwwtzb64HgLeubmJ`, `target: production`,
   `state: READY`, `githubCommitSha: a1a7807e5` (the PR #800 merge commit) — verified via
   `list_deployments`.
2. **Edge functions** — `generate-tas-sections` auto-redeployed to version 12 on merge; live
   source pulled via `get_edge_function` and confirmed to exactly match the git diff (imports and
   calls `formatFeesLine`/`formatResourcesSummaryLine` from the new `formatDeliveryContext.ts`).
3. **Migrations** — none.
4. **Worktrees** — Worktree C (`rto-compass-hub-C`) released: confirmed clean, `main` not checked
   out in either other worktree, checked out and fast-forwarded to `origin/main`, ledger row set
   to `unclaimed`.

---

## Manual QA checklist (post-merge — Brian-gated)

- [ ] Open Resources > Fees, click an existing fee row to edit it, confirm edits autosave with the
      "Saving…/All changes saved" indicator and no toast spam.
- [ ] Confirm "Add Fees" → select Payment Plan when one already exists still requires manual
      Submit (no autosave, no infinite-loop/toast-storm regression).
- [ ] Regenerate TAS Section 6 for a build with Facility/Resources data recorded via "Pull
      Facility and Resources", confirm the generated text actually references it.
- [ ] Confirm regenerating Section 6 for a build with a refundable/payment-plan-included fee shows
      that in the generated fees line.

None of the above has been manually clicked through post-merge as of this writing — only
scoped-`tsc`/lint/fresh-eyes-review verification and the deployment/edge-function checks above.

---

## Still open / follow-up

- **Payment-plan/additional fee amounts render as `$null`** in the Section 6 generated prompt
  text — pre-existing, not introduced by this PR, deliberately left out of scope. `amount` is
  `NULL` for those fee types in `q1_tas_builder_fees`; real amounts live in `description.items`
  and `formatFeesLine` doesn't currently unpack them. Needs its own FRAME if Brian wants it fixed.
- No living doc was used for this task (scoped directly in-session) — nothing to reconcile/delete.

---

## Soak status

No feature flag — both changes are live for all tenants immediately. Low risk tier: the fees
autosave is additive UI behaviour with a manual-save fallback already proven for the one path
excluded from autosave; the generation prompt fix only affects TAS sections generated *after* this
merge (already-generated draft sections in the database are unaffected until regenerated). Watch
for: any report of unexpected "Payment plan updated" toasts (would indicate the `silent` flag
isn't reaching the mutation), or a fee row failing to persist silently (would indicate the
save-fire-time revalidation is rejecting a legitimately valid state).

---

## References

- PR: https://github.com/ComplyHub-ai/rto-compass-hub/pull/800
- Merge commit: `a1a7807e550342dcf6f8ba8bf70219855173a260`
- Vercel deployment: `dpl_73jm77Bhf1pmEwwtzb64HgLeubmJ`
- Active work ledger: `active-work.md` (Worktree C row, released)
