# Audit — PRs #323–#326: Staging → Main Catchup + Document RPC Hardening (30 July 2026)

**Date:** 30 July 2026
**Branches:** `feat/staging-catchup-batch1`, `fix/document-rpc-tenant-authz-atomicity`, `chore/regenerate-supabase-types`, `fix/document-rpc-grace-tenant-write-block` (all deleted post-merge)
**PRs:** [#323](https://github.com/ComplyHub-ai/rto-compass-hub/pull/323), [#324](https://github.com/ComplyHub-ai/rto-compass-hub/pull/324), [#325](https://github.com/ComplyHub-ai/rto-compass-hub/pull/325), [#326](https://github.com/ComplyHub-ai/rto-compass-hub/pull/326)
**Merge commits:** `a80328fc3` (#323), `3d5f42d1b` (#324), `f15e3d87d` (#325), `91cb46917` (#326)
**Living doc retired:** `staging-to-main-catchup.md` (workspace root) — kept in place for now per Brian's instruction, to be deleted once he confirms
**Origin:** `/audit-branch-drift` run 29 Jul 2026 — a deliberate, careful pick-and-port exercise bringing `origin/staging` (Lovable/RJ's direct edits, 26 commits not on `main`) into `origin/main` (370+ commits not on `staging`), item by item, never a bulk merge.

---

## Purpose

Close out an 11-item staging/main reconciliation, plus two items discovered mid-catchup that were deliberately kept out of the main batch and shipped on their own branches: a live cross-tenant authorization gap in a documents RPC (Item 10), and a Cursor Bugbot-flagged regression in that same fix (its own follow-up).

---

## What was implemented

### PR #323 — `feat/staging-catchup-batch1` (bulk of the catchup)

- **Item 1 — Trial signup page redesign.** Ported staging's six-section marketing landing page on top of main's independently-rewritten `DemoSignup.tsx` (not a wholesale swap). Fixed while porting: kept main's crypto-secure `secureId()` temp-password fallback over staging's weaker `Math.random()` version; swapped `font-heading` → `font-anton` on all headings to match brand typography; corrected `FaqSection.tsx`'s integration claim (aXcelerate and VETtrak confirmed real; PowerPro and Accelerate confirmed non-existent, removed from the copy); re-enabled Google sign-up.
- **Item 4 — Document approval-date fix + bulk-delete async fix.** `EditDocumentModal.tsx`: stopped every routine metadata edit of an already-approved document from silently re-stamping `approved_at` to today. `useBulkDeleteDocuments.ts`: wrapped `deleteDocumentFiles` in an async closure so it's properly awaited.
- **Item 5 — SSO/QI hook type-cast fixes only.** Ported 3 low-risk type-cast tweaks; all 3 accompanying staging migrations deliberately **not** ported — one would have regressed a stronger live guard on `sa_extend_trial_v2` (staging's version only checked billing/subscription status; production's independently-shipped version also checks diamond-tenant status, `paid_through_date`, and lifecycle status), the other three were already fully satisfied in production.
- **Item 6 — Six small type-cast tweaks batch.** Pure type-level casts, zero runtime behavior change, no conflicts with main.
- **Item 9 — Placement supervisor invite membership check.** Already identical on both branches; no port needed.
- **Item 11 sub-items 1–7 — Checker-review follow-ups**, folded into the same PR: banned-pattern cleanup (`console.error` → `logger`), UTC-vs-`Australia/Sydney` date bug in `todayIso`, a dead variable/misleading comment, inline hex colors swapped for Tailwind brand tokens across all six new trial-signup sections, a magic-string `#signup` anchor extracted to a shared constant with a `logger.warn` fallback, leftover slate-gradient backgrounds swapped to `bg-white`, and a redundant null-check removed.
- **Items 2, 3, 7, 8 — no port needed in this PR** (see below).

### PR #324 — `fix/document-rpc-tenant-authz-atomicity` (Item 10)

**What was wrong (confirmed live 30 Jul 2026):** `rpc_update_document_register_fields` is `SECURITY DEFINER` (bypasses RLS) but performed no authorization check of its own beyond confirming `auth.uid()` was not null. Any authenticated user could call it directly, bypassing the UI entirely, and edit any document in any tenant. Found independent of anything staging introduced, while diagnosing Item 4's approver-identity bug.

**Related bug in the same function:** the approver-identity write (`approved_by`/`approved_by_uuid`) happened via a separate direct-table `UPDATE` after the RPC succeeded. That write could silently no-op — not because `docs_reg_update` RLS blocks Consultant/Consultant Assistant (it doesn't; `sec.has_tenant_role` auto-expands `'Administrator'` to include both), but because `restrict_select_current_tenant_documents_register` scopes the row to the caller's *current active* tenant, and `write_lock_update_documents_register`/`billing_gate` could independently block it — with no error surfaced. Also confirmed: `reviewer_id` and `relevant_legislation` were accepted into `p_updates` but had no corresponding `SET` clause — edits showed "Success" but never persisted.

**Fix (`CREATE OR REPLACE`, rebuilt from the live baseline body):**
1. Real tenant/role authorization check (Administrator, Compliance Manager, Governing Person, Consultant, Consultant Assistant, or super_admin).
2. `approved_by`/`approved_by_uuid` folded into the same `UPDATE` as `approved_at`/`document_status`, atomically — the separate direct-table write removed entirely from `EditDocumentModal.tsx`.
3. `reviewer_id` and `relevant_legislation` added to the `SET` clause.

**Adversarial review before merge:** a new `checker` skill (`.claude/skills/checker/SKILL.md`, added to the repo in this same PR) was run against the branch — a fresh-eyes Claude Agent subagent with no memory of the authoring conversation, verifying against the live database rather than trusting the diff. It surfaced three confirmed issues before merge, all fixed in the same PR:
- The migration's own comment misattributed the RLS reasoning (blamed `docs_reg_update` for excluding Consultant/Consultant Assistant, when `sec.has_tenant_role` actually auto-expands `'Administrator'` to include both) — corrected.
- The hand-rolled role check only read `tenant_members.role` (the scalar column), ignoring `tenant_members.roles` (the multi-role jsonb array) — a real gap: 138 of 407 currently-active memberships carry at least one extra role via that array, and 2 real users would have been wrongly denied. Fixed by switching to `sec.has_tenant_role()`, the same helper `docs_reg_update` RLS uses, which checks both.
- The migration's `search_path` was copied from a stale baseline snapshot (`''`) rather than the live value (`'public', 'pg_catalog'`) — harmless functionally (every reference already schema-qualified) but corrected to avoid an unannounced diff on the next `CREATE OR REPLACE`.

Also added while the file was open: re-implemented the tenant write-lock and billing-active checks that RLS enforces everywhere else on this table but this `SECURITY DEFINER` function bypassed entirely; switched `relevant_legislation`'s `SET` clause from `COALESCE` to the same "was this key sent" `CASE` pattern as the other fields (so it can be cleared to null later); fixed two raw `console.error` calls in the same component file to use the structured `logger` with proper context labeling.

### PR #325 — `chore/regenerate-supabase-types` (Item 2)

Regenerated `src/integrations/supabase/types.ts` directly from the live project rather than hand-merging staging's removal of a deprecated table type (`_zz_deprecated_email_domain_rules`, confirmed gone in production) against main's addition of a new RPC type (`auto_create_governance_entry`, confirmed live). Run as the deliberate last step of the whole catchup, after Item 10 — the last DB-touching item — was applied to production.

### PR #326 — `fix/document-rpc-grace-tenant-write-block` (Bugbot follow-up to Item 10)

**What was wrong:** Cursor Bugbot flagged (high severity) that the `sec.tenant_is_active()` check added in PR #324 wrongly rejected grace-period tenants. `sec.tenant_is_active()` doesn't treat `'grace'` as active, but grace-period write access is deliberately kept open elsewhere — `sec.is_tenant_write_locked()` explicitly returns `false` during an open grace window. Confirmed live against a real affected tenant (`2288d17c-52c5-4022-9e46-9becaa1f9d46`, billing cancelled, grace window open through 14 Aug 2026): `sec.tenant_is_active()` returned `false` while `sec.is_tenant_write_locked()` returned `false` (not locked) — meaning RLS itself would still let this tenant's Administrator/Compliance Manager/Governing Person edit documents, but the RPC was newly rejecting them.

**Root cause confirmed:** `docs_reg_update` and `billing_gate` are both **permissive** RLS policies on `documents_register`'s `UPDATE` command, and Postgres ORs permissive policies together. A role holder passing `docs_reg_update` (no billing check of its own) already grants the write regardless of what `billing_gate`'s `tenant_is_active()` condition says — only the **restrictive** `write_lock_update_documents_register` policy actually binds. The PR #324 migration treated `billing_gate` as if it were a mandatory AND, which is stricter than what RLS enforces today.

**Fix:** `CREATE OR REPLACE`, removes the `tenant_is_active` check entirely, keeps the `is_tenant_write_locked` check.

---

## Review and verification

- **Adversarial review (`checker` skill):** run once, against PR #324 before merge — findings and resolutions detailed above. This is a new skill added to the repo in this same PR, complementing `cichecker` (mechanical CI parity) with a fresh-eyes, live-DB-verifying review.
- **Type-check/lint:** `npx tsc --incremental --noEmit` and `npx eslint` run clean on every changed file across all four PRs, including the whole-repo check against the regenerated `types.ts` in PR #325.
- **Live DB verification before every migration was written or replaced:** confirmed via Supabase MCP `execute_sql` — the exact prior live function definition (not just the git baseline) before each `CREATE OR REPLACE`; the `tenant_members.role` CHECK constraint (confirmed matches baseline, no drift, "Consultant Assistant" correctly absent from the scalar column's allowed values but present via the `roles` jsonb array); role-gate helper signatures and callability (`sec.has_tenant_role`, `sec.is_super_admin`, `sec.is_tenant_write_locked`, `sec.tenant_is_active`); RLS policy definitions and command scope (`polcmd`, `polpermissive`) on `documents_register` to confirm the permissive-OR / restrictive-AND semantics behind the PR #326 fix; and the specific grace-period tenant affected by the PR #324 regression, found via direct query against `billing.entitlements` and `public.tenants`.
- **Bug found post-merge, fixed same day:** Cursor Bugbot caught the grace-tenant regression on PR #324 within minutes of merge — confirmed against live data before writing the fix (see PR #326 above), rather than assumed correct from the bot's report alone.
- **Migration drift discipline followed throughout:** every `CREATE OR REPLACE` in this batch (Items 10 and its follow-up) was written by pulling the live `pg_get_functiondef` first, not the `00000000000000_baseline.sql` snapshot alone — the baseline was confirmed stale on one attribute (`search_path`) during Item 10's own diagnosis, which is exactly the class of drift this repo's `CREATE OR REPLACE` discipline exists to catch.

---

## Post-merge deployment

| Surface | Action | Status |
|---|---|---|
| Vercel frontend | `EditDocumentModal.tsx`, trial signup page + sections, various hooks | Deployed via normal `main` merge → Vercel auto-deploy |
| Production DB — `rpc_update_document_register_fields` (PR #324) | Applied via `execute_sql` (interim procedure, `supabase db push` still unusable) | ✅ Confirmed live via `pg_get_functiondef` matching the merged file exactly |
| Migration ledger — `20260729040703` | `supabase migration repair --status applied` (Brian) | ✅ Verified `version=20260729040703`, `name=harden_rpc_update_document_register_fields` matches file exactly |
| Production DB — `rpc_update_document_register_fields` (PR #326 follow-up) | Applied via `execute_sql` | ✅ Confirmed live — `tenant_is_active` check no longer present in the live function definition |
| Migration ledger — `20260729060039` | `supabase migration repair --status applied` (Brian) | ✅ Verified `version=20260729060039`, `name=fix_document_rpc_grace_tenant_write_block` matches file exactly |
| `types.ts` regeneration (PR #325) | Generated file only, no production DB step | N/A |

---

## Explicitly out of scope — tracked separately, not blockers

- **Item 11 sub-item 9** — `useBulkDeleteDocuments.ts`/`documentFiles.ts` silently swallow storage-deletion failures on bulk delete, leaving orphaned files in the `documents` bucket. Pre-existing, made slightly more visible by this batch's async-wrapper fix. Not a regression from this work — its own future ticket.
- **Item 3's follow-up** — four edge functions live in production with no git source at all (`notify-gp-meeting-scheduled`, `diag-anthropic-audit`, `meeting-reports-generator`, `monthly-report-reminders`), found by the originating `/audit-branch-drift` run. Different root cause (main's own internal cleanup gap, not anything staging introduced) — needs its own investigation and decision per function, kept out of this catchup deliberately.
- **Item 11 sub-item 8** — duplicated "30+ years of real RTO and audit experience" marketing copy across three trial-signup sections. Discarded as an engineering ticket (Brian's call, 29 Jul 2026) — whatever Angela decides on the copy stands as-is either way.

---

## Living-rules / process notes from this batch

- The `checker` skill (`rto-compass-hub/.claude/skills/checker/SKILL.md`) is new, added in PR #324 — a fresh-eyes adversarial reviewer distinct from `cichecker`, triggered by the word "checker" alone (not "cichecker"). Documented in `complyhubworkspace/CLAUDE.md` § Living-doc workflow so the distinction isn't lost in a future session.
- While setting this up, discovered that `cichecker` — relied on throughout this workspace's hard gates and living-doc workflow as the mandatory pre-push check — does not currently exist on disk in this repo (`rto-compass-hub/.claude/skills/cichecker/` is absent; not tracked, not untracked, just missing). Flagged to Brian separately; not resolved as part of this batch.
- This batch is a concrete demonstration of why the repo's `CREATE OR REPLACE`-history discipline exists: Item 10's own migration would have shipped with a stale `search_path` had the live definition not been pulled directly rather than trusting the baseline file alone.
