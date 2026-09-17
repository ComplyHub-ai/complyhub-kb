# ComplyHub Lint, Routing, and Playwright Program

> **⚠ Not the entry point for G04-B.** As of 15 Sep 2026 the active entry point is
> `g04-route-contract-foundation.md` § 0. Read that first; this document is reference material it opens at
> named points — principally § G04-B (contract field list) and § G04-C (shadow adapters/generators).
> Where the two disagree, that one wins. The § G04-B/C/D/E design below remains accurate and is the
> approved design; only this header's branch/worktree/next-action state was stale.
>
> **Status:** G04-B design approved, never built. Implementation now sequenced by
> `g04-route-contract-foundation.md`. G04-A complete.
> **Purpose:** multi-session execution ledger for the wider G04 routing program — retained as the design
> record for the route contract itself.
> **Formal name (added 17 Sep 2026):** the G04 program tracked in this doc and its G04-A/B/C/D/E
> phases is the **Navigation Consolidation Initiative** — G00–G03 and G-LINT in the Program dashboard
> below are separate, unrelated bodies of work and keep their own names/numbering.
> **Last completed work:** G04-A route and UX-access characterization plus route-manifest determinism — PR #1057, merged 8 September 2026
> **Merge commit:** `5981b1fc4334a00a5bb3dc4839903f730d7798ff`
> **Current worktree:** Worktree A — `rto-compass-hub` (corrected 15 Sep 2026; previously named Worktree B)
> **Current branch:** none. The `feat/g04-route-contract` branch this header used to name was found on
> 15 Sep 2026 to be a dead pointer at `164280ac4` — 208 commits behind `main`, zero commits of its own,
> never pushed — and was deleted. **No route-contract work exists anywhere yet.**
> **Owner decisions:** decision 1 (canonical navigation source) is RESOLVED — `g04b-nav-source-recon.md`
> § Issue 5's locked navigation-catalog decision. Decisions 2–5 (unavailable UX, heatmap navigation
> exception, role/capability vocabulary, legacy gate retirement) remain open and are explicitly **out of
> scope** for the current FRAME — see `g04-route-contract-foundation.md` §3.
> **Next action:** `g04-route-contract-foundation.md` § 0, Phase 0.

This ledger is the continuation source of truth for the program. It records the
approved G04 plan, current source findings, decisions, boundaries, and evidence.
It does not authorize a commit, push, merge, deployment, database change, or
production mutation. Those remain separate approval gates.

Playwright credentials are never stored in this ledger. Approved production-lane
credentials must be supplied at runtime through the documented environment
variables.

## Current position

Groups 0–3 are complete and merged. They established the permanent quality
documentation, reproducible inventories, a scoped lint command, a CI ratchet,
the complete source-derived route baseline, and the safe Playwright harness.
The lint ratchet permits existing lint debt but rejects new lint findings in
files changed by a PR.

The locked program order is:

1. Maintain the route manifest and safe Playwright coverage.
2. Characterize and converge frontend routing and UX access in small route-family PRs.
3. Pass the G04 route exit gate.
4. Begin broad feature-grouped lint retirement only after the route exit gate.

PRs #1009, #1010, and #1023 changed no database objects. PRs #1009 and #1010
changed no application or Playwright behavior. PR #1023 established the safe
browser lanes and quarantined the legacy specs.

## Resume instructions for a new chat

1. Read this file and `rto-compass-hub/docs/quality/README.md` from current `main`.
2. Follow the normal session-start process: inspect `active-work.md`, verify the
   assigned worktree and branch, fetch `origin/main`, and confirm the worktree
   state before editing.
3. Treat **G04 — canonical frontend routing and UX-access convergence** as the
   active program.
4. Continue one approved phase at a time. Keep route convergence separate from
   broad lint cleanup.
5. Before any commit, push, PR, merge, deployment, database action, or
   production browser verification, use the applicable approval gate.

The former instruction to dispatch a separate Scout or orchestration process is
not part of this ledger. The current recon was performed locally in the primary
session and is recorded below.

## G04 objective — Navigation Consolidation Initiative

Create one canonical frontend route definition that can drive, or explicitly
account for, all of the following:

- route registration and route-module ownership;
- layouts and provider composition;
- redirects and redirect history behavior;
- frontend UX access gates;
- navigation visibility;
- breadcrumbs and section labels;
- route-manifest generation;
- route and browser characterization tests.

A developer adding a protected page should declare its frontend routing and UX
access facts once, rather than update several unrelated wrappers, allowlists,
navigation sources, and breadcrumb resolvers.

## Security boundary

The browser is not the security authority. RLS, RPCs, and Edge Functions remain
independent server-side enforcement points. G04 may standardize frontend UX
gates and introduce route capability metadata, but it must not widen access,
replace backend authorization, or consolidate server-side authorization.

Any server-side authorization redesign is a separate, explicitly scoped program.

## Recon findings on current `origin/main`

### Route registration and manifest

- `src/AppRoutes.tsx` remains the primary route composition file. It contains
  public routes, token routes, authentication/recovery routes, tenant routes,
  trainer routes, dashboard routes, superadmin routes, redirects, and the
  catch-all behavior.
- Existing extracted route modules are limited and unevenly applied. Current
  examples include `src/routes/legalRoutes.tsx`, `src/routes/admin.tsx`, and
  `src/routes/dashboardHeatmap.tsx`.
- `dashboardHeatmap.tsx` currently exports a small `RouteObject[]` containing
  the relative `heatmap` path and lazy page import. It inherits the existing
  dashboard guard/layout chain from `AppRoutes.tsx`.
- `scripts/generate-route-manifest.mjs` parses `AppRoutes.tsx` and imported route
  arrays, resolves lazy imports, records wrapper/layout chains, detects direct
  `Navigate` redirects, and writes `docs/quality/route-manifest.json`.
- The manifest generator recognizes a fixed wrapper-name list. That list is
  useful evidence, but it is not yet a canonical route contract and does not
  drive runtime routing or navigation.
- The current source-derived manifest is 479 route objects, 16 indexes, 47
  dynamic/wildcard routes, 91 direct redirects, and 5 component-based redirect
  handlers. The generated file is
  `rto-compass-hub/docs/quality/route-manifest.json`.

### Current UX access mechanisms

- `src/routes/ProtectedRoute.tsx` waits for auth, role, and app readiness;
  redirects unauthenticated users to login with a return target; and can apply
  `useCanView()` to a supplied page path.
- `src/components/tenant/TenantGuard.tsx` resolves the effective tenant and
  role, handles automatic workspace selection, tenant-loop protection, and
  path-specific governance/TAS role rules.
- `src/guards/SuperAdminGuard.tsx` handles session readiness, hard superadmin
  or platform identity, QA-testing exceptions, tenant-mode behavior, and
  fallback redirects.
- `src/guards/PlatformPermissionGuard.tsx` applies per-page platform
  permissions beneath the superadmin guard.
- `src/guards/QAAccessGuard.tsx` applies QA tester or superadmin access.
- `src/routes/guards/TrainerRouteWrapper.tsx` supplies trainer context and
  protects trainer report routes.
- `src/components/guards/DriverDiagnosticRouteGuard.tsx` applies a dedicated
  role/capability gate and requires tenant context for superadmins.
- Additional route-adjacent gates include billing, consultant, affiliate,
  admin, manager, auditor, student, and role-specific route wrappers.
- Raw role and capability decisions also exist in tenant pages, navigation
  configuration, permission hooks, and feature-specific components. These must
  be inventoried before being retired or folded into metadata.

### Guard ordering and special cases

- Public pages and token-based pages intentionally run outside the normal
  authenticated tenant chain.
- `PublicOnlyRoute` handles authenticated users entering public-only paths and
  centralizes post-auth redirection.
- `/auth/callback`, password recovery, profile completion, and orphan-recovery
  paths are special shells. They must not be accidentally wrapped in a tenant
  gate during route extraction.
- The normal protected chain is readiness checks first, then session/auth
  status, then UX access and tenant/capability decisions, followed by the
  protected layout/page.
- The superadmin chain is separate: session/platform identity first, then
  tenant-mode and special QA rules, then per-page platform permission.
- The current code frequently renders a loading surface while decisions are
  unresolved. G04 must preserve this behavior where correct and distinguish it
  from denied and unavailable states.
- Unknown routes and legacy redirects must retain their current precedence,
  target, and history replacement behavior.

### Navigation and breadcrumb sources

The repository currently contains multiple overlapping navigation systems:

- `src/config/roleNavigation.ts` — role-specific navigation configurations;
- `src/config/roleMenuConfigs.ts` — another role/menu configuration used by
  enhanced sidebars and breadcrumbs;
- `src/config/sidebarConfig.ts` and `src/components/nav/sidebarConfig.ts` —
  additional sidebar definitions;
- `src/config/superAdminNav.ts` — superadmin navigation;
- `src/components/nav/` and `src/components/navigation/` — multiple sidebar
  renderers and role-specific shells;
- `src/lib/nav/getBreadcrumb.ts` and
  `src/components/layout/NavBreadcrumb.tsx` — independent breadcrumb
  resolution paths;
- `src/utils/routeRegistry.ts` — existing page-description metadata, which is
  not currently a route/access contract;
- legal and help-centre registries — separate navigation domains that should
  remain explicit exceptions unless separately approved.

The central risk is divergence: a route can be registered in `AppRoutes.tsx`,
hidden or shown by a different navigation source, and labeled by a third
breadcrumb source.

## Approved implementation plan

The plan is approved for implementation. Each stage below includes the
technical outcome and the plain-English purpose.

## Delivery structure: branches, PRs, and handoff gates

G04 is a program made up of several independently reviewable slices. It should
not be delivered as one long-lived branch and one oversized PR. The smooth
working structure is one short-lived feature branch and one PR per bounded
stage or route-family slice.

### Recommended sequence

| Sequence | Branch purpose            | PR boundary                                                                         | Required handoff before the next slice                                     |
| -------- | ------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1        | G04-A characterization    | Current-route behavior and regression tests only                                    | Decision table reviewed; no unresolved behavior hidden in tests.           |
| 2        | G04-B contract            | Typed canonical route metadata only, unless tightly coupled to G04-A                | Contract fields and explicit exceptions approved.                          |
| 3        | G04-C shadow adapters     | Manifest/navigation/breadcrumb adapters and parity checks                           | Shadow output matches current behavior or every mismatch is recorded.      |
| 4        | G04-D heatmap pilot       | `/dashboard/heatmap` contract adoption and parity                                   | Heatmap route, layout, guard, manifest, and tests pass.                    |
| 5+       | G04-D route-family slices | One dashboard/register, redirect, tenant-layout, or special-family migration per PR | Previous family is merged or explicitly accepted as the conflict baseline. |
| Final    | G04-E convergence         | Approved special-gate retirement/convergence slices                                 | Every removed legacy gate has parity evidence and an owner/removal record. |

G04-A and G04-B may be combined into one PR only if the resulting diff remains
small, reviewable, and behavior-neutral. G04-C may be combined with G04-B only
when the contract and adapters are inseparable and the parity checks are
included in the same PR. The heatmap pilot and every later route-family
migration remain separate PRs.

### Branch rules

- Start each branch fresh from the current `origin/main` or the explicitly
  approved predecessor baseline.
- Use descriptive names such as:
  - `feat/g04-characterization`;
  - `feat/g04-route-contract`;
  - `feat/g04-route-shadow-adapters`;
  - `feat/g04-heatmap-contract`;
  - `feat/g04-dashboard-registers-contract`.
- G04-A shipped as PR #1057. Start each subsequent G04 slice from current
  `origin/main` on its own descriptive branch.
- Do not mix broad lint cleanup, database work, Edge Function work, or
  unrelated route fixes into a G04 branch.
- Do not begin the next route-family branch until the previous slice has passed
  its focused checks and its final branch/PR baseline is recorded.

### PR contents for every slice

Every G04 PR should state:

1. the exact route family or planning stage in scope;
2. the current source behavior being preserved;
3. the files and symbols changed;
4. the before/after manifest or parity result;
5. the focused tests and Playwright lane, if applicable;
6. explicit non-goals and parked findings;
7. the rollback boundary;
8. whether the next slice may start from `origin/main` or must use the merged
   predecessor as its baseline.

### Plain English

Do the work like a chain of small, understandable deliveries. Each branch
answers one question, each PR has one clear rollback point, and the next slice
starts only after the previous slice has proved itself. We can use the current
branch for the first slice, but we should not put the entire G04 program into
one branch and one PR.

### G04-A — Characterize current behavior (COMPLETE — PR #1057)

#### Technical outcome

Create a focused characterization layer for current routing and UX access. It
must cover representative cases across these dimensions:

| Case                                       | Required behavior to record                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Public                                     | Public pages render without tenant/auth guards where currently intended.                                  |
| Unauthenticated protected deep link        | Redirects to the existing login destination with the original path/search preserved.                      |
| Authenticated tenant user                  | Waits for readiness, resolves the active workspace, then mounts the intended layout/page.                 |
| Missing tenant/workspace                   | Preserves the current workspace-selection, no-workspace, or recovery behavior.                            |
| Allowed role/capability                    | Mounts the intended page only after the access decision resolves.                                         |
| Denied role/capability                     | Uses the current denied destination and does not mount protected content.                                 |
| Permission transport/configuration failure | Represents unavailable access distinctly from both allow and deny.                                        |
| Hard superadmin                            | Preserves the separate superadmin/platform gate and per-page permission gate.                             |
| OAuth/recovery/callback                    | Preserves the special unguarded or alternate-shell path.                                                  |
| Unknown route                              | Preserves catch-all and not-found behavior.                                                               |
| Redirect                                   | Preserves target, query/hash handling, route precedence, and `replace` behavior.                          |
| Session/account change                     | Prevents stale access decisions or prior-tenant content from surviving logout, refresh, or tenant switch. |

Candidate files and tests:

- `src/AppRoutes.tsx`;
- `src/routes/ProtectedRoute.tsx`;
- `src/routes/PublicOnlyRoute.tsx`;
- `src/routes/OrphanRecoveryGate.tsx`;
- `src/routes/OAuthCallbackGate.tsx`;
- `src/components/tenant/TenantGuard.tsx`;
- `src/guards/SuperAdminGuard.tsx`;
- `src/guards/PlatformPermissionGuard.tsx`;
- `src/components/guards/DriverDiagnosticRouteGuard.tsx`;
- `tests/routes/route-manifest.test.ts`;
- existing route tests under `tests/routes/` and `src/routes/__tests__/`;
- focused Playwright coverage using the safe lanes described in
  `docs/quality/playwright-contract.md` and
  `docs/quality/playwright-harness.md`.

#### Expected behavior

Before and after G04-A, runtime behavior must be unchanged. The result is a
decision table and regression tests, not a new access mechanism.

#### Plain English

First, write down and test what the app already does. This gives us a safety
net so later route changes do not accidentally change who can see a page or
which redirect a user receives.

#### Risks and rollback

- Risk: tests accidentally encode a bug as an approved product rule.
- Control: label observations separately from approved decisions and stop on
  ambiguous access behavior.
- Rollback: remove only the new characterization tests; no runtime code should
  need rollback in this stage.

### G04-B — Define the typed canonical route contract

#### Technical outcome

Define one typed contract for route facts. The exact shape will be confirmed
against the current route object needs, but must support at least:

- canonical path and dynamic parameters;
- redirect target, query/hash behavior, and `replace` semantics;
- route family and source module;
- page/lazy module reference;
- layout/provider chain;
- access class: public, authenticated, tenant, role/capability, hard
  superadmin, callback/recovery, or explicit exception;
- UX capability/permission metadata and optional context resolver;
- navigation label, icon/group, visibility rule, and canonical link;
- breadcrumb/section facts;
- explicit legacy aliases and exceptions;
- test metadata: persona, environment, state, side-effect class, and expected
  visible assertion.

The contract must describe frontend UX access only. It must not become a
server authorization vocabulary or imply that navigation visibility authorizes
API/database actions.

#### Expected behavior

No route behavior changes. The contract initially describes current behavior
and exposes unresolved or exceptional routes rather than guessing.

#### Plain English

Give each route one complete description instead of scattering its details
across several files. The description tells the app where the page lives, how
it is protected, what it is called in the menu, and how it should be tested.

#### Risks and rollback

- Risk: the contract becomes a second route registry or silently invents a new
  authorization system.
- Control: keep the current router and guards authoritative; require explicit
  exceptions and backend-independence comments.
- Rollback: delete the contract and its type/tests without changing runtime
  route registration.

### G04-C — Add shadow adapters and generators

#### Technical outcome

Add adapters or generators that consume the contract for:

- route-manifest output;
- navigation visibility/link facts;
- breadcrumb facts;
- route characterization fixtures and parity checks.

During shadow mode:

- existing guards remain authoritative;
- metadata is compared with current route composition;
- mismatches are reported as test failures or explicit exceptions;
- there is no permissive `legacy OR new` access combination;
- an unavailable decision is never converted into allow or an automatic deny
  redirect;
- protected layouts, queries, and side effects do not mount before allow.

Relevant implementation areas include:

- `src/AppRoutes.tsx`;
- the new canonical route metadata module;
- `scripts/generate-route-manifest.mjs`;
- `docs/quality/route-manifest.json`;
- `src/lib/nav/getBreadcrumb.ts`;
- navigation configuration and adapter files;
- `tests/routes/route-manifest.test.ts` and new contract-parity tests.

#### Expected behavior

Generated output should match the current source-derived manifest and current
navigation/breadcrumb behavior. Any difference must be intentional and recorded.

#### Plain English

Let the new route description observe and report what the app would do, but do
not let it control access yet. This makes mismatches visible without putting
users at risk.

#### Risks and rollback

- Risk: generated metadata is treated as permission enforcement or silently
  changes menu visibility.
- Control: shadow-only adapters, parity tests, and explicit runtime ownership.
- Rollback: stop generating from the contract and restore the prior manifest
  generation path; existing runtime guards remain untouched.

### G04-D — Migrate one route/layout family at a time

#### First approved slice: `/dashboard/heatmap`

Start with `src/routes/dashboardHeatmap.tsx` because it is already isolated,
has a narrow route object, and inherits a known existing chain:

`ProtectedRoute → OrphanRecoveryGate → BillingGateGuard → AppShellWrapper`.

The first slice must:

- declare the heatmap route in the canonical contract;
- preserve its relative path and lazy page import;
- preserve route order and inherited wrappers/layout;
- add manifest parity and uniqueness assertions;
- add or update navigation/breadcrumb metadata only if the route currently has
  an approved visible navigation entry;
- record an explicit exception if heatmap remains intentionally unlisted;
- avoid database, Edge Function, backend authorization, or production changes.

Because heatmap currently has no approved navigation lane, this first slice
proves route, layout, manifest, and access parity but does not claim complete
navigation convergence. The next slice should be selected from a small
dashboard/register family that exercises both navigation and breadcrumbs.

#### Migration order after the pilot

1. Heatmap pilot and contract parity.
2. One low-risk dashboard/register family with a stable navigation entry.
3. Legacy redirect family, preserving target and history semantics.
4. One tenant layout family after mount-lifetime and tenant-switch behavior is
   characterized.
5. Superadmin and platform-permission routes only after their access rules and
   explicit hard-superadmin exceptions are approved.
6. Remaining route families and special shells.

#### Expected behavior

For each migrated family, direct links, refresh, navigation, breadcrumbs,
redirects, denied access, loading, unavailable access, logout, tenant switch,
and back/forward behavior remain equivalent unless a separate product decision
explicitly approves a change.

#### Plain English

Move one small, already-separated route first. Prove that the new description
produces the same result before touching a larger route family. Then expand one
family at a time so any regression has a clear owner and rollback point.

#### Risks and rollback

- Risk: route extraction changes wrapper order, lazy loading, tenant state, or
  redirect precedence.
- Control: one route family per PR, generated before/after manifest diff,
  focused tests, and explicit Playwright evidence where the lane is safe.
- Rollback: revert the single route-family commit/PR and restore the previous
  route-module spread. No database rollback should be required.

### G04-E — Converge approved special UX gates

#### Technical outcome

After parity is proven for ordinary route families, migrate approved special
cases and retire duplicated wrappers/allowlists only when equivalent behavior
is demonstrated. Every remaining legacy gate must either be removed or recorded
with an owner, reason, and removal condition.

Hard superadmin routes remain explicitly marked and exceptional. Callback,
recovery, public token, alternate-shell, QA, billing, consultant, affiliate,
trainer, and tenant-context exceptions must remain visible in the contract.

#### Expected behavior

The canonical contract drives ordinary route composition, navigation,
breadcrumbs, manifest output, and tests. Explicit exceptions remain deliberate,
reviewable, and independently tested.

#### Plain English

Once the small examples work, move the special cases over carefully. Remove old
duplicate rules only after tests prove that the app still behaves the same.

#### Risks and rollback

- Risk: a special shell or legacy allowlist is removed because it looks
  duplicated but carries an undocumented product rule.
- Control: require an owner and explicit decision for every exception; do not
  infer authorization from route names or menu visibility.
- Rollback: restore the specific legacy wrapper or allowlist through a focused
  forward change or revert the route-family PR. Backend authorization remains
  unchanged throughout.

## Required tests and evidence

Every implementation PR must provide:

- exact base and branch SHAs;
- changed route families and source modules;
- before/after ordered manifest output;
- guard, layout, redirect, navigation, and breadcrumb parity evidence;
- focused Vitest/unit tests for the changed contract and route behavior;
- Playwright evidence when the journey is covered by an approved safe lane;
- explicit statement of prohibited browser actions not performed;
- `node scripts/generate-route-manifest.mjs --check`;
- focused route tests;
- scoped ESLint ratchet check;
- formatting and `git diff --check` evidence;
- no database migration or Edge Function drift introduced by the route slice.

The browser test result must name the exact route, persona, environment,
viewport, actions, assertions, and side effects. A passing browser test does
not prove RLS, RPC, Edge Function, or backend authorization correctness.

## Explicit non-goals

- No database, RLS, RPC, trigger, grant, or Edge Function changes.
- No backend authorization consolidation.
- No broad lint-debt retirement before G04 exits.
- No replacement of backend enforcement with browser metadata.
- No production schema mutation or production write workflow.
- No change to the approved Playwright credential policy.
- No silent cleanup of unrelated navigation, route, or lint defects.
- No removal of an old guard merely because the new metadata exists.

## Unresolved decisions requiring product or owner input

1. **Canonical navigation source:** decide whether `roleNavigation`,
   `roleMenuConfigs`, a new contract-owned source, or another existing source
   becomes authoritative for ordinary tenant navigation.
2. **Unavailable UX:** approve the visible retry/unavailable destination and
   copy for permission transport/configuration failures.
3. **Heatmap navigation exception:** confirm that heatmap may remain unlisted
   during the pilot, or provide an approved navigation/breadcrumb entry.
4. **Role/capability vocabulary:** map existing raw role checks and platform
   permission keys to frontend access classes without changing backend policy.
5. **Legacy gate retirement:** assign an owner and removal condition for each
   route gate that remains after shadow parity.

No implementation should resolve these ambiguities by guessing or by encoding
the observed behavior as a new authorization rule.

## G04 exit gate — Navigation Consolidation Initiative

G04 is complete only when:

- one declared frontend UX-access rule exists for every protected route;
- router composition, navigation, breadcrumbs, manifest, and route tests derive
  from the canonical contract or have an explicit temporary exception;
- deep links, refresh, back/forward, logout, tenant switch, denied,
  unavailable, and special-shell behavior are characterized and tested as
  applicable;
- protected layouts and data-bearing surfaces do not mount before access
  resolves;
- every legacy route gate is retired or recorded with an owner and removal plan;
- no route behavior was widened or narrowed without an approved decision and
  independent backend-enforcement review;
- the final generated route inventory and focused tests pass; and
- the ledger records the final PR, merge, and post-merge evidence.

## Program dashboard

| ID     | Group                           | Deliverable                                         | PR           | Status                            |
| ------ | ------------------------------- | --------------------------------------------------- | ------------ | --------------------------------- |
| G00    | Documentation and inventories   | Permanent docs, living ledger, initial measurements | —            | COMPLETE                          |
| G01    | Measurement and lint ratchet    | Scoped lint command and merge-base-aware CI ratchet | #1009        | MERGED                            |
| G02    | Route manifest                  | Ordered path/component/guard/layout inventory       | #1010        | MERGED                            |
| G03    | Playwright foundation           | One safe canonical harness                          | #1023        | MERGED                            |
| G04    | Canonical routing and UX access — **Navigation Consolidation Initiative** | Typed route contract and staged convergence | #1031, #1057, #1160, #1166, #1191 | IN PROGRESS — PR 4 (pilot family catalog + one real consumer) next |
| G-LINT | Lint retirement                 | Feature-grouped fixes after route exit gate         | TBD          | BLOCKED                           |

### G04-A characterization and manifest determinism (PR #1057 merged)

PR #1057 added the G04-A decision table and five focused regression tests for
protected readiness, deep-link login redirects, page denial, authenticated
public-only routing, and the support `?force=1` override. It changed no runtime
route registration, guards, navigation, backend authorization, database object,
Edge Function, or production behavior.

The PR also made route-manifest freshness stable across merges: the generator
now records Git content hashes for route source modules instead of the last
touching commit, and formats output with the repository-local Prettier runtime.
The manifest remains at 479 route objects. Verification before merge: manifest
freshness check, 18 focused route tests, scoped ESLint ratchet, formatting, and
diff checks all passed.

## Completed work and evidence

### G04 — heatmap route-family extraction (PR #1031 merged)

PR #1031 extracted the standalone `/dashboard/heatmap` route from
`src/AppRoutes.tsx` into `src/routes/dashboardHeatmap.tsx`. The route kept its
relative path, lazy page import, source order, inherited
`ProtectedRoute → OrphanRecoveryGate → BillingGateGuard` chain, and
`AppShellWrapper` layout. No redirect, database, Edge Function, CI, config,
production, Help Centre, root-path, or admin-profile behavior changed.

The generated manifest was current at 479 route objects and 91 direct
`Navigate` redirects. The 479 count included `/superadmin/system/db-events`,
added by PR #1029 after the 478-route AV cleanup baseline. The heatmap
extraction preserved the count.

Fresh-eyes review corrected two test-quality issues before merge: the heatmap
assertion did not prove uniqueness and the route-count assertion was too
permissive. No approved Playwright lane covers heatmap, so browser verification
was not run.

Recorded verification:

- `node scripts/generate-route-manifest.mjs --check`;
- `npx vitest run tests/routes/route-manifest.test.ts` — 3 tests passed;
- `node scripts/check-eslint-ratchet.mjs --base origin/main -- <changed TypeScript files>`;
- `npm run type-check`;
- `npx prettier --check <changed files>`;
- `git diff origin/main...HEAD --check`.

PR #1031 merged as `8f3d784c05a4afa5e72ec45cccd773564e2bcd43` on 8 September 2026. No commit, push, or PR work remains for that completed slice.

### G04 route sequence updates — PRs #1025, #1028, and #1029

PR #1025 refreshed the manifest after retiring
`/dashboard/risk/profile-setup`, reducing the approved route baseline from 480
to 479. PR #1028 removed the shadowed nested `/dashboard/registers/av` redirect
while retaining the top-level `/registers/av` redirect. PR #1029 later added
`/superadmin/system/db-events`; therefore the current source-derived manifest
is 479 route objects and 91 direct redirects.

These changes did not alter database objects, Edge Functions, or production
state. PR #1028 recorded that its local AV journey could not reach client route
evaluation and no hosted AV run was performed.

### G02 — complete route-manifest baseline (PR #1010 merged)

The G02 manifest is generated from `src/AppRoutes.tsx` and its spread
`legalPublicRoutes` module. Its earlier baseline recorded 480 route objects,
16 indexes, 47 dynamic/wildcard routes, 92 direct `Navigate` redirects, and 5
component-based redirect handlers. After later route changes, the current
source-derived count is recorded above as 479 route objects and 91 direct
redirects.

The manifest records ordered path, component/lazy import, route family,
redirect details, guards, layouts, parameters, wildcard status, source module,
and source order. Generator syntax, freshness, formatting, route tests,
focused lint, and diff checks passed before merge.

### G01 — establish lint baseline ratchet (PR #1009 merged)

PR #1009 added permanent quality-program documentation and
`scripts/check-eslint-ratchet.mjs`. CI compares changed TypeScript files with
their merge-base versions and fails only net-new lint findings. It changed the
local lint scope but did not alter lint severities, routes, migrations, Edge
Functions, or Playwright behavior.

The operational baseline was 605 existing errors and 325 existing warnings,
with no fatal SQL parser results. The baseline is a ratchet, not a cleanup
program.

## Baseline and lint policy

The initial raw repository-wide measurement at
`14d75b9002adb7792be81c4ef66602a4092898c7` found 640 errors and 325 warnings
across 594 files. Thirty-five errors were SQL migrations incorrectly parsed by
ESLint and were not application lint findings.

The largest legacy rule categories at measurement time were
`react-hooks/exhaustive-deps` (213), `@typescript-eslint/ban-ts-comment` (132),
`react-hooks/set-state-in-effect` (87), `react-refresh/only-export-components`
(82), and `no-restricted-syntax` (81).

## Route and Playwright starting facts

- Current source-derived route manifest: 479 route objects, 16 indexes, 47
  dynamic/wildcard routes, 91 direct redirects, and 5 component redirect
  handlers.
- The repository has two Playwright configurations and 19 E2E specs.
- The safe canonical harness enables one anonymous local lane and one explicit
  Vivacity production read-only lane.
- Legacy specs remain intercepted, disposable, or quarantined according to
  `docs/quality/playwright-harness.md`.
- The secondary Playwright configuration resets/seeds data and ignores cleanup
  failure. It must not become a hosted default suite without isolated
  credentials and proven cleanup.

Detailed permanent guidance is in:

- `rto-compass-hub/docs/quality/README.md`;
- `rto-compass-hub/docs/quality/route-refactor-contract.md`;
- `rto-compass-hub/docs/quality/playwright-contract.md`;
- `rto-compass-hub/docs/quality/playwright-harness.md`;
- `rto-compass-hub/docs/quality/lint-playwright-runbook.md`.

## Locked decisions

| Date       | Decision                                       | Why                                                                                                                                                                                                  |
| ---------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-09-07 | One coherent feature or workflow slice per PR  | Keeps review and rollback understandable.                                                                                                                                                            |
| 2026-09-07 | Browser writes require disposable isolation    | Hosted frontend can reach shared backend data.                                                                                                                                                       |
| 2026-09-08 | Vivacity Testing Tenant production exception   | The explicit production Playwright lane may use approved Vivacity users and record only login, page-activity, and onboarding-status events; QI/TAS and other business-data writes remain prohibited. |
| 2026-09-07 | Permanent runbook and this ledger are required | New sessions must not depend on chat memory.                                                                                                                                                         |
| 2026-09-07 | Routing precedes broad lint retirement         | Stabilizes feature, guard, layout, and module boundaries first.                                                                                                                                      |
| 2026-09-07 | Lint is measured and ratcheted early           | Prevents new debt without competing with route extraction.                                                                                                                                           |
| 2026-09-08 | G04 plan approved                              | Route metadata will be introduced in shadow mode, with one route family migrated at a time and backend authorization left independent.                                                               |

## Parked findings

| ID    | Finding                                                                                        | Why parked                                                                                         | Future group |
| ----- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------ |
| P-001 | Legacy lint debt remains after scoping                                                         | The ratchet contains it; cleanup waits for the route exit gate.                                    | G-LINT       |
| P-002 | Secondary Playwright setup resets/seeds data and ignores cleanup failure                       | It cannot be a hosted default suite.                                                               | G03          |
| P-003 | Local `/signup` does not render `Create Your Account` within 20 seconds under the safe harness | Prevents an honest anonymous feature-flow assertion; requires separate route/runtime diagnosis.    | G04+         |
| P-004 | Multiple navigation and breadcrumb registries overlap                                          | Requires canonical-source decision; do not consolidate opportunistically during the heatmap pilot. | G04-B/G04-C  |
| P-005 | Existing raw role checks may encode undocumented product rules                                 | Requires owner/product decision before retirement or metadata mapping.                             | G04-B/G04-E  |

## G03 verification evidence — 8 September 2026

- The default local anonymous lane passed: it serves `/signup` without form
  submission.
- The explicit production Vivacity lane passed approved administrator sign-in,
  Vivacity tenant identity, Quality Indicators workspace, and TAS Library
  rendering in one run.
- The production lane blocks Google telemetry and every non-allowlisted request.
  Its only allowed state-changing calls are approved test-user authentication
  audit, page-activity, and onboarding-status records.
- It does not create, edit, import, sync, submit, upload, invite, generate,
  delete, or sign out.
- The production lane is opt-in only, accepts only `rto.complyhub.ai` and
  runtime credentials, and is excluded from the default command and CI unless
  explicitly selected.
