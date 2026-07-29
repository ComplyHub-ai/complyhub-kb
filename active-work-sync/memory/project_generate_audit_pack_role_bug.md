---
name: project-generate-audit-pack-role-bug
description: "generate-audit-pack + generate-board-report role gate — FIXED in PR #317. Was lowercase-vs-Proper-Case on profiles.role plus stale snapshot; now uses tenant_members live role (tas-export-pdf pattern)."
metadata:
  type: project
  originSessionId: 67b8eb46-7fd2-4721-bf9a-f02ed9b2a0aa
  modified: 2026-07-27T05:38:00.000Z
  status: fixed
  fixedIn: PR #317
---

**Status: FIXED — shipped in PR #317 (merged to `main` 27 Jul 2026).**

`supabase/functions/generate-audit-pack/index.ts` and `generate-board-report/index.ts` previously gated
with a case-sensitive check against lowercase snake_case on `profiles.role`, which never matched live
Proper-Case values (`Administrator`, `Compliance Manager`). Separately, `profiles.role` is a stale
signup snapshot that can diverge from `tenant_members.role` (27 live diverged users at diagnosis time).

**Do not reopen this as an open bug.** The fix follows the existing `tas-export-pdf` pattern: bypass
when `profile.role === 'super_admin'`, else authorize from a fresh `tenant_members.role` lookup
(`status='active'`) against Proper Case role names for the caller's tenant. Stale `profile.tenant_id`
reads in the same files were also swapped in that PR.

**Lasting rule (authoritative doc correction locked, not yet applied on a branch — see
`bug3-stale-tenant-id.md` Decision 10):**
- `profiles.role` is a **legacy signup-time snapshot**, not platform-level-only/`super_admin`-or-`NULL`.
- **Never authorize tenant actions from `profiles.role`.** Use `useEffectiveRole().effectiveRole`
  (frontend) or a fresh `tenant_members` lookup (edge/RPC).
- An earlier memory version claiming `profiles.role` is only ever `'super_admin'`/`NULL` was **wrong**
  and is retracted (Decision 5 live evidence: 183+ users hold Proper-Case tenant-role strings there).

If a future change reintroduces `profile.role` casing checks for tenant authorization, treat it as a
regression against PR #317 / Decision 5 / Decision 10.
