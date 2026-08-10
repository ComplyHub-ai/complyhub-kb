# Audit — PR #400

> **Date:** 10 August 2026 (audit written); **Merged:** 10 August 2026
> **Scope:** Trainers Matrix Engine UX cleanup + a real classification/risk-flag consistency bug found
> during that review
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — worked directly in conversation, no
> intermediate `.md` file created for this body of work

---

## Summary

Started as a UX review of the Trainers Matrix Engine page and a trainer's detail drawer at Brian's
request (screenshot-driven, "what looks broken vs. what's just confusing"). Turned up a real backend
bug along the way: two SQL functions computed a trainer's compliance classification and their
compliance risk flags from the same underlying data, but used different bars for what counted as
"good enough" — one accepted merely-submitted (`pending`) credentials, the other required actually
-reviewed (`verified`) ones. Result: a trainer's profile could show a green "Full Trainer & Assessor"
badge and a red "Credentials Unverified" warning at the same time. Fixed the logic, checked the blast
radius against live production data before shipping, then rolled the fix out end-to-end (migration →
production apply → ledger repair → bulk recompute across every tenant).

**Branch:** `fix/trainer-matrix-ux-cleanup` (not yet deleted) · **Merge commit:** `5604be357` ·
**Merged:** 10 Aug 2026 · **Migration:** `20260810120000` · **Follow-up commit (same PR, same day):**
`db1005cc6` (dropdown positioning fix, added after merge review continued)

## Fixes shipped in PR #400

### Trainers Matrix Engine main table — UX cleanup

- Renamed the per-trainer detail tab from a dynamic `Full Matrix: {trainer name}` label (looked like
  leftover debug/test state) to a fixed `Trainer Detail` label.
- De-duplicated the Status column badge for `non_compliant` rows — it repeated the exact text already
  shown in the Classification column on the same row.
- Unified the Supervisor column's two "not applicable" renderings (`N/A` and `—`) into one consistent
  dash.
- Downgraded the PD-gap advisory diagnostics (`no_ta_pd`, `no_industry_pd`) from `medium` to `info`
  severity in `useTrainerDiagnostics.ts` — these apply to every trainer including fully compliant ones,
  so they shouldn't carry the same visual weight as an actual compliance blocker.

### Trainer drawer — Onboarding Evidence Summary labeling

`OnboardingSummaryCard.tsx` already computed two genuinely different things (record-type counts vs.
evidence-file disposition counts) but rendered them as one unlabeled list that looked like it should
sum to the "Records" tile — it doesn't, by design. Added a small caption above each group ("Record
types (sums to Records)" / "Uploaded file status (separate from Records)") so the distinction is
visible instead of implied.

### Classification / risk-flag contradiction — `compute_trainer_classification` and
`compliance.compute_trainer_status`

**Root cause:** `compute_trainer_classification` (grants 1A–1E, `can_train`/`can_assess`) counted a
credential/currency record as sufficient if `status IN ('verified','pending')`. `compliance
.compute_trainer_status` (drives the drawer's risk-flag list) only counted `status = 'verified'` and
flagged the trainer "Credentials Unverified" / "Missing Vocational Map" / "No industry currency" when
it found zero verified records — even on a trainer classification had just approved based on pending
ones. Both signals were individually correct; shown together on the same trainer they contradicted
each other.

**Fix (migration `20260810120000_require_verified_not_pending_for_trainer_classification.sql`):**
- Tightened every classification-bearing check in `compute_trainer_classification` to require
  `status = 'verified'`, not `'pending'`.
- Tightened `compliance.compute_trainer_status`'s own currency check the same way (it previously
  counted *any* status within 2 years, looser than classification's new bar — left alone, this would
  have created a fresh version of the same contradiction in the opposite direction).
- Reworded the risk-flag/warning messages so a record that was submitted-but-not-yet-verified reads
  differently ("submitted but not yet verified by an admin") from one that was never submitted at all
  ("no current industry currency") — the two need different follow-up actions (go click Verify, vs.
  chase the trainer for evidence).
- Both function bodies were diffed against live `pg_get_functiondef` output (not the git baseline
  alone) before writing the replacement, per this repo's migration discipline — confirmed neither
  function had been touched by any migration since the baseline snapshot.
- Migration was dry-run tested against live production rows inside a `BEGIN`/`ROLLBACK` transaction
  before ever being written to a file — confirmed exact predicted outcomes (test trainer → non-
  compliant, a trainer with genuinely verified evidence → unaffected, a real customer trainer with
  only-pending currency → `1A → 1B`) with zero permanent effect.

### TGA qualification/unit picker dropdown positioning

`QualificationSearchDropdown.tsx` always anchored below its trigger and only shrank its height as
space ran out, never considering the (often much larger) space above the trigger. When the trigger sat
near the bottom of a long scrollable drawer (the "Add Qualification & Units" search box on a trainer's
TGA Units tab), the dropdown ran past the visible viewport and became hard to scroll/select. Added
above/below space measurement; flips to open upward (anchored to the trigger's top edge, list order
reversed so the search box stays nearest the trigger) whenever space below drops under ~160px and more
room exists above. No page scrolling or zooming involved — the dropdown overlays content already
visible on screen above the trigger.

## Production rollout (post-merge)

1. **Schema change applied to production** via Supabase MCP `execute_sql` (not `apply_migration`, per
   this repo's interim migration procedure) — both function bodies replaced, verified live afterward
   via `pg_get_functiondef`.
2. **Migration ledger repaired** — Brian ran `supabase migration repair --status applied 20260810120000`
   from his terminal; confirmed `version`/`name` match the file exactly in
   `supabase_migrations.schema_migrations`.
3. **Bulk recompute run across every tenant** — looped `compute_trainer_classification` over every
   trainer already holding a classification row (111 total), using a snapshot-then-recompute-then-diff
   pattern in one SQL session (temp tables don't persist across separate MCP calls — learned this
   mid-task when a second call needed the "before" snapshot; recovered the same detail from the
   `trainer_timeline_events` audit trail the classification trigger writes automatically on every
   change, so nothing was lost).

**Result — 42 trainers changed classification:**

| Tenant | Trainers changed | Detail |
|---|---|---|
| Australian College Pty Ltd | 11 | all `1A → 1B` |
| Think Real Estate | 4 | all `1A → 1B` |
| Access Community Enterprises Limited | 1 | `1A → 1B` |
| Rural Medical Education Australia Limited | 1 | `1A → 1B` |
| Dijan Training Program | 1 | `1A → 1B` |
| ComplyHub Demo (internal, not a customer) | 23 | mix of `1A/1E→1B`, `1C→1D`, `1C→non_compliant` |
| Vivacity Testing Tenant (test account) | 1 | Brian Sismundo, `1A → non_compliant` |

**Zero real customer trainers dropped to non-compliant.** All 18 real-customer changes are the
predicted, safe `1A→1B` demotion — every affected trainer stays independent (can still train/assess),
just now correctly flagged for an unactioned currency-verification backlog rather than silently passing
on unchecked paperwork. Every affected currency record was confirmed pre-rollout to have
`verified_by = null` — this is a real, unactioned admin-review backlog at these RTOs, not a data-quality
problem. The higher-than-originally-estimated total (42 vs. an initial 20-trainer estimate) came from
under-sampling ComplyHub Demo's seeded dataset during the pre-flight blast-radius check, not from any
error in the fix itself or unexpected impact on real tenants.

## Still open / follow-up

- **Australian College Pty Ltd and Think Real Estate** carry the bulk of the real-customer currency-
  verification backlog (11 and 4 trainers respectively). Worth a heads-up to those RTOs that they have
  pending currency evidence sitting unreviewed — Brian to decide if/when to reach out.
- No code or schema follow-up identified. The `trainer_timeline_events` audit trail now has a
  permanent record of every classification change from this rollout, timestamped, queryable per
  trainer.

## Soak status

Not applicable in the usual sense (no feature-flagged behavior change to soak) — but this is a live
compliance-classification change directly affecting what real RTOs see on their dashboard as of
10 Aug 2026. Recommend keeping an eye on support tickets from Australian College Pty Ltd / Think Real
Estate over the next few days in case the classification change prompts questions.
