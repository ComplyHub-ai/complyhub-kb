# Migration Repair — Orphaned Version Cleanup — Working Doc

> Replaces the previous drift-reconciliation working doc (Groups 5–13) — that work is complete
> (see `complyhub-kb/handoffs/` and PR #272 for its final state). This doc now tracks the
> `supabase migration repair` cleanup effort that unblocks `supabase db push`.

Last updated: 22 July 2026

---

## The problem

`supabase db push` fails for every migration, not just new ones, with:

```
Remote migration versions not found in local migrations directory.
```

**Root cause:** production's `supabase_migrations.schema_migrations` ledger contains thousands of
pre-June-2026 Lovable-era migration versions that were applied directly to the database with no
matching `.sql` file in git. The CLI requires every ledger version to have a matching local file
before it will push anything — so it refuses to push, for any migration, until this is resolved.

**Workaround used once (not sustainable):** applying two small PR #287 migrations by hand via the
SQL editor, then manually inserting matching ledger rows so the CI drift check treated them as
matched.

## The proposed real fix

`supabase migration repair --status reverted <version> <version> ...` against the orphaned
versions. **Metadata-only** — flips a status flag in the ledger table. Does **not** run any
DROP/undo SQL and does **not** touch the actual tables/functions those old migrations created.
Same tool already used for the PR #279 incident (see `rto-compass-hub/supabase/migrations/CLAUDE.md`).

This needs Carl/Dave sign-off before running — it's a repo-wide change to shared tooling behavior
affecting how the whole team applies migrations going forward, not a solo call.

---

## Cons / risks considered before proceeding

The operation itself (`migration repair`) only ever writes to `schema_migrations` — no DDL, no data
changes, no tables/functions/RLS touched. The real risk is entirely in **getting the version list
right**, not in the mechanics of the command:

1. **Wrong versions in the list** — if a version that should still be tracked (e.g. has a real file
   under a different name/timestamp) gets marked `reverted`, it becomes a permanent blind spot.
2. **Interaction with in-flight reconciliation work** — running the repair against a stale snapshot
   while reconciliation files are still being written risks orphaning records against each other.
3. **Effectively irreversible in practice** — technically flippable back via `--status applied`, but
   redoing that correctly for thousands of rows from memory is its own error source.
4. **Blast radius beyond `db push`** — anything else reading `schema_migrations.status` (branch DB
   creation, CI drift-check, internal tooling) could behave differently afterward.
5. **Scale amplifies mistakes** — one bad range/filter on a batch this size turns a one-time fix into
   a fresh investigation.
6. **No rollback drill** — if it doesn't fully solve the problem, trust and time are spent for a
   partial fix.
7. **Timing/concurrency** — should run in a quiet window, not while others are pushing or provisioning
   branch DBs.

**Mitigations applied:** fresh list pulled at repair time (not from memory/old docs), explicit
exclusion of in-flight reconciliation items, independent Carl/Dave sign-off on the actual list (not
just the concept), a test push on one trivial migration immediately after, and full documentation of
the exact command + version list used, timestamped, for future reference.

---

## Audit — round 1 (via Cursor, read-only)

Verified live against production `supabase_migrations.schema_migrations`, 22 July 2026, current
branch `main`. Nothing applied, pushed, repaired, or written to the repo.

**⚠️ Headline: do NOT mark ~3,608 reverted.** That historical estimate was too blunt. The verified
safe set is **3,105** versions, not ~3,608 — the gap (~679) is dangerous-to-blanket-revert named
migrations, not rounding.

### Raw numbers

| Source | Count |
|---|---|
| Production `schema_migrations` rows (total) | 3,924 |
| — excluding the `00000000000000` baseline pseudo-row | 3,923 |
| Local top-level `.sql` files (excl. `_archive/`) | 351 |
| Local files with no exact-version match in production | 211 |

### Matching method matters — three methods disagree

| Method | Orphans | Meaning |
|---|---|---|
| A. ±120s window | 3,691 | Prod version with no local file within ±120s |
| B. Exact-version (what `db push`/`repair` actually key on) | 3,784 | Prod version with no local file of that exact version |
| C. Canonical drift-check (`migration-drift-check.yml`) | 613 named | Prod row whose version/name matches no file, excluding blank + Lovable-UUID names |

### Composition of the 3,784 exact-version orphans

| Bucket | Count | Version range | Verdict |
|---|---|---|---|
| Blank / NULL name | 3,105 | 2025-07-17 → 2026-06-25 | ✅ SAFE candidate |
| Lovable-UUID name | 16 | 2026-07-06 → 2026-07-16 | ⚠️ FLAG — recent auto-apply duplicates |
| Descriptive name | 663 (319 pre-June, 344 June+) | 2026-06-05 → 2026-07-20 | ⛔ FLAG — reconciliation near-misses / double-stamps / recent real work |

### Why 3,608 vs 3,105

The real safe set (blank-name only) is ~503 lower than the historical estimate. The historical
number was almost certainly an all-orphans figure taken earlier; the all-orphans number is actually
*higher* today (3,691–3,784) because more named drift has accumulated since — 344 named orphans are
dated June 2026 or later. The conservative, correct number is the blank-name-only set: unambiguously
applied directly by Lovable, no file, no name, ever.

### Explicitly excluded from the safe set

- **16 Lovable-UUID-named rows** (all July 2026) — recent auto-apply duplicates, human review needed:
  `20260706214829 20260706220637 20260707014842 20260707015736 20260708060308 20260708071128
  20260708072733 20260709015857 20260709025124 20260709031143 20260709032947 20260709033942
  20260709041819 20260709075858 20260715031823 20260716012333`
- **663 descriptively-named orphans** (344 June+, 319 pre-June) — content exists in repo under a
  different version (reconciliation near-misses/double-stamps) or is genuinely recent work, e.g.
  `20260720034638 fix_get_survey_results_text_samples_plain_strings`,
  `20260720032436 sa_extend_trial_v2_reject_paid_subscribers`,
  `20260720013845 fix_aot_engine_authorization_patch_crlf`,
  `20260718074007 set_security_invoker_on_validation_dashboard_views`, and the July 15–17 batch.

### Round 1 recommendation

Scope the repair to the 3,105 blank-name versions only. Exclude the 16 UUID + 663 named rows —
route those through the existing `.drift-baseline.txt`/reconciliation process. Dave to confirm the
42 blank-name rows dated 1–25 June (right at the discipline cutover) are genuinely Lovable-era.

Full 3,105-version list captured live in Cursor's query output (spooled to a file outside the repo —
see Round 2 §4 for path/confirmation); not inlined here.

---

## Audit — round 2 addendum (via Cursor, read-only)

Closed two gaps left open by round 1: the "reconciliation rows can't overlap" claim was asserted by
logic, not verified; and the June cutover rows needed real SQL content, not just dates.

### 1. Baseline diff — PASS

Machine-diff of all 517 `.drift-baseline.txt` version|name pairs against the 3,105-version safe set:
**0 overlap.** Confirms the "no reconciliation/baseline row can share a version with a blank-name
orphan" inference against live data.

### 2. Spot-check (10 versions across the full date range) — 1 flag

| Version | Timestamp | SQL summary | Flag |
|---|---|---|---|
| `20250717071103` | 2025-07-17 07:11:03 | Creates `entry_type`/`evidence_type`/`review_cycle`/`gov_status` enums + `gov_register` table | **FLAG** — structurally significant governance DDL, not throwaway noise |
| `20250901010611` | 2025-09-01 | `sa_add_existing_user_to_tenant` patch | — |
| `20251104005601` | 2025-11-04 | `admin_create_trial_tenant` qualified `gen_salt` fix | — |
| `20260101232624` | 2026-01-01 | Bulk RLS policies on lookup tables | — |
| `20260301042013` | 2026-03-01 | `sa_list_plan_prices`/`sa_update_plan_price` RPCs | — |
| `20260401012621` | 2026-04-01 | Release-note data seed | — |
| `20260501065017` | 2026-05-01 | `trainer_credentials` RLS fix | — |
| `20260609084505` | 2026-06-09 | Widen 9 `sa_*` RPC guards to accept Consultant role | — (June cutover window) |
| `20260617055555` | 2026-06-17 | Widen `invite_user`/`rpc_invites_create` guards (Phase 3b §3.7) | — (June cutover window) |
| `20260625034441` | 2026-06-25 | `risk_register.governance_link` column type change | — |

**Verdict:** `20250717071103` is real governance schema, not disposable noise. `reverted` is
ledger-only and won't roll back the live schema — but marking it reverted means this piece of
governance schema has zero git history unless reconciled first. Nine of ten samples matched expected
Lovable-era hotfix/RLS/data-seed pattern.

### 3. June 2026 cutover — 42 rows, for Dave (data only, no judgment applied)

Full list of blank-name safe-set versions dated 2026-06-01 → 2026-06-25 with SQL summaries — see
Cursor's original output for the complete 42-row table. Notable clusters:

- Rows 8–16 (`20260616024751` → `20260616081455`) read as a deliberate incident-recovery sequence
  ("Phase 0.5x" — search_path widening, function restoration, sentinel sweeps).
- Rows 35–36 (`20260623003952`, `20260623004628`) are one-off named-user data patches
  (`angela@vivacity.com.au`).
- Rows 39–41 (`20260625002550/004055/004352`) are three rapid iterations of
  `add_consultant_to_consulting_org()`.

Whether this cluster is Lovable stragglers vs. intentional unnamed cutover work is for Dave's review.

### 4. Artifact location — CONFIRMED SAFE

| Item | Detail |
|---|---|
| Path | `/Users/khiansismundo/.cursor/projects/Users-khiansismundo-complyhubworkspace/agent-tools/15f79da5-2ca3-46e6-b06e-1a0c9ea643e6.txt` |
| Size | 46 KB |
| Inside `rto-compass-hub/`? | No — Cursor project metadata |
| Git status | Untracked; `complyhubworkspace/` itself is not a git repo |

### Round 2 verdict

| Check | Result |
|---|---|
| Baseline diff | PASS (0 overlap) |
| Spot-check | PASS with 1 awareness flag (`20250717071103`) |
| June 42-row list | Delivered — Dave review pending |
| Artifact | Confirmed outside repo |

No changes to the proposed 3,105-version safe set based on these checks.

---

## Recommendation — tiered rollout (senior-dev judgment call)

Rather than one blanket action:

**Tier 1 — run now (3,063 versions):** the 3,105 safe set minus the June 42 and minus
`20250717071103`. Unambiguous Lovable-era noise (patches, RLS, seed data, one-off fixes). Two
independent verification passes agree; nine of ten spot-checks are boring. Safe to run today — every
week of delay keeps `db push` broken for the whole team with no corresponding reduction in risk.

**Tier 2 — the June 42, fast follow-up (this week, not blocking Tier 1):** hand Dave the 42-row
table, one question — "any of these ring a bell as intentional work?" Likely resolves in minutes for
most rows; the Phase 0.5x cluster (rows 8–16) is the one genuinely worth his attention.

**Tier 3 — `20250717071103`, handle before reverting (cheap, ~20 min):** write a proper
reconciliation migration file capturing this governance-schema DDL (same pattern as the 13-item PR
#272 reconciliation), then mark the ledger row reverted alongside it. This is the one item where
waiting costs something real — once it's buried among thousands of reverted rows, nobody will single
it out again. Not worth ceremony on all 3,105 for this — just this one.

**Standing practice for the actual run:** whoever executes `migration repair` should first paste the
final, Carl/Dave-approved version list into a timestamped file in `complyhub-kb/audit/` — not just
leave it in a chat log — so the reasoning is recoverable later without re-deriving it.

---

## Open items

- [ ] Carl: reconcile `20250717071103` first, or accept it stays permanently unreconciled?
- [ ] Dave: confirm June 42 (especially rows 8–16, the Phase 0.5x cluster, and rows 35–41) are safe
      to include or should be pulled out and handled separately.
- [ ] Once both answered: run Tier 1 (3,063 versions) in a quiet window, verify `git status` clean
      before/after per the workspace's standing gate, confirm a trivial test migration pushes cleanly
      afterward, then document the exact command + list used in
      `complyhub-kb/audit/` and update `rto-compass-hub/supabase/migrations/CLAUDE.md` with the
      resolution.
- [ ] Tier 2 and Tier 3 follow-ups once sign-off lands.
