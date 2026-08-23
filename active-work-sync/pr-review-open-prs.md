# Open PR Review — rto-compass-hub

> Last synced/reviewed: 23 August 2026 (Asia/Manila)

## Executive summary

GitHub currently reports 31 open PRs. The previous version of this document was stale and covered only #571, #561, and #572; none of those are currently open.

The dominant risk is migration drift and stacked-branch ordering:

- Most migration PRs report `Migration drift check: fail`.
- Many report `Supabase Preview: fail` or `skipping`. Repository rules already document a broad production-ledger drift problem, so this is not proof that every PR's SQL is wrong.
- The Supabase MCP production connection was unavailable during this review (`USER_NOT_LOGGED_IN`). Claims that a migration is already deployed remain unverified until `list_migrations` and targeted object queries succeed.
- Reconciliation PRs must not be applied to production again. After merge, verify the exact migration `version` + `name` ledger row only.
- New migrations must be applied after merge using the documented interim procedure: execute the exact SQL from `main`, verify the object/data change, then run `supabase migration repair --status applied <version>`. Never use `apply_migration` for a file that exists in Git.

## Recommended merge order

This is a review order, not approval to merge.

1. **Security:** fix/review #701, then #584, then #698. #701 is draft and blocked; all three need explicit gate resolution.
2. **Governance reconciliation chain:** #644 → #653 → #655 → #659 → #665 → #666 → #671.
3. **Form Campaign chain:** #691 → #695. Do not merge #694 as-is; it duplicates migrations from the preceding chain.
4. **DAP:** prefer #685 → rebased #693. Do not merge #683 and #693 together without resolving their duplicate lifecycle/product-type migrations.
5. **TAS stack:** #631 → #633 → #635 → #639 → choose/rebase #645 and/or #650.
6. **Independent TAS/DAP work:** #606, #625, #648, #688, #692, then #599 after reconciling its AOT overlap with #650.
7. **Hold #629** until its Vercel failure and core RBAC/RLS review are resolved; review #604 alongside it.

## Per-PR review

### Security

#### #701 — `fix(security): authorize TAS licensing decision RPCs`

- **Disposition:** urgent, but do not merge yet. Draft; `Supabase Preview` and migration drift fail.
- **Review:** hardens the two sibling `SECURITY DEFINER` licensing write RPCs, checks tenant context, roles, support-mode writability, write locks, target existence, and anonymous execution.
- **Fix before merge:** replace deprecated `auth.role()` and the `profiles.role` super-admin authorization branch with the current canonical authorization helper; confirm the service-role bypass is restricted to trusted callers; add/run authenticated cross-tenant and removed-membership tests. Existing tests are mainly source-shape tests.
- **Production:** new migration `20260823120000_harden_tas_licensing_decision_rpc_auth.sql`; apply after merge and repair/verify this exact ledger version.

#### #584 — `fix(security): fail-closed membership on SSO snapshot and Re-detect RPCs`

- **Disposition:** high priority; rebase and validate before merge. Migration drift fails; Preview is skipped.
- **Review:** changes stale profile-role/tenant authorization in SSO snapshot/suggestion RPCs and related governance grants. High blast radius because it changes `SECURITY DEFINER` RPC behavior.
- **Fix before merge:** inspect every changed RPC against its current production definition; test active membership, removed membership, NULL roles, tenant switching, and legitimate support/admin paths; confirm no grant was removed from a real caller.
- **Production:** new migrations `20260821120000`, `20260822060000`, and `20260822061500`; apply in filename order after merge and repair/verify each exact ledger row.

#### #698 — `fix: remediate project security review findings`

- **Disposition:** high priority; rebase and review before merge. Behind; Preview and migration drift fail.
- **Review:** broad security remediation touching Mailgun Edge Functions, governance grants/wrappers, Driver Diagnostic audit/deletion behavior, and finalisation guards.
- **Fix before merge:** review the full Edge Function invoke/auth graph; verify Mailgun authentication is not confused with service-role authorization; inspect all callers of restricted RPCs; confirm deletion audit integrity; run regression tests and changed-file lint.
- **Production:** new migration `20260823081856_remediate_security_review_findings.sql`; apply/verify after merge and deploy/verify changed Edge Functions.

#### #699 — `Harden Driver Diagnostic persistence and server invariants (#697)`

- **Disposition:** hold for full security/workflow review; rebase first. Draft/behind; Preview and migration drift fail.
- **Review:** adds a client persistence state machine, flush-on-navigation/unmount behavior, confirmation gating, Sydney-quarter handling, audit uniqueness/actor snapshots, confirmed-history locks, and workflow RPC invariants. This is a large cross-layer change with both data-loss and authorization risk.
- **Required:** test rapid dimension navigation, unmount during save, retry/error recovery, stale browser tabs, quarter-boundary dates, duplicate open assessments, confirmed-row updates, divergence rationale, active-tenant equality, and finalisation with unsaved drafts. Review all three `SECURITY DEFINER` RPC migrations against current helper definitions; ensure the unique index can be created against existing duplicates and that audit/user deletion behavior preserves required history.
- **Production:** new migrations `20260823094500`, `20260823094600`, and `20260823094700`; apply in filename order after merge and repair/verify each exact ledger version.

### Governance chain

These branches are stacked and/or reconcile direct-to-production work. Do not merge a later consolidated branch that repeats earlier migration files.

#### #644 — `Reconcile 22 Aug Governance production migrations`

- **Disposition:** first in Governance chain, after rebase and exact-ledger verification. Migration drift fails.
- **Review:** reconciliation-only PR for four migrations claimed already present in production.
- **Required:** compare SQL and ledger identity; ensure no unrelated files remain; rebase onto current `main`.
- **Production:** do not reapply SQL; verify `20260822053115`, `20260822055410`, `20260822062357`, and `20260822062831`.

#### #653 — `Reconcile Wave 0F Governance meeting RPC migration`

- **Disposition:** second, after #644. Unstable; migration drift fails and Preview is skipped.
- **Review:** reconciliation-only `20260822065343_close_core_governance_meeting_rpcs_batch_2`.
- **Required:** verify exact production SQL/ledger identity and that no duplicate history is inherited.
- **Production:** do not reapply; verify the exact ledger row after merge.

#### #655 — `Fix Governance Support Mode write enforcement`

- **Disposition:** third, after #653. Stacked.
- **Review:** adds support-session writability, break-glass semantics, tenant scoping, and closes a legacy meeting RPC.
- **Required:** test readonly/writable support sessions, break-glass expiry/authorization, ordinary users, and cross-tenant calls; confirm explicit overload grants.
- **Production:** new migrations `20260822074000` and `20260822074200`; apply/repair/verify after merge.

#### #659 — `Close legacy Governance RPC callers and grants`

- **Disposition:** fourth, after #655. Stacked.
- **Review:** removes an unused legacy hook caller and closes public execution on a legacy RPC; the PR correctly identifies a data-loss risk from mapping partial settings to a full-settings RPC.
- **Required:** prove no runtime consumers remain and that active settings paths still work.
- **Production:** new `20260822074500_close_legacy_governance_rpc_public_grants.sql`; apply/repair/verify.

#### #665 — `Reconcile Wave 0F follow-up hardening`

- **Disposition:** fifth, after #659. Reconciliation only.
- **Review:** mirrors `20260822074656_harden_wave_0f_legacy_rpc_grants_and_comment`, reportedly already applied.
- **Production:** do not reapply; verify exact version/name after merge.

#### #666 — `Wave 0G: close Governance decision and action authorization`

- **Disposition:** sixth, after #665. Reconciliation/authorization boundary.
- **Review:** closes decision/action RPC authorization under the 11-role contract.
- **Required:** test Governing Person, Regulatory Officer, Executive, Administrator, Compliance Manager, Consultant, and support-mode paths across every write operation; inspect all function overload grants.
- **Production:** body claims `20260822103643_close_governance_decision_action_rpcs_wave_0g` is already applied; do not reapply, verify only.

#### #671 — `Fix Governance Wave 0G regeneration semantics`

- **Disposition:** seventh, after #666. Clean merge state.
- **Review:** forward-only correction for complaint-category uniqueness and regeneration created/updated counts.
- **Required:** run regeneration twice; confirm separate categories are not overwritten and the second run reports updates; inspect handling of pre-existing conflicts.
- **Production:** new `20260822111500_fix_governance_wave0g_regeneration_semantics.sql`; apply/repair/verify.

#### #691 — `Wave 0H: close Form Campaign Governance authority`

- **Disposition:** after #666 (and preferably #671 if object overlap is confirmed). Preview is skipped.
- **Review:** four Form Campaign authority/transition/RLS migrations plus frontend role gates.
- **Required:** verify all four production ledger claims; test operational handoff versus Governance decision authority, completed-campaign bypasses, and tenant correlation.
- **Production:** body says these are already applied; do not reapply, verify ledger rows only.

#### #695 — `Wave 0I: harden Form Campaign finding Governance handoff`

- **Disposition:** after #691; do not merge independently. Migration drift fails.
- **Review:** three follow-up migrations, reportedly already applied; tenant-correlation policy fix is security-sensitive.
- **Required:** verify exact SQL/ledger rows; test cross-tenant parent correlation and operational-to-Governance handoff; ensure missing-policy guards behave correctly on a fresh branch DB.
- **Production:** reconciliation only; do not reapply.

#### #694 — `Security/wave 0i form campaign finding handoff`

- **Disposition:** do not merge as structured; use #691 → #695 or reduce this branch to unique content.
- **Review:** repeats migrations from #644, #665, #666, #691, and #695 while targeting `main`; this creates duplicate migration history/replay risk. It is behind and migration drift fails.
- **Required:** close as superseded or remove every migration already represented by the selected chain. Do not solve this by renaming files.

### DAP

#### #685 — `feat(dap): readiness engine foundation`

- **Disposition:** preferred DAP foundation, after rebase. Preview fails.
- **Review:** pure readiness engine, tests, and a review panel; lower DB risk than #683/#693.
- **Required:** verify advisory findings cannot become activation blockers, and the panel is not treated as authoritative approval before the server gate exists.
- **Production:** none directly.

#### #683 — `fix(dap): Phase 0 compliance containment`

- **Disposition:** likely superseded by #693; do not merge before comparison.
- **Review:** has lifecycle/product-type migrations `20260823062200` and `20260823062300`; #693 has semantically similar migrations at `20260823063236` and `20260823063258`, plus more hardening.
- **Required:** compare SQL and choose one canonical path. Prefer #685 → #693 if #693 fully contains the intended containment.
- **Production:** only the selected migration set may be applied; verify direct-production claims first.

#### #693 — `feat(dap): governed assessment and workforce readiness foundation`

- **Disposition:** after #685, only after resolving #683 overlap and rebasing. Preview and migration drift fail.
- **Review:** eight migrations for lifecycle, product type/data, readiness gates, trainer identity/backfill, assessment tools, and workforce readiness; high blast radius and includes backfill.
- **Required:** validate backfill guards, fresh-branch behavior, RLS/indexes, lifecycle transitions, and trainer identity uniqueness.
- **Production:** apply selected migrations in filename order, verify each change, then repair each exact ledger version.

### TAS stack and independent TAS work

The intended stack is #631 → #633 → #635 → #639. #645 and #650 are based on that stack and share a migration; the final history must contain that migration once.

#### #631 — `TAS Sprint 8: make ComplyHub the TAS authoring and export source`

- **Disposition:** first in TAS stack; high regression risk. Behind; Preview and migration drift fail.
- **Review:** replaces over 1,000 lines of legacy client document generation with persisted draft sections and compiled export.
- **Required:** test required/partial drafts, product types, tenant selection, edit persistence, export/download, legacy data, and the visible `as any` casts in the changed component; run focused E2E/export QA.
- **Production:** new `20260822053500_allow_tas_draft_generation_without_assurance_gates.sql`; apply/repair/verify once.

#### #633 — `TAS Sprint 9: connect operational module signals`

- **Disposition:** after #631. Preview and automerge fail.
- **Review:** read-side operational signals for assessment tools and validation.
- **Required:** tenant-scope counts, preserve advisory/non-blocking semantics, test empty registers/missing units, resolve failed checks.
- **Production:** inherits #631 migration; no duplicate copy.

#### #635 — `TAS Sprint 9 follow-up: link third-party governance to register`

- **Disposition:** after #633. Preview and automerge fail.
- **Review:** adds create/link behavior against canonical `third_parties`.
- **Required:** test duplicate names, tenant scoping, permissions, error/retry handling, and cross-tenant linking.
- **Production:** no migration beyond inherited #631 migration.

#### #639 — `TAS Sprint 9 follow-up: connect TAS to continuous improvement`

- **Disposition:** after #635; dirty and failing Preview/automerge.
- **Review:** adds write-side CI integration and assumes `ci_register` is canonical.
- **Required:** rebase; verify idempotent tenant-scoped writes, permissions, retries, and stale register references.
- **Production:** inherited #631 migration only.

#### #645 — `TAS Sprint 10: keep authoring available while assurance work continues`

- **Disposition:** after #639; compare with #650. Migration drift fails.
- **Review:** shares many TAS builder files and the #631 migration; keeps authoring available while assurance is advisory.
- **Required:** resolve overlap with #650, verify authoring versus final approval gates, and remove duplicate #631 migration from final history.

#### #650 — `TAS Sprint 10: fix standalone-unit AOT baseline and breakdown`

- **Disposition:** after #639; choose/rebase with #645. Unstable.
- **Review:** fixes standalone-unit AOT baseline/breakdown and adds prerequisite hardening.
- **Required:** test qualification, skillset, standalone-unit, zero-breakdown, mismatch, reload, and repeated-save cases; ensure standalone units do not require qualification/AQF fields.
- **Production:** new `20260822073000` and `20260822073100`; apply/repair/verify; apply inherited #631 migration only once.

#### #625 — `TAS Sprint 8: align final compiled version with approval readiness`

- **Disposition:** independent but high risk; dirty and migration drift fails.
- **Review:** changes final compile RPC semantics, assurance blockers, AOT requirements, rationale source, and output sections.
- **Required:** compare RPC with current production definition using content history/live definition; test standalone versus qualification output, missing sections, approval state, and export reproducibility.
- **Production:** new `20260822045800_align_final_tas_compile_with_approval_readiness.sql`; apply/repair/verify.

#### #606 — `TAS Sprint 2: advisory assurance and validation separation`

- **Disposition:** independent but semantically interacts with #625/#631. Behind; migration drift fails.
- **Review:** turns validation into advisory assurance and adds market-consultation presence/repair migrations.
- **Required:** verify structural phase completion remains enforced, hooks are read-only, repair migrations are idempotent, and compile semantics are reconciled with #625.
- **Production:** apply four migrations in filename order and repair/verify each.

#### #648 — `Fix DAP workplace contextualisation for First Aid`

- **Disposition:** low/medium-risk UI change; rebase and resolve Preview.
- **Review:** searchable multi-select and broader First Aid contexts.
- **Required:** test existing single values, save/reload, empty selection, keyboard/search, and non-First-Aid products. No migration listed.

#### #688 — `TAS: simplify Learner summary without background writes`

- **Disposition:** independent UI fix; rebase and resolve Preview.
- **Review:** removes background writes and keeps learner inputs user-owned.
- **Required:** test remount, failed reads, reload, explicit save, navigation away, and stale generated summaries.

#### #692 — `TAS: remove duplicate phase navigation and simplify footer`

- **Disposition:** independent UI cleanup; rebase and resolve Preview.
- **Review:** removes competing navigation and simplifies footer.
- **Required:** test every phase, previous/next/save/complete behavior, deep links, mobile/keyboard navigation, and unsaved-change protection.

#### #599 — `TAS: editable planned AOT hours`

- **Disposition:** high-risk AOT contract; reconcile with #650 first. Behind; Preview and migration drift fail.
- **Review:** editable planned hours, preserved benchmark evidence, rationale requirements, support-mode guards, pack-shape backfill, and final determination.
- **Required:** compare all AOT RPC/function definitions with #650; test qualification/skillset/standalone/legacy packs, repeated save, rationale, readonly/writable support mode, and evidence preservation.
- **Production:** six migrations (`20260822075500`, `20260823082100`, `20260823083000`, `20260823083100`, `20260823084500`, `20260823084600`) in filename order, after verifying none were already applied.

### RBAC

#### #604 — `Wave 0A: RBAC safety and canonical tenant roles`

- **Disposition:** foundational, but hold for review with #629. Dirty/behind; Preview and migration drift fail.
- **Review:** changes the canonical 11-role contract, routes, effective-role handling, and capability drift.
- **Required:** test all canonical roles, unknown-role fail-closed behavior, tenant switching, and support mode; reconcile its migration with #644/#694.
- **Production:** `20260822053115` is duplicated in #644 and #694; choose one canonical path and verify ledger identity.

#### #629 — `Wave 0C/0D: close core Governance authorization`

- **Disposition:** hold. Dirty/behind; migration drift fails, Preview is skipped, and Vercel fails.
- **Review:** changes core Governance route guards, role contracts, read-only context, and RLS authorization; very high blast radius.
- **Required:** fix Vercel; rebase onto the selected RBAC/reconciliation base; test all 11 roles, support mode, tenant switching, redirects, read-only behavior, direct RPC/table access, and current role helper definitions.
- **Production:** `20260822055410` is duplicated in #644 and #694; choose one reconciliation path, never apply duplicate copies.

## Migration register and duplicate warnings

### Reconciliation-only (do not reapply SQL)

- #644: `20260822053115`, `20260822055410`, `20260822062357`, `20260822062831`
- #653: `20260822065343`
- #665: `20260822074656`
- #666: `20260822103643`
- #691: `20260823072533`, `20260823074222`, `20260823080426`, `20260823080830`
- #695: `20260823081423`, `20260823081445`, `20260823084239`

- #694 repeats many of these and should not merge without being reduced to unique content.

### Important overlap

- #683 and #693 contain semantically duplicated DAP lifecycle/product-type migrations under different timestamps.
- #631, #639, #645, and #650 carry `20260822053500`; final history must contain it once.
- #604, #644, and #694 carry `20260822053115`.
- #629, #644, and #694 carry `20260822055410`.
- #644/#694 carry `20260822062357` and `20260822062831`.
- #653/#694 carry `20260822065343`.
- #665/#694 carry `20260822074656`.
- #666/#694 carry `20260822103643`.
- #691/#694/#695 overlap on Form Campaign migrations.
- #606 and #599 both contain timestamps `20260823083000` and `20260823083100` for different purposes. Resolve this timestamp collision before merge; two unrelated migrations cannot safely share a version.

## Limitations and next gate

- GitHub state was queried live on 23 August 2026: open PRs, branches, mergeability, changed files, migration filenames, PR bodies, and check buckets.
- Production Supabase verification was attempted but the connector was unauthenticated. Re-run `list_migrations`, targeted object queries, and Edge Function drift checks before treating any “already deployed” claim as fact.
- No code in `rto-compass-hub` was changed, committed, pushed, merged, or commented on. Only this workspace-level review document was updated.
- Before any merge: verify the branch, re-run scoped lint/tests, perform the migration-ledger comparison, check Edge Function drift where applicable, and get an explicit decision on how to handle the universal Preview/migration-drift failures.
