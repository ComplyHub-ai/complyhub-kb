# Navigation Consolidation Initiative — Optimization Plan (G04-B): Baseline, SOLID Checks, and PR Sequence

> **Status:** Planning only. Authorizes no merge, deletion, or production change on its own — every
> substantive decision quoted here is already **LOCKED** in `g04b-nav-source-recon.md`; this document
> adds execution structure only: a pinned baseline, an evidence-tiered current-state map, SOLID checks
> per slice, an anti-abstraction guardrail, and a PR sequence.
>
> **Modeled on:** `unicorn-cms-f09c59e5/docs/kb/reference/codebase-optimization-plan-2026-08-28.md`
> §§3–6 (Carl's Unicorn optimization plan) — same discipline, applied to the ComplyHub/rto-compass-hub
> G04-B navigation-source program instead of a whole-repo sweep.
>
> **Source of truth for *why*:** `g04b-nav-source-recon.md` (workspace root) — 14 issues, all but one
> (#10, awaiting lock) already confirmed by Brian. This document does not re-derive or re-litigate any of
> those findings; it only organizes them into buildable, individually-measurable PRs.
>
> **Worktree:** stale as of 15 Sep 2026 — this document was authored against Worktree B on
> `feat/g04-route-contract` (10 Sep 2026 baseline). PRs 1–5 have all now shipped (PR 3 undocumented
> until a 15 Sep 2026 audit found it), and Worktree B is now released, unclaimed — see `active-work.md`'s
> worktree registry for current claims before starting PR 6 or any later PR in §6.
>
> **⚠ Not the entry point.** As of 15 Sep 2026 the active entry point for PRs 7–13 is
> `g04-route-contract-foundation.md` § 0. Read that first; this document is reference material it opens
> at named points. Where the two disagree, that one wins.
>
> **Created:** 10 September 2026. **Last progress update:** 15 September 2026 (PR 6 merged — see §6;
> PR 7 superseded, catalog now delivered incrementally via `g04-route-contract-foundation.md`).
> **Reconsider by:** whenever the recon's Issue 5 catalog work actually starts landing, since the baseline
> below will already be stale by then.

## 1. Executive decision

`g04b-nav-source-recon.md` already found the underlying problem and locked the fix decisions: at least
eight independently-maintained systems each decide "what shows in the menu" for some slice of the app,
with two full dead-code shell systems (12 + 15 files) that look live at a glance, systemic same-page/
different-label drift, three roles (Regulatory Officer, Employer, Third Party, Student) whose menus are
mostly or entirely dead links, and a role-preview feature with no visible effect on the sidebar it claims
to preview. Issue 5 locked the actual fix: build one typed navigation catalog
(`src/config/appNavigationCatalog.ts` + `src/config/appNavigationSelectors.ts`) that becomes the logical
source of truth, migrated in incrementally, never deleting a legacy source until its live consumers have
moved and evidence proves zero remaining imports.

What's missing is execution structure — the same kind Carl's Unicorn plan applies repo-wide: a pinned
baseline so "before" is a real number and not a memory, an evidence-tiered map of what's actually live
today, a SOLID check per slice so each new piece of catalog infrastructure earns its complexity, an
anti-abstraction guardrail so a slice can't grow net-larger without an explicit reliability reason, and a
PR sequence sized so each merge shows one measurable, reviewable improvement — not a single sweep, and
not the whole 14-issue backlog collapsed into "3-4 PRs" either.

## 2. Scope and evidence model

### In scope

- All 14 issues logged in `g04b-nav-source-recon.md`, and the exact files each one names.
- The Issue 5 navigation catalog build itself (`appNavigationCatalog.ts`, `appNavigationSelectors.ts`)
  and its staged shell migrations.
- Verification gates already specified in the recon: `node scripts/generate-route-manifest.mjs --check`,
  scoped ESLint, `forbiddenLayouts.test.ts`, and each issue's own listed acceptance evidence.

### Out of scope

- Route-contract shape, route guards, and backend/server authorization — owned by worktree B's separate
  G04 route-contract branch and by RLS/server policy, never by this catalog.
- Issue 14 (login/landing-resolution cleanup) — the recon itself flags this as "not part of the G04-B
  navigation-source program," a different part of the app. Tracked in the PR sequence as an independent,
  parallel-safe track, not folded into the catalog work.
- Anything the recon explicitly parked: further `RootAppLayout` convergence for `adminSidebarConfig`/
  `ssoSidebarConfig`/the inline Executive sidebar beyond what Issue 5 already locked; `src/config/nav.ts`
  and `routeLabels.ts` beyond the specific fixes in Issues 10 and 14.
- Any new decision. If something surfaces here that isn't already LOCKED in the recon, it goes back to
  the recon's decision log for Brian to confirm — this document is not a second place to make calls.

### Evidence already established (reused, not re-verified here)

Issues 2, 3, and 6 each independently confirmed, directly against production on 10 September 2026, that
zero `tenant_members` rows hold the affected role (Regulatory Officer as primary, Employer, Third Party,
Student — any status). That verification is the safety bar that let those issues lock a "coming soon"
change with no current-user impact; it is not re-run here, only relied upon.

## 3. Baseline at `origin/main@eddc9065`

> **Reflects commit:** `eddc9065` (10 Sep 2026). Compare against current `main` HEAD before trusting
> the line counts/importer counts below — Issue 12/13's deletions (PRs #1084/#1085) already changed
> several of these files' status since this table was written; rows marked "✅ DELETED"/"✅ MERGED"
> elsewhere in this doc reflect that, but the raw numbers in this table itself were not re-run.

**Baseline commit note:** `origin/main` was `164280ac4` when the recon and both G04-B worktrees were
claimed (10 Sep 2026 morning). A fresh check during this planning pass found it had since advanced twice
more, through `0ce9a528` (PR #1081) to the true current tip, `eddc9065` (2026-09-10, 12:08). `git
merge-base --is-ancestor` confirms all three SHAs sit on one line of ancestry, not a fork. **Good news:**
a diff of `164280ac4..eddc9065` (11 commits) restricted to the 46 files below shows zero changes — all 11
commits are unrelated TGA-demo-sync-identity-guard fixes. Every fact below is pinned to `eddc9065`, and
would be identical at `164280ac4` or `0ce9a528` too — this is the "no drift found" outcome Carl's plan's
own baseline discipline is designed to catch when it *does* happen, not proof it can't happen on the next
refresh.

### Code footprint

| File | Group | Lines @ `eddc9065` | Live external importers | Note |
|---|---|---:|---:|---|
| `src/config/roleNavigation.ts` | Nav system (Tier C, split menu/permission — see §4) | 1,224 | 8 | matches recon |
| `src/config/roleMenuConfigs.ts` | Nav system (Tier A) | 565 | 5 | matches recon's F3 (6 incl. self) |
| `src/components/nav/sidebarConfig.ts` | Nav system (Tier C, dead) | 107 | 0 | confirmed dead |
| `src/config/superAdminNav.ts` | Nav system (Tier A) | 372 | 4 | matches recon |
| `src/config/adminSidebarConfig.ts` | Nav system (Tier A) | 553 | 3 | matches recon |
| `src/config/ssoSidebarConfig.ts` | Nav system (Tier A) | 60 | 1 | matches recon |
| `src/lib/nav/getBreadcrumb.ts` | Nav system (Tier A) | 94 | 2 | matches recon |
| `src/components/layout/NavBreadcrumb.tsx` | Nav system (Tier C, dead) | 70 | 0 | confirmed dead |
| `src/components/common/SectionChip.tsx` | Nav system (Tier A) | 63 | 3 | matches recon |
| `src/components/common/Breadcrumb.tsx` | Nav system (Tier A) | 125 | 2 | matches recon |
| `src/constants/routeLabels.ts` | Nav system (Tier A) | 152 | 2 | matches recon |
| `src/utils/routeRegistry.ts` | Nav system (Tier C, dead, B8) | 308 | 0 | confirmed dead |
| `src/config/nav.ts` | Nav system (Tier A, thin live path only) | 42 | 4 | matches recon |
| `src/contexts/PreviewRoleContext.tsx` | Nav system (Tier A) | 55 | 5 | matches recon |
| `src/components/layout/RoleSidebar.tsx` | Nav system (Tier A, the live one) | 87 | 3 | matches recon |
| `src/layouts/SharedShell.tsx` | Issue-12 deletion set | 72 | — | matches recon |
| `src/layouts/GeneralLayout.tsx` | Issue-12 deletion set | 10 | — | matches recon |
| `src/layouts/SuperAdminLayout.tsx` | Issue-12 deletion set | 26 | — | matches recon |
| `src/layouts/AppLayout.tsx` | Issue-12 deletion set | 10 | — | matches recon |
| `src/components/sidebar-v3/SidebarGroup.tsx` | Issue-12 deletion set | 150 | — | matches recon |
| `src/components/sidebar-v3/SidebarItem.tsx` | Issue-12 deletion set | 88 | — | matches recon |
| `src/components/sidebar-v3/SidebarSearch.tsx` | Issue-12 deletion set | 45 | — | matches recon |
| `src/components/sidebar-v3/SidebarV3.tsx` | Issue-12 deletion set | 197 | — | matches recon |
| `src/components/sidebar-v3/index.ts` | Issue-12 deletion set | 4 | — | matches recon |
| `src/components/sidebar-v3/renderSidebarIcon.tsx` | Issue-12 deletion set | 13 | — | matches recon |
| `src/components/common/ModuleSwitcher.tsx` | Issue-12 deletion set | 135 | — | matches recon |
| `src/config/sidebarConfig.ts` | Issue-12 deletion set (item 7 — corrected, see note below) | 421 | 5 | matches recon; feeds only the dormant chain |
| `src/hooks/useSidebarPermissions.ts` | Issue-12 deletion set | 71 | — | matches recon |
| `src/hooks/useSidebarBadges.ts` | Issue-12 deletion set | 81 | — | matches recon |
| `src/pages/governance/index.tsx` | Issue-12 deletion set | 42 | — | matches recon |
| `src/components/navigation/GovernanceNavigation.tsx` | Issue-12 deletion set | 205 | — | matches recon |
| `src/components/settings/GovernanceTab.tsx` | Issue-12 deletion set | 221 | — | matches recon |
| `src/layouts/RoleLayout.tsx` | Issue-13 deletion set | 52 | — | matches recon |
| `src/config/roleMenus.ts` | Issue-13 deletion set | 185 | — | matches recon |
| `src/components/nav/RoleSidebar.tsx` | Issue-13 deletion set | 195 | — | matches recon (the dead one) |
| `src/config/menu.ts` | Issue-13 deletion set | 85 | — | matches recon (not `menu.tsx`) |
| `src/components/navigation/NewSidebar.tsx` | Issue-13 deletion set | 120 | — | matches recon |
| `src/components/shell/SideMenu.tsx` | Issue-13 deletion set | 40 | — | matches recon |
| `src/config/navigation.ts` | Issue-13 deletion set | 234 | — | matches recon |
| `src/components/navigation/sidebar/Sidebar.tsx` | Issue-13 deletion set | 114 | — | matches recon |
| `src/tools/menuMap.ts` | Issue-13 deletion set | 89 | — | matches recon |
| `src/utils/iconFromMenu.ts` | Issue-13 deletion set | 96 | — | matches recon |
| `src/pages/auditor/Dashboard.tsx` | Issue-13 deletion set | 188 | — | matches recon |
| `src/pages/compliance-manager/Dashboard.tsx` | Issue-13 deletion set | 130 | — | matches recon |
| `src/pages/executive/Dashboard.tsx` | Issue-13 deletion set | 169 | — | matches recon |
| `src/pages/student/Dashboard.tsx` | Issue-13 deletion set | 128 | — | matches recon |
| `src/pages/trainer/Dashboard.tsx` | Issue-13 deletion set | 11 | — | matches recon |
| `src/lib/badges.ts` | PR 1 follow-up (not in original recon) | 167 | 0 (was: `useSidebarBadges.ts`, deleted) | found by fresh-eyes review of commit `b46f030dc`, not the original recon |
| `src/config/tableMap.ts` | PR 1 follow-up (not in original recon) | 43 | 0 (was: `src/lib/badges.ts`, deleted same batch) | found by fresh-eyes review |
| `src/components/shared/PageLayout.tsx` | PR 1 follow-up (not in original recon) | 44 | 0 (was: `pages/governance/index.tsx`, deleted) | found by fresh-eyes review |
| `src/components/shared/PageHeader.tsx` | PR 1 follow-up (not in original recon) | 34 | 0 (was: `pages/governance/index.tsx`, deleted) | found by fresh-eyes review; distinct from the live `src/components/common/PageHeader.tsx` |

**Correction found while compiling this table:** the file-measurement pass initially classified
`src/config/sidebarConfig.ts` as a "live nav-system" file, since the recon's original per-file audit
investigated it alongside the genuinely live files. It is actually item 7 of Issue 12's own locked Group A
deletion list — its only consumer chain (`useSidebarPermissions.ts` → `SidebarV3.tsx` → `SharedShell.tsx`)
is the same confirmed-dead dormant shell. §4's Tier C/D listing below has been corrected to match; its 421
lines belong in the Issue-12 sum, not the nav-system sum.

**Sums, corrected:**

| Group | Files | Lines |
|---|---:|---:|
| Nav-system files (Tier A + Tier C, excluding `sidebarConfig.ts`) | 15 | 3,877 |
| Issue-12 deletion set, as originally locked in the recon (17 files, incl. `sidebarConfig.ts`) | 17 | 1,791 |
| PR 1 follow-up — orphaned DB-reading tail, found by fresh-eyes review, not the original recon | 4 | 288 |
| Issue-13 deletion set | 15 | 1,836 |
| **Confirmed-dead total (PR 1's full final scope + Issue-13)** | **36** | **3,915** |

**Second correction, found at actual deletion time (PR 1 in progress):** an earlier draft of this table
computed the Issue-12 sum as 2,212 lines/16 files by adding `sidebarConfig.ts`'s 421 lines a second time
on top of a Scout-reported sum that already included them — a hand-arithmetic error, not a data error.
`git diff --cached --stat` after actually staging all 17 deletions in the worktree gave the real,
ground-truth number: **1,791 lines across 17 files**, confirmed above.

**Third addition, found after PR 1's first commit shipped:** an adversarial fresh-eyes review of commit
`b46f030dc` (dispatched specifically to check "nothing connected to it, not even DB" per Brian's
instruction) found 4 more files that became orphaned as a direct consequence of the first 17 being
deleted — `src/lib/badges.ts` (the one file in the whole dormant chain that actually read from the
database — read-only counts from `tp_matrix_units`, `tp_credentials`, `tp_pd_events`, and ~28 register
tables via a dynamic table-name map, all still read elsewhere by live code, so nothing was lost),
`src/config/tableMap.ts` (its only real importer), and `src/components/shared/PageLayout.tsx`/
`PageHeader.tsx` (both had exactly one importer, the already-deleted `pages/governance/index.tsx`). Each
was independently re-verified for zero live importers before deletion, committed separately as `89bf14f68`
on the same branch. This is why PR 1's real final scope (21 files, 2,079 lines) is larger than the
recon's original Issue 12 list (17 files, 1,791 lines) — the difference is a genuine, DB-connection-aware
finding this session's own process (fresh-eyes review before merge) was designed to catch, not a mistake.

**Headline for PRs 1–2 (§6):** shipping the two already-LOCKED dead-code retirements, plus the follow-up
finding above, removes **3,915 lines across 36 files** with zero behavioral risk and zero database
dependency of any kind, before a single line of new catalog code is written — the fastest, clearest
"before/after" win in this program, and the reason §6 sequences them first.

Do not compare these counts against a different exclusion method (e.g. Carl's whole-repo `npm run
metrics`) without labeling the difference — this table is scoped to the 47 navigation-related files named
in the recon, not the whole `src/` tree.

## 4. What the system actually looks like now (evidence-tiered)

Reusing Carl's Unicorn-plan tiering (A: demonstrated active use, protect first; B: active/new, adoption
uncertain; C: source only, no usage evidence; D: retirement-approved/dead, confirmed) against the recon's
own findings:

### Tier A — live, currently rendered, protect first

| File/system | Why it's Tier A |
|---|---|
| `src/config/adminSidebarConfig.ts` | Renders for Administrator/Governing Person/Consultant/Consultant Assistant via `AdminSidebar`; currently has 2 live broken links (Issues 7, 8) |
| `src/config/ssoSidebarConfig.ts` | Renders for Student Support Officer via `SsoSidebar`; recon found zero dead links |
| `ExecutiveSidebar`'s inline 3-item array | Renders for Executive; zero dead links, zero label conflicts |
| `src/config/roleMenuConfigs.ts` | Live for Compliance Manager, Trainer, Trainer/Assessor, Student (all-dead per Issue 6), Regulatory Officer (mostly-dead per Issue 2) via `EnhancedRoleSidebar` |
| `src/config/superAdminNav.ts` | Live for super_admin via `SuperAdminSidebarNav`; all 46 literal paths matched the manifest as of the recon's pass |
| `src/constants/routeLabels.ts` + `src/components/common/Breadcrumb.tsx` | Live page-title/breadcrumb path via `TitleHeader`; currently produces duplicated/wrong breadcrumb text on 17 of 26 reachable pages (Issue 10) |
| `src/components/common/SectionChip.tsx` + `getBreadcrumb.ts` | Live group-label path via `StandardPageHeader`/`PageHeader` |
| `src/contexts/PreviewRoleContext.tsx` | Live role-preview feature; currently has no visible effect on the rendered sidebar (Issue 4), and two dead home-path values (Issue 8's second file) |

### Tier B — active/new, adoption not yet measurable

- The `available`/`coming_soon` state model itself, once shipped by Issues 2/3/6 — brand new, no
  telemetry yet by definition. Treat as Tier B until it's been live long enough to have its own evidence.
- The eventual `appNavigationCatalog.ts`/`appNavigationSelectors.ts` pair — same reasoning; it's new
  infrastructure replacing proven Tier A sources, so each migrated shell needs its own before/after
  comparison (§7) rather than being assumed correct on landing.

### Tier C — source only, no live consumer, not yet approved for deletion

- `src/config/roleNavigation.ts` — the menu/display half is not on any live render path, but its
  `routePermissions`/`canAccessRoute()`/`isRegulatorRole()`/`isReadOnlyForRole()` half **is** live
  (consumed by `useRegulatorMode.ts`, `ReadOnlyContext.tsx`). Issue 5's stage 5 requires disentangling
  these before any deletion — this file is not simply Tier D.
- `src/components/nav/sidebarConfig.ts` — dormant/dead menu-data file, confirmed zero importers, but not
  folded into any LOCKED removal issue yet.
- `src/components/layout/NavBreadcrumb.tsx`, `src/utils/routeRegistry.ts` — confirmed zero live callers,
  but not part of any LOCKED issue's deletion list yet; flag as follow-up candidates, do not delete here.

### Tier D — retirement-approved, confirmed dead, LOCKED for deletion

- **Issue 12 group — ✅ DELETED, PR #1084 merged 10 Sep 2026 (21 files, §3, incl. the 4-file follow-up):** the dormant `SharedShell`/`GeneralLayout`/`SuperAdminLayout`/
  `AppLayout`/`SidebarV3` family, `src/config/sidebarConfig.ts` (its only consumer chain is this same
  dormant family — corrected here from an earlier draft pass that miscategorized it as a live nav-system
  file), `useSidebarPermissions.ts`/`useSidebarBadges.ts`, plus the governance trio (`GovernanceTab.tsx`,
  `GovernanceNavigation.tsx`, `pages/governance/index.tsx`). Confirmed dead via zero-import repo search
  (re-verified directly in worktree B at implementation time, not just from the recon's earlier pass).
  **Caveat found during implementation:** `forbiddenLayouts.test.ts` is not actually wired into
  `npm run test` — the standing `vitest.config.ts` only includes `tests/**/*.test.{ts,tsx}`, and this test
  lives under `src/lib/utils/__tests__/`, so it silently never runs via the normal command. Run directly
  (with a temporary include-pattern override), it currently fails for a reason unrelated to Issue 12 — a
  stale `// BrandedLayout removed...` comment in `src/pages/DocumentRepository.tsx` trips the test's naive
  text-match check, confirmed pre-existing on `origin/main` before this PR touched anything. Both facts
  are new findings, not part of the original recon or this document's earlier drafts — see the PR 1
  write-up for the backlog items this opens. The recon's own narrative count of "12 files" treats the
  six-file `sidebar-v3/` directory as one item; §3's table lists all 17 physical files individually.
- **Issue 13 group (15 files, §3):** the independent `RoleLayout`/`roleMenus.ts` dead shell plus
  `menu.ts`/`navigation.ts` and their dead consumers, plus 5 orphaned per-role Dashboard pages. Confirmed
  dead at every level of each import chain, not just the top file.

## 5. Target architecture and SOLID checks per slice

### Target model (already locked, Issue 5)

One typed navigation catalog (`src/config/appNavigationCatalog.ts`) referencing route-contract IDs — never
a hand-copied route string — with surface/role visibility hints and explicit `available`/`coming_soon`
availability, plus pure selectors (`src/config/appNavigationSelectors.ts`) producing ordered entries per
shell/role/preview state. The catalog is presentation only; route registration/redirects stay owned by
the G04 route contract, and client/server guards/RLS/RPCs/write permissions stay separately owned. A menu
entry existing never grants access; a hidden entry is never a security control.

### SOLID checks, instantiated per slice (not the generic five — what each slice must actually satisfy)

| Slice group (see §6) | Single responsibility | Open/closed | Liskov | Interface segregation | Dependency inversion |
|---|---|---|---|---|---|
| Quick link/label fixes (1,7,8,10) | Each fix touches exactly one wrong literal — no bundled behavior change | N/A — these are data corrections, not new extension points | N/A | N/A | N/A |
| Coming-soon model (2,3,6) | The `available`/`coming_soon` state is a presentation fact only, never conflated with route permission | Adding a new coming-soon destination later must be a data change (one field), not a new conditional in every consuming sidebar | Every consuming sidebar (`EnhancedRoleSidebar`, mobile variants, quick actions, preview) must render the same coming-soon contract identically — no shell gets a silently different behavior for the same state | A coming-soon menu item exposes only its label/status/a11y attributes to the renderer — not the full route-permission or auth object | The coming-soon *decision* (which entries are coming-soon) must be testable without mounting React or hitting Supabase |
| Role-preview fix (4) | Preview selection is navigation-and-layout-only; it must not touch `AppContext` mode, membership, or write-permission state | Adding a new previewable role must not require editing the sidebar-selection switch itself, only the catalog's role list | The previewed role's sidebar must resolve through the exact same selector every real user of that role gets — no preview-only branch that could silently diverge from production behavior | The preview banner/exit control receives only presentation state, not real auth context | Sidebar-selection-by-role must be a pure function of (role, catalog) testable with no real session |
| Catalog foundation + shell migrations (5, staged) | Each migrated shell (`roleMenuConfigs` consumers, `adminSidebarConfig` consumers, `ssoSidebarConfig`, `superAdminNav`) is its own slice with its own single responsibility: consume the catalog for that shell only | A new route/menu item is added via one catalog entry, not a parallel edit across shells | Every shell adapter returns the same entry shape (label, icon, group, availability) regardless of which legacy config it used to read | A shell component receives only the ordered entries and availability state it renders — not the whole catalog object | Catalog selection logic (ordering, filtering by role/shell/preview) must be pure and testable without React or Supabase, per Issue 5's own stated target |
| Dead-code retirement (12, 13) | Each deletion group is scoped to files with zero live importers — no partial removal that leaves a dangling import | N/A — removal, not extension | N/A | N/</br>A | N/A |
| Login/landing consolidation (14) | One canonical `resolveLanding()` remains; every deprecated/duplicate implementation is retired, not patched in place | A new post-login special case (e.g., a new onboarding gate) must be addable inside the one canonical resolver, not as a fifth parallel implementation | Every caller (`ProtectedRoute`, `RoleLandingRedirect`, `Auth.tsx` via `routeToLanding`) gets the same landing decision for the same user state | `resolveLanding()` callers receive only the resolved path, not the intermediate session/profile/membership checks it performed internally | Landing-resolution logic must be testable against session/profile/membership fixtures without a real browser |

### Anti-abstraction guardrail (adapted from Carl's plan, applied here)

Every slice/PR in §6 reports, in its own PR description:

- lines and files before/after (from the baseline in §3, refreshed at merge time);
- largest touched file before/after;
- duplicated label/route/config sites removed (the recon's own overlap findings are the "before" count —
  e.g., Issue 1 removes one of two duplicate "Trainers Matrix" entries);
- direct legacy-config imports removed (a shell migrated off `adminSidebarConfig.ts` onto the catalog
  removes that direct import, even if the catalog file itself grows);
- tests added or strengthened;
- any new indirection introduced, with an explicit justification if the slice is not net-negative/neutral
  in lines — per Carl's plan, "replacing duplicated authorization, adding runtime validation at an
  external boundary, or creating missing characterization coverage" are the only accepted justifications,
  and none of those apply to a presentation-only catalog, so **every catalog slice here is expected to be
  net-negative or LOC-neutral, not net-positive**, once its migrated shells' legacy imports are removed.

## 6. Slice/PR register

Full "what/why/blast-radius/acceptance-evidence" detail for every row below already exists in
`g04b-nav-source-recon.md` — this table adds only what that document doesn't: PR grouping, ordering,
dependency, and the SOLID/metrics obligations from §5 and §7. Do not duplicate the recon's implementation
plans here; link back to them.

| PR | Slice | Source issue(s) | Files touched (see recon for exact list) | Depends on | Full detail |
|---|---|---|---|---|---|
| 1 | ✅ **MERGED — PR #1084** (`8522e2d3`, 10 Sep 2026) | Issue 12 | 21 files final (17 from recon + 4-file DB-reading tail found by fresh-eyes post-commit): `SharedShell`/`GeneralLayout`/`SuperAdminLayout`/`AppLayout`/`SidebarV3`/governance trio + `badges.ts`/`tableMap.ts`/`shared/PageLayout.tsx`/`shared/PageHeader.tsx` | none | recon § Issue 12; §3 above for the follow-up |
| 2 | ✅ **MERGED — PR #1085** (`f6dbb604e`, 10 Sep 2026) | Issue 13 | 19 files final (15 from recon + 4-file fresh-eyes-caught follow-up tail: `SidebarItem.tsx`, `ViewAsRole.tsx`/`useViewAsRole.ts`, `menu.tsx`) | none | recon § Issue 13 |
| 3 | ✅ **MERGED — PR #1086** (`f99784fa1`, 10 Sep 2026 — merged same day as PRs 1/2, found undocumented during a 15 Sep 2026 audit) | Issues 1, 7, 8, 10 | `adminSidebarConfig.ts`, `routeLabels.ts`; `PreviewRoleContext.tsx` split into `previewRoleOptions.ts`/`previewRoleStore.ts` (lint-only refactor, no behavior change); additional scope found via the branch's own fresh-eyes-style second commit and confirmed live on current `main`: `roleNavigation.ts`, `roleMenuConfigs.ts` (same typo/label fixes applied to sibling configs), `AdminRoute.tsx` (narrow allowlist so a previewing super-admin can reach the two corrected static preview pages) | none | recon §§ Issue 1, 7, 8, 10 |
| 4 | ✅ **MERGED — PR #1096** (`98bb98834`, 11 Sep 2026) | Issue 2 | `roleMenuConfigs.ts` (auditor config, 13 coming-soon/5 live — corrected from the recon's original 11/2 split, see recon § Issue 2), `AuditorDashboard.tsx` → `FutureFeatureCard`; folded in as hygiene (not part of Issue 2 itself): 3 of `roleNavigation.ts`'s dead Employer literals flagged `isComingSoon` (recon § F2); also wired 21 previously-silently-skipped `src/**` test files into `vitest.config.ts`/CI and fixed all 14 that failed once run, plus reconciled 2 unrelated direct-to-prod migrations found while checking this PR's migration drift — both out of this program's scope, done in the same branch on Brian's instruction, not folded into Issue 2's own acceptance evidence | none | recon § Issue 2 |
| 5 | ✅ **MERGED — PR #1157** (`36af06149`, 15 Sep 2026) | Issues 3, 6 | `roleMenuConfigs.ts` (student config, 17 items flagged `isComingSoon`), `StudentDashboard.tsx` → `FutureFeatureCard`, `NotAuthorized.tsx` (role-specific message for Employer/Third Party); also deleted the entire dead `src/pages/dashboards/` directory (7 files, found while touching `StudentDashboard.tsx`, traced to day-one debris — see `active-work.md`) | PR 4 (reuses its model) | recon §§ Issue 3, 6 |
| 6 | ✅ **MERGED — PR #1158** (`ba138872c`, 15 Sep 2026) | Issue 4 | `RoleSidebar.tsx` (sidebar-selection precedence — preview role now wins over `mode` shortcuts), `PreviewRoleDropdown.tsx` (removed auto-navigation on selection), `PreviewRoleBanner.tsx` (accurate navigation-only wording, no more "full write access retained" claim) | PR 4, 5 (renders their coming-soon states) | recon § Issue 4 |
| 7 | ⛔ **SUPERSEDED 15 Sep 2026 — do not start from this row.** Catalog foundation is now delivered incrementally by PRs 3–4 of `g04-route-contract-foundation.md` §0 (one pilot family end-to-end), not as one big-bang foundation PR. | Issue 5, stage 1 | — see `g04-route-contract-foundation.md` | Its prerequisite route contract does not exist; the `feat/g04-route-contract` branch this row used to point at was a stale, contentless local branch, deleted 15 Sep 2026. **Go to `g04-route-contract-foundation.md` §0 and start at Phase 0.** | `g04-route-contract-foundation.md` |
| 8 | Apply availability decisions into catalog | Issue 5, stage 2 | catalog entries for Issues 2/3/6's coming-soon states | PR 4, 5, 7 | recon § Issue 5 |
| 9 | Migrate `roleMenuConfigs.ts` consumers | Issue 5, stage 3a | `EnhancedRoleSidebar`, `NavBreadcrumb`, `SectionChip` | PR 8 | recon § Issue 5 |
| 10 | Migrate `adminSidebarConfig.ts` consumers | Issue 5, stage 3b | `AdminSidebar`, quick access, `MobileBreadcrumb` | PR 8, PR 3 (shares files) | recon § Issue 5 |
| 11 | Migrate `ssoSidebarConfig.ts`/`superAdminNav.ts` consumers | Issue 5, stage 3c | `SsoSidebar`, `SuperAdminSidebarNav` | PR 8 | recon § Issue 5 |
| 12 | Migrate preview/breadcrumb/search surfaces | Issue 5, stage 4 | preview role adapter, breadcrumb/section-chip/search consumers | PR 6, PR 9–11 | recon § Issue 5 |
| 13 | Isolate and retire legacy sources | Issue 5, stage 5 | disentangle `roleNavigation.ts`'s menu vs. permission halves; retire once import count is zero | PR 9–12 | recon § Issue 5 |
| 14 | Login/landing-resolution consolidation | Issue 14 | `resolveLanding.ts`, `routeAfterLogin.ts`, `roleRouting.ts`, `routeToLanding.ts` | none (independent track) | recon § Issue 14 |

Notes on ordering:

- **PRs 1–3 shipped first**, as planned — PR 3 merged the same day as PRs 1/2 (10 Sep 2026, PR #1086),
  though this went unrecorded in this document and in `active-work.md` until a 15 Sep 2026 audit found
  the local branch still sitting unmerged-looking in Worktree A and traced it back to the actual GitHub
  merge. PR 4 (Issue 2) then shipped 11 Sep 2026 — no dependency conflict with PR 3's files. All four are
  zero-risk (confirmed-dead code) or low-risk/high-clarity (isolated label fixes), giving the fastest,
  lowest-risk "before/after" proof the new discipline works before the higher-stakes catalog build starts.
- **PR 14 is fully independent** and can run in parallel with anything else, per the recon's own note that
  it isn't part of the G04-B navigation-source program.
- **PRs 7–13 (the catalog) are strictly sequential**, per Issue 5's own stated gate: "One PR changes one
  catalog slice/shell... no long-lived parallel catalog copy." Do not start PR 10 before PR 9 merges.
- **PRs 7–13 are now entered through `g04-route-contract-foundation.md`, not this register.** That
  document's §0 is the execution sequence: its Phase 0 (three decisions) and Phase 1 (PRs 1–5+, starting
  with the `nav-metrics` script) come first, then control returns here at PR 8. The old note in this spot
  — "PR 7 does not create, require, or trigger the `nav-metrics` script" — was **superseded 15 Sep 2026**;
  that script is now the first PR built, per §8's updated header.

## 7. Verification and release gates (per PR, reused from the recon)

Every PR in §6 passes, at minimum, the gates its own source issue(s) already specify in the recon, plus:

- `node scripts/generate-route-manifest.mjs --check` — clean before and after (no route change expected
  for any presentation-only PR in this register; a diff means something was load-bearing and the PR stops
  for re-investigation).
- Scoped `npm run lint` against only the touched paths — never a whole-repo run, per this workspace's
  standing rule.
- `src/lib/utils/__tests__/forbiddenLayouts.test.ts` passes (relevant to PRs 1, and any later PR touching
  the same guarded page set).
- No `npm run build` or bare root `tsc --noEmit`/`npm run type-check` — vacuous/hang risk, per this
  workspace's standing rule; rely on scoped lint plus Vercel's preview build as the real gate.
- **PRs 8–13 specifically: `npm run nav-metrics` before and after, diffed in the PR's anti-abstraction
  report.** This tool (`scripts/nav-metrics.mjs`) was built in `g04-route-contract-foundation.md` Phase 1
  PR 1 — that document will already be deleted (per its own lifecycle rule) by the time PRs 8–13 run, so
  this line is the durable instruction to keep using it. Do not rely on remembering this from a prior
  session; this bullet is the instruction.
- **Tool retirement condition (checked at the start of PR 13, Issue 5 stage 5):** run `npm run nav-metrics`.
  If every one of its ~15 tracked files is either gone or reports 0 live importers, PR 13 deletes
  `scripts/nav-metrics.mjs` and its `package.json` entry in the same PR, and says so in its anti-abstraction
  report ("removed nav-metrics.mjs — zero tracked files remain, its job is done"). If any tracked file still
  has live importers, leave the tool in place and note which files are still pending in PR 13's own
  description — do not delete it on a guess. This tool was built for this one cleanup, not as permanent
  codebase-wide infrastructure; leaving it in place after its tracked files are gone would itself become the
  kind of orphaned leftover file this whole program exists to remove.
- The anti-abstraction guardrail report from §5 is included in the PR description.

## 8. Proposed `nav-metrics` script (item 3b — proposal only, not built here)

> **SUPERSEDED 15 Sep 2026 — this script is now scheduled work, and it is the FIRST thing built.**
> The deferral this section used to record ("nothing here is scheduled work... a recommendation for a
> possible future FRAME") was **overridden by Brian on 15 Sep 2026**. The script is now PR 1 of the
> route-contract FRAME — built *before* any contract or catalog code, so the anti-abstraction guardrail
> (§5) has real before/after numbers instead of a hand-count. Reason: Carl's Unicorn plan puts repeatable
> metrics at P0.5/P0.6, ahead of structural work, and §3's baseline here is a hand-count this document
> itself admits will be stale before use.
>
> **Do not follow the old deferral.** See `g04-route-contract-foundation.md` §0 (execution sequence) and
> §4 D1 (the locked override). The spec below is still accurate and is what PR 1 builds.

Carl's Unicorn plan hit the same problem this planning pass just hit — `main` advancing mid-review made a
hand-counted baseline stale before it was even used — and fixed it with a committed, repeatable script
(`npm run metrics`, P0.5) instead of ad-hoc counts. `rto-compass-hub` has no equivalent today. Proposing,
not building, the following for a future small PR (own FRAME, not bundled into any PR above):

- `scripts/nav-metrics.mjs`, `npm run nav-metrics` — walks only the ~20 files named in this document's §3
  baseline list (not the whole repo), by explicit path list rather than a glob, so a renamed/moved file is
  a visible failure rather than a silent gap.
- Reports: line count per file, split by the Live/Tier-C/Tier-D groups in §4; a live-importer count per
  file (via a static import-graph pass, not a raw string grep, to avoid the false-positive class this
  recon already hit twice — `GovernanceTab` vs. `CombinedGovernanceTable`, `AppLayout` vs.
  `RootAppLayout`); and a total-lines-removed figure whenever run against a branch that has deleted any
  Tier-D file, so the anti-abstraction guardrail's before/after numbers in §5 stop being hand-counted.
- `--json`/`--out <file>` output, matching the convention Carl's `architecture-metrics.mjs`,
  `check-route-drift.mjs`, and this workspace's own `generate-route-manifest.mjs` already use.
- Would be run once per PR in §6 (before and after), not continuously, and would not be wired into CI as
  a blocking gate initially — same reasoning Carl's plan gives for `routes:check-drift`: the baseline is
  already known to be a moving target (main advances between PRs), so a hard gate would fail unrelated
  work until this document's own PR sequence has actually landed enough of itself to be self-consistent.

This script is not required for PRs 1–6 (dead-code removal and label fixes don't need a repeatable tool,
a one-off count suffices) — it earns its keep starting around PR 7, where the catalog build will produce
several sequential "before/after" comparisons that are worth automating rather than hand-counting each
time.