# ComplyHub Lint, Routing, and Playwright Program

> **Status:** READY TO CONTINUE — G03 NEXT
> **Purpose:** temporary multi-session execution ledger
> **Last completed work:** PR #1010 — route manifest, merged 7 September 2026
> **Merged commit:** `e14d465962906eba7eaa4bd7d70630afb5c60665`
> **Released worktree:** B is clean on `main` at `e14d4659629` (PR #1010 merge commit)
> **Next work:** proceed to the separately scoped G03 Playwright-foundation decision when approved

> This ledger is the continuation source of truth for this program. It does not
> authorize a commit, push, merge, deployment, database change, or production
> mutation. A new session must still claim an available worktree and create a
> fresh feature branch from current `origin/main` before implementation.

## Current position

Groups 0–2 are complete and merged. They established the permanent quality
documentation, a current inventory, a scoped local lint command, a CI ratchet,
and the complete source-derived route baseline. The ratchet permits existing
lint debt but rejects new lint findings in files changed by a PR.

The program order is locked: establish the route manifest and safe Playwright
coverage, complete the route refactor in small route-family PRs, pass its exit
gate, and only then begin broad feature-grouped lint retirement. PR #1009 and
#1010 changed no product route behavior, application feature, database object,
or Playwright test behavior.

## Resume instructions for a new chat

1. Read this file and `docs/quality/README.md` from current `main`.
2. Follow the normal session-start process: inspect `active-work.md`, claim an
   unclaimed worktree, fetch `origin/main`, and create a new branch from it.
3. Treat **G03 — Playwright foundation** as the next decision. Recon the two
   existing configurations, test personas, data-write risk, cleanup behavior,
   and hosted-read-only candidates; then present a bounded plan for approval
   before editing. Do not combine G03 with route refactoring or broad lint
   cleanup.

## Program dashboard

| ID | Group | Deliverable | PR | Status |
| --- | --- | --- | --- | --- |
| G00 | Documentation and inventories | Permanent docs, living ledger, initial measurements | — | COMPLETE |
| G01 | Measurement and lint ratchet | Scoped lint command and merge-base-aware CI ratchet | #1009 | MERGED |
| G02 | Route manifest | Ordered path/component/guard/layout inventory | #1010 | MERGED |
| G03 | Playwright foundation | One safe canonical harness | PR 3 | PLANNED |
| G04+ | Route refactor | One route family or layout concern per PR | TBD | BLOCKED BY G02/G03 |
| G-LINT | Lint retirement | Feature-grouped fixes after route exit gate | TBD | BLOCKED |

## Completed work and evidence

### G02 — complete route-manifest baseline (PR #1010 merged)

On branch `feat/quality-route-manifest-g02`, the route baseline is generated
from `src/AppRoutes.tsx` and its spread `legalPublicRoutes` module. It records
480 ordered route objects, 16 indexes, 47 dynamic/wildcard routes, 92 direct
`Navigate` redirects, and 5 component-based redirect handlers. Each entry has
its source module, resolved and local paths, family, component/lazy import,
inherited guard and layout chain, redirect details, parameters, wildcard flag,
and source order.

Focused verification passed: generator syntax, manifest freshness, Prettier,
the route-manifest Vitest check, focused ESLint, and `git diff --check`. The
manifest expands the legal array deliberately: the original 473/46/88/15
foundation measurement is AppRoutes-only, while the complete runtime manifest
adds 7 legal-route objects (including one dynamic route, four redirects, and
one index). No router, product, backend, Playwright configuration, or CI
behavior changed.

PR #1010 merged as `e14d465962906eba7eaa4bd7d70630afb5c60665` at 04:30:53 UTC
on 7 September 2026. A retry then fetched `origin/main`, preserved the generated
`html/` report artifacts in `stash@{0}`, and fast-forwarded Worktree B cleanly
to the merge commit before releasing its registry row.

### PR #1009 — establish lint baseline ratchet

Merged as `6ae0a115169a2dbf51bfef33bafef77a95fd7949`.

- Added permanent quality-program docs under `docs/quality/`.
- Added `scripts/check-eslint-ratchet.mjs`; CI compares each changed TypeScript
  file with its merge-base version and fails only net-new lint messages.
- Changed the local `lint` command from linting the whole repository to the
  intended TypeScript/TSX source, test, script, Cypress, and Edge Function paths.
- Did not alter ESLint rule severities, application code, routes, migrations,
  Edge Function behavior, or Playwright behavior.

Verification recorded before merge:

- `node --check scripts/check-eslint-ratchet.mjs`
- ratchet run against `origin/main` for `src/AppRoutes.tsx`
- scoped lint baseline: 605 existing errors, 325 existing warnings, and no fatal
  SQL parsing results
- targeted Prettier and `git diff --check`

## Baseline and lint policy

The initial raw repository-wide measurement at
`14d75b9002adb7792be81c4ef66602a4092898c7` found 640 errors and 325 warnings
across 594 files. Thirty-five errors were SQL migrations incorrectly parsed by
ESLint; they are not application lint findings.

PR #1009 corrected the command scope, producing the operational baseline of 605
existing errors and 325 existing warnings with no fatal SQL parser results. The
ratchet prevents this baseline from growing; it is not a cleanup program.

The largest legacy rule categories at measurement time were
`react-hooks/exhaustive-deps` (213), `@typescript-eslint/ban-ts-comment` (132),
`react-hooks/set-state-in-effect` (87), `react-refresh/only-export-components`
(82), and `no-restricted-syntax` (81).

## Route and Playwright starting facts

- The AppRoutes-only foundation measurement remains 473 route objects, 299 lazy
  imports, 15 indexes, 46 dynamic/wildcard routes, and 88 redirects. The
  merged G02 manifest expands its imported legal-route module, yielding the
  complete runtime baseline of 480 route objects, 16 indexes, 47
  dynamic/wildcard routes, 92 direct redirects, and 5 component-based redirect
  handlers. The generated file is `docs/quality/route-manifest.json`.
- The repository has two conflicting Playwright configurations and 20 E2E specs.
  Three specs are hosted-read-only candidates; the others require disposable
  data or quarantine.
- The secondary Playwright configuration resets/seeds data and ignores cleanup
  failure. It must never become a hosted default suite without isolated
  credentials and proven cleanup.

The detailed inventories and contracts are in `docs/quality/foundation-inventory.md`,
`docs/quality/route-refactor-contract.md`, and
`docs/quality/playwright-contract.md`.

## Locked decisions

| Date | Decision | Why |
| --- | --- | --- |
| 2026-09-07 | One coherent feature or workflow slice per PR | Keeps review and rollback understandable |
| 2026-09-07 | Browser writes require disposable isolation | Hosted frontend can reach shared backend data |
| 2026-09-07 | Permanent runbook and this ledger are required | New sessions must not depend on chat memory |
| 2026-09-07 | Routing precedes broad lint retirement | Stabilizes feature, guard, layout, and module boundaries first |
| 2026-09-07 | Lint is measured and ratcheted early | Prevents new debt without competing with route extraction |

## Parked findings

| ID | Finding | Why parked | Future group |
| --- | --- | --- | --- |
| P-001 | Legacy lint debt remains after scoping | The ratchet contains it; cleanup waits for route exit gate | G-LINT |
| P-002 | Secondary Playwright setup resets/seeds data and ignores cleanup failure | It cannot be a hosted default suite | G03 |
