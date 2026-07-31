# Audit — Ticket Batch: RPL Register, Adding Electives, Delivery Readiness, Trainer Matrix

**Date:** 31 July 2026
**Branch:** `fix/tickets+otherissuesfoundinTAS`
**PR:** #334 — merged, `ef9bd62ef..d9133048`
**Follow-up PR:** #338 — merged, `d91330486..0c0a54626` (fresh-eyes bot findings on this same work, plus an
unrelated migration-drift reconciliation)
**Source:** five open support tickets, diagnosed and implemented one at a time per the workspace's
living-doc workflow. Working file `ticketImplementationplan.md` (workspace root) is deleted after this
audit, per that workflow.

---

## What was fixed

### RPL Register — course code cannot be added
Hardcoded 7-course dropdown replaced with a tenant-scoped, searchable combobox
(`CourseCodeCombobox.tsx`, new `useTenantQualifications` hook), modeled on the existing
`TrainingProductSelector.tsx` pattern. Confirmed live: Australian College went from 2 of 25 real active
qualifications selectable to all 25.

### Adding Electives — qualification packaging rules misread
Root cause: the system was silently computing external-elective caps from an arithmetic guess
(`Math.min(2, elective/3)`) instead of the AI-extracted rule already sitting correctly in the database.
Fixed the precedence so the real extracted rule wins, added a confidence-tiered UI (high/medium/unknown)
so an unresolvable cap is shown honestly instead of guessed, and removed several hardcoded `?? 2`
fallbacks that would have silently reintroduced the same bug. A planned manual-override escape hatch
(Phase 4) was designed, coded, then **deliberately removed** after review — see "Decisions recorded"
below.
**Post-deploy audit (Phase 7) run 31 Jul 2026:** the one qualification identified as a genuine
over-permissive compliance risk (HLT23221 — previously allowed 2 external electives, real limit is 1) has
exactly one TAS platform-wide, with 0 external electives selected. **Zero violations found.**

### Error with the trainer units
Split into two independent issues under one ticket. The originally-reported trainer
("artwalters") turned out to be a correctly-working compliance warning on a genuinely incomplete profile
— not a bug, no code change; tracking of the follow-up question to the reporting customer moves to the
support ticket system, not tracked further here. A second, unrelated bug was found during investigation:
two Delivery Readiness warning codes (`units_without_trainers`, `units_without_assessment_validation`)
had no translation entry and rendered as raw backend strings — fixed with the two missing map entries.

### Delivery Readiness (three sub-issues)
1. Bulk "Apply to All Units" wrote a trainer to every unit in a TAS with zero per-unit qualification
   check, even though the picker correctly only offered course-level-qualified trainers. New shared
   helper (`trainerUnitQualification.ts`) now gates the actual write per unit, batches the writes, reports
   partial success honestly, and shows a capability badge (train-only / assess-only) instead of silently
   permitting an unqualified assignment.
2. Two different "coverage" percentages on the same screen (73.3% vs 0/15) were both individually correct
   but measuring different things (any trainer assigned vs. a qualified trainer) with no distinguishing
   label. Relabelled only — no calculation change.
3. A "Generate Schedule" button produced real data that was never displayed anywhere in the product. Added
   a read-only session list next to the existing button. Confirmed first that the button itself is
   load-bearing (a separate RPC blocks TAS compilation without it) — not hidden or removed.

### Trainer Matrix & Credentials Validation
1. A "N qualified" badge and the actual trainer picker measured "qualified" three different ways on the
   same screen, so a badge could say "1 qualified" while the picker showed nobody. Relabelled the badge to
   describe what it actually measures and added an explanatory message when the picker legitimately has
   nobody to offer.
2. The per-unit trainer coverage table was hard-capped at 10 rows with no way to reach the rest — 53 of 87
   TAS builds platform-wide (61%) exceeded this cap, one with 55 units permanently unreachable. Cap
   removed, made scrollable, added stable ordering.

## Fresh-eyes review findings (all fixed, this PR)

An independent adversarial review of the branch (no memory of the implementation conversation) found 6
additional real bugs the ticket fixes above had introduced or missed, plus 6 "worth a second look" items
after wider discussion:

| # | Bug | Fix |
|---|---|---|
| CB1 | Save button permanently disabled for real qualifications (packaging-rule constraint key mismatch — new regression) | Removed the broken per-group-constraint derivation entirely rather than patching the key mismatch |
| CB2 | Session-plan generation silently blocked when a cap is genuinely unknown, instead of warning | Distinguished "derived zero" from "unresolved" throughout the validator |
| CB3 | External-elective detection disagreed between files on real data, leaving some qualifications with no external-elective UI at all | One shared `isExternalRule` predicate used everywhere |
| CB4 | Trainer-permission warning fired on already-fully-permitted trainers | Routed through the same `getUnitCapability` helper as the bulk-assignment gate |
| CB5 | Deleted edge function (`tga-fetch-qualdetails`) still deployed and publicly callable in production | Undeployed via `supabase functions delete` and re-verified gone |
| CB6 | Bulk trainer assignment wrote one row at a time with no atomicity; a partial failure left the UI unrefreshed and out of sync with the DB | Batched into one write per distinct payload; partial failures now refresh the UI and report the real split |

Plus WSL4 (extraction-quality warnings were computed but never shown), WSL5 (false "cap unknown" alarm for
skill sets, which structurally have no electives), WSL7 (three sites mislabelled non-AI data as
`'ai_extracted'`), WSL8 (legacy builder's backup-trainer dropdown offered unqualified trainers the
write-path would silently reject), and WSL9 (RPL course filter couldn't match 11 of 12 platform-wide RPL
rows whose course code had since left active scope) — all implemented.

## Decisions recorded

| Decision | Outcome |
|---|---|
| Manual packaging-override escape hatch (Adding Electives Phase 4) | **Removed entirely**, not shipped. Already coded and reviewed, but live-checking training.gov.au for the 4 qualifications that hit "unknown" showed 3 of 4 genuinely have no stated rule to override — the feature would have let staff type an unverified number and have the system trust it as fact, for a problem smaller than assumed. Migration, hook, and component all deleted; zero references remain anywhere in the repo. |
| Trainer with single train/assess capability | Kept assignable (not tightened to require both), but must now show which capability they hold — rejected the stricter option because it would have invalidated 8 currently-active trainers across 5 tenants with no VET-requirement basis for the stricter rule |
| "Coverage" percentage semantics (any-assigned vs. qualified) | Left both numbers and both calculations exactly as-is — relabelled only. Changing the underlying definition would silently drop headline coverage numbers platform-wide and change what `delivery_ready` means, which is a product/regulatory call for Angela, not a bug-fix side effect |
| super_admin read/write access on the (now-deleted) override table | No fix made while the table existed — confirmed 862 other policies platform-wide already grant the same access; fixing one new table wouldn't have closed any real gap. Moot now the table is deleted. Not pursued as a follow-up — internal-access-only, no exposure to tenant data beyond what already exists via those 862 policies |

## Blast radius

27 files across `src/components/tas/builder/` and `builder-sandbox/` (near-duplicate trees, checked and
fixed in both throughout), `src/hooks/`, `src/lib/utils/`, `src/pages/registers/rpl/`, one edge function,
and `supabase/config.toml`. No new migration shipped (the one planned migration, for the override table,
was deleted before ever being applied anywhere).

## DB/RLS impact

None in the final merged state. The override table's migration was deleted pre-merge, never applied to
any environment — confirmed via `list_migrations` before deletion.

## Post-merge actions completed

- `tga-fetch-qualdetails` edge function undeployed from production and reverified gone (CB5).
- `docs/role-maps/administrator.md` updated to drop the stale reference.
- Adding Electives Phase 7 read-only audit run against production — zero violations found (above).

## Related follow-up (PR #338, same day)

A separate, unrelated incident surfaced the same day: 5 schema changes for this same Risk Register work
had been applied directly to production outside the migration file → PR → merge flow. PR #338 reconciled
those 5 with matching git files, fixed 4 Cursor/Vercel bot findings that were left unactioned from this
PR's own review threads (trainer-notify-settings save race, a non-exception-safe DB trigger, a missing
Compliance Manager nav permission, and the Trainer's Report roster defaulting to the wrong reporting
month), and hardened `.cursor/rules/core.mdc` / `migrations.mdc` so the direct-to-production pattern
surfaces automatically in Cursor going forward. Full detail in that PR's own description; not repeated
here since it's a distinct incident from this ticket batch.

## Not yet tested

No dev server / browser available in this session for any of the above — `tsc --noEmit` and `eslint` are
clean across all touched files, but none of the UI changes (combobox behaviour, capability badges,
relabelled coverage figures, scrollable unit table) have been visually verified in a running app.
