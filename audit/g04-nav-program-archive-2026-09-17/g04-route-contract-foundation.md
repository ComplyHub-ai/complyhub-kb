# Navigation Consolidation Initiative — Route-Contract Foundation (G04)

> Formal initiative name: **Navigation Consolidation Initiative**. Internal tracking code (branch
> names, PR titles, cross-references throughout this doc) stays **G04** / **G04-B** — see
> `README.md`'s header note for why that numbering isn't being renamed.

> **START HERE. This file is the single source of truth for this body of work.**
> It is the only entry point. Every other document named here is reference material, opened at the
> specific points §0 names — never read cover-to-cover, never followed as an instruction set.
> Where any other document disagrees with this one, **this one wins.**
>
> **Status:** Phase 1 IN PROGRESS — PRs 1-4 merged (see §5); PR 5+ (remaining route families) not yet
> started. Not done — see this file's own Lifecycle line below for what "done" requires.
> **Owner:** Khian · **Worktree:** A (`rto-compass-hub`) · **Opened:** 15 September 2026
> **Purpose:** unblock G04-B PR 7 (navigation catalog foundation) by supplying stable route identifiers.
> **Lifecycle:** permanent while this work is live. Delete only when **every item in this document is
> done** — all of §0's Phase 0 decisions locked, all of its Phase 1 PRs merged, and the audit entry
> written. Until then it stays, because it is also the basis for the audit and for any work built on
> top of this. Partial completion is not completion.

---

## 0. Read order and execution sequence

Work top to bottom. Do not start a step before the one above it has met its gate.

### Phase 0 — decisions only. No code, no PR, no branch.

| Step | Do this | Read this | Done when |
|---|---|---|---|
| 0a | Resolve **O1** — pick the pilot route family | `g04b-nav-optimization-plan.md` §3 + §4, then `g04b-nav-source-recon.md` § Issue 5 + § F4, then live `AppRoutes.tsx` + `docs/quality/route-manifest.json` | A family is named that is small, isolated, **and** has a real live menu entry |
| 0b | Resolve **O2** — ID format | `lint-playwright-program.md` § G04-B field list, then the existing `docs/quality/route-manifest.json` shape | Scheme chosen that survives a path rename without churn |
| 0c | Resolve **O3** — contract field subset | `lint-playwright-program.md` § G04-B (all ~11 field categories), then `g04b-nav-source-recon.md` § Issue 5 target model | Every included field has a named consumer; everything else deferred |

Each resolved item is written into §4 as a locked decision and struck from §6.

### Phase 1 — build. One PR at a time, strictly sequential.

| PR | Do this | Read this | Gate to proceed |
|---|---|---|---|
| 1 | Build `scripts/nav-metrics.mjs` | Spec: `g04b-nav-optimization-plan.md` §8. File list: its §3. Tier groups: its §4 | Output matches a spot-checked subset of §3's baseline |
| 2 | ✅ **MERGED — PR #1166** (`0c215b959`, 15 Sep 2026) — Classification pass, tier every route | Tier table: §4 D2 below. Dead-link evidence: `g04b-nav-source-recon.md` §F2, §F4, Issues 2/3/6/12/13. Live truth: `docs/quality/route-manifest.json` | Every route has a tier; tier-C items listed, never guessed |
| 3 | Contract types + pilot family entries | Field subset: O3's outcome + `lint-playwright-program.md` § G04-B. Generator wiring: its § G04-C | Manifest `--check` clean; generated output identical to current |
| 4 | ✅ **MERGED — PR #1203** (`192ede473`, 17 Sep 2026) — Pilot catalog entry + one real consumer | Target model: `g04b-nav-source-recon.md` § Issue 5. SOLID row: `g04b-nav-optimization-plan.md` §5. Gates: its §7 | Old-vs-new visible menu identical for a real role, desktop + mobile |
| 5+ | Repeat 3–4, one family per PR | Same as 3–4 | Previous family merged before the next starts |

### Phase 2 — hand control back to the navigation program.

Once enough families carry stable IDs, `g04b-nav-optimization-plan.md` §6 resumes at **PR 8 → 9 → 10 →
11 → 12 → 13**, in its existing order (Issue 5 stages 2–5). That document's PR 14 is an independent
track, runnable at any time.

**In one line:** do all of Phase 0 and Phase 1 in this document, then do PRs 8–13 of
`g04b-nav-optimization-plan.md`.

---

## 1. Why this exists

`g04b-nav-optimization-plan.md` §6 PR 7 ("catalog foundation") is blocked on a prerequisite: a stable
set of route identifiers, so catalog entries reference a route-contract ID rather than a hand-copied
route string. Per `g04b-nav-source-recon.md` § Issue 5 step 1, the route contract's "identifiers and
generated manifest are the only allowed target references."

That prerequisite was believed to be in progress on branch `feat/g04-route-contract`. On 15 Sep 2026 that
branch was found to be a dead pointer (`164280ac4`, 208 commits behind `main`, zero commits of its own,
never pushed) and was deleted. **No route-contract work exists anywhere.**

**However, the design for it was never lost.** `lint-playwright-program.md` (workspace root) contains the
full, previously-approved G04 program: G04-A shipped (PR #1057, 8 Sep 2026); G04-B ("Define the typed
canonical route contract") is fully specified but never built; G04-C ("shadow adapters and generators")
specifies feeding `scripts/generate-route-manifest.mjs` / `docs/quality/route-manifest.json` from the
contract in shadow mode. That document's *header* is stale (it still names the deleted branch and
Worktree B); its *body* is the live design.

---

## 2. Source documents

| Document | What to take from it |
|---|---|
| `lint-playwright-program.md` § G04-B, § G04-C | The contract's field list, shadow-mode rules, risks/rollback, exit gate. Header lines 3–9 are stale. |
| `g04b-nav-source-recon.md` § Issue 5 | Locked catalog target model, staged implementation map, verification gates. |
| `g04b-nav-optimization-plan.md` §6, §7, §8 | PR register, per-PR verification gates, the deferred `nav-metrics.mjs` proposal (now overridden — see §4). |
| `unicorn-cms-f09c59e5/docs/kb/reference/codebase-optimization-plan-2026-08-28.md` | Carl's method: evidence tiers, anti-abstraction guardrail, execution packet, change-size limits, stop conditions. |
| `unicorn-cms-f09c59e5/docs/kb/reference/clean-architecture-refactor.md` | Cautionary precedent: superseded *because* it front-loaded layers without proving value on one slice. |

---

## 3. Locked constraints (do not re-litigate)

- **Presentation only.** The contract describes frontend UX access. It is never a server-authorization
  vocabulary, and navigation visibility never authorizes an API or database action. Router and guards stay
  authoritative; RLS/RPC/Edge authorization is untouched.
- **Shadow mode.** Generated output must match the current source-derived manifest. Any difference is a
  test failure or a recorded explicit exception — never a silent behavior change.
- **No `legacy OR new` permissive combination.** An unavailable decision is never converted into allow or
  an automatic deny redirect.
- **Rollback boundary.** Deleting the contract module and its tests must restore prior behavior without
  touching runtime route registration.
- **Four owner decisions stay unresolved and out of scope** (from `lint-playwright-program.md` § "Unresolved
  decisions"): unavailable-UX copy, heatmap navigation exception, role/capability vocabulary, legacy gate
  retirement ownership. Only decision 1 (canonical navigation source) is resolved — Issue 5's locked
  catalog decision. Do not guess the others; they are not required to unblock PR 7.

---

## 4. Locked decisions made in this FRAME

### D1 — Build the measuring instrument first (overrides `g04b-nav-optimization-plan.md` §8)

**Decision:** `scripts/nav-metrics.mjs` ships as the first PR of this FRAME, before any contract code.

`g04b-nav-optimization-plan.md` §8 explicitly deferred this script to "a possible future FRAME," arguing it
"earns its keep starting around PR 7." **That deferral is overridden.** Brian approved the override on
15 Sep 2026.

**Why:** Carl's plan puts repeatable metrics at P0.5/P0.6 — *before* structural work — precisely so every
later PR reports before/after numbers instead of a hand-count. Our §3 baseline is a hand-count the plan
itself admits will be stale before use. Without the script, the anti-abstraction guardrail in D4 cannot be
enforced with evidence.

**Shape:** walks only the ~20 files named in `g04b-nav-optimization-plan.md` §3, by explicit path list (not
a glob), so a renamed or moved file is a visible failure rather than a silent gap. Reports per file: line
count, Live/Tier-C/Tier-D group, and live-importer count via a static import-graph pass (not a raw string
grep — that produces the known false-positive class). `--json` / `--out <file>` for machine-readable output.
Touches no application code.

### D2 — Classify by evidence tier before assigning any identifier

**Decision:** every route is classified before it earns a contract entry. Dead routes get a tier-D marker
and **no stable ID**.

Adapted from Carl's evidence tiers:

| Tier | Meaning here | Contract treatment |
|---|---|---|
| A | Live route with confirmed real usage | Full contract entry + stable ID |
| B | Registered in `AppRoutes.tsx`, reachable, usage unproven | Full contract entry + stable ID |
| C | Source exists, reachability unproven | Investigate before deciding — never a guessed ID |
| D | No live route, or reachable only via a broken double-hop redirect | Recorded as dead, no ID, no catalog entry |

**Why:** the recon already proved large tier-D populations — all 39 paths in `roleMenus.ts`, 14 of 18 in
`menu.ts`, 17 dead `/student/*` items. Assigning stable identifiers to all 479 route objects would encode
the mess into the new system. Issue 5's own staged map already requires this ("record every existing menu
destination as mapped, intentionally coming-soon, legacy redirect, or unresolved — never guess a
replacement for an unresolved path"); D2 makes it the gating step rather than a side-note.

### D3 — Pilot one route family end-to-end, not two foundations back-to-back

**Decision:** instead of "complete route contract → complete catalog → migrate consumers over months," take
one bounded route family the whole way through: contract entry → catalog entry → one real consumer reading
it → parity proof that the rendered menu is unchanged.

**Why:** `clean-architecture-refactor.md` was superseded for exactly the failure this avoids — assuming a
complete layer set reduces cost, without proving it on one slice first. Both of Carl's documents converge on
a single bounded pilot, and `lint-playwright-program.md`'s own G04-D independently picked `/dashboard/heatmap`
for the same reason. If the pattern is wrong, that surfaces after one family instead of after two finished
foundation modules.

**Family choice is deferred to RECON** (see §6 open item O1) — the pilot family must be picked on evidence,
not assumed. `/dashboard/heatmap` is the incumbent candidate per G04-D, but it has no approved navigation
lane, which makes it a poor proof for *catalog* work specifically.

### D4 — Anti-abstraction report required per PR

**Decision:** every PR in this FRAME reports, in its PR description:

- lines and files before/after;
- direct hand-copied route strings removed;
- duplicated rule sites removed;
- tests added or strengthened;
- **any new indirection introduced.**

Default expectation is net-negative or LOC-neutral. A net-positive PR requires an explicit reliability
justification (e.g. replacing duplicated authorization, adding runtime validation at an external boundary,
creating missing characterization coverage).

**Why:** PR 7 as originally scoped adds ~4 new files and removes nothing, with the first real deletion not
arriving until Issue 5 stage 5. That is a long net-add stretch with no evidence of benefit — the precise
pattern that got `clean-architecture-refactor.md` retired.

### D6 — Pilot family: Student Support Officer (`ssoSidebarConfig.ts` → `SsoSidebar.tsx`)

**Decision:** the pilot route family for D3/PRs 3–4 is the Student Support Officer sidebar.

**What it is:** 9 items across 2 sections ("Workspace", "Registers") plus a 2-item quick-access array
(`ssoQuickAccessItems`) drawn from the same underlying data. Single component consumer (`SsoSidebar.tsx`),
single role (Student Support Officer), reached through one `RoleSidebar.tsx` switch case. All 9 routes
confirmed live in `docs/quality/route-manifest.json`; recon already confirmed zero dead links.

**Why, over the alternatives checked:**
- `AdminSidebar` (553 lines, 4 shared roles) and `roleMenuConfigs.ts`/`EnhancedRoleSidebar` (565 lines,
  5 roles, two already coming-soon) are the only other live systems reachable from `RoleSidebar.tsx` — both
  9–10x larger and shared across multiple roles, too much surface for a first pilot.
- `SuperAdminNav` (372 lines, 46 items, single role) is 6x larger than SSO.
- `ExecutiveSidebar` (3 items, inline array, no config file, the smallest possible surface) was rejected as
  *too* trivial: no sections, no second consuming surface, and not one of Issue 5's five named catalog
  namespaces. Piloting on it would "pass" without proving the two things the catalog actually needs to
  prove — grouped presentation and one destination definition serving more than one surface without
  duplication.
- SSO is named as one of Issue 5's five locked catalog namespaces ("tenant Administrator, enhanced role,
  Student Support, SuperAdmin, external portal") — not an edge case outside the target model.

**Confirmed out of this pilot's blast radius:** `routeLabels.ts` has two SSO-adjacent breadcrumb entries
(`/dashboard/sso`, `/dashboard/sso/monthly-pack`) that don't exactly match `ssoSidebarConfig.ts`'s real
paths — a pre-existing, low-severity breadcrumb-label gap (backlog item 20 in `active-work.md`, found
during this recon), not a hard dependency. The breadcrumb system stays untouched by this pilot.

### D7 — ID format: hand-authored `namespace` + `id` fields, reviewed by an independent Opus pass

**Decision:** every route-contract entry carries two separate fields — `namespace` (one of Issue 5's five
locked catalog namespaces, e.g. `studentSupport`) and `id` (a hand-authored camelCase slug, e.g.
`students`, `atRisk`, `reportsRegister`). Both are chosen once by whoever authors the entry, deliberately
independent of the route's current path, component name, or file location. A build-time validator (already
required by Issue 5 stage 1: "reject duplicate IDs, unknown route IDs") enforces uniqueness of `id` within
a `namespace`, and the slug format `^[a-z][a-zA-Z0-9]*$` (camelCase, no dots, no nesting).

**Why not derive the ID from anything that already exists in the manifest:** verified directly against
`docs/quality/route-manifest.json` for the SSO pilot family —
- `order` is positional, shifts on any edit above it. Unstable.
- `path` isn't even unique today (17 duplicate resolved paths repo-wide, per the manifest's own
  `summary.duplicateResolvedPaths`), and deriving the ID from path defeats the reason an ID exists (must
  survive a path rename without consumer churn).
- `component` can be `null` (redirect-only routes) and isn't unique either — `SsoDashboard` alone renders
  three different paths (`/dashboard/student-support`, `/dashboard/sso/dashboard`, `/dashboard/sso/work-queue`)
  — corrected 16 Sep 2026, PR 3 recon; originally stated as two, verified against the manifest directly.
- `family` (e.g. `dashboard/sso`) is itself computed from the path prefix — same rename-fragility as path,
  one level up.

**Why hand-authored strings over a generated ID (hash/UUID):** at this scale — contract entries added a
handful at a time across many small, independently-reviewed PRs, not all 479 routes at once — a readable
slug is self-verifying in a diff and PR review; an opaque hash isn't, for no gained safety once the
uniqueness validator exists regardless.

**Independent review (Opus, adversarial pass, 15 Sep 2026):** endorsed the format, with one required fix
and two gaps that had to be settled before writing any contract entries — the SSO pilot family itself
contains live examples of both, confirmed against the manifest:

1. **`namespace` must be a separate field from `id`, not baked into a single dotted string.** If a
   destination legitimately moves between namespaces later, a combined string would force the ID itself to
   change — recreating the exact consumer churn the ID exists to prevent. Adopted as stated in this
   decision's field list above.
2. **Only real menu destinations get contract entries — not detail pages or redirects.** Verified against
   the SSO family: `/dashboard/sso/students/:studentName` (a per-student detail page, reached only by
   clicking through, never a menu item) and `/dashboard/sso/reports/new` (component `null` — a pure
   redirect) do not get IDs. The contract exists to fix the *menu* duplication problem; a page nobody picks
   from a menu is out of that problem's scope. If a later, separate need for tracking those arises, that's
   its own decision, not a default extension of this one.
3. **One underlying destination reachable from more than one menu entry gets one `id`, referenced by
   multiple catalog entries — not one ID per entry point — unless the shared component is only a
   coincidence of today's implementation and the destinations are genuinely meant to diverge later.**
   Verified live case: `SsoReportsHub` renders both `/dashboard/sso/reports` ("Reports", Workspace section)
   and `/dashboard/registers/sso-reports` ("Reports Register", Registers section) — two deliberately
   distinct, differently-labeled menu entries in the *same* sidebar, not an accidental overlap. The route
   contract's `id` answers "is this the same underlying page" (a plumbing fact — one door, one ID); the
   *menu catalog*, a separate later layer, is what lets two entries with their own label and section both
   point at that one ID (two signposts to the same door, not two keys). This is not a default merge of
   distinct-looking entries: if a shared component is only a temporary implementation shortcut and the two
   routes are on a roadmap to genuinely diverge (different data, different permissions, different future
   behavior), that's a real exception — two IDs, decided case by case on product intent, not on whether the
   code happens to be shared today. No case in the SSO pilot family currently meets that exception.

   **Added 16 Sep 2026, PR 3 recon — two corrections to this rule's own example:** `SsoReportsHub` actually
   backs four paths repo-wide, not two — `/dashboard/sso/packs-history` and `/dashboard/student-support/uploads`
   are the other two, but neither is a menu item in this pilot family, so they stay out of scope and don't
   change the rule. Separately, the SSO pilot family contains a **second, simpler shared-ID case this rule
   didn't originally name**: the two quick-access items (`ssoSidebarConfig.ts`'s `ssoQuickAccessItems` —
   "SSO Dashboard" and "Students") are exact path-*and*-label duplicates of two Workspace-section items, not
   merely same-component. They get the same one-`id` treatment as the `SsoReportsHub` case — more trivially so,
   since there's no divergent label/section to reason about, just a literal duplicate entry point. PR 3's
   execution packet should name both shared-ID cases explicitly.

### D8 — Contract field subset: three fields, everything else deferred to a named owner

**Decision:** each contract entry carries exactly three fields beyond `namespace`+`id` (D7) — corrected
16 Sep 2026, PR 3 recon: originally stated as four, but the table below has always had three rows and
no fourth field exists anywhere in this document or in `lint-playwright-program.md` §G04-B's original
wishlist that was left out of it. Verified by cross-checking every item in that original ~11-field
wishlist against this table plus the deferred-fields table further down — everything is accounted for
as locked-here or deferred-with-a-named-owner, with two exceptions carried to `active-work.md`'s
backlog as undecided rather than silently dropped: query/hash/`replace` redirect semantics, and
general "legacy aliases and exceptions" beyond the `legacyRedirect` classification value.

| Field | Consumer |
|---|---|
| Canonical path | The build-time validator and shadow-mode manifest generator (G04-C), to confirm the entry points at a real, currently-live route |
| Classification: `live` / `comingSoon` / `legacyRedirect` / `unresolved` | Issue 5 stage 1, verbatim: "record every existing menu destination as mapped, intentionally coming-soon, legacy redirect, or unresolved" |
| Redirect target (populated only when classification = `legacyRedirect`) | Same validator — gives a legacy-redirect entry a concrete destination instead of just a label |

**Note on scope of "redirect":** this classification is about a *menu destination's* fate (an old nav item that now just forwards somewhere else, tracked so nobody guesses a replacement) — it is not the same thing as a route that is itself a pure in-app redirect with no menu presence (e.g. `/dashboard/sso/reports/new`, `component: null`). The latter is excluded entirely by D7 decision 2 above; it never had a menu entry to classify.

**Everything else from `lint-playwright-program.md` § G04-B's original ~11-field wishlist is deferred**, each to a named reason, not a vague "later":

| Deferred field | Owner |
|---|---|
| Access class (public/authenticated/tenant/role/superadmin/etc.), UX capability/permission metadata | Owner decision 4 (role/capability vocabulary) — already locked out of scope, §3 |
| Navigation label, icon, group, visibility rule, canonical link | The navigation **catalog** layer (`g04b-nav-optimization-plan.md` PR 8+), not the contract — Issue 5 assigns these to the catalog, not the route contract |
| Breadcrumb/section facts | Same catalog layer, Issue 5 stage 4 (PR 12) |
| Test metadata (persona/environment/side-effect class) | The wider G04-C/D Playwright harness — no PR in this FRAME's Phase 1 consumes it |
| File/module, component, lazy-import path, layout/provider chain | **Deliberately never added, not merely deferred.** `scripts/generate-route-manifest.mjs` already derives these facts automatically from a real AST walk, with a `--check` mode that fails the build on drift. Hand-authoring a second copy would create exactly the "two systems that can silently disagree" problem this whole program exists to eliminate — confirmed by an independent Opus review, 15 Sep 2026, which read the generator script directly rather than taking the claim on faith |

**Independent review finding, applied as a fix to D7's validator (not a new field):** the same review, prompted by a direct question about whether structural fields belong in the contract, surfaced a real gap in the canonical-path field itself rather than in the fields being left out. Canonical path is the only link between a contract entry and its manifest row, and the manifest's own `summary.duplicateResolvedPaths` already lists 17 paths registered to two different route objects each. A path-based lookup can silently match the wrong row. Fix, folded into D7's validator: it must assert **exactly one** manifest row matches a contract entry's path — zero or two-or-more is a build failure, not a warning. For a genuine, confirmed two-match case, one optional `sourceModule` disambiguator field may be added by exception, never as a default. Separately, when a `legacyRedirect` entry's stated redirect target disagrees with what the manifest independently derives for that route, the validator reports a mismatch rather than assuming the hand-authored value is correct.

### D5 — Lightweight execution packet, with Carl's hard gate

**Decision:** each PR opens with a short packet naming: baseline SHA and branch; in-scope files/routes/
guards; the public behavior being frozen; the independent oracle proving it; expected before/after numbers;
explicit non-goals; PR-specific stop conditions.

**Hard gate, taken verbatim in spirit from Carl's contract:** *if the packet cannot name the affected public
behavior and an independent oracle, the candidate stays investigation-only.* For this FRAME the standing
oracle is the generated route manifest — `node scripts/generate-route-manifest.mjs --check` clean before and
after, with 479 route objects unchanged unless a diff is intentional and recorded.

---

## 5. Staged PR sequence

Strictly sequential. One family or one candidate per PR (Carl's change-size limits).

| # | PR | Scope | Gate to proceed |
|---|---|---|---|
| 1 | ✅ **MERGED — PR #1160** (`1c91b8032`, 15 Sep 2026) | `scripts/nav-metrics.mjs` + npm script only. No app code. | Verified against `grep` ground truth for 4 files, all exact matches; one real exclusion-logic bug caught and fixed during verification. Route manifest unchanged (479 objects). |
| 2 | ✅ **MERGED — PR #1166** (`0c215b959`, 15 Sep 2026) | `docs/quality/route-classification.json` — all 479 routes tiered (164 A, 313 B, 1 C, 1 D). Verified against `AppRoutes.tsx` directly, not just the manifest — caught and corrected one manifest-generator artifact (a pathless layout wrapper's null path displaying as `/`) that would have inflated tier C from 1 to 2. No contract code yet. | Every route in the manifest has a tier; tier-C items listed, not guessed. |
| 3 | ✅ **MERGED — PR #1191** (`9a296326c`, 17 Sep 2026) | `docs/quality/route-contract.json` (8 entries) + `scripts/validate-route-contract.mjs`. Shadow mode — no consumer wired up. | Manifest `--check` clean (479 routes unchanged); validator passes 8/8; every canonicalPath independently verified against the manifest before writing. |
| 4 | ✅ **MERGED — PR #1203** (`192ede473`, 17 Sep 2026) | `src/config/studentSupportNavCatalog.ts` (new) + `src/config/studentSupportSidebarAdapter.ts` (new) + `SsoSidebar.tsx` (one import-line swap) + `ssoSidebarConfig.ts` (trimmed to type/color exports only) + `tsconfig.app.json` (`resolveJsonModule`). Adapter resolves each entry's link from `route-contract.json` by `(namespace, routeId)` rather than duplicating it — one entry (`reportsRegister`'s Registers-section signpost) needed a narrow `pathOverride` exception since the contract only records one of its two real URLs. Folded in on request: fixed a pre-existing missing-`SheetTitle` accessibility gap in the same mobile `Sheet` (same gap confirmed still open in `AdminSidebar.tsx`, parked as `active-work.md` backlog item 31). | Verified via two new tests, not manual click-through: a data-parity test asserting the adapter's output exactly matches the pre-PR hand-authored config, and a render test proving `SsoSidebar.tsx` is wired to the adapter on both desktop and mobile paths. `nav-metrics` net -38 lines on tracked baseline; route manifest unchanged (479 objects). |
| 5+ | Remaining families, one per PR | Repeat 3–4 per family. | Previous family merged before the next starts. |

PR 7 in `g04b-nav-optimization-plan.md` §6 is superseded by PRs 3–4 above and should be re-pointed at this
document once this FRAME is approved.

---

## 6. Open items — resolve before implementation

- **O1 — ✅ DONE 15 Sep 2026.** Pilot family locked as Student Support Officer — see D6.
- **O2 — ✅ DONE 15 Sep 2026.** ID format locked as separate `namespace`+`id` fields, hand-authored,
  independently reviewed — see D7.
- **O3 — ✅ DONE 15 Sep 2026.** Field subset locked as path + classification + conditional redirect target
  (plus D7's `namespace`+`id`), everything else deferred to a named owner — see D8.
- **O4 — ✅ DONE 15 Sep 2026.** Cross-document pointers corrected so no door leads to a stale map:
  `lint-playwright-program.md`'s header (deleted branch, wrong worktree, superseded next-action) rewritten
  and marked "not the entry point"; `g04b-nav-optimization-plan.md`'s §8 deferral notice, §6 PR 7 row,
  §6 ordering note, and header all re-pointed here. Both now state that this document wins on conflict.

---

## 7. Stop conditions

Pause and return to investigation when:

- the proposed contract increases LOC materially without removing duplicated behavior;
- a supposed duplicate route/label has different permission, tenancy, or response semantics;
- the generated manifest diverges from the current one for a reason that cannot be explained and recorded;
- a route's reachability cannot be established (tier C) and an ID would have to be guessed;
- the branch base or worktree changes unexpectedly;
- resolving a blocker would require answering one of the four unresolved owner decisions.

---

## 8. Standing verification gates (every PR)

Run in this order, every PR, from PR 2 onward (PR 1 built the tool the third bullet needs — it has no
prior snapshot to diff against):

1. **Before touching any code:** `npm run nav-metrics` — this is the "before" snapshot for D4's
   anti-abstraction report below. If it exits 1 with "MISSING FROM BASELINE," stop and update the
   baseline list in `scripts/nav-metrics.mjs` first — don't proceed on a stale file list.
2. Make the change.
3. **Before opening the PR:** `npm run nav-metrics` again — this is the "after" snapshot. Diff the two
   outputs (line count, live-importer count per file) and put that diff directly in the PR description's
   anti-abstraction report (D4) — not a hand-estimate.
4. `node scripts/generate-route-manifest.mjs --check` — clean before and after.
5. Scoped `npm run lint` against touched paths only — never a whole-repo pass.
6. **Never** `npm run build`, bare `npm run type-check`, or speculative `tsc --build` (vacuous / hang
   risk). Vercel's build is the real gate.
7. `src/lib/utils/__tests__/forbiddenLayouts.test.ts` where the guarded page set is touched.
8. `ci-gate` skill before any commit, push, or PR.

**This list, not conversation memory, is what a future session follows.** If a session picks this FRAME
back up cold, §0 sends it here — this numbered sequence is the actual instruction, not a summary of one.
