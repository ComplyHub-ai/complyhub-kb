# Navigation Consolidation Initiative — Source Recon and Implementation Plan (G04-B)

> **This is now the single canonical file for G04-B navigation work.** It started as read-only recon
> and grew, through this session, into a full decision log and implementation plan for every issue

## Table of contents

> Issues are numbered in the order they were *found*, not the order they appear in the file below —
> physical position runs 1, 2, 3, 4, 5, 13, 6, 7, 9, 12, 10, 11, 8, 14. Use this table to jump by
> number instead of scrolling. Line numbers below are exact as of 16 September 2026 — they will drift
> on any future edit; search the issue title if a number stops lining up.

| # | Issue | Status | Line |
|---|---|---|---|
| 1 | Duplicate "Trainers Matrix" entry in the Admin sidebar | ✅ SHIPPED — PR #1086 | 270 |
| 2 | Regulatory Officer's dedicated sidebar menu is almost entirely dead links | ✅ SHIPPED — PR #1096 | 389 |
| 3 | Employer and Third Party roles render no sidebar at all | ✅ SHIPPED — PR #1157 | 467 |
| 4 | Super-admin "preview as role" has no effect on the sidebar shown | ✅ SHIPPED — PR #1158 | 512 |
| 5 | Core decision: which system becomes the canonical navigation source | LOCKED — in progress (route contract + catalog build ongoing, see `active-work.md`) | 563 |
| 6 | Student role's entire live sidebar menu is 100% dead links | ✅ SHIPPED — PR #1157 | 1067 |
| 7 | "Placement Sites" link in the live Admin sidebar is broken (typo drift) | ✅ SHIPPED — PR #1086 | 1184 |
| 8 | "Employer Portal" link in the live Admin sidebar points to a nonexistent path | ✅ SHIPPED — PR #1086 | 1596 |
| 9 | Module Switcher highlight/navigation mismatch | CORRECTED — not a live bug, no action needed | 1275 |
| 10 | Breadcrumb trail shows duplicated/wrong text on some pages | ✅ SHIPPED — PR #1086 | 1501 |
| 11 | (correction) not a live bug — both link sources are dead code | CORRECTED — folded into Issue 12 | 1573 |
| 12 | Retire the entire dormant shell/sidebar system | ✅ SHIPPED (IMPLEMENTED) — PR #1084 | 1293 |
| 13 | Retire the `RoleLayout`/`roleMenus.ts` dead shell system | ✅ SHIPPED (MERGED) — PR #1085 | 843 |
| 14 | Login/landing-resolution cleanup | LOCKED — not yet implemented (independent track, can run any time) | 1648 |

**Other sections:** `PARKED (out of scope)` appears **twice** (line 258 and line 1629 — the second one
is easy to miss). `Architecture/bad-practice findings` (B-prefixed) at line 661. `Flagged` (F-prefixed)
at line 716, with a dedicated `F4` deep-dive at line 731 and `F2`'s full dead-link itemization at line
987. Any B-item or F-item that reads as a standalone, actionable finding (not just commentary) should
be cross-checked against `active-work.md`'s Backlog — see items 25–27 there for the ones already
promoted (16 Sep 2026).

## Scope and evidence

This started as read-only recon for the G04-B canonical-navigation-source decision gate. The initial
comparison covered the four named navigation-source candidates, their real source consumers, the
requested breadcrumb/label paths, and overlap or dead-code evidence, and deliberately did not choose a
canonical source or propose an implementation. **That has since changed within this same file:** every
issue found (Issues 1–12) now has a recorded decision and, where locked, a full implementation plan —
see the Decision log below. Treat the phrase "does not choose... does not propose" below as describing
only the original, now-superseded starting scope, not the file's current state.

Baseline inspected: Worktree B, `feat/g04-route-contract`, at the current branch tip based on `origin/main` (`164280ac4`). The G04 program ledger records the current route-manifest baseline as 479 route objects and describes the decision as frontend UX access/navigation metadata only; backend authorization remains independent.

Evidence used: source imports and callers under `src/` and `tests/`, the current `docs/quality/route-manifest.json`, and file history with `git log --follow`. The route comparisons below use exact literal path membership against the current route manifest; a missing exact literal can be a legacy/speculative link or a path represented only by a different parent/redirect, so it is evidence of drift, not by itself a runtime-browser verdict.

## 1. `src/config/roleNavigation.ts`

### What it drives

This file contains three related but distinct things:

- typed section/item navigation (`NavMenuItem`, `NavMenuSection`, `RoleNavigationConfig`);
- a role-to-navigation map (`roleNavigationConfigs`) and helpers for allowed paths/read-only state;
- a separate `routePermissions` table and `canAccessRoute()` decision function.

The role map defines configurations for `super_admin`, Administrator, Compliance Manager, Trainer, Trainer/Assessor, Student Support Officer, Regulatory Officer, Student, Employer, Third Party, Governing Person, and Executive. It does not define a separate Consultant or Consultant Assistant configuration. `getNavigationForRole()` falls back to `TRAINER_NAV` for null, unknown, Consultant, and Consultant Assistant values.

The intended visual consumer is `src/components/navigation/sidebar/RoleSidebar.tsx:7`, which calls `getNavigationForRole()` and renders the sections/items. A repository search found no source or test import of that component, so this sidebar is not on the current route/layout call chain. Likewise, `src/hooks/useRoleNavigation.ts:11` imports the config and exposes the navigation/access helpers, but no other source consumer of `useRoleNavigation()` was found.

The access helper is also consumed by `src/components/guards/RoleRouteGuard.tsx:5`, but that guard has no caller outside its own file. Its direct runtime role is therefore not established. The file is imported at runtime for regulator/read-only behavior: `src/hooks/useRegulatorMode.ts:6` uses `isRegulatorRole()` and `isReadOnlyForRole()`, and `src/contexts/ReadOnlyContext.tsx:4` uses `isRegulatorRole()`. `RegulatorModeBadge` is mounted by `GlobalTopbar`, and `ReadOnlyProvider` is mounted by `RootAppLayout`; this makes those helper paths live even though the role sidebar and route guard are not.

### Completeness/currentness

- The file is large and broad: 120 `path:` entries in the file, 80 unique literal menu/permission paths, 12 role-map keys, and a 14-value `AppRole` union. The 80-path count includes role-menu paths rather than treating the file as one flat menu.
- It has substantial coverage for the main tenant roles and explicit read-only flags for Regulatory Officer menu items.
- It is not a complete current navigation source for the live shell. The current `RootAppLayout` delegates Administrator, Governing Person, Consultant, and Consultant Assistant to `AdminSidebar`, Student Support Officer to `SsoSidebar`, Executive to `ExecutiveSidebar`, and only a subset to `EnhancedRoleSidebar`. Those live branches use other config files/components.
- It mixes display-name role values (`'Compliance Manager'`, `'Trainer/Assessor'`) with the snake-case `super_admin` value and has a fallback-to-Trainer behavior. That is material if its helpers are used as contract facts.
- Exact route-manifest comparison found 18 of its 80 unique literals absent from the current manifest: `/dashboard/students-support/placement-sites`, `/dashboard/user-management`, the four `/employer/*` paths, `/settings`, `/settings/preferences`, `/student-support`, the five `/student/*` paths, `/surveys`, and the three `/third-party/*` paths. These entries are evidence of route/navigation drift or of unregistered portal work.

### Last meaningfully touched

Latest file history entry: `c1ead1e52` (2026-09-08), “Complete Driver Diagnostic UAT hardening.” That change added the driver-diagnostics access branch to `canAccessRoute()`, not a general navigation refresh. Earlier meaningful additions include Intelligence Centre and consultant-governance parity work on 2026-09-01/02, and Training Product Transitions on 2026-08-14.

### Overlaps/conflicts

- `roleNavigation` and `roleMenuConfigs` share 29 exact paths, including `/calendar`, `/dashboard/assessment-validation`, `/dashboard/document-repository`, `/dashboard/governance/meeting-manager`, `/dashboard/intelligence`, `/dashboard/tas/transitions`, and several trainer/student paths. The same route can have different labels, grouping, or read-only semantics.
- For `super_admin`, this file maps to `ADMIN_NAV`, while the live superadmin shell renders `superAdminNav`. That is an alternate definition for the same platform role, although the route domains do not overlap at the literal path level.
- Its route-permission table is not the same thing as the menu map: some permission paths are not listed in the role menus, and menu visibility does not itself prove the route guard is mounted.
- `isRegulatorRole()` and `isReadOnlyForRole()` are live helper consumers, but the navigation data and `routePermissions` are largely not on the current runtime navigation path. This makes the file a mixed navigation/access utility rather than one unambiguous source.

## 2. `src/config/roleMenuConfigs.ts`

### What it drives

This file defines `RoleMenuConfig`, section/item metadata, themes, quick actions, optional nested children, badges, and feature-visibility fields. It has five configured keys: `compliance-manager`, `trainer`, `student`, `consultant`, and `auditor`.

The primary live consumer is `src/components/layout/EnhancedRoleSidebar.tsx:10`, which calls `getMenuConfig(role)` and renders sections, quick actions, labels, icons, active links, and feature badges. `src/components/layout/RoleSidebar.tsx` is mounted by `RootAppLayout` and selects `EnhancedRoleSidebar` for Compliance Manager, Trainer, Trainer/Assessor, Student, and Regulatory Officer. Consequently:

- Compliance Manager uses the `compliance-manager` config;
- Trainer and Trainer/Assessor use the shared `trainer` config;
- Student uses the `student` config;
- Regulatory Officer reaches `EnhancedRoleSidebar`, but `getMenuConfig('Regulatory Officer')` has no explicit branch and falls back to the `trainer` config rather than the `auditor` config.

The file is also consumed by `src/components/common/SectionChip.tsx:8`, which is used by the active `StandardPageHeader` and `PageHeader` components to derive a group label. `NavBreadcrumb.tsx` imports it as another breadcrumb source, but that component has no caller found in `src/` or `tests/`. The `auditor` config can also be reached by the older `RoleLayout`/role-key path, but that layout is not imported by the current `AppRoutes.tsx` route tree; the current auditor dashboard route imports a different dashboard page.

### Completeness/currentness

- It has 97 `path:` occurrences and 82 unique literal paths including quick actions. It is richer than `roleNavigation` for nested menu items, quick actions, descriptions, themes, and feature badges.
- It covers only five config keys and does not provide current-shell configurations for Administrator, Governing Person, Student Support Officer, Executive, Third Party, or Employer. `getMenuConfig()` falls back to Trainer for unbuilt/unknown values.
- `NavBreadcrumb` maps Administrator to the key `'admin'`, but no `'admin'` config exists, so `getMenuConfig('admin')` also returns Trainer. Its map uses `External Auditor`, while the current live tenant role/configuration uses `Regulatory Officer`; that role is not mapped by `NavBreadcrumb`.
- Exact route-manifest comparison found 36 of its 82 unique literals absent. The absent set is concentrated in the auditor portal paths (`/auditor/*`), student portal paths (`/student/*`), legacy top-level paths such as `/document-repository`, `/evidence`, `/registers`, `/risk`, and trainer paths such as `/trainer/*`. This is consistent with a mixture of speculative/legacy menu content and current dashboard paths, not a complete source-derived route inventory.

### Last meaningfully touched

Latest file history entry: `6dfc30b47` (2026-09-02), “fix(intelligence): close tenant Centre review flags.” It added `/dashboard/intelligence` to the Compliance Manager and auditor configurations. Earlier meaningful changes added Training Product Transitions on 2026-08-14 and post-demo SSO/trainer/governance updates on 2026-08-17.

### Overlaps/conflicts

- It shares 29 exact paths with `roleNavigation`. Shared links include the same trainer/student/dashboard surfaces but are grouped and labelled differently in places. Examples include `roleNavigation`’s “Admin Dashboard” versus this file’s “Compliance Dashboard” for different role menus, “Trainers Matrix” versus “Trainers Matrix Engine,” and “Document Repository” versus trainer-specific “Documents”/“Training Resources” labels.
- It shares 8 exact paths with `src/config/sidebarConfig.ts`, including `/dashboard/assessment-validation`, `/dashboard/auditor`, `/dashboard/compliance`, `/dashboard/document-repository`, `/dashboard/student`, and `/dashboard/trainer`.
- The live tenant sidebar has a further conflict at role level: `RoleSidebar` sends Administrator/Governing Person/Consultant/Consultant Assistant to `AdminSidebar`, not this file; it sends Regulatory Officer to this file, but the resolver supplies Trainer content.
- The `auditor` config is not the current Regulatory Officer navigation lane, so its existence can give a false impression that auditor navigation is complete/current.

## 3. `src/config/sidebarConfig.ts`

### What it drives

This is a flat/grouped sidebar model with `SidebarGroup`, `SidebarItem`, string icon names, optional badge specifications, and string `permissionKey` values. It has seven broad groups (Dashboards, Main Navigation, Documents & Compliance, Quality Area 1, Students & Support, Quality Area 3, and Quality Area 4), 50 `route:` occurrences, and 49 unique route literals. It contains no explicit role-to-menu map; visibility is delegated to permission keys.

The consumer chain is `useSidebarPermissions.ts:1`, which reads `sidebarConfig` and filters items through `canAccess(userRoles, permissionKey)`, and `useSidebarBadges.ts:2`, which walks the same config to derive badge requests. `SidebarV3.tsx` renders those filtered groups and badges. `SidebarV3` is only mounted by `SharedShell.tsx`; `SharedShell` is only used by `GeneralLayout` and `SuperAdminLayout`, and neither layout has a caller in the current `AppRoutes.tsx` tree. Therefore this config is on a dormant/legacy sidebar chain in the current application route composition, not the current `RootAppLayout` tenant sidebar.

### Completeness/currentness

- It has broad register coverage and operational badge metadata, but no role coverage in the data itself; permission-key semantics live elsewhere.
- Its route vocabulary is often the older unprefixed `/registers/*` form, while the current source-derived manifest and active role menus commonly use `/dashboard/registers/*`. Exact route-manifest comparison found 24 of 49 unique literals absent, including most `/registers/*` entries and `/dashboard/students-support/placement-sites`.
- It includes commented/annotated hidden entries and route assumptions such as `/dashboard/students-support/feedback`; this is useful historical evidence but not a complete current contract.
- `getIcon()` uses dynamic string lookup and a fallback icon. The file has no breadcrumb or label consumer: `getBreadcrumb.ts` does not import it.

### Last meaningfully touched

Latest file history entry: `6ff09df78` (2026-08-19), “feat: standalone Forms platform (Phase 1 frontend),” which added the Documents & Compliance group and Forms route. The prior substantial change was the 2026-07-16 port of staged navigation groups.

### Overlaps/conflicts

- It shares 12 exact paths with `roleNavigation` and 8 with `roleMenuConfigs`, but usually with different route prefixes, labels, and permission models. The common exact paths include dashboard/assessment-validation, dashboard/document-repository, calendar, and role-specific dashboard entries.
- Its `/registers/*` links conflict with the `/dashboard/registers/*` links in the live role menus for the same conceptual registers. That is a canonical-link problem even where a legacy redirect happens to exist.
- Its permission-key filtering is a different visibility mechanism from `roleNavigation`’s role map/`routePermissions` and `roleMenuConfigs`’ role resolver. It does not provide an authoritative breadcrumb label or route-module fact.

## 4. `src/components/nav/sidebarConfig.ts`

### What it drives

This file defines a separate `Role` union (`ADMIN`, `COMPLIANCE_MANAGER`, `TRAINER`, `VIVACITY_ADMIN`), a `NavItem` shape with `href`, optional child groups, and the `NAV` array. It is a legacy/Remix-style navigation definition with dashboard, documents, trainer portal, QA-area groups, and a small role filter on individual items.

Repository search found no import of `src/components/nav/sidebarConfig.ts`, `NAV`, or its `Role` type. The similarly named live-looking component `src/components/nav/RoleSidebar.tsx` does not consume it; that component imports `roleMenus` from a different file. `getBreadcrumb.ts` also imports `NavItem` from `src/config/nav.ts`, not this file. On current evidence, this candidate is dead code and drives no runtime component, hook, breadcrumb, or guard.

### Completeness/currentness

- It covers only four uppercase role tokens and has 29 `href:` entries. It has no superadmin/Regulatory Officer/Student Support Officer/Executive/Consultant/Employer role model and no dynamic permission metadata.
- Exact route-manifest comparison found 25 of 29 unique literal hrefs absent. Most `/qa1/*`, `/qa2/*`, `/qa3/*`, `/qa4/*`, `/trainer/*`, `/documents`, `/forms`, `/complybot`, and `/governance/meeting-manager` links are not current exact route objects.
- Its last meaningful file touch is old relative to the other candidates and no current caller was found, so its role/route values are historical evidence rather than current runtime behavior.

### Last meaningfully touched

Latest file history entry: `825950aad` (2026-02-15), “Changes,” which added the Regulatory Intelligence item and imported `Shield`. Earlier history is the 2025-10-07 Remix initial commit and a 2025-10-11 governance route refactor.

### Overlaps/conflicts

- It shares only `/calendar` and `/dashboard` exactly with `src/config/sidebarConfig.ts`, and `/calendar`, `/dashboard/regulatory-intelligence`, and `/surveys` with `roleNavigation`/other legacy sources where applicable.
- Its `NavItem` name is a false friend: breadcrumb code’s `NavItem` is from `src/config/nav.ts` and uses `to` plus `type`, not this file’s `href` plus role/group fields.
- Because it is unconsumed, conflicts here are latent rather than current runtime conflicts; adopting it would require first proving that its route vocabulary still represents live pages.

## 5. `src/config/superAdminNav.ts`

### What it drives

This is the dedicated superadmin navigation tree. It defines `SuperNavItem` with optional path, children, badge key, footer/dev-tools flags, and per-item `permissionKey`. The current data has five primary groups (Command Centre, Operations, Revenue, Content & Comms, System), a collapsible Dev Tools group, and a footer Preview As item; it contains 46 unique path literals.

The primary runtime consumer is `src/components/SuperAdminSidebarNav.tsx:2`. It partitions the tree into primary/dev-tools/footer items, filters by `usePlatformPermissions()` (`permissionKey`, with a platform-owner bypass), reads badge counts from `useSuperAdminBadges()`, and renders the links. `RootAppLayout.tsx:121-133` mounts this component when the authenticated user is in superadmin mode or on a superadmin route; it has both desktop and mobile placements. `SharedShell.tsx` also references it, but that shell is on the dormant layout chain described above.

### Completeness/currentness

- It is the most current candidate by last meaningful touch and has a direct runtime consumer in the current route shell.
- All 46 literal superadmin paths matched an exact route object in the current route manifest. That establishes route-string parity for this candidate, not permission parity or page-behavior parity.
- It has explicit platform permission metadata and badge metadata, but only for the platform/superadmin domain. It is not a tenant navigation source and does not describe tenant roles, tenant layouts, tenant UX capabilities, or ordinary tenant breadcrumbs.
- The nav labels have recently tracked the observability restructure: “Edge Function Errors,” “Database & Scheduler Events,” and “User Action Trail” are separate entries, with the latest label change recorded below.

### Last meaningfully touched

Latest file history entry: `96ddb9467` (2026-09-09), “feat(superadmin): restructure Audit Trail into User Action Trail (PR 3/4),” changing the `/superadmin/system/audit` label. The preceding meaningful touch was `d17a5091f` (2026-09-08), which added/split the edge-function-error and database-event navigation entries.

### Overlaps/conflicts

- There are no exact path overlaps between `superAdminNav` and the four tenant/legacy navigation candidates. The domains are intentionally separate.
- There is a role-level overlap/conflict with `roleNavigation`: that file maps `super_admin` to `ADMIN_NAV`, but the live superadmin shell uses this dedicated tree. The active breadcrumb path for `/superadmin/*` also uses this tree, so the two sources can disagree if the generic role helper is used for a superadmin context.
- Its `permissionKey` values are platform permission metadata, not tenant-role values. Treating them as the same vocabulary as tenant navigation would blur the platform/tenant boundary.

## Breadcrumb and label sourcing

### `src/lib/nav/getBreadcrumb.ts`

`getBreadcrumb.ts:14-18` imports three different data shapes/types: `NavItem` from `src/config/nav.ts`, `SuperNavItem` from `src/config/superAdminNav.ts`, and `RoleMenuConfig` from `src/config/roleMenuConfigs.ts`. It provides three independent resolvers:

- `getBreadcrumbFromRoleConfig()` (`:27-47`) scans role-menu sections/items and one level of children;
- `getBreadcrumbFromNav()` (`:50-68`) scans the legacy `sidebarNav` from `src/config/nav.ts`;
- `getBreadcrumbFromSuperAdminNav()` (`:72-94`) scans the dedicated superadmin tree.

It does not import `roleNavigation.ts`, either sidebar-config candidate, `routeRegistry.ts`, or `routeLabels.ts`.

### `src/components/layout/NavBreadcrumb.tsx`

`NavBreadcrumb.tsx:15-19` imports `sidebarNav`, `superAdminNav`, the three resolver functions, `useTenantMembership`, and `getMenuConfig()`. Its selection order is:

1. superadmin context or `/superadmin` pathname → `superAdminNav`;
2. a recognized role-key map → `getMenuConfig()` / `roleMenuConfigs`;
3. otherwise → legacy `sidebarNav` from `src/config/nav.ts`.

Its role-key map recognizes Administrator, Compliance Manager, Trainer, Student, and External Auditor, but not Regulatory Officer, Governing Person, Consultant, Consultant Assistant, Student Support Officer, Executive, Employer, or Third Party. The rendered component uses `SectionChip` for the group label and renders only the item label (`:55-67`). No caller of `NavBreadcrumb` was found, so it is not established as a current mounted breadcrumb component.

### Current mounted section/title breadcrumb path

`src/components/common/SectionChip.tsx` duplicates the same role/superadmin/fallback selection and calls `getBreadcrumb*()` (`:4-45`). It is mounted by the active `StandardPageHeader` and `PageHeader` components, making `roleMenuConfigs`, `superAdminNav`, and `src/config/nav.ts` live label/group sources through that path. `SectionChip` only renders `groupLabel`; it does not render the item label.

There is another parallel mounted breadcrumb component: `src/components/common/Breadcrumb.tsx:15` imports `getLabelForRoute` from `src/constants/routeLabels.ts`, not any of the named candidates. `TitleHeader` mounts it. It derives a multi-segment trail from pathname segments, with longest-prefix labels from `routeLabels` and a title-cased fallback. This means current page labels are not solely sourced from the navigation candidates even when a section chip is present.

### `src/utils/routeRegistry.ts`

`routeRegistry.ts` is a static `ROUTE_REGISTRY` of title, description, banner text, and export metadata with longest-prefix lookup helpers (`:15-306`). Repository search found no external import or call site for `ROUTE_REGISTRY`, `getRouteMetadata()`, `getPageTitle()`, `getBannerText()`, `hasExportCapability()`, or `getExportFormats()`; all matches are internal to the file. It currently does not drive navigation, breadcrumbs, route registration, or access. Its keys also use a legacy mix of `/registers/*`, `/admin/*`, and other paths. Last meaningful touch: `5dc4c5cc5` (2025-12-01), which removed one metadata entry.

## Recommendation options

These were decision options and tradeoffs when first written. **Superseded — a decision has since been
made; see the "SELECTED" note under option 6 and Issue 5 in the Decision log below for the full locked
plan.** Left in place for the reasoning trail, not as an open question anymore.

1. **Make `roleNavigation.ts` canonical for ordinary tenant navigation.**
   - Pros: broadest role map; already contains menu paths, read-only flags, and route-permission helper vocabulary; relatively recent role/access changes.
   - Tradeoffs: current live tenant sidebar generally does not consume it; Consultant and Consultant Assistant fall back to Trainer; it mixes navigation data with access decisions; it has 18 manifest-missing literals; and it conflicts with live `AdminSidebar`, `SsoSidebar`, `ExecutiveSidebar`, and `roleMenuConfigs`.

2. **Make `roleMenuConfigs.ts` canonical for ordinary tenant navigation and breadcrumbs.**
   - Pros: direct live consumer for several enhanced tenant roles; supports labels, groups, icons, nested items, quick actions, descriptions, themes, and feature visibility; already feeds the section-chip breadcrumb path.
   - Tradeoffs: only five configured keys; current Regulatory Officer resolution falls back to Trainer; Administrator and several other live roles are handled elsewhere; it contains many legacy/speculative paths; and its role resolver is not an access contract.

3. **Make `src/config/sidebarConfig.ts` canonical.**
   - Pros: clear group/item shape, permission keys, and badge metadata; broad register coverage.
   - Tradeoffs: its current rendering chain is dormant under the current route tree; it has no explicit role model; it uses a competing permission-key system; and 24 of 49 route literals are absent from the current manifest, with substantial `/registers/*` versus `/dashboard/registers/*` drift.

4. **Make `src/components/nav/sidebarConfig.ts` canonical.**
   - Pros: small/simple shape and explicit per-item role lists.
   - Tradeoffs: no current callers; last meaningful touch was 2026-02-15; only four legacy role tokens; 25 of 29 hrefs are absent from the current manifest; and its `NavItem` shape is unrelated to the breadcrumb module’s `NavItem`.

5. **Use `src/config/superAdminNav.ts` as a separate canonical platform navigation source only.**
   - Pros: direct current runtime consumer, explicit platform permissions/badges, recent maintenance, and exact path parity with all 46 manifest literals.
   - Tradeoffs: it cannot serve ordinary tenant navigation or tenant breadcrumbs without collapsing a deliberate platform/tenant boundary. The generic `super_admin` entry in `roleNavigation` would still need an owner decision as an alternate definition.

6. **Introduce a new contract-owned source that supersedes these for G04 facts, while retaining explicit adapters/exceptions during convergence.**
   - Pros: can describe route registration, route module, layout chain, frontend UX access class, visibility, canonical link, breadcrumb facts, aliases, and test metadata in one route-owned record; can represent current exceptions instead of forcing one legacy menu file to become a universal source.
   - Tradeoffs: it creates an additional source during shadow mode; it requires parity evidence against the live `RootAppLayout` branches, `superAdminNav`, `roleMenuConfigs`, `src/config/nav.ts`, and the mounted `routeLabels` breadcrumb path; and it does not remove the need for an owner decision about legacy/dead entries and special role shells.

**SELECTED — option 6, locked 10 September 2026.** See Issue 5 in the Decision log below for the full
locked plan (target model, staged migration, verification gates).

## PARKED (out of scope)

- The current `RootAppLayout` also uses `adminSidebarConfig`, `ssoSidebarConfig`, and an inline Executive sidebar path outside the named candidates; no convergence work was pursued here.
- `src/config/nav.ts` and `src/constants/routeLabels.ts` are additional legacy/current label sources; they were inspected only to answer the requested breadcrumb/label sourcing question.
- Route-contract shape, route guards, manifest changes, Playwright coverage, backend authorization, and retirement of dead navigation code remain outside this recon.

## Decision log

Concrete issues surfaced from this recon are tracked here one at a time as they're worked through,
each with a status, blast-radius findings, and a recorded decision. No item is implemented until its
decision is explicitly confirmed by Brian.

### Issue 1 — Duplicate "Trainers Matrix" entry in the Admin sidebar

**Status: ✅ SHIPPED — PR #1086 (`f99784fa1`), 10 September 2026 (bundled with Issues 7, 8, 10;
status corrected 16 Sep 2026 by cross-referencing `g04b-nav-optimization-plan.md` §6 — see that
document's "Known gaps" note in `active-work.md` for why this had gone stale).**

**What:** `rto-compass-hub/src/config/adminSidebarConfig.ts` lists the same destination page,
`/admin/trainer-matrix-engine`, twice in two different sidebar sections:

| Section | Label | Link |
|---|---|---|
| Training & Assessment | "Trainers Matrix" | `/admin/trainer-matrix-engine` |
| VET Workforce | "Trainers Matrix Engine" | `/admin/trainer-matrix-engine?tab=engine` |

**Blast-radius findings (verified against code, not assumed):**

1. `?tab=engine` is dead weight. React Router does not create a separate route for a query string —
   the app registers only ONE route object for this path, in `AppRoutes.tsx`. The page component
   (`TrainerMatrixEngine.tsx`) never reads any `tab` value from the URL. No test, guard, or route
   logic reads it either. Removing it is safe in isolation and changes no behavior.
2. The page's own on-screen title/breadcrumb (`src/constants/routeLabels.ts`, consumed by the mounted
   `Breadcrumb.tsx`/`TitleHeader`) is hard-coded as **"Trainers Matrix Engine"** for this exact path —
   so today, regardless of which sidebar link is clicked, the landed page already displays "Trainers
   Matrix Engine" as its own title.
3. `adminSidebarConfig.ts`'s own comments document the Training & Assessment section as a deliberately
   ORDERED compliance workflow sequence (TAS Engine → Industry Engagement → **Trainers Matrix** →
   Assessment Validation → Credit Transfer → RPL → FRE), placing "Trainers Matrix" intentionally as
   step 3 ("trainer competence enforcement"). The VET Workforce section's "Trainers Matrix Engine"
   entry instead sits among trainer-administration tools (Trainer Credentials, PD Register, Staff
   Turnover, Trainer Availability, Profile Management) and carries the dead `?tab=engine` query string
   — evidence it was added later, likely copy-pasted without noticing the pre-existing entry.
4. A deployed edge function (`supabase/functions/ai-router/navigationIndex.ts`, ComplyBot's
   "where do I find X" navigation index) independently already uses label **"Trainers Matrix"** and
   section **"Training & Assessment"** for this exact route — an external system corroborating that
   framing as canonical, unprompted by this decision.
5. The exact same two-label duplicate pattern independently exists a second time in
   `src/config/permissions.ts` (`trainers-matrix` vs `trainer-matrix-engine` permission keys), but that
   system only feeds a currently-dormant secondary sidebar (`useSidebarPermissions.ts` → `SidebarV3.tsx`
   → `SharedShell.tsx`, no caller in the live `AppRoutes.tsx` tree) — no live access impact today, but
   the same confusion is baked in twice and would resurface if that dormant system is ever revived.
6. Live analytics (`src/components/tracking/ActivityTrackingProvider.tsx`) already maps BOTH
   `/admin/trainer-matrix` and `/admin/trainer-matrix-engine` to the same single analytics event key,
   `trainer_matrix` — removing one sidebar row does not fragment analytics reporting.
7. Checked every remaining reference to this route across the repo (QA test-scenario seed data keyed
   by route path, `src/data/qaInventorySeed.ts`; role-map/audit-report documentation) — all key off the
   route path, not the sidebar label, so none break regardless of which label survives.
8. Searched all test files for `adminSidebarConfig`, "VET Workforce", and "Trainers Matrix Engine" —
   the only hits are false positives in an unrelated "VET Workforce" standalone-forms template test
   file, confirmed by content inspection to have no connection to this sidebar or route. **No test of
   any kind references either sidebar entry or this route.**

**Recommendation (diagnosed, not yet confirmed by Brian):** remove the **"Trainers Matrix Engine"**
row in the VET Workforce section (the one carrying the dead `?tab=engine`); keep **"Trainers Matrix"**
in the Training & Assessment section, because (a) it's the one embedded in the documented, ordered
compliance-sequence comment, (b) the VET Workforce copy is the one carrying the leftover dead query
string, suggesting it's the later, accidental duplicate, and (c) the independently-maintained
AI-assistant navigation index already agrees with "Trainers Matrix" / "Training & Assessment" as
canonical. Confirmed via test search that nothing programmatically depends on the VET Workforce row
surviving.

**One follow-up worth doing in the same change, not a blocker:** the page's own live title in
`routeLabels.ts` currently says "Trainers Matrix Engine," which would then be the only place still
using the removed wording. Relabeling that one line to "Trainers Matrix" keeps the sidebar and the
page's own title in agreement — small, same PR, but a separate line/file from the sidebar removal
itself.

**Next action:** LOCKED — implemented in PR 3 (`feat/g04b-nav-link-label-fixes`), 10 September 2026. Edited
`rto-compass-hub/src/config/adminSidebarConfig.ts` (remove the VET Workforce row) and, if the follow-up
above is included, `src/constants/routeLabels.ts` (one label string). Verify via
`node scripts/generate-route-manifest.mjs --check` (no route change expected) and scoped ESLint. No
migration, no edge function change (the AI-assistant navigation index already agrees and needs no
edit).

### Correction to this recon's own earlier finding

Section 2 above (`roleMenuConfigs.ts`, "What it drives") stated Regulatory Officer has no explicit
branch in `getMenuConfig()` and falls back to the `trainer` config. **This is stale/incorrect as of
the current worktree tip.** Direct code read of `getMenuConfig()` (`src/config/roleMenuConfigs.ts:554-556`)
confirms an explicit branch: `if (role === 'Regulatory Officer') return roleMenuConfigs['auditor'];`.
Regulatory Officer genuinely receives its own dedicated `auditor` config today, not a Trainer fallback.
Superseded by Issue 2 below, which found a different, more serious live problem in that same config.

### Role → live sidebar component mapping (verified against `RootAppLayout.tsx`/`RoleSidebar.tsx`)

> **Reflects commit:** `164280ac4` (10 Sep 2026 — this recon's stated baseline throughout). Before
> trusting this table, compare against current `main` HEAD; if it's moved significantly, re-verify
> against `RootAppLayout.tsx`/`RoleSidebar.tsx` directly rather than assuming this table still holds.

The tenant sidebar is not one file — `RootAppLayout` renders `SuperAdminSidebarNav` for the platform
case, otherwise delegates to `src/components/layout/RoleSidebar.tsx` (the only one of three
identically-named `RoleSidebar.tsx` files actually wired into the live layout), which branches per role:

| Role | Live component | Config file | Coverage |
|---|---|---|---|
| super_admin | `SuperAdminSidebarNav` (normal path) | `superAdminNav.ts` | Complete |
| Administrator | `AdminSidebar` | `adminSidebarConfig.ts` | Complete (full-access bypass) |
| Governing Person | `AdminSidebar` | `adminSidebarConfig.ts` | Complete (explicit full-access bypass) |
| Consultant | `AdminSidebar` | `adminSidebarConfig.ts` | Complete (explicit full-access bypass) |
| Consultant Assistant | `AdminSidebar` | `adminSidebarConfig.ts` | Complete, but permission-filtered per item (not on the bypass list) |
| Compliance Manager | `EnhancedRoleSidebar` | `roleMenuConfigs.ts` → `compliance-manager` | Complete |
| Trainer | `EnhancedRoleSidebar` | `roleMenuConfigs.ts` → `trainer` | Complete |
| Trainer/Assessor | `EnhancedRoleSidebar` | `roleMenuConfigs.ts` → `trainer` (same object as Trainer, not its own config) | Complete, shared by design |
| Student | `EnhancedRoleSidebar` | `roleMenuConfigs.ts` → `student` | Complete |
| Regulatory Officer | `EnhancedRoleSidebar` | `roleMenuConfigs.ts` → `auditor` (dedicated, explicit branch) | **Menu exists but is mostly broken — see Issue 2** |
| Student Support Officer | `SsoSidebar` | `ssoSidebarConfig.ts` | Complete |
| Executive | `ExecutiveSidebar` | Inline 3-item array inside the component itself, not an external config file — deliberately minimal by its own code comment | Complete for its intentionally narrow scope |
| **Employer** | **none** | — | **No sidebar renders at all — falls through every branch** |
| **Third Party** | **none** | — | **No sidebar renders at all — falls through every branch** |

Employer and Third Party hitting "no sidebar" is not accidental: `RoleSidebar.tsx` carries a comment
noting `getMenuConfig` historically falls back to Trainer for unbuilt roles and deliberately avoids
passing these two roles into that fallback — i.e., someone chose "no sidebar" over "wrong sidebar" for
these two, but neither has a real one either.

**Secondary finding, narrow:** a super admin using role-preview (`PreviewRoleContext`) while in global
`superadmin` mode always sees `AdminSidebar` regardless of the previewed role — the `mode === 'superadmin'`
check short-circuits before the previewed role is consulted. Role preview has no visible sidebar effect
for a super admin in that mode. Not one of the 14 tenant roles; flagged for awareness only.

### Issue 2 — Regulatory Officer's dedicated sidebar menu is almost entirely dead links

**Status: ✅ SHIPPED — PR #1096 merged 11 September 2026 (`98bb98834`), worktree B**

**Correction found at implementation time:** this section's original count (11 items, only 2 resolving
to real pages) undercounted. The `auditor` menu config actually lists **14** items/quick-actions, not
11 — three more dead links hide under paths that don't look like `/auditor/*` at a glance (Document
Repository → `/document-repository`, Compliance Registers → `/registers`, Evidence Library →
`/evidence`) and were missed by a search scoped only to that prefix. Of those three, "Compliance
Registers" turned out to be a **live, working route** (`/registers/*` redirects to
`/dashboard/registers`, a real read-only page) — a `/fresh-eyes` adversarial review caught this after
an initial commit mis-flagged it as coming-soon alongside the other two. **Final split: 13 coming-soon,
5 kept as ordinary links** — Auditor Dashboard, Intelligence, Training Product Transitions, Compliance
Registers, and Risk Register (one more than this section's original "Intelligence, Training Product
Transitions, and the Risk Register" candidate list), each verified against `AppRoutes.tsx` and the
role's actual read-only permission constants/hooks (`RISK_REGISTER_READ_ROLES`,
`isTenantIntelligenceReadOnly`, `useCanWriteTenantContent`/`OPERATIONAL_WRITE_ROLES`), not assumed.
`AuditorDashboard.tsx` was replaced with the existing `FutureFeatureCard` component per the locked
decision below (no fabricated metrics remain).

**Original planning content below, kept for the "why" — see the correction above for what actually
shipped:**

**What:** Regulatory Officer correctly receives its own `auditor` menu config (see correction above,
this is not a Trainer-fallback bug). But verified directly against the live route tree
(`src/AppRoutes.tsx:1019-1023`), the `auditor` route family registers only ONE route:
`/dashboard/auditor` (index page, `AuditorDashboard`, wrapped by `AuditorRoute` guard) — no child
routes for schedule, compliance, reports, communications, issues, feedback, findings, or export.

The `auditor` menu config (`src/config/roleMenuConfigs.ts:449-536`) lists 11 items/quick-actions.
Only 2 resolve to real pages: "Auditor Dashboard" (`/dashboard/auditor`) and "Intelligence"
(`/dashboard/intelligence`, a different existing page). The remaining 9 — Audit Schedule, Compliance
Status, Generate Audit Report, Previous Reports, Export Data, RTO Communications, Issue Tracking,
Feedback Submission, plus quick actions Log Finding/Export Evidence/Schedule Follow-up — all point to
`/auditor/*` paths with zero matching routes anywhere in the app today. A Regulatory Officer clicking
most of their own sidebar hits a dead link.

**Locked decision:** treat the Regulatory Officer portal as **coming soon**, not repaired or built out.
Preserve the intended information architecture, but never render a link to a nonexistent route. The
existing "Auditor Dashboard" is itself a static prototype with hardcoded sample figures, not a live
experience — it goes coming-soon too. Only Intelligence, Training Product Transitions, and the Risk
Register redirect are candidates for ordinary links, and only after each is tested with a real
primary-Regulatory-Officer read-only persona and proven to behave correctly; otherwise they go
coming-soon as well. This decision grants or removes no route, API, database, or server authorization.

**Verified directly against production, 10 September 2026 (by Claude Code, not assumed from the plan):**
zero `tenant_members` rows have `Regulatory Officer` as a primary role. Three rows have it as a
supplementary role (2 active, 1 deactivated) — all three belong to members whose primary role is
Administrator, so all three see the Administrator sidebar today, not this broken menu. No current user
is affected by this bug.

**Implementation plan:**
1. **Availability model** — add a frontend-only `available` / `coming_soon` state to each menu entry.
   A coming-soon item is not an anchor, cannot be keyboard-activated, and exposes its status to screen
   readers. This state must never be conflated with route permissions or server role gates — menu
   presentation is not authorization.
2. **Honest portal entry state** — replace the static auditor dashboard with a genuine Regulatory
   Officer coming-soon surface. No fabricated metrics, no sample evidence, no active-looking actions.
   Explain the portal is being prepared; a support/contact path only if product approves one.
3. **Keep only proven destinations** — test Intelligence, Training Product Transitions, and the Risk
   Register redirect via a real primary-Regulatory-Officer persona in a read-only environment. Keep a
   destination as an ordinary link only if it loads, is useful read-only, and has no misleading write
   affordances. No aliases, redirects, placeholder pages, or guessed URLs for the 9 absent destinations.
4. **Regression coverage** — focused tests for portal selection, coming-soon non-navigability, and
   available items resolving through the route manifest; an authenticated read-only browser check once
   a primary-role test persona exists.

**Blast-radius checks before shipping:** desktop and mobile sidebars, search/filter results, quick
actions, breadcrumbs, page titles, and any role-preview surface (Issue 4) for the same state; analytics
mapping so a retired action isn't reported as a successful visit; search help material/onboarding/emails
for `/auditor/*` links (redirect only a confirmed legacy audience to an intentional destination, don't
add a redirect merely to silence a broken link); confirm no change to route guards, server permissions,
feature visibility, tenant membership, or background services.

**Acceptance evidence:** every visible entry has an explicit availability decision; no coming-soon entry
navigates anywhere; no fabricated dashboard data remains visible; retained links pass the route-manifest
check and a focused role-appropriate read-only test; the diff changes frontend presentation only.

### Issue 3 — Employer and Third Party roles render no sidebar at all

**Status: ✅ SHIPPED — PR #1157 (`36af06149`), 15 September 2026 (bundled with Issue 6; status
corrected 16 Sep 2026 by cross-referencing `g04b-nav-optimization-plan.md` §6). Decision originally
locked via ChatGPT planning round, merged into this file 10 September 2026.**

Verified directly against `src/components/layout/RoleSidebar.tsx`: neither role matches any branch in
the live role-selection switch, so both fall through to `return null` — no sidebar renders. A code
comment in that file indicates this was deliberate (avoiding `getMenuConfig`'s historical fallback to
Trainer for unbuilt roles), but "no menu" is not itself a working navigation experience for these two
roles either.

**Locked decision:** treat Employer and Third Party as **future external stakeholder portals**, not
incomplete tenant workspaces. Keep the deliberate no-sidebar behavior — do not build a menu, routes,
dashboard, or placeholder feature pages for either role in this cleanup. Replace the generic
"Not authorized" outcome with a role-specific, non-navigational coming-soon landing: states the portal
is being prepared, no fabricated figures or active-looking actions, only a product-approved support/
contact path. This is a frontend message, not a grant of access or an authorization change.

**Verified directly against production, 10 September 2026 (by Claude Code, not assumed from the plan):**
zero `tenant_members` rows have `Employer` or `Third Party` as a primary role or a supplementary role,
in any status. No current user is affected.

**Supporting evidence from the plan (not yet independently re-verified by Claude Code, flagged for
awareness):** a landing-route change on 25 August 2026 reportedly already set both roles to
`/not-authorised` deliberately, with a source comment stating their dedicated portal routes aren't
active in the tenant router; the only existing Employer/Third Party portal pages are design previews
under the Administrator route (`/admin/user-portals/*`) with hardcoded metrics — not real role portals.

**Implementation plan:**
1. **Role-specific unavailable state** — make the existing role landing distinguish Employer/Third
   Party from a generic authorization failure, while keeping the current fail-closed route boundary. No
   sidebar, navigation, sample counts, or action controls — a single accessible title and explanation.
2. **No speculative activation** — do not register `/employer/*` or `/third-party/*`, wire the old menu
   config into the global sidebar, repurpose the admin previews, or add redirects just to make paths
   resolve. Keep public token-based survey links independent of this role landing.
3. **Future launch gate** — a real portal needs its own product FRAME first (permitted journeys, route
   contract, data ownership, authorization model, real primary-role personas, first useful read-only
   screen) before the coming-soon landing is ever replaced.

**Acceptance evidence:** an Employer/Third Party primary role sees an accurate portal-status message,
not a misleading error or a borrowed menu; no click target exposes an absent route; the change touches
frontend presentation only; a later launch is separately scoped and verified, not inferred from the
admin preview screens.

### Issue 4 — Super-admin "preview as role" has no effect on the sidebar shown

**Status: ✅ SHIPPED — PR #1158 (`ba138872c`), 15 September 2026 (status corrected 16 Sep 2026 by
cross-referencing `g04b-nav-optimization-plan.md` §6). Decision originally locked via ChatGPT
planning round, merged into this file 10 September 2026.**

Verified directly against `RootAppLayout.tsx`/`RoleSidebar.tsx`: when a super-admin is in global
`superadmin` mode and uses the preview-role feature, the sidebar-selection logic checks
`mode === 'superadmin'` before it ever consults the previewed role, so `AdminSidebar` renders
regardless of which role is being previewed. The feature silently has no visible effect on navigation
in this one case. Narrow blast radius — affects only super-admin users using role preview while in
global superadmin mode, not any tenant-role user.

**Locked decision:** keep role preview as a **navigation-and-layout preview only** for platform staff.
Fix the actual bug — the selected role must win for sidebar selection, on both desktop and mobile — but
it must never become an authorization, data-access, route-guard, membership, or write-permission
simulation. Selecting a role must NOT auto-navigate to its configured home path (those paths include
absent/coming-soon destinations from Issues 2 and 3; auto-navigating there would be misleading) — the
selector only changes visible navigation in place. Regulatory Officer, Employer, and Third Party stay
selectable so their coming-soon states can be inspected. The preview banner must read: "Navigation
preview only — access is unchanged; do not use this to validate data or permissions," and must not claim
the preview retains full write access.

**Supporting evidence from the plan (not yet independently re-verified by Claude Code, flagged for
awareness):** the preview selector reportedly currently navigates immediately to every selected role's
home path on selection (a second bug beyond the one we found ourselves); preview state reportedly
overrides the shared `useEffectiveRole` result while other guards keep using the real super-admin
identity, so this mixed state cannot prove real read/write/authorization behavior; the preview/demo
wiring reportedly dates to 31 March–2 April 2026 with no dedicated preview-role tests in the suite.

**Implementation plan:**
1. **Separate preview presentation from identity** — the selected preview role is an explicitly
   navigation-only value, consumed only by layout/sidebar presentation and preview labels. AppContext
   mode, real tenant membership, real effective role, server calls, route authorization, and write
   decisions all keep sourcing from their existing real-context mechanisms, untouched.
2. **Correct sidebar precedence** — in preview, select the role-appropriate sidebar before the normal
   SuperAdmin/consultant/support branch, on both desktop and mobile. Without a preview role, the current
   SuperAdmin sidebar is preserved exactly; exiting clears only preview presentation state.
3. **Safe selector, truthful banner** — remove auto-navigation on role selection; keep the current route
   stable until the operator follows a visible, available item. Render Issues 2/3's coming-soon states
   in preview exactly as they'll appear to the real role. Replace the banner's write-access claim with
   the approved navigation-only warning plus an accessible exit control.
4. **Verification** — focused component tests for role selection, desktop/mobile parity, exit, no
   selection-triggered navigation, and a no-preview SuperAdmin regression; confirm preview state never
   changes AppContext mode or the values route guards/write checks read.

**Acceptance evidence:** every selectable preview role shows its intended sidebar or coming-soon state,
none silently fall back to Administrator navigation; selecting/exiting preview performs no membership,
authorization, or data mutation and doesn't redirect anywhere; the banner is accurate; SuperAdmin
navigation is unchanged with preview off, proven by focused tests.

### Issue 5 — Core decision: which system becomes the canonical navigation source

**Status: LOCKED — decided via ChatGPT planning round, merged into this file 10 September 2026**

This is the original G04-B decision this whole recon was commissioned to inform. Full role→component
mapping is now confirmed (see table above). None of the four originally-compared tenant-navigation
candidate files is a complete, currently-live source on its own — see the six recommendation options
above (`## Recommendation options`).

**Locked decision:** option 6 — build one typed, frontend **navigation catalog** as the logical source
of truth for all menu presentation. It owns a destination's stable identifier, label, icon, grouping and
order, intended shell placement, route-contract identifier, and presentation availability
(`available`/`coming_soon`). Sidebars, quick access, breadcrumbs, menu search, and navigation preview
must derive from this catalog rather than keeping their own copies. The catalog is **not** an
authorization system — route registration/redirects stay owned by the G04 route contract and router;
client/server guards, membership, RLS, RPCs, and write permissions stay separately owned. A menu entry
existing never grants access; a hidden entry is never a security control. Delivered incrementally after
Worktree B's G04 route-contract work supplies stable route identifiers — no big-bang replacement, and no
legacy model deleted until its live consumers have migrated and evidence proves it's no longer imported.

**Evidence and current ownership map (from the plan; cross-checked against this recon's own findings
where they overlap, consistent throughout):** `roleMenuConfigs.ts` drives Compliance Manager/Trainer/
Student/Regulatory Officer + role-aware breadcrumbs; `adminSidebarConfig.ts` drives the Administrator
sidebar/quick access/mobile breadcrumb (and currently includes the Issue 8 broken Employer Portal
shortcut); `ssoSidebarConfig.ts` drives Student Support; `superAdminNav.ts` drives SuperAdmin.
Breadcrumb/section-chip resolution combines `roleMenuConfigs.ts`, `superAdminNav.ts`, and legacy
`nav.ts`, whose role map recognizes "External Auditor," not the live "Regulatory Officer" name.
`roleNavigation.ts` is flagged as the highest-risk mixed source — it declares role menus but also
exports the client route-permission/read-only helpers consumed by `RoleRouteGuard` and related hooks;
these must be disentangled, not silently removed alongside the menu data.

**Important gap found while merging this plan in, not yet resolved:** the plan's ownership map also
names five files this recon never independently audited — `src/config/roleMenus.ts`,
`src/config/menu.ts`, `src/config/navigation.ts`, `src/layouts/RoleLayout.tsx`, and `src/lib/navigation.ts`.
**Confirmed all five genuinely exist** (checked directly, 10 September 2026) — this is real, not an
external-tool error — but none of them have been traced for live consumers, dead-link counts, or
overlaps the way the other eight systems in this recon were. This means the true count of "systems that
decide what's in the menu" is higher than the 8 this recon fully characterized, and Item 4's own
ownership map (below) already warns these aren't safe to delete as a batch (`SharedShell` uses Sidebar
V3, role-dashboard pages use `RoleLayout`, and old helpers still import several of the others). **Needs
its own audit pass, same depth as P1/P2, before the migration in stage 5 below touches any of them.**

**Target model:** after the route contract is available, introduce `src/config/appNavigationCatalog.ts`
(typed catalog data only, each entry referencing a route-contract ID, never a hand-copied route string,
with surface/role visibility hints and explicit availability) and
`src/config/appNavigationSelectors.ts` (pure selectors producing ordered entries per shell/role/preview
state — presentation filtering only, never authorization). Existing sidebar/breadcrumb/quick-access/
search components consume selectors through small adapters until their old config is retired. The
catalog has separate namespaces for tenant Administrator, enhanced role, Student Support, SuperAdmin,
and future external portal navigation — one destination definition can appear in more than one namespace
without duplicating its route, availability, label, or icon.

**Staged implementation map:**
1. **Contract and catalog foundation — dependent on Worktree B.** Land/verify the G04 route-contract
   branch first; its identifiers and generated manifest are the only allowed target references. Add
   catalog types and an initial inventory with no UI consumer switched yet. Reject duplicate IDs,
   unknown route IDs, missing labels, and an `available` entry whose route is absent from the manifest.
   Record every existing menu destination as mapped, intentionally coming-soon, legacy redirect, or
   unresolved — never guess a replacement for an unresolved path.
2. **Apply the locked availability decisions everywhere** — model Issues 2 and 3's coming-soon entries
   once in the catalog; update the Administrator Role Portals, enhanced sidebar, breadcrumb/search, and
   Issue 4's preview adapter to use the shared state. A coming-soon entry stays non-navigational and
   accessible everywhere it appears, never becoming a redirect or fabricated portal on a different shell.
3. **Migrate the current RootAppLayout shells one at a time** — `roleMenuConfigs.ts` consumers first
   (`EnhancedRoleSidebar`, `NavBreadcrumb`, `SectionChip`), then `adminSidebarConfig.ts` consumers
   (`AdminSidebar`, quick access, `MobileBreadcrumb`), then `ssoSidebarConfig.ts`/`SsoSidebar`, then
   `superAdminNav.ts`/`SuperAdminSidebarNav`. Preserve each shell's grouping, badges, capability
   filtering, collapse state, and mobile behavior through adapters; retire a source only after its
   import count is zero and its replacement passes the verification gates below.
4. **Migrate preview and navigation-adjacent surfaces** — replace hardcoded preview-role home/menu
   declarations with catalog lookup (Issue 4 stays navigation-only); derive breadcrumb labels, section
   chips, quick-access labels, and sidebar search from the same selected catalog entries.
5. **Isolate and retire legacy systems in bounded PRs** — separate `roleNavigation.ts`'s menu
   declarations from its client route-permission/read-only helpers (no authorization behavior change,
   only removing the dependency on a second menu list, after dedicated guard review). Characterize
   `SharedShell`/Sidebar V3 (already this recon's Issue 12), `RoleLayout`/`roleMenus.ts`, and
   `menu.ts`/`navigation.ts`/`sidebarConfig.ts`/`nav.ts` consumers before moving or deleting them — each
   alternate layout is its own slice. Never remove something merely because the normal shell doesn't use
   it; route-manifest and import evidence must prove it's unreachable or migrated.

**Verification and release gates:** `node scripts/generate-route-manifest.mjs --check` passes before and
after every slice; the catalog validator reports no unknown route ID or navigable missing target;
focused tests cover catalog selection by role/shell, availability behavior, desktop/mobile parity,
sidebar search, quick access, and breadcrumb labels; every migrated shell gets an old-vs-new visible-item
comparison for a real role plus separate coming-soon/direct-link tests, using a primary-role read-only
browser persona wherever the result claims real access; route guards, `roleNavigation.ts` permission
helpers, and backend authorization stay unchanged unless a separate authorization FRAME is approved — a
clean UI test cannot prove authorization equivalence. One PR changes one catalog slice/shell; rebase
against the then-current route contract before starting the next slice; no long-lived parallel catalog
copy.

**Acceptance evidence:** every migrated destination has one catalog entry and one explicit availability
decision; a shared label/icon/route/coming-soon change appears consistently everywhere it's migrated; no
catalog entry bypasses or replaces route/client/server authorization; the route manifest stays current,
the retirement ledger tracks remaining legacy consumers, and every retired source has zero live imports.

---

## Architecture / bad-practice findings (not bugs, but structural risk factors)

These are not live defects on their own — flagged because they inform Issue 5 and because they explain
*why* problems like Issues 1, 2, 3, and 4 keep recurring across the codebase.

- **B1.** At least five different systems each independently decide "what shows in the menu" for some
  slice of the app, with no single official source — the root condition Issue 5 exists to resolve.
- **B2.** Two of those systems (`src/config/sidebarConfig.ts` and `src/components/nav/sidebarConfig.ts`)
  are dead code — fully disconnected from the live app today, yet indistinguishable at a glance from
  the live ones, risking accidental edits to something inert.
- **B3.** `src/config/roleNavigation.ts` mixes menu-display facts together with access-decision facts
  (`routePermissions`, `canAccessRoute()`) in the same file — editing a label risks touching access
  logic, or vice versa, without that coupling being obvious.
- **B4.** The exact "same page, two labels, two sections" mistake found in Issue 1 is independently
  repeated a second time inside the dormant `permissions.ts`/`sidebarConfig.ts` chain — confirming this
  is a recurring pattern in how sections get built, not a one-off, and it would resurface if that dormant
  chain is ever revived.
- **B5.** The page's own on-screen title/breadcrumb and its sidebar menu label are sourced from
  entirely separate systems with no cross-check — structurally, nothing prevents the mismatch found in
  Issue 1 from happening again anywhere else in the app.
- **B6.** The breadcrumb trail is built by three independent, non-communicating resolver functions in
  one file, plus a fourth separate mounted component (`Breadcrumb.tsx`/`routeLabels.ts`) that ignores
  all three — multiple non-agreeing label paths for the same UI element.
- **B7. CONFIRMED intentional, not a bug.** Trainer/Assessor's menu is the exact same object as
  Trainer's config — verified this is deliberate: the shared config object's own `displayName` field is
  explicitly `'Trainer/Assessor'` (not `'Trainer'`), proving it was designed from the outset as one
  combined config serving both role labels, not an accidental sharing. No action needed.
- **B8.** `src/utils/routeRegistry.ts` is a fully dead metadata file (title/description/banner text) —
  zero live consumers found anywhere. Pure clutter, no live risk.
- **B9. CORRECTED — not actually redundant.** Direct read of `RoleSidebar.tsx` plus `AppContext.tsx`'s
  type definitions confirms `mode` (`'superadmin' | 'tenant' | 'consultant' | 'loading'`) is a distinct
  top-level workspace mode, separate from `effectiveRole` (the tenant-membership role, e.g.
  `'Consultant'`). `mode === 'consultant'` represents a platform-level consultant workspace context not
  tied to any specific tenant; the switch's `'Consultant'` case handles an ordinary tenant member whose
  role happens to be Consultant while `mode === 'tenant'`. These are two genuinely different scenarios
  that both happen to render `AdminSidebar` — legitimate design, not duplicated logic. No action needed.
- **B10.** Inside the dormant sidebar chain, `RoleSidebar.tsx`'s `mode === 'superadmin'` branch is
  effectively unreachable under normal conditions (superseded by `RootAppLayout`'s own earlier check) —
  dead logic layered on an already-dormant path, negligible risk.
- **B11.** A second, fully orphaned code path exists for the Admin sidebar: `src/layouts/AdminLayout.tsx`
  also renders `AdminSidebar` directly and is wired to its own route module (`src/routes/admin.tsx`),
  but that module is never imported anywhere in the live app (confirmed via repo-wide search). A third
  dead-code layer sitting alongside the two already-known dormant sidebar files (B2).
- **B12.** `NavBreadcrumb.tsx` is confirmed fully dead (never mounted anywhere), and a diagnostic page
  (`src/pages/dev/NavCheck.tsx`) is unreachable — it has no real route entry, only a mention in a
  separate, stale, hand-maintained route list (`src/tools/routeScanner.ts`) that itself incorrectly
  claims the page is routed. A second stale "route inventory" file existing alongside the real one.
- **B13.** 8 more pages that use the live `TitleHeader` component are themselves unreachable — no
  registered route anywhere in `AppRoutes.tsx` (`admin/Dashboard.tsx`, `governance/dashboard.tsx`, and 6
  consultant/superadmin hub pages). Dead code that still looks fully wired-up (imports the live header,
  compiles fine) — only a route-registration check reveals it's unreachable.
- **B14.** `src/pages/admin/Dashboard.tsx` appears to be a stale duplicate of the actually-routed
  `src/pages/admin/AdminDashboard.tsx` (a different file, live at `/admin/dashboard` and
  `/dashboard/admin`) — same-sounding name, only one of the two is real.

## Flagged — evidence gathered, not yet root-caused or decided

- **F1.** Root cause of Issue 2's broken Regulatory Officer links is not yet diagnosed — whether the
  pages were planned but never built, built elsewhere and the menu never updated, or intentionally
  descoped without trimming the menu. Needs its own investigation pass before a fix can be designed.
- **F2. DONE — see full itemization below.** Every dead link in the four navigation candidate files has
  now been individually listed with a why-guess, not just the bulk counts.
- **F3. DONE — closed, no surprises.** Checked directly: only six files reference `roleMenuConfigs.ts`
  anywhere in `src/` (`roleMenuConfigs.ts` itself, `RoleSidebar.tsx`, `getBreadcrumb.ts`,
  `NavBreadcrumb.tsx`, `EnhancedRoleSidebar.tsx`, `SectionChip.tsx`) — all six were already accounted for
  in this recon. No hidden or unrelated consumer exists.
- **F4. DONE — see full audit below.** The five files named in the ChatGPT plan's ownership map have
  now been audited to the same depth as the other 8 systems. Four are dead; one is genuinely live and
  must not be touched as part of any navigation cleanup.

## F4 — audit of the 5 previously-unaudited navigation-adjacent files

### `src/config/roleMenus.ts` — fully dead, two levels deep

Exports role-keyed menu sections for 5 roles (`compliance-manager`, `trainer`, `student`, `executive`,
`auditor`) — a fourth, independent role-key vocabulary alongside the ones already found in the other
systems. Its only consumer, `src/components/nav/RoleSidebar.tsx`, has exactly one importer,
`src/layouts/RoleLayout.tsx` (see below), which has exactly five importers —
`src/pages/{auditor,compliance-manager,executive,student,trainer}/Dashboard.tsx` — none of which are
imported anywhere else in `src/`. Confirmed dead at every level of the chain, not just the top file.

**Every single one of its 39 literal paths is dead** — none match any live route, and none are caught by
any wildcard redirect (checked directly against `AppRoutes.tsx`, including nested wildcard sub-routers).
All under `/compliance-manager/*`, `/trainer/*`, `/student/*`, `/executive/*`, `/auditor/*` — a role
namespace that appears to have been scaffolded here and superseded entirely by the real, live
`/dashboard/{role}` tree that the other systems in this recon already use.

**Last touched:** a single commit, the initial 7 October 2025 import. Never edited since.

**Overlaps:** shares trailing path segments (not code) with `roleMenuConfigs.ts`/`roleNavigation.ts` —
e.g. both independently use `/student/support`, `/trainer/assessments` — but this file's versions lack
the `/dashboard` prefix the live systems use, so it's a same-wording-different-dead-URL conflict, not a
same-page-different-label one.

### `src/config/menu.ts` — fully dead, two levels deep, but actively edited anyway

Exports a SuperAdmin menu and a Student Support Officer menu. Its two consumers
(`NewSidebar.tsx`, `SideMenu.tsx`) each have zero importers anywhere in `src/`. Confirmed dead at both
levels.

**14 of 18 literal links are dead**, including several that technically match a route object but only
via a broken double-hop: `AppRoutes.tsx` has a "Legacy Super Admin redirects" block sending several
`/admin/...` paths to bare `/superadmin/...` targets — but no top-level `/superadmin` route exists
anywhere; every real superadmin page lives nested under `/dashboard/superadmin/...`. So these links
technically hit a redirect, then immediately dead-end at the login catch-all anyway. Two entries
reference features whose removal is explicitly documented in `AppRoutes.tsx`'s own code comments
("content/registers placeholder deleted — Section 5 cleanup", "Legacy redirect to
/superadmin/ops/reports removed — target no longer exists (Phase 1 cleanup)") — meaning this file wasn't
updated when those features were deliberately retired elsewhere in the app.

**Last touched: 22 February 2026** — real content changes, well after this file's only two consumers
were already unreachable. Someone has been maintaining genuinely dead code without realizing it.

**Overlaps:** direct label collision with the already-audited `superAdminNav.ts` — both use identical
labels ("Templates," "Release Notes," "Billing," "Email Templates") but this file points them at the
broken legacy `/admin/...` aliases while `superAdminNav.ts` points directly at the correct live paths.

### `src/config/navigation.ts` — fully dead, two levels deep, but the most actively maintained file in this entire recon

Exports a single flat/nested navigation tree with role-based filtering helpers. Its three consumers
(`Sidebar.tsx`/`AppSidebar`, `menuMap.ts`, `iconFromMenu.ts`) each have zero importers anywhere in
`src/`. Confirmed dead at both levels.

**Roughly 24 of 39 literal paths are dead or land on the wrong generic page** — it shares the exact same
un-prefixed `/registers/xxx` pattern already found in `nav.ts` (caught by the live wildcard, landing on
the generic hub instead of the specific register), plus several paths with no live equivalent under any
name (`/admin/monthly-reports`, `/admin/matrix-live`) and one entry a prior developer already
hand-labeled `// Hidden — broken; use /admin/surveys`.

**Last touched: 13 August 2026** — the single most recently and heavily edited file of all 8+ systems in
this entire recon. One of its recent commits is titled "Fix showcase demo bugs and fold 8 orphaned SSO
reports into Monthly Pack" — a substantive rewrite, done to a file whose only three consumers are
themselves unreachable anywhere in the live app. **This is the strongest concrete evidence in the whole
recon that the current multi-file navigation setup actively wastes engineering time** — someone spent
real effort fixing broken links in a file nobody can ever see, a month before this recon started.

**Overlaps:** near-duplicate of the already-audited `nav.ts` — both independently define the identical
un-prefixed `/registers/*` path set plus `/documents`, `/actions`, `/surveys`, `/calendar`, `/governance`.
Two separately-maintained dead files converging on the same stale path convention.

### `src/layouts/RoleLayout.tsx` — fully dead, and confirmed a THIRD, separate dead shell system

Renders `RoleSidebar` (nav) plus a role-view switcher. Its five consumers are the same
`pages/{role}/Dashboard.tsx` files noted under `roleMenus.ts` above — confirmed unreachable.

**Specifically resolved, since this recon needed to know:** is this the same dormant shell system as
Issue 12 (`SharedShell`/`GeneralLayout`/`SuperAdminLayout`/`SidebarV3`)? **No.** Traced every import in
`RoleLayout.tsx` directly — none touch any of those four names, and a repo-wide search for all four
confirms zero cross-references in either direction with `RoleLayout.tsx` or `RoleSidebar` (nav). This is
an independent, third dead shell system, with its own separate never-touched-since-scaffolding origin
(single commit, 7 October 2025, like `roleMenus.ts`) and its own separate orphaned call chain (5
per-role `pages/{role}/Dashboard.tsx` files — distinct from the real, live per-role dashboards at
`src/pages/dashboard/{Role}Dashboard.tsx`, which must not be confused with these dead ones). **Needs its
own cleanup entry, not folded into Issue 12's shell removal** — added as Issue 13 below.

### `src/lib/navigation.ts` — CONFIRMED LIVE. Do not touch as part of any navigation cleanup.

A 12-line utility (`navigate(path, options)`) doing manual `pushState`/`popstate` dispatch, bypassing
React Router's own navigate API. Traced its one consumer, `routeToLanding.ts`, and all three of *that*
file's consumers: two (`RootLanding.tsx`, `PostAuthGate.tsx`) are themselves unreachable, but the third,
`src/pages/Auth.tsx`, is genuinely live — rendered at real routes and calling this utility directly in
the post-login and post-OAuth-callback flows. **This file is real, load-bearing plumbing for the login
flow, not a menu/navigation-data source** — it has no path strings of its own and is unrelated to the
canonical-navigation-source question. Flagged here only so nobody mistakes it for one of the dead files
above and removes it by accident during Issue 5/12/13 cleanup work.

### Summary table

| File | Status | Last meaningful edit | Dead links |
|---|---|---|---|
| `roleMenus.ts` | Dead, 2 levels deep | 7 Oct 2025 (never touched again) | 39/39 |
| `menu.ts` | Dead, 2 levels deep | 22 Feb 2026 (edited despite being dead) | 14/18 |
| `navigation.ts` | Dead, 2 levels deep | 13 Aug 2026 (most recently/heavily edited file in this whole recon) | ~24/39 |
| `RoleLayout.tsx` | Dead — third, separate shell system from Issue 12 | 7 Oct 2025 (never touched again) | n/a, no own paths |
| `lib/navigation.ts` | **LIVE — do not touch** | 7 Oct 2025 (never touched again, still load-bearing) | n/a, utility only |

### Additional dead code found while tracing `lib/navigation.ts` (not otherwise investigated)

`src/components/RootLanding.tsx` (lazy-imported in `AppRoutes.tsx` but never actually rendered anywhere
in the route tree) and `src/pages/auth/PostAuthGate.tsx` (zero importers anywhere) are both separately
dead. Noted for awareness; not otherwise chased.

## Issue 13 — Retire the `RoleLayout`/`roleMenus.ts` dead shell system (third, separate from Issue 12)

**Status: ✅ MERGED — PR #1085 (`f6dbb604e`), 10 September 2026.**

Implemented and shipped exactly per the plan below, with one addition: an adversarial fresh-eyes
review (independent of the implementation session) caught a 4-file follow-up tail, folded into the
same PR rather than deferred, on Brian's instruction:

- `src/components/navigation/sidebar/SidebarItem.tsx` and `src/components/role-switcher/ViewAsRole.tsx`
  / `src/hooks/useViewAsRole.ts` genuinely **became** dead as a direct side effect of this PR's 15-file
  deletion — their sole callers (`Sidebar.tsx`/`AppSidebar` and `RoleLayout.tsx` respectively) were
  among the 15 files removed.
- `src/config/menu.tsx` — the file this plan's original "explicitly out of scope, do not delete" note
  (item 9 below) was protecting — turned out, on independent re-check, to have **already been dead
  before this PR touched anything**: its exports (`menuConfig`, `iconForPath`) had zero live importers
  of their own, unrelated to `menu.ts`'s removal. The original out-of-scope note was correct as written
  (don't confuse the two files, don't delete this one *as part of the `menu.ts` removal step*) — it was
  never a claim that `menu.tsx` was live. Deleted as its own independently-justified item once confirmed,
  not as a consequence of removing `menu.ts`.

All four traced back to the same 7 October 2025 original-import commit — old leftovers, not new code.
Final count: 19 files, 2,056 lines removed, zero additions/modifications. Fresh-eyes verdict: SHIP,
with explicit confirmation of no DB tail (none of the 15 original files ever called Supabase).

Surfaced by F4. A third, independent dead shell system, distinct from Issue 12's
`SharedShell`/`GeneralLayout`/`SuperAdminLayout`/`SidebarV3` family — confirmed via direct import tracing,
zero cross-references either direction. Both this recon's B-list and Issue 12 should not assume these
two dead systems are the same thing; they are two separate cleanup items that happen to be the same
*kind* of work.

**Files:** `src/layouts/RoleLayout.tsx`, `src/config/roleMenus.ts`, and the five orphaned page files that
are its only consumers: `src/pages/auditor/Dashboard.tsx`, `src/pages/compliance-manager/Dashboard.tsx`,
`src/pages/executive/Dashboard.tsx`, `src/pages/student/Dashboard.tsx`,
`src/pages/trainer/Dashboard.tsx`. **Important:** these five must not be confused with the real, live
per-role dashboards at `src/pages/dashboard/{Role}Dashboard.tsx` (different files, different folder) —
confirm this distinction carefully before deleting anything.

**Also folded in from the same F4 pass, same standard:** `src/config/menu.ts` and
`src/config/navigation.ts` (and their dead consumers `NewSidebar.tsx`, `SideMenu.tsx`, `Sidebar.tsx`/
`AppSidebar`, `menuMap.ts`, `iconFromMenu.ts`) — both fully dead, two levels deep, confirmed by direct
import tracing, safe to remove on the same terms as Issue 12.

**Recommendation:** scope as its own dedicated removal task, same discipline as Issue 12 — enumerate
every file precisely, verify a full type-check/build succeeds with them removed, and do not touch
`src/lib/navigation.ts` (confirmed live) in the same pass by mistake.

### Implementation plan — Issue 13 (drafted 10 September 2026)

Same re-resolution discipline as Issue 12: every path below was confirmed directly against the current
worktree tip during this planning pass, since the original F4 audit named several of these files by
component/file name only, without a full path.

**Group A — `RoleLayout`/`roleMenus.ts` and their five orphaned pages:**

1. `src/pages/auditor/Dashboard.tsx`
2. `src/pages/compliance-manager/Dashboard.tsx`
3. `src/pages/executive/Dashboard.tsx`
4. `src/pages/student/Dashboard.tsx`
5. `src/pages/trainer/Dashboard.tsx`
6. `src/components/nav/RoleSidebar.tsx` — the dead one. Confirmed its only importer is
   `src/layouts/RoleLayout.tsx` (item 7). **Not** the same file as `src/components/layout/RoleSidebar.tsx`
   (the live one, wired into `RootAppLayout`) or `src/components/navigation/sidebar/RoleSidebar.tsx` (a
   third file with this exact base name, named in this recon's original section 1 as the intended
   consumer of `roleNavigation.ts` — unrelated to this issue, not touched here). Three files share this
   name across the codebase; only this one is in scope.
7. `src/layouts/RoleLayout.tsx`
8. `src/config/roleMenus.ts`

**Group B — `menu.ts`/`navigation.ts` and their dead consumers, folded in from the same F4 pass:**

9. `src/config/menu.ts` — **note the extension.** Confirmed by direct content read this is the file
   described in F4 (exports `superAdminMenu`, `studentSupportOfficerMenu`, `getMenuForRoles`). A
   different file, `src/config/menu.tsx`, sits right next to it with unrelated content (its own `Role`
   type, `menuConfig`, `iconForPath`) — confirmed neither of Group B's two consumers below import that
   one. Do not delete `menu.tsx`; it is not part of this issue.
10. `src/components/navigation/NewSidebar.tsx`
11. `src/components/shell/SideMenu.tsx`
12. `src/config/navigation.ts`
13. `src/components/navigation/sidebar/Sidebar.tsx` — exports default `AppSidebar`. Confirmed zero
    importers anywhere in `src/`.
14. `src/tools/menuMap.ts`
15. `src/utils/iconFromMenu.ts`

**Confirmed explicitly out of scope — do not delete, do not confuse with the above:**

- `src/config/menu.tsx` (see item 9's note).
- `src/components/layout/RoleSidebar.tsx` and `src/components/navigation/sidebar/RoleSidebar.tsx` — the
  other two files sharing the "RoleSidebar" name (see item 6's note). Neither is investigated further
  here; the first is live, the second is unrelated to this issue.
- `src/lib/navigation.ts` — the confirmed-live, load-bearing `navigate()` utility (F4). Easy to confuse
  with `src/config/navigation.ts` (dead, item 12, in scope) by name alone — they are not the same file
  and must not be conflated during execution.

**Locked decision — confirmed by Brian, 10 September 2026:** delete all 15 Group A/B files. No adapter
or replacement needed — none are reachable today, and none feed Issue 5's new navigation catalog work.

**Implementation slices — deletion order.** Leaf-first, same discipline as Issue 12:

1. **Re-verify immediately before touching anything**, against the branch tip at implementation time.
2. **Delete the five orphaned Dashboard pages (Group A, items 1–5)** — each has exactly one import
   (`RoleLayout`), and nothing imports any of the five.
3. **Delete `src/components/nav/RoleSidebar.tsx`** (item 6) — its only importer, `RoleLayout.tsx`, is
   still present at this point but about to go; safe to remove in either order relative to step 4.
4. **Delete `src/layouts/RoleLayout.tsx`** (item 7) — now unreferenced once step 2 is done.
5. **Delete `src/config/roleMenus.ts`** (item 8) — now unreferenced once steps 3–4 are done (its two
   importers were `RoleLayout.tsx` and `nav/RoleSidebar.tsx`).
6. **Delete `NewSidebar.tsx` and `SideMenu.tsx`** (items 10–11) — each already has zero importers, can be
   done independently of steps 2–5.
7. **Delete `src/config/menu.ts`** (item 9) — now unreferenced once step 6 is done. Re-confirm
   `menu.tsx` is untouched immediately after this step, precisely because the two filenames are easy to
   mix up.
8. **Delete `menuMap.ts` and `iconFromMenu.ts`** (items 14–15) — each already has zero importers.
9. **Delete `src/components/navigation/sidebar/Sidebar.tsx`** (item 13, `AppSidebar`) — already zero
   importers.
10. **Delete `src/config/navigation.ts`** (item 12) — now unreferenced once steps 8–9 are done (its
    three importers were `menuMap.ts`, `iconFromMenu.ts`, and `Sidebar.tsx`).
11. Run every check in "Blast-radius checks" below before committing.

**Blast-radius checks before shipping:**

- After each deletion step, grep for that file's own name/export across `src/` and `tests/` and confirm
  zero remaining references before moving on.
- Confirm the two other `RoleSidebar.tsx` files (`components/layout/`, live; `components/navigation/
  sidebar/`, third unrelated file) are untouched — three files share this exact base name and only one
  is being deleted.
- Confirm `src/config/menu.tsx` is untouched, checked specifically right after step 7.
- Confirm `src/lib/navigation.ts` (F4's confirmed-live utility) is untouched — it is nowhere in this
  batch, but its name is one character away from item 12's `src/config/navigation.ts`.
- Do not run `npm run build` or a bare root `tsc --noEmit`, per this workspace's standing rule. Run
  `npm run lint` scoped to the removed paths and any file that used to import them.
- Re-run `node scripts/generate-route-manifest.mjs --check` — no diff expected, since none of these 15
  files register a route (all five Dashboard pages are confirmed unreachable, not routed).
- Search `docs/` for any of these file/component names, same low-expectation check already used for
  Issue 12.

**Acceptance evidence:**

- All 15 Group A/B files are gone from the working tree.
- `generate-route-manifest.mjs --check` reports no diff.
- `npm run lint` is clean for every touched/removed path.
- `src/lib/navigation.ts`, `src/config/menu.tsx`, `src/config/permissions.ts`, and both other
  `RoleSidebar.tsx` files are confirmed untouched.
- A repo-wide search for each deleted file's export name returns zero hits outside git history.

## F2 — full itemization of every dead navigation link

**Correction to the original bulk count for `roleMenuConfigs.ts`:** the original "36 of 82 absent"
figure included 4 false positives from a naive text scan that didn't exclude commented-out code
(`/surveys` and three `/trainer/*` paths inside a disabled, commented-out block that renders nothing
today). Excluding those, the real live-dead-link count for that file is **32 of 77** uncommented
literal paths.

### `roleNavigation.ts` — 18 dead literals

| Path | Context | Why |
|---|---|---|
| `/dashboard/students-support/placement-sites` | Students & Support, "Placement Sites" | Typo drift — live route is singular `/dashboard/student-support/placement-sites` |
| `/dashboard/user-management` | Compliance Manager, "Users" | Renamed/moved — live route is `/admin/user-management` |
| `/employer/dashboard`, `/employer/trainees`, `/employer/assessments`, `/employer/feedback` | Employer nav (4 items) | No `/employer/*` route family exists at all — never-built portal, consistent with Issue 3. **3 of 4 (`trainees`/`assessments`/`feedback`) flagged `isComingSoon` in PR #1096, 11 Sep 2026, folded into PR 4 for hygiene** — `roleNavigation.ts`'s menu data has zero live render consumer today (confirmed: `RoleSidebar.tsx`, its only reader, is never imported anywhere reachable), so this is presentation-data hygiene ahead of Issue 3's actual fix, not a user-visible change. `/employer/dashboard` was left untouched — it's the item's home-path/index entry, out of scope for the hygiene pass; still open for whichever issue eventually retires this file. |
| `/settings` | Settings, "Organisation Settings" | No exact route; closest live paths are `/settings/profile`, `/settings/rto`, `/settings/key-dates`, `/settings/tenant` — looks like a missing index page |
| `/settings/preferences` | Settings, "Preferences" | No live route, no close match — never-built |
| `/student-support` | SSO, "SSO Dashboard" | Missing `/dashboard` prefix — live route is `/dashboard/student-support` |
| `/student/complaints`, `/student/courses`, `/student/feedback`, `/student/progress`, `/student/support` | Student nav (5 items) | No `/student/*` route family exists at all |
| `/surveys` | SSO, "Surveys" | No live `/surveys` route — sibling files already have a comment flagging this exact path as "Hidden — broken; use `/admin/surveys`," but this file never applied the same fix |
| `/third-party/agreements`, `/third-party/dashboard`, `/third-party/reports` | Third Party nav (3 items) | No `/third-party/*` route family exists at all — consistent with Issue 3 |

None of these 18 are caught by any live wildcard redirect — all genuinely unreachable as written.

### `roleMenuConfigs.ts` — 32 dead literals (corrected from 36)

**Auditor config (Regulatory Officer, Issue 2), itemized individually:**

| Path | Context | Why |
|---|---|---|
| `/auditor/schedule`, `/auditor/compliance`, `/auditor/reports/generate`, `/auditor/reports/history`, `/auditor/export`, `/auditor/communications`, `/auditor/issues`, `/auditor/feedback`, `/auditor/findings/new`, `/auditor/export/evidence`, `/auditor/schedule/followup` (9 menu items + 3 quick actions, 9 unique after de-dupe with earlier count) | Audit Overview / Audit Reports / Communication / quick actions | No `/auditor/*` route family exists beyond the single `/dashboard/auditor` index — never-built |
| `/document-repository` | Evidence Review, "Document Repository" | Missing prefix — live routes are `/dashboard/document-repository` and `/admin/document-repository` |
| `/registers` | Evidence Review, "Compliance Registers" | Resolves via the live `/registers/*` wildcard redirect to the generic `/dashboard/registers` hub — works, but not the canonical specific-register link form used elsewhere |
| `/evidence` | Evidence Review, "Evidence Library" | No live route, no close match — never-built |

**Consultant config:**

| Path | Context | Why |
|---|---|---|
| `/complybot` | Consultant Portal, "ComplyBot" | Missing prefix — live route is `/admin/complybot` |

**Student config — every single one of its 17 links is dead** (see new Issue 6 below):

| Path | Context | Why |
|---|---|---|
| `/student/courses`, `/student/assessments`, `/student/progress`, `/student/assessments/upcoming`, `/student/results`, `/student/rpl`, `/student/competencies`, `/student/resources`, `/student/support`, `/student/feedback`, `/student/complaints`, `/student/profile`, `/student/enrolments`, `/student/certificates`, `/student/assessments/submit`, `/student/support/book`, `/student/certificates/download` | My Learning / Assessments & Results / Support & Resources / My Profile / quick actions | No `/student/*` route family exists anywhere in the live app — an entire portal that was scaffolded in this config but never built (or built under an unidentified different path scheme) |

Only one of the 32 (the `/registers` entry) is caught by a live wildcard redirect; the rest are genuinely unreachable.

### `sidebarConfig.ts` (dormant system) — 24 dead literals, but 23 of them still "work" via a wildcard

| Path | Context | Why |
|---|---|---|
| `/dashboard/students-support/placement-sites` | Students & Support, "Placement Sites" | Same typo drift as `roleNavigation.ts` |
| `/registers/adc`, `/registers/aqf`, `/registers/audit`, `/registers/ci`, `/registers/ct`, `/registers/fpp`, `/registers/fre`, `/registers/ien`, `/registers/mcn`, `/registers/mktg`, `/registers/pdr`, `/registers/pfp`, `/registers/pli`, `/registers/qi`, `/registers/risk`, `/registers/rpl`, `/registers/staff-turnover`, `/registers/tas`, `/registers/tcr`, `/registers/thp`, `/registers/tprod`, `/registers/trainer-availability`, `/registers/whs` (23 items) | Quality Area 1/2/4, Students & Support, VET Workforce groups | All resolve via the live `/registers/*` wildcard redirect to the generic `/dashboard/registers` hub, not the specific register the label promises — "not a 404" but still the wrong page. `/registers/risk` is two redirect-hops removed (the hub itself redirects again to `/dashboard/risk/*`) |

Since this whole file is confirmed dormant/dead code today (not rendered anywhere live), the practical
urgency is low — but worth knowing precisely, in case this file is ever considered as a revival
candidate.

### `src/components/nav/sidebarConfig.ts` (dead code) — 25 dead literals

| Path | Context | Why |
|---|---|---|
| `/complybot` | "Compliance Intelligence" | Missing prefix — live route is `/admin/complybot` |
| `/governance/meeting-manager` | "Governance Meetings" | Resolves via the live `/governance/*` wildcard redirect to the generic `/dashboard/governance` hub, not the meeting-manager page specifically |
| `/documents` | "Documents Register" | No exact route; closest are `/dashboard/documents`, `/dashboard/registers/documents` |
| `/forms` | "Forms & Checklists" | Missing prefix — live route is `/dashboard/forms` |
| `/document-repository` | "Document Repository" | Missing prefix — live routes are `/dashboard/document-repository`, `/admin/document-repository` |
| `/qa1/training`, `/qa1/assessment`, `/qa1/rpl`, `/qa1/facilities` (4) | Quality Area 1 group | No live route or close match — Remix-era placeholders |
| `/registers/ssr` | "Student Support Register" | Resolves via the `/registers/*` wildcard to the generic hub, same situation as `sidebarConfig.ts` above |
| `/qa2/complaints`, `/qa2/enrolment`, `/qa2/work-placement` (3) | Quality Area 2 group | No live route or close match |
| `/qa3/trainer-competence`, `/qa3/pd-currency`, `/qa3/workforce-management` (3) | Quality Area 3 group | No live route or close match |
| `/qa4/leadership`, `/qa4/risk`, `/qa4/continuous-improvement`, `/qa4/information-transparency`, `/qa4/integrity-nrt`, `/qa4/accountability` (6) | Quality Area 4 group | No live route or close match. Notably, "continuous improvement" alone has three different unrelated path spellings across the codebase (`/qa4/continuous-improvement` here, `/registers/continuous-improvement` elsewhere, `/dashboard/ci` live) — none matching each other |
| `/surveys` | "Surveys & Feedback" | No live `/surveys` route — same finding as `roleNavigation.ts` |
| `/trainer/assessment-validation` | "Assessment Validation" | Missing prefix/renamed — live route is `/dashboard/assessment-validation` |
| `/trainer/pd-tracker` | "PD Tracker" | No exact match; closest live analogue is `/dashboard/trainer-portal/pd`, a differently-shaped path family |

This whole file is confirmed dead code today (no live caller) — same low-urgency note as above.

## Issue 6 — Student role's entire live sidebar menu is 100% dead links

**Status: ✅ SHIPPED — PR #1157 (`36af06149`), 15 September 2026 (bundled with Issue 3; status
corrected 16 Sep 2026 by cross-referencing `g04b-nav-optimization-plan.md` §6). Decision originally
confirmed by Brian, 10 September 2026, on condition zero users hold this role (verified true).**

**What:** Unlike Issue 2 (Regulatory Officer, ~82% dead), the Student role's live menu — rendered by
`EnhancedRoleSidebar` reading `roleMenuConfigs['student']` — has **zero working links**. All 17 of its
menu items and quick actions point to a `/student/*` route family that does not exist anywhere in the
live app today (see itemization above). A user logged in with the Student role sees a full, normal-
looking sidebar with sections like "My Learning," "Assessments & Results," "My Profile" — and every
single click leads nowhere.

This item was never sent to the ChatGPT planning round (it was found afterward, during this recon's own
F2 audit), so it was planned directly by Claude Code instead, matching the same structure and standard
as Issues 2–5.

**Locked decision:** treat the Student portal the same way as Issue 2's Regulatory Officer portal —
**coming soon**, not repaired or built out. Preserve the intended information architecture (My Learning,
Assessments & Results, Support & Resources, My Profile), but never render a link to a nonexistent route.
Unlike Issue 2, there is no partial subset of working links to preserve; all 17 are unbuilt, so the whole
portal becomes a single coming-soon landing rather than a partially-functional shell with 17 dead rows
underneath it. No route, placeholder page, or guessed URL gets created for any of the 17 destinations. A
real Student portal needs its own product FRAME later, same standard as Issue 3's Employer/Third Party
gate.

**Verified directly against production, 10 September 2026:** zero `tenant_members` rows have `Student`
as either a primary role or a supplementary role, in any status (active or deactivated). No current user
is affected — this was the explicit condition Brian set before locking this decision. The `student`
config block in `roleMenuConfigs.ts` dates to the initial imported build (7 October 2025); its only
later touch was an unrelated Compliance Manager path fix (1 July 2026) that added no Student route.

**Implementation plan:**
1. **Availability model** — apply the same frontend-only `available`/`coming_soon` state introduced for
   Issue 2 to every Student menu entry. Since all 17 are currently unbuilt, all 17 start as
   `coming_soon` — there is no "proven available destination" step here, unlike Issue 2, because nothing
   behind this menu works today.
2. **Honest portal entry state** — since the Student role has no working dashboard either (no
   `/student/*` route exists at all, including a Student home page), present a single coming-soon
   landing rather than a partially-functional shell with 17 dead rows underneath it.
3. **No speculative build-out** — do not register any `/student/*` route, create placeholder pages, or
   guess replacement URLs for any of the 17 destinations. A real Student portal needs its own product
   FRAME first (permitted journeys, route contract, data ownership, authorization model, a real
   primary-Student-role persona) — same gate as Issue 3.
4. **Regression coverage** — a focused test confirming the primary Student role sees the coming-soon
   landing and that no Student menu item is navigable.

**Blast-radius checks before shipping:** same checklist as Issue 2 — desktop/mobile sidebar, quick
actions, breadcrumbs, page titles, the role-preview surface (Issue 4), analytics event mapping, and any
help-centre/onboarding content referencing `/student/*`. Confirm no change to route guards, server
permissions, feature visibility, tenant membership, or background services.

**Acceptance evidence:** every Student menu entry has an explicit `coming_soon` state; none are
navigable; no fabricated Student dashboard data is shown; the diff changes frontend presentation only.

## P1 — audit of the three additional live sidebar systems (AdminSidebar, SsoSidebar, ExecutiveSidebar)

Confirmed real consumer chain for all three via `RootAppLayout.tsx` → `RoleSidebar.tsx`'s role switch,
matching the mapping table above. One caveat found while confirming the chain: `AdminSidebar` has a
*second*, fully orphaned code path — `src/layouts/AdminLayout.tsx` also renders it directly and is
wired to `src/routes/admin.tsx`, but that route module is never imported anywhere in the live app
(confirmed via repo-wide search, zero hits). Noted as a new architecture finding (B11) below.

### AdminSidebar / `adminSidebarConfig.ts` — 2 genuine dead links, live and currently rendered

66 unique base paths across 8 sections + quick access. Cross-checked every miss against `AppRoutes.tsx`
directly (not just the flat manifest) before calling anything dead:

- **"Placement Sites" → `/dashboard/students-support/placement-sites` is dead.** The real live route
  uses the singular form, `/dashboard/student-support/placement-sites` — same typo-drift pattern already
  found independently in two other files (`roleNavigation.ts`, `sidebarConfig.ts`) during F2, but this
  is the first instance found in a currently-**live**, currently-rendered menu (Administrator/Governing
  Person/Consultant/Consultant Assistant all see this broken link today).
- **"Employer Portal" → `/employer/dashboard` is dead.** No `/employer/*` route exists anywhere. The
  real, live Employer Portal page exists — just at a completely different path,
  `/admin/user-portals/employer`. This is a live, currently-broken link, not a never-built feature.
- One flagged miss turned out to be a **false positive**: `/admin/trainer-management/pd-recommendations`
  ("PD Recommendations") looked dead against the flat route manifest, but the manifest generator doesn't
  expand nested wildcard sub-routers — `AppRoutes.tsx` registers `trainer-management/*` as a wildcard to
  a nested router inside that page's own `index.tsx`, which does declare this exact child route.
  Confirmed both the route and page genuinely exist. **Methodology caveat for all earlier dead-link
  counts in this recon:** this specific false-positive class (nested wildcard sub-routers the flat
  manifest can't see) is a real measurement risk; every dead-link finding in this recon and in F2 was
  manually spot-checked against `AppRoutes.tsx` directly precisely to catch this, but it's not
  exhaustively ruled out for every single one of the ~80 items sampled in bulk elsewhere.
- No further internal label duplicates beyond the already-locked Issue 1 pair.

**Overlaps:** shares 40 exact paths with `roleNavigation.ts`, 20 with `roleMenuConfigs.ts`, 16 with
`sidebarConfig.ts`. The "same page, different label" pattern recurs repeatedly beyond the already-known
Trainers Matrix case — e.g. `/dashboard/auditor` is "Regulatory Officer Portal" here but "Auditor
Dashboard" elsewhere; `/admin/complybot` is "ComplyBot" here but "Compliance Intelligence" elsewhere;
`/calendar` has three different labels across just one of the other files. One commit
(`1e6e11fca`) was found editing `adminSidebarConfig.ts` and `roleNavigation.ts` together, by hand, in
the same change, to keep one access decision in sync between the two files — direct evidence the
current multi-file setup already requires manual coordinated edits for a single shared fact.

**Permission logic confirmed exactly:** Administrator and Consultant Assistant are filtered per-item
against each item's allow-list; Governing Person and Consultant get a full bypass (see every item
regardless of its allow-list); super-admin/support-mode also bypasses. Consultant Assistant is
additionally the only one of the four subject to a second, separate permissions check on top — and is
the only one of the four actually denied a specific page today (Intelligence).

### SsoSidebar / `ssoSidebarConfig.ts` — clean, zero dead links

9 unique paths, all verified live. No per-item permission filtering at all — this system relies
entirely on `RoleSidebar`'s upstream role switch for gating, not on anything inside itself. One label
mismatch found on a shared path with `roleNavigation.ts` (`/dashboard/registers/ssr`: "Support
Register" here vs. two different labels — "Student Support Register" and "Student Support" — there).

### ExecutiveSidebar (inline array) — clean, zero dead links, zero label conflicts

Only 3 items, all verified live. No per-item permission filtering (same pattern as SsoSidebar — gated
entirely upstream). The only one of the eight systems audited where every shared path with every other
system has a matching label — no "same page, different label" conflict found for this one anywhere.

## New issues surfaced by P1

### Issue 7 — "Placement Sites" link in the live Admin sidebar is broken (typo drift)

**Status: ✅ SHIPPED — PR #1086 (`f99784fa1`), 10 September 2026 (bundled with Issues 1, 8, 10;
status corrected 16 Sep 2026 by cross-referencing `g04b-nav-optimization-plan.md` §6).**

Administrator, Governing Person, Consultant, and Consultant Assistant all see a "Placement Sites" link
today that leads nowhere — the config uses the plural `students-support`, the real registered route
uses the singular `student-support` (confirmed directly against `AppRoutes.tsx:1632`,
`{ path: 'student-support/placement-sites', element: <PlacementSites /> }`).

**Blast-radius findings:**
1. The same wrong plural spelling is repeated in three other places: `roleNavigation.ts`,
   `sidebarConfig.ts` (dormant/dead file), and `permissions.ts`'s path→permission-key map (feeds only
   the dormant `SidebarV3` chain, no live effect). This is a systemic, repeated typo across the
   codebase, not unique to the admin config — worth knowing before treating it as a one-file fix,
   though only the `adminSidebarConfig.ts` instance is in a currently-live, currently-rendered menu.
2. No test anywhere references either the correct or incorrect path (confirmed via repository-wide
   search of `tests/`).
3. No analytics/tracking rule keys off this specific path.

**Recommendation:** correct the one literal string in `adminSidebarConfig.ts` from the plural to the
singular form. Low-risk, single-line change. Whether to also fix the same typo in `roleNavigation.ts`
and `permissions.ts` in the same pass, or leave those for whenever those files are otherwise touched
(they're not live navigation surfaces today), is Brian's call.

**Next action:** LOCKED — implemented in PR 3 (`feat/g04b-nav-link-label-fixes`), 10 September 2026.

## P2 — full audit of `nav.ts` and `routeLabels.ts`

### `src/config/nav.ts` (`sidebarNav`, 29 paths)

**What it drives:** three consumers, none of them a healthy live navigation surface. `NavBreadcrumb.tsx`
consumes it but **`NavBreadcrumb` itself is never mounted anywhere** (no JSX usage found outside its
own file) — confirmed fully dead, not just "no caller found" as the earlier shallow note put it.
`src/pages/dev/NavCheck.tsx` also imports it but has no route entry in `AppRoutes.tsx` — unreachable in
the live app (it's only listed in a separate, stale, hand-maintained route list,
`src/tools/routeScanner.ts`, that isn't derived from the real routes and itself wrongly claims this
page is routed). The one genuinely live consumer is `SectionChip.tsx` (mounted via `StandardPageHeader`,
11 call sites, and `PageHeader.tsx`) — but it only ever renders the **group label** ("Governance
Registers"), never the individual item labels this file defines for its 29 paths.

**Completeness:** of 29 paths, 3 are genuinely dead with no redirect (`/documents`, `/actions`,
`/complybot` — each moved to a different, longer live path and never updated here; clicking these would
bounce even a logged-in user to `/login` via the final catch-all). The other 23 (`/registers/ci`,
`/risk`, `/rpl`, `/fre`, `/whs`, etc.) are legacy unprefixed paths swallowed by the same live
`/registers/*` wildcard redirect already documented for `sidebarConfig.ts` — they land on the generic
registers hub, not 404, but not the intended specific register either. **Practical severity is lower
than it looks:** since the one live consumer (`SectionChip`) only matches these paths internally for
label lookup and never renders them as clickable links, none of these 26 dead/soft-broken links are
actually clickable anywhere in the live app today.

**Last touched:** only 3 commits ever, all pre-dating active project history ("Changes", "Changes",
"Initial commit from remix") — frozen legacy code, not actively maintained.

**Overlaps:** `/calendar` agrees across every system that has it. `/governance` conflicts:
this file says "Governance Dashboard," the live page's own title (`routeLabels.ts`) says "Governance
Meeting Manager." Zero literal-path overlap with the live `/dashboard/registers/*` vocabulary despite
describing the same registers conceptually.

### `src/constants/routeLabels.ts` (42 path keys + 12 `topLevelModules`) — actively maintained, unlike `nav.ts`

**What it drives:** confirmed live via `Breadcrumb.tsx` → `TitleHeader` (the canonical page-header
component, used across dozens of pages) — this is the file already responsible for Issue 1's page-title
mismatch. **A second live consumer not previously documented:** `ModuleSwitcher.tsx` (the sidebar-header
module-switcher dropdown) also reads this file's `getLabelForRoute()` and `topLevelModules` list to
show the current module and highlight the active one.

**Completeness:** of its ~44 unique literal paths, 23 are the same bare `/registers/*` keys caught by
the live wildcard redirect — meaning a user is redirected away before `Breadcrumb` or `ModuleSwitcher`
ever sees that literal URL, making these 23 keys dead weight in practice. One key, `/registers/fpp`
("Fit and Proper Person"), has no matching route or redirect target anywhere under any prefix — an
apparently orphaned register with no live page at all under any name found. **Separately, and more
consequential:** almost none of the real, live `/dashboard/registers/*` pages have their own specific
label key in this file — only a generic `/registers` prefix fallback exists — so most live register
pages currently show a generic **"Registers"** title in their own page header, not their specific name.
See Issue 10 below.

**Last touched:** actively maintained, most recent change tied to a real feature (#859, 2026). One of
its own commit messages ("chore: keep routeLabels addition without rewriting alignment") confirms it's
deliberately edited append-only rather than periodically reconciled — a direct, self-documented
explanation for why it's drifted.

**Overlaps — systematic label-mismatch check (new evidence, not just the already-known Trainers Matrix
case):** compared this file's live page-title text against every other system's menu label for the same
register. At least 12 of ~20 comparable registers disagree — mostly abbreviation-vs-full-name or
singular-vs-plural drift (e.g. "Risk Management" here vs. "Risk Register" in the menus; "Work Health and
Safety" here vs. "Work Health & Safety" in `adminSidebarConfig.ts`; "ADC Register" in menus vs. "Annual
Declaration of Compliance" here). Confirms the Issue 1 mismatch pattern is systemic across roughly half
of all registers, not an isolated case — real, user-visible inconsistency between what the sidebar
calls a page and what the page's own header calls itself.

## Issue 9 — Module Switcher: 5 of 12 modules can never highlight as active, and clicking them navigates to the wrong page

**Status: CORRECTED — this is NOT currently visible to any user in the live app. Not a live bug.**

**Important correction, found only because Brian asked "where can I see this in the UI":** `ModuleSwitcher`
is only ever rendered by `SidebarV3.tsx`. Verified directly: `SidebarV3` is only mounted by
`SharedShell.tsx`, and `SharedShell`/`GeneralLayout`/`SuperAdminLayout` have **zero matches anywhere in
`AppRoutes.tsx`** — this is the exact same dormant/dead sidebar chain already documented elsewhere in
this recon (see the `sidebarConfig.ts` write-up and finding B2). **No role, including super-admin, can
see this component in the app today.** I stated earlier that this was "a live, mounted component" — that
was wrong; I hadn't traced its actual mount chain, only read the component's own code. Recorded here as
a correction rather than silently fixed, per this session's own standard.

**Practical effect:** this remains real, accurate evidence about the dormant system (useful if that
system is ever revived, and it reinforces why B2 flags it as a live risk if revived), but it is **not**
an active bug affecting any current user, so it does not need a decision or a fix right now. Demoted from
"Issue" to a note under the dormant-system findings; folded into Issue 12 below instead.

## Issue 12 — Retire the entire dormant shell/sidebar system (scheduled after Issue 11)

**Status: IMPLEMENTED — shipped as PR #1084 (`b46f030dc` + `89bf14f68`), merged to `main` 10 September
2026 (merge commit `8522e2d3`).** Final scope was 21 files, not the 17 listed below — an adversarial
fresh-eyes review dispatched before merge (per Brian's instruction to confirm "nothing connected to it,
not even db") found 4 more files that became orphaned as a direct consequence of this deletion:
`src/lib/badges.ts` (the only file in this whole chain that actually read from the database — confirmed
safe, every table it read is still read elsewhere by live code), `src/config/tableMap.ts` (its only real
importer), and `src/components/shared/PageLayout.tsx`/`PageHeader.tsx` (both had exactly one importer,
this issue's own `pages/governance/index.tsx`). Full detail: `g04b-nav-optimization-plan.md` §3/§6, PR 1.

Investigated while answering Brian's question "where can Issue 9's component even be seen, and by
whom." The answer led to a full system, not just one file:

**What it is:** a complete second, alternate application shell — `src/layouts/SharedShell.tsx` (its own
sidebar mount point, top bar, footer, and ComplyBot wiring), backed by two entry layouts
(`src/layouts/GeneralLayout.tsx`, `src/layouts/SuperAdminLayout.tsx`), rendering either
`src/components/sidebar-v3/SidebarV3.tsx` (which itself mounts `ModuleSwitcher.tsx`, the Issue 9
component, and reads `src/config/sidebarConfig.ts` via `useSidebarPermissions.ts`/`useSidebarBadges.ts`)
or `SuperAdminSidebarNav` for the superadmin case.

**Confirmed dead:** repo-wide search found zero callers of `GeneralLayout` or `SuperAdminLayout` inside
`AppRoutes.tsx` or anywhere else in the live route tree. No role, including super-admin, can reach this
shell today.

**Confirmed the team already decided to retire it, not just that it happened to go unused:** an existing
test, `src/lib/utils/__tests__/forbiddenLayouts.test.ts` ("No page-level sidebars"), fails the build if
any page under `src/pages/` (outside `/superadmin/`) imports `GeneralLayout`, `SharedShell`, or several
other named legacy pieces. This test has existed since the very first commit of the current codebase.

**Timeline (via `git log --follow`):** the whole system dates to `e18dcafa5`, 7 October 2025 — the
initial migration commit that created the current codebase. It was touched a handful of times through
October–December 2025, including one commit literally titled "Revert sidebar to original state"
(29 October 2025). Its last meaningful touch of any kind was 2 December 2025 — over nine months frozen
as of this recon.

**Recommendation:** safe to delete, but scoped as its own dedicated removal task — not folded into
Issue 9's fix, and not started as part of this recon. A real deletion PR should enumerate every file in
this family precisely (this recon's own findings B2, B3, B4, B10, B13 partial overlap, F2's dormant-file
dead-link findings, and this entry) before removal, verify the `forbiddenLayouts` test still passes
(it should, trivially, once the files are gone) and that a full type-check/build succeeds with the
files removed.

**Additional files folded in from the Issue 11 correction, now LOCKED for removal — confirmed by
Brian, 10 September 2026:** `src/pages/governance/index.tsx`,
`src/components/navigation/GovernanceNavigation.tsx`, and `src/components/settings/GovernanceTab.tsx`.

**Final exhaustive verification before locking (separate, dedicated pass, not just the earlier check):**
searched `src/`, `tests/`, `docs/`, and `supabase/` individually for every real reference to
`GovernanceTab`, `GovernanceIndex`, `GovernanceNavigation`, and the path `governance/index`:
- `GovernanceNavigation` — zero matches anywhere except its own file and `governance/index.tsx` (its
  only mounter, itself unreachable).
- `GovernanceIndex` / `pages/governance/index` — zero matches anywhere except the file itself and the
  already-known stale, non-authoritative `src/tools/routeScanner.ts` (a hand-maintained list already
  flagged elsewhere in this recon as not derived from real routes — it incorrectly lists several
  unreachable pages as routed, this one included).
- `GovernanceTab` (exact component name, re-checked precisely to exclude false-positive substring
  matches against the unrelated `CombinedGovernanceTable`/`useCanDeleteGovernance` — an initial broad
  search wrongly flagged those 3 files; a precise recheck confirms they only contain the word
  "Table," not "Tab") — zero real matches anywhere except its own declaration.
- `tests/` and `supabase/` — zero matches for any of the three names.

Confirmed safe: no test, no other component, no server-side function, and no other page references any
of these three files. Locked for removal as part of Issue 12's cleanup batch.

### Implementation plan — Issue 12 (drafted 10 September 2026)

Every path below was re-resolved directly against the current worktree tip during this planning pass
(not taken on memory from earlier in this recon) — precise paths for files the original entry only
named loosely, plus two things the earlier entry didn't have: a file it never listed, and a same-name
trap worth knowing about before anyone starts deleting.

**Group A — the dormant shell/sidebar family itself:**

1. `src/layouts/SharedShell.tsx`
2. `src/layouts/GeneralLayout.tsx`
3. `src/layouts/SuperAdminLayout.tsx`
4. `src/layouts/AppLayout.tsx` — **new finding, not in the original Issue 12 inventory.** A thin
   wrapper whose only job is `import GeneralLayout from '@/layouts/GeneralLayout'` and render children
   inside it. A first broad search for the string "AppLayout" surfaced 7 files, but 6 were false
   positives — they contain the unrelated name `RootAppLayout`, not an import of this file (same
   substring trap already caught once in this recon for `GovernanceTab`). A precise import-statement
   search confirms zero real importers anywhere in `src/`. It only exists to wrap an already-dead file,
   so it belongs in the same batch.
5. `src/components/sidebar-v3/` (whole directory) — `SidebarV3.tsx`, `SidebarSearch.tsx`,
   `SidebarGroup.tsx`, `SidebarItem.tsx`, `renderSidebarIcon.tsx`, `index.ts`. Confirmed each supporting
   file's only importer is another file inside this same directory — one self-contained dead unit, not
   just the top file plus loose stragglers.
6. `src/components/common/ModuleSwitcher.tsx` — the Issue 9 component. Confirmed its only mounter
   anywhere in `src/` is `SidebarV3.tsx`. (This also resolves an apparent contradiction elsewhere in
   this doc: the P2 audit of `routeLabels.ts` called this file a "live consumer" — that meant "the code
   would execute if this were ever rendered," not "reachable in the UI." Issue 9's correction —
   unreachable — is the accurate one; there was never a real discrepancy, just two passes using "live"
   differently.)
7. `src/config/sidebarConfig.ts`
8. `src/hooks/useSidebarPermissions.ts`
9. `src/hooks/useSidebarBadges.ts`

**Group B — governance dead files, already locked above via the Issue 11 correction:**

10. `src/pages/governance/index.tsx`
11. `src/components/navigation/GovernanceNavigation.tsx`
12. `src/components/settings/GovernanceTab.tsx`

**Confirmed explicitly out of scope — do not delete, do not confuse with the above:**

- **`src/config/permissions.ts`** (the Issue 1 duplicate-key file). Feeds `useSidebarPermissions.ts`
  (Group A item 8), but also has two other live importers unrelated to this dormant chain:
  `useLoadDynamicPermissions.ts` and `useRoleConfigManagement.ts`. Removing the one dead hook that reads
  it does not make this file itself dead — it stays.
- **`src/config/menu.tsx`** (note the extension — `.tsx`, not `.ts`). A completely separate, unrelated
  file that happens to share the base name "menu" with Issue 13's dead `menu.ts` below (different `Role`
  type, different `menuConfig`, its own `iconForPath`). Not part of Issue 12 or 13 either way. Flagged
  here purely so whoever executes either deletion doesn't grab the wrong file by mistake — the two are
  one keystroke apart in a fuzzy file search.
- **`src/lib/utils/__tests__/forbiddenLayouts.test.ts`** — keep, do not delete. Confirmed by direct read:
  it does a regex/string content scan for forbidden names (`BrandedLayout`, `UnifiedSidebar`, `SideNav`,
  `GeneralLayout`, `SharedShell`, `.sidebar\b`) across page files under `src/pages/`. It does not import
  any of Group A's files itself, so deleting them cannot break this test's own compilation. It should
  keep passing trivially once Group A is gone (nothing left to match), and continues to function as a
  standing guard against reintroduction afterward — this is exactly the test already cited earlier in
  this entry as evidence the team already decided to retire this system.

**Locked decision — confirmed by Brian, 10 September 2026:** delete Group A and Group B in full. No
adapter, redirect, or replacement is needed for any of these 12 files — nothing renders them today, and
Issue 5's new navigation catalog (the actual replacement work for live navigation) targets systems that
are genuinely reachable, not this dormant family.

**Implementation slices — deletion order.** Work leaf-first (delete a file only once nothing left in the
batch still imports it), so an interrupted or partially-reviewed PR never leaves a dangling import:

1. **Re-verify immediately before touching anything.** Rerun the import searches above against the
   worktree's actual branch tip at the moment of implementation, not this planning pass's snapshot — a
   file landing in between could change the picture.
2. **Delete the governance trio (Group B)** — `GovernanceTab.tsx`, `GovernanceNavigation.tsx`, then
   `governance/index.tsx`. Order within the trio doesn't matter; all three are already independently
   confirmed to have zero cross-references. Simplest, most isolated part of the batch — good first step.
3. **Delete `ModuleSwitcher.tsx`** — exactly one importer (`SidebarV3.tsx`, going next), safe as its own
   step.
4. **Delete the whole `src/components/sidebar-v3/` directory** as one unit.
5. **Delete `useSidebarPermissions.ts` and `useSidebarBadges.ts`** — both now unreferenced once step 4 is
   done (`SidebarV3.tsx` was their only caller).
6. **Delete `src/config/sidebarConfig.ts`** — now unreferenced once step 5 is done. Do not confuse with
   `src/config/permissions.ts`, which stays.
7. **Delete the three outer layouts** — `AppLayout.tsx` first (the leaf, depending only on
   `GeneralLayout`), then `SharedShell.tsx` and `SuperAdminLayout.tsx`, then `GeneralLayout.tsx` last
   (the thing everything else in this batch ultimately wrapped).
8. Run every check in "Blast-radius checks" below before committing.

**Blast-radius checks before shipping:**

- After each deletion step, grep for that file's own name/export across `src/` and `tests/` and confirm
  zero remaining references before moving to the next step — not just once at the very end.
- Run `src/lib/utils/__tests__/forbiddenLayouts.test.ts` specifically and confirm it still passes (it
  should, trivially — the names it scans for will simply no longer exist to match).
- Confirm `src/config/permissions.ts`, `useLoadDynamicPermissions.ts`, and `useRoleConfigManagement.ts`
  are untouched and still resolve.
- Confirm `src/config/menu.tsx` (unrelated file, same base name as Issue 13's `menu.ts`) is untouched.
- Do not run `npm run build` or a bare `npm run type-check`/`tsc --noEmit` at the repo root, per this
  workspace's standing rule (vacuous / hang risk). Run `npm run lint` scoped to the removed paths and any
  file that used to import them; let Vercel's preview build be the real compile gate after push.
- Re-run `node scripts/generate-route-manifest.mjs --check` — no route change is expected (none of these
  12 files register a route), so this should report clean. A diff here would mean something in this
  batch was load-bearing after all, and the deletion should stop for re-investigation.
- Search `docs/`, `supabase/`, and any onboarding/help content for the deleted file/component names, same
  discipline already used for Issues 8 and 11 — low expectation of a hit, not yet actually checked.

**Acceptance evidence:**

- All 12 Group A/B files are gone from the working tree.
- `forbiddenLayouts.test.ts` passes.
- `generate-route-manifest.mjs --check` reports no diff.
- `npm run lint` is clean for every touched/removed path.
- `src/config/permissions.ts`, `src/config/menu.tsx`, and `src/lib/navigation.ts` are confirmed
  untouched.
- A repo-wide search for each deleted file's export name returns zero hits outside git history.

<!-- Original (superseded) analysis retained below for traceability -->

Read `ModuleSwitcher.tsx` and `routeLabels.ts` directly, line by line, to confirm the exact mechanism —
this is worse than "can't highlight," it's a real broken click:

`ModuleSwitcher` calls `navigate(mod.route)` when an item is clicked, and separately tries to match the
current URL against `mod.route` (or `mod.matchPrefix`) to decide which item to show as active. 5 of the
12 `topLevelModules` entries use bare `/registers/*` paths (`/registers/tas`, `/registers/ien`,
`/registers/ci`, `/registers/risk`, `/registers/qi`). Since the real live pages actually live under
`/dashboard/registers/*` (or elsewhere), two things both go wrong for these 5:
1. **Clicking the item navigates the user to the wrong page** — the live `/registers/*` wildcard
   redirects to the generic registers hub, not the specific module.
2. **The item can never show as "active"** even when a user is genuinely on the right page, because the
   real URL (`/dashboard/registers/ien`, etc.) never matches the configured bare path.

**Verified the real destination for each of the 5, individually, against `AppRoutes.tsx` directly:**

| Module label | Configured (wrong) route | Real live destination | Fix clarity |
|---|---|---|---|
| Industry Engagement | `/registers/ien` | `/dashboard/registers/ien` (direct route, no further redirect) | Clear — simple prefix correction |
| Continuous Improvement | `/registers/ci` | `/dashboard/ci` (direct route, no further redirect) | Clear — simple correction |
| Risk Management | `/registers/risk` | `/dashboard/risk` (the register path itself redirects here — this is the true final destination) | Clear — simple correction |
| Quality Indicator Surveys | `/registers/qi` | `/dashboard/registers/qi` (direct route, no further redirect) | Clear — simple prefix correction |
| Training & Assessment | `/registers/tas` | **Ambiguous — no clean equivalent exists.** `routeLabels.ts` itself has an orphaned key, `/dashboard/tas: 'Training & Assessment'`, with **no matching route anywhere** — that label was seemingly written for a page that doesn't exist. The two real candidates are the TAS register page (`/dashboard/registers/tas`) or the separate, much more prominent "TAS Quality Engine" feature (`/dashboard/tas-engine`, the one from Issue 1). These are different pages serving different purposes; picking the wrong one would send users to the wrong destination when they click this module in a header dropdown | **Needs Brian's decision, not a mechanical fix** |

**Recommendation:** lock and fix the 4 clear cases now (correct each `route` value in `topLevelModules`
to its verified real destination). Hold "Training & Assessment" separately pending a decision on which
page it should represent.

**Next action:** awaiting confirmation to lock the 4 clear cases; awaiting a decision on the 5th.

## Issue 10 — Breadcrumb trail (not the page title) shows duplicated/wrong text on some pages

**Status: OPEN — corrected from the original finding; narrower in scope than first reported**

**Correction: the original framing of this issue was wrong and is superseded by this entry.** Direct
code read of `TitleHeader.tsx` confirms the big, prominent page title (`<h1>`) is an explicit prop each
page hardcodes itself — it does **not** come from `routeLabels.ts` at all. Separately verified that most
register pages (e.g. WHS, confirmed directly) use a completely different layout component
(`RegisterPageLayout` → `StandardBreadcrumbs`) with its own explicitly-passed title and breadcrumb items
— entirely unrelated to `routeLabels.ts`. **So the claim "most register pages show a generic title" is
false and is withdrawn.**

**What's actually wrong, confirmed by reading `Breadcrumb.tsx` directly:** `TitleHeader` does mount a
small, separate breadcrumb trail bar (`<Breadcrumb />`, no props) beneath the main title, and only *that*
element reads `routeLabels.ts`, one path-segment at a time. For any page whose path has multiple
segments under a prefix with no specific label key (e.g. `/dashboard/registers/ien`, confirmed directly
using `TitleHeader`), the breadcrumb trail resolves **every segment past `/dashboard` to the same
fallback label**, producing a visibly wrong, duplicated trail like "Home / Main Dashboard / Main
Dashboard" instead of something like "Home / Registers / Industry Engagement." This is real and
confirmed, but it's a small 12px breadcrumb strip, not the page's main heading — much lower visual
prominence than originally reported.

**Full audit complete — this is now a concrete plan, not an estimate.** Of 34 real page consumers of
`TitleHeader` (excluding 5 deprecated wrapper/shim files that aren't real pages), 8 are dead/unreachable
(no registered route at all — see B13 below) and were excluded from a correctness verdict. Of the
remaining 26 live, reachable pages: **17 are affected** (their breadcrumb trail currently shows
duplicated/wrong text), **9 are unaffected** (already covered by an existing key, or the plain
last-segment fallback happens to produce acceptable text for single-segment paths like `/consultant/*`).

**Status: ✅ SHIPPED — PR #1086 (`f99784fa1`), 10 September 2026 (bundled with Issues 1, 7, 8;
status corrected 16 Sep 2026 by cross-referencing `g04b-nav-optimization-plan.md` §6). Locked by
Brian, 10 September 2026, before implementation.**

**Implementation plan:** add the following 20 new key/label pairs to `routeLabels.ts` (purely additive —
no existing key is changed or removed, so no existing page's breadcrumb can regress; new, longer/more
specific keys simply win the "longest match" comparison for their own paths going forward):

| New key | Label | Fixes |
|---|---|---|
| `/dashboard/governance` | Governance | Governance dashboard segment (shared prefix for the next 2 rows) |
| `/dashboard/governance/meeting-manager` | Governance Meeting Manager | Governance Meeting Manager page |
| `/dashboard/governance/driver-diagnostics` | Driver Diagnostics | Driver Diagnostics list + detail pages |
| `/admin/trainers-report` | Trainer's Report | Trainers Report page |
| `/dashboard/assessors` | Assessors | Shared prefix for the next row |
| `/dashboard/assessors/insights` | Assessor Performance Insights | Assessor Insights page |
| `/dashboard/manager` | Compliance Manager Dashboard | Manager Dashboard page |
| `/dashboard/tasks` | Tasks | Tasks page |
| `/dashboard/trainers` | Trainer Management | Trainers (plural) dashboard page |
| `/dashboard/diversity-inclusion` | Diversity & Inclusion | Diversity & Inclusion page (canonical path, distinct from the already-keyed `/dashboard/students-support/diversity`) |
| `/dashboard/heatmap` | Compliance Heatmap | Heatmap page |
| `/dashboard/registers` | Registers | Shared prefix for the next row (distinct literal from the existing bare `/registers` key) |
| `/dashboard/registers/assessment-tools` | Assessment Tools Register | Assessment Tools register page |
| `/dashboard/student-support` | Student Support | SSO Dashboard page (singular path, distinct from the already-keyed plural `/dashboard/students-support/*`) |
| `/dashboard/sso` | Student Support | Shared prefix for the next row |
| `/dashboard/sso/monthly-pack` | SSO Monthly Report | SSO Monthly Pack page |
| `/dashboard/templates` | Templates | Templates page |
| `/dashboard/trainer-portal` | Trainer Portal | Shared prefix for the next row |
| `/dashboard/trainer-portal/validation-schedule` | My Validation Schedule | Trainer validation-schedule page |
| `/dashboard/workforce` | Workforce | Shared prefix for the next row |
| `/dashboard/workforce/industry-experts` | Industry Experts | Industry Experts register + detail pages |

**Blast-radius findings:** `Breadcrumb.tsx` is the only consumer of `getLabelForRoute()`/`routeLabels`
(confirmed earlier in this recon — `ModuleSwitcher.tsx` is the only other consumer and only reads
`topLevelModules`, a separate export, unaffected by this change). Adding new, more specific keys cannot
change the resolved label for any existing path, since the matching logic always prefers the longest
matching key — every new key here is longer/more specific than any key it could compete with. No test
references any of these specific paths or labels (not yet exhaustively re-confirmed for this exact list,
but consistent with every other test-search result in this recon finding zero navigation-label test
coverage). Pure documentation/label fix, no route, guard, or behavior change.

**Next action:** LOCKED — implemented in PR 3 (`feat/g04b-nav-link-label-fixes`), 10 September 2026.

## Issue 11 — CORRECTED: not a live bug. Both link sources are themselves unreachable dead code.

**Status: CORRECTED — not currently visible to any user. Folded into Issue 12's cleanup scope.**

Investigated fully before treating this as a real bug, same discipline as Issue 9's correction.
`git log -S` against `AppRoutes.tsx`'s entire history confirms the string `governance/dashboard` has
**never** appeared there — this route was never registered at any point, not removed later. More
importantly: checked whether the two files containing the broken links are themselves reachable.
**Neither is.**

- `src/components/navigation/GovernanceNavigation.tsx` (source of the `/dashboard/governance/dashboard`
  link) is only mounted by `src/pages/governance/index.tsx` — which is itself never imported anywhere in
  `AppRoutes.tsx`. Unreachable.
- `src/components/settings/GovernanceTab.tsx` (source of the `/governance/dashboard` link) has **zero
  callers anywhere in `src/`** — not mounted by anything at all, confirmed by a repo-wide search. It also
  contains its own comment, `// Mock data - replace with actual governance meeting data`, consistent with
  an unfinished prototype that was never wired in. Unreachable.

**Conclusion:** no user, of any role, can reach either of these two broken links today, because the
pages containing them don't exist in the live app either. Not a live bug — withdrawn as its own Issue.
Folded into Issue 12's dead-code cleanup scope as two more files to account for when that removal is
scoped (in addition to the shell/sidebar system already documented there).

### Issue 8 — "Employer Portal" link in the live Admin sidebar points to a nonexistent path

**Status: ✅ SHIPPED — PR #1086 (`f99784fa1`), 10 September 2026 (bundled with Issues 1, 7, 10;
status corrected 16 Sep 2026 by cross-referencing `g04b-nav-optimization-plan.md` §6).**

The real Employer Portal page exists and is reachable at `/admin/user-portals/employer` (confirmed
live in `AppRoutes.tsx:2294` directly, and independently confirmed as the correct link already used by
the live `UserPortalsHub.tsx` page itself). The Admin sidebar's "Employer Portal" item instead links to
`/employer/dashboard`, which has no matching route anywhere.

**Blast-radius findings:**
1. **A second, related instance of the same wrong path found:** `src/contexts/PreviewRoleContext.tsx`
   (the "preview as role" feature, see Issue 4) defines `/employer/dashboard` as the Employer role's
   preview "home path" — the exact same dead path. It also defines `/third-party/dashboard` (confirmed
   dead in F2) as Third Party's home path. If a super-admin previews as either role, they'd be sent to
   a dead URL. This means Issue 8's fix scope should include this second file, and the same fix likely
   applies to Third Party once/if that role gets a real portal path confirmed (see Issue 3, being
   discussed via the ChatGPT handover).
2. A second, fully orphaned route module (`src/routes/admin.tsx`, see finding B11) also registers the
   correct `/admin/user-portals/employer` path, but that module isn't imported anywhere live — the real,
   live registration is the direct one in `AppRoutes.tsx` itself, confirmed separately.
3. No test anywhere references either path (confirmed via repository-wide search of `tests/`).
4. Documentation files (`docs/audit-report/role-audit/administrator.md`,
   `docs/audit-report/role-audit/external-stakeholders.md`, `docs/role-maps/employer-third-party.md`,
   `docs/audit-report/AUDIT-REPORT.md`) reference this area — not yet checked which path they cite;
   worth a quick look before shipping so docs don't contradict the fix, but not a blocker.

**Recommendation:** correct the "Employer Portal" `to:` value in `adminSidebarConfig.ts` to
`/admin/user-portals/employer`. Also correct `PreviewRoleContext.tsx`'s Employer `homePath` to match, in
the same small PR, since it's the same underlying wrong path causing a related problem.

**Next action:** LOCKED — implemented in PR 3 (`feat/g04b-nav-link-label-fixes`), 10 September 2026.

## PARKED / out of scope (deliberately not investigated further in this recon)

- **P1. DONE — see full audit below.** The three additional live sidebar systems (AdminSidebar/SSO/
  Executive) have now been audited to the same depth as the four original candidates.
- **P2. DONE — see full audit below.** `src/config/nav.ts` and `src/constants/routeLabels.ts` have now
  been audited to the same depth as the other 8 systems.
- **P3.** Route-contract shape, route guards, live database/access rules, and Playwright coverage are
  explicitly separate, later stages of the G04 program — not this recon's scope.
- **P4. DONE — traced and closed, no issue found.** Confirmed exact definition directly in
  `AppContext.tsx`: `isInSupportMode = isSuperAdmin && mode === 'tenant' && !activeTenantRole` — a
  super-admin who has entered a specific tenant's workspace but has no resolved membership role there
  (mid-resolution, or genuinely no membership) sees `AdminSidebar` as a support/impersonation-adjacent
  view. This is intentional, legitimate design, not a bug or a gap — no action needed.
- **P5.** Two other files share the component name `RoleSidebar` (`src/components/nav/RoleSidebar.tsx`,
  `src/components/navigation/sidebar/RoleSidebar.tsx`) — confirmed neither is wired into the live
  layout, not investigated beyond that confirmation.
- **P6.** Whether the prior recon's original (superseded) Regulatory Officer fallback claim reflected a
  genuinely different commit/branch state, versus simply being an error in that pass — not reconciled.

## Issue 14 — Login/landing-resolution cleanup: duplicate checks, a workaround navigation mechanism, and competing `resolveLanding` implementations

**Status: LOCKED — confirmed by Brian, 10 September 2026. Not yet implemented.**

**Not part of the G04-B navigation-source program** — this is a different part of the app (the
post-login "where do I land" flow), surfaced while answering a direct question about
`src/lib/navigation.ts`'s code quality. Logged here anyway since it's the same file/decision-log
discipline, and because one of the files involved (`src/lib/navigation.ts`) was already flagged
elsewhere in this recon as "confirmed live, do not touch during navigation cleanup" (see F4).

### What

Four separate pieces of code all try to answer "where should this authenticated user land":

1. **`src/lib/auth/landing.ts`'s `resolveLanding()`** — the real, intended, canonical one. Live,
   correct, used by `ProtectedRoute.tsx` and `RoleLandingRedirect.tsx` directly, and by `Auth.tsx`
   indirectly via `src/routing/routeToLanding.ts`.
2. **`src/lib/auth/routeAfterLogin.ts`** — explicitly marked `@deprecated` in its own re-export file
   (`src/lib/auth/deprecated.ts`), with a comment saying to use #1 instead. **Despite that, it is still
   genuinely called live today** — by `src/pages/auth/ResetPassword.tsx`, after a password reset.
3. **`src/utils/roleRouting.ts`** — advisory-deprecated per a code comment ("should also be considered
   deprecated"). Confirmed via repo-wide search: **zero live callers**. Genuinely dead.
4. **`src/utils/resolveLanding.ts`** — same function name as #1, completely different (synchronous,
   takes a role string, no database calls), imported by `src/routes/PublicOnlyRoute.tsx` — but **that
   import is never actually called anywhere in the file** (confirmed by reading the full 40-line file).
   Dead import in an otherwise-live file, not an active behavioral risk, but a confusing same-name trap.

**Also found, unrelated to the duplication but in the same code path:** `routeToLanding.ts` runs its own
session/profile/consultant-membership checks, then — for the common case — hands off to `resolveLanding()`
(#1), which redoes nearly the same three checks a second time before an ordinary user ever reaches their
dashboard. A 2-second "safety fuse" silently no-ops if `routeToLanding` is called twice in quick
succession, with no user-facing fallback if that ever discards a legitimate call. One specific branch
(an existing Consultant with a stale previously-selected workspace) does a hard `window.location.replace`
full-page reload while every sibling branch uses the shared soft-navigation helper, with no comment
explaining why.

### Evidence — what the deprecated-but-live code (#2) does that the canonical one (#1) doesn't, checked one by one

- **Restoring the page you were trying to reach before being sent to log in** — NOT a real gap. A
  separate, live, URL-parameter-based mechanism already does this independently (`ProtectedRoute.tsx`
  builds a `?returnTo=` link, `Login.tsx` reads it directly). The deprecated code's own version reads
  from a `localStorage` key that, per a repo-wide search, **nothing else in the app writes to anymore**
  — already inert in practice.
- **Finishing a pending team-invite link** — NOT a real gap. A dedicated, purpose-built page
  (`src/pages/AcceptInvitePage.tsx`) already handles this independently. The deprecated code's inline
  version looks like an earlier, superseded attempt.
- **Checking whether the user needs onboarding** — NOT a real gap. A separate trigger component
  (`OnboardingTrigger.tsx`) is mounted once in the main app shell (`RootAppLayout.tsx`) and runs
  independently of which login path got the user there.
- **Computing whether the tenant is a demo/trial workspace** — dead computation even within the
  deprecated file itself; the result is logged but never actually used to change the returned path.
- **Automatically dropping a user straight into their one workspace when they belong to only one, without
  showing a "pick your workspace" screen with a single option** — **CONFIRMED REAL.** Read the actual
  database function (`get_my_app_context`) the canonical path (#1) relies on: it strictly reads whatever
  `active_tenant_id` is already stored on the profile and does **not** auto-select a tenant for a
  single-membership user who doesn't have one set yet. A user in that exact situation going through the
  canonical path today would land on `/tenant/select` instead of being dropped straight into their only
  workspace — a real, if narrow, regression risk if the deprecated code is retired without preserving
  this specific behavior.

### Locked decision

Consolidate onto the single canonical implementation (#1), preserving only the one confirmed-real extra
behavior (single-membership auto-selection), and retire the rest as genuinely dead or superseded. Fix
the two independent code-quality issues (duplicate checks, silent safety-fuse) in the same pass since
they live in the same small set of files.

### Implementation slices

1. **Preserve the one real behavior.** Add single-membership auto-tenant-selection to the client-side
   canonical flow (mirroring what `routeAfterLogin.ts` already does via `setActiveTenantRpc` when exactly
   one active membership exists and no `active_tenant_id` is set) — an additive client-side change, not
   a database/RPC change, so lower risk than modifying `get_my_app_context` itself.
2. **Remove the duplicate checks in `routeToLanding.ts`.** Have it delegate straight to `resolveLanding()`
   for the common case instead of re-running its own session/profile/consultant checks first. Decide
   deliberately where the Consultant-with-stale-tenant side effects (the `localStorage` cleanup and the
   forced hard reload) should live — fold them into `resolveLanding()` itself so every caller
   (`ProtectedRoute.tsx`, `RoleLandingRedirect.tsx`, `Auth.tsx` via `routeToLanding`) gets consistent
   behavior, rather than leaving them as a login-only special case.
3. **Give the safety-fuse guard a visible fallback.** If a call is suppressed, it must not silently
   no-op with nothing but a dev-only console line — at minimum a non-dev-gated log, and ideally a
   guarantee the caller still ends up navigated correctly.
4. **Resolve or document the hard-reload branch.** Either make the Consultant-with-stale-tenant case use
   the same soft-navigation helper as every sibling branch, or add a code comment explaining why a hard
   reload is deliberately required there.
5. **Migrate `ResetPassword.tsx` off `routeAfterLogin.ts`** onto the canonical `resolveLanding()`/
   `routeToLanding()` path, once step 1 is in place.
6. **Delete confirmed-dead code:** `src/utils/roleRouting.ts` (zero live callers); the unused
   `resolveLanding` import inside `src/routes/PublicOnlyRoute.tsx` (drop the import, not the file); once
   that import is gone, remove `src/utils/resolveLanding.ts` entirely to eliminate the same-name trap;
   once step 5 ships, delete `src/lib/auth/routeAfterLogin.ts` and its `src/lib/auth/deprecated.ts`
   re-export wrapper.

### Blast-radius checks before shipping

- `tests/routes/g04-route-characterization.test.tsx` mocks `@/utils/resolveLanding` directly — confirmed
  via direct read. This test needs updating (or its mock removed) before `utils/resolveLanding.ts` is
  deleted, or the test will fail to resolve the mocked module.
- Test `ResetPassword.tsx` end-to-end for a single-membership user, a multi-membership user, an
  invite-token user, and a user arriving via a deep link, to confirm nothing regresses now that two of
  the four "extra" behaviors are proven to be handled elsewhere and the third is being explicitly
  preserved.
- Re-search for any importer of `routeAfterLogin`, `deprecated.ts`, `roleRouting.ts`, or
  `utils/resolveLanding.ts` beyond what this pass found, immediately before deleting each file.
- Confirm folding the Consultant-with-stale-tenant side effects into `resolveLanding()` doesn't change
  behavior unexpectedly for its other two callers (`ProtectedRoute.tsx`, `RoleLandingRedirect.tsx`) —
  decide deliberately whether they should also get that behavior, since today only the login path does.
- Do not touch `src/lib/navigation.ts` (the low-level `navigate()` utility) in this pass — confirmed
  separately (F4) that it's genuinely live, load-bearing plumbing, unrelated to which "resolveLanding" is
  canonical.

### Acceptance evidence

- Exactly one live "where should this user land" implementation remains in the codebase, with no
  duplicate-named lookalikes anywhere.
- Single-membership users are still auto-dropped into their one workspace regardless of which entry flow
  (normal login vs. password reset) they came through, proven by a focused test.
- The safety-fuse guard no longer silently discards a legitimate navigation attempt with zero trace.
- The Consultant-with-stale-tenant behavior is consistent and intentional across every caller, with a
  comment explaining the reload if one is still deliberately required.
- Every file marked dead in this entry (`roleRouting.ts`, `routeAfterLogin.ts`, `deprecated.ts`,
  `utils/resolveLanding.ts`) has zero live imports before removal, and the one test that referenced them
  has been updated first.

