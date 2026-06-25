# Phase 5 — fix/local-run Conflict Tracker

Tracks every file that will conflict — hard OR soft — when `fix/local-run` is resynced with `main` after all PRs are merged.
Carl must be present for Phase 5. This doc is his briefing sheet.

**Last full rebuild:** 17 June 2026 (Opus, authoritative method) — see methodology below.

---

## Methodology (how this list was built)

This is NOT a proxy. It is computed two ways and reconciled:

1. **Authoritative hard-conflict set** — actual dry-run merge of `fix/local-run` into latest `main` on a throwaway branch. Whatever git reports as `CONFLICT` is a hard conflict. Result: **17 files**.

2. **Full both-sides intersection** — files changed on `main` since the merge base AND changed on `fix/local-run` since the merge base. Conflicts (hard or soft) can only happen where both sides touched the same file. Result: **24 files**.

The difference (24 − 17 = **7 files**) is the **soft-conflict set**: git auto-merges them without complaint, but both branches changed them, so the merged result may be logically wrong. These are the silent risks. They will NOT show up as a conflict marker — someone has to read them.

- Merge base: `e34ad55026f346072ad6ff66da4f6b484ef55fbb`
- Main changed 317 src/supabase files since merge base
- fix/local-run changed 4,186 src/supabase files since merge base
- Overlap = 24 files needing attention

---

## THE COMPLETE CONFLICT-RISK SET — 24 files

### Hard conflicts — 17 files (git will stop and demand resolution)

| File | PRs layered onto it | Risk |
|---|---|---|
| `src/AppRoutes.tsx` | #25, #31 (+ drift = 3 sources) | ⚠️ HIGH — 2 PRs stacked on branch drift |
| `src/components/governance/tabs/HistoryTab.tsx` | #35, #36 (+ drift = 3 sources) | ⚠️ HIGH — 2 PRs stacked on branch drift |
| `src/config/roleNavigation.ts` | #25 (+ drift) | MEDIUM — #25 added Executive/Consultant roles + executive route perms |
| `src/hooks/useGovernanceMeetings.ts` | #33 (+ drift) | MEDIUM — #33 switched to useAppContext()/activeTenantId |
| `src/config/landingRoutes.ts` | pure drift | MEDIUM |
| `src/hooks/useSuperadminTenantsV3.ts` | pure drift | MEDIUM |
| `src/hooks/useUnitValidationProgress.ts` | pure drift | MEDIUM |
| `src/lib/auth/routeAfterLogin.ts` | pure drift | MEDIUM |
| `src/pages/industryconsultation/index.tsx` | pure drift | MEDIUM |
| `src/pages/registers/pdr/index.tsx` | pure drift | MEDIUM |
| `supabase/functions/_shared/tga-parsers.ts` | pure drift (add/add) | MEDIUM — both branches added independently |
| `supabase/functions/dap-ai-draft/index.ts` | pure drift | MEDIUM |
| `supabase/functions/derive-unit-content/index.ts` | pure drift (add/add) | MEDIUM |
| `supabase/functions/derive-unit-tga-data/index.ts` | pure drift (add/add) | MEDIUM |
| `supabase/functions/generate-dap-docx/index.ts` | pure drift (add/add) | MEDIUM |
| `supabase/functions/generate-session-plan/index.ts` | pure drift | MEDIUM |
| `supabase/functions/tga-extract-packaging-rules/index.ts` | pure drift | MEDIUM |

### Soft conflicts — 7 files (⚠️ git auto-merges SILENTLY — must be read by hand)

| File | PRs that touched it | Risk |
|---|---|---|
| `supabase/config.toml` | #36 (+ drift) | ⚠️ HIGH — #36 added `[functions.governance-section-ai-summary]`. Auto-merge will not error. Verify the entry is present and no function blocks were dropped/duplicated, or deploys break. |
| `src/components/admin/tenants/TenantControlDrawerEnhanced.tsx` | pure drift | MEDIUM — both sides edited, auto-merged. Review merged logic. |
| `src/components/layout/GlobalTopbar.tsx` | pure drift | MEDIUM — auto-merged, review. |
| `src/config/roleMenuConfigs.ts` | pure drift | ⚠️ HIGH — role/menu config; a wrong auto-merge silently breaks nav for a role. Read carefully. |
| `src/layouts/ConsultantSidebar.tsx` | pure drift | MEDIUM — auto-merged, review. |
| `src/lib/setActiveTenant.ts` | pure drift | ⚠️ HIGH — tenant-switching logic; a wrong auto-merge silently corrupts tenant context. Read carefully. |
| `src/pages/registers/fpp/index.tsx` | pure drift | MEDIUM — auto-merged, review. |

---

## Corrections to previous versions of this tracker

| Item | Previous (wrong) | Now (authoritative) |
|---|---|---|
| `HistoryTab.tsx` layering | claimed #34 touched it | **#34 did NOT touch it.** Touched by #35 + #36 only. (#34's files: AttendancePanel, LiveMeetingTab, governanceAgendaSections, useGovernanceAgenda.) |
| `LiveMeetingTab.tsx` | flagged as likely conflict | **Confirmed false positive.** Not in both-sides intersection — fix/local-run never changed it. 3 PRs touched it on main's side only, so it merges clean. |
| Total conflict files | 18 (17 hard + 1 soft) | **24 (17 hard + 7 soft).** Previous run missed 6 silent soft-conflicts. |
| Soft-conflict detection | only config.toml found | full both-sides intersection now finds all 7 |

---

## PRs with ZERO Phase 5 impact

Touched no file in the 24-file intersection. Completely clean for the resync.

| PR | Branch | Reason |
|---|---|---|
| #41 | `cursor/critical-bug-investigation-25dd` | Migration only |
| #37 | `cursor/multi-training-products-assessment-tools-4f90` | 3 files, none in intersection |
| #32 | `cursor/bulk-edit-rto-division-6e6d` | 1 file, not in intersection |
| #30 | `cursor/critical-bug-investigation-b5a0` | Migration only |
| #24 | `cursor/critical-bug-investigation-3dff` | 1 file, not in intersection |
| #38 | `cursor/calendar-non-governance-meetings-fdb1` | 6 files, none in intersection |
| #39 | `cursor/bulk-upload-evidence-wizard-63d9` | 11 files, none in intersection |
| #22 | `cursor/critical-bug-investigation-f04e` | Migration only — 2 new files, neither in intersection |
| #21 | `cursor/critical-bug-investigation-fef7` | 4 files, none in intersection |
| #20 | `cursor/critical-bug-investigation-ff3a` | 5 files, none in intersection |

Note: #34 and #35 DID contribute to the conflict set (#35 → HistoryTab), but #34's own changed files do not appear in the intersection — its merge added drift conflicts elsewhere, not in its own files.

---

## Notes for Carl (Phase 5)

1. **The 7 soft-conflicts are the real danger** — git will not flag them. After the merge, before committing, manually diff these 7 files against both branch versions. Priority order: `config.toml`, `setActiveTenant.ts`, `roleMenuConfigs.ts` (all HIGH), then the other 4.

2. **19 of 24 are pure fix/local-run drift** — nothing to do with any merged PR. They can be resolved with branch context alone, no PR history needed.

3. **Only 5 files have PR involvement:** AppRoutes.tsx (#25+#31), HistoryTab.tsx (#35+#36), roleNavigation.ts (#25), useGovernanceMeetings.ts (#33), config.toml (#36). Resolve layered files in PR merge order (lower PR number first).

4. **After Phase 5 merge, deploy `governance-section-ai-summary`** to branch DB (`agcdvmrwzzgnlmfyrxtb`) — code will be present post-resync but not live until deployed.

5. **~4,160 other fix/local-run files** changed but only on one side — they fast-forward cleanly. Still, run a smoke test of auth, tenant switching, nav, and governance after the resync.

6. **fix/local-run has already solved the UUID migration naming problem.** `main` currently has 111 migration files with UUID-format names (`20250717071136-e2ddd9e0-...sql`) left over from Lovable's old naming convention. These cause `supabase db push` to fail on `main` — the CLI can't reconcile them with production history and exits with a migration repair error. `fix/local-run` replaces ALL of them with a single `00000000000000_baseline.sql` (full schema snapshot) plus only net-new migrations on top. Once Phase 5 lands, the UUID files are gone and `db push` works cleanly from that baseline.

7. **PR #29 migrations are not yet applied to production.** The 11 migrations from PR #29 (timestamps `20260618000050`–`20260618001000`) merged to `main` on 18 June 2026 but were never pushed to the production database — the Supabase Git Integration did not fire, and `db push` from `main` is blocked by the UUID issue above. These migrations and their features (consultation linking, QI autolog, trainer archive cols, custom_id seeds) will go live as part of the Phase 5 baseline push. After Phase 5, also regenerate `src/integrations/supabase/types.ts` — migration `20260618000800` adds `has_new_consultation_evidence` to the `rpc_tas_list_builds_v3` return type.

8. **PR #26 added two new Phase 5 conflicts** (merged 18 June 2026):
   - `package-lock.json` — new deps from PR #26's new edge functions. Will conflict in Phase 5 against fix/local-run's lockfile. Carl to regenerate after merge.
   - `supabase/functions/email-outbox-worker/index.ts` — **three-way conflict**: main has PR #29's version, PR #26 has Angela's version (already pre-resolved to RJ's on the branch before merge), fix/local-run has a third diverged version. Must be diffed manually — do not auto-merge. Identify which version is most current (check RJ for guidance).

9. **PR #26 migrations (13 files, `20260618021800`–`20260618023000`) are not yet applied to production.** Same situation as PR #29 — merged to main but blocked by UUID migration issue. Will go live in Phase 5 baseline push. Features affected: TAS AOT Quality Engine polymorphism, billing `get_eligible_plans`, assessment tool naming/custom_id, email outbox pg_cron schedule, QI autolog trigger, trainer archive columns.

---

## Reference files (regenerate before Phase 5 — main keeps moving)

- `both-sides-changed.txt` — the 24-file intersection (regenerate: merge-base + both-sides diff)
- `diverged-files-raw.txt` — all 4,186 fix/local-run-changed files (used for per-PR pre-check in Stage 1)
