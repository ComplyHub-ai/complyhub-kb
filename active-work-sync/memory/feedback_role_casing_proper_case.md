---
name: feedback-role-casing-proper-case
description: "rto-compass-hub currently stores tenant_members.role as Proper Case strings, not the snake_case shown in CLAUDE.md's future-enum-migration table — always verify against src/lib/constants/roles.ts before hardcoding"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 67b8eb46-7fd2-4721-bf9a-f02ed9b2a0aa
  modified: 2026-07-29T07:40:30.994Z
---

`rto-compass-hub/CLAUDE.md`'s "Roles and permissions" section has a role-values table explicitly labeled
"as they will exist post-migration" (snake_case: `administrator`, `compliance_manager`, etc.) — but the
role enum migration has NOT landed yet. **Today, `tenant_members.role` / `tenant_members.roles[]` hold
Proper Case strings** (`'Administrator'`, `'Compliance Manager'`, `'Governing Person'`, etc.) — confirmed
against `src/lib/constants/roles.ts`'s `ROLES.*` values and `supabase/functions/_shared/roleGates.ts`'s
own header comment ("Role strings are Proper Case to match the values stored in
public.tenant_members.role").

**Why this matters:** on PR #310 (24 Jul 2026), a new edge-function role gate for `tas-export-pdf` was
written comparing `membership.role` against `['administrator', 'compliance_manager']` (lowercase) — Vercel's
bot flagged it, since it would 403 every real Administrator/Compliance Manager. The mistake came directly
from reading CLAUDE.md's role table too literally without cross-checking `roles.ts`/`roleGates.ts` for
the *actual current* stored casing.

**Worse: the file this gate was modelled on (`generate-audit-pack/index.ts`) has the same bug already
live** — it checks `profile.role` against lowercase `'administrator'/'compliance_manager'`, guaranteeing
a mismatch since `profiles.role` is stored Proper Case (confirmed live: 183 real users hold values like
`'Administrator'`, contradicting an earlier, now-corrected claim that this field is platform-level only
— see [[project_generate_audit_pack_role_bug]] for the full corrected diagnosis, including a separate
staleness issue with this same field). Not yet fixed (outside the diff of the PR that found it).

**How to apply:** before writing ANY role-name comparison in a new edge function or migration, check
`src/lib/constants/roles.ts` for the actual `ROLES.*` value — never infer casing from CLAUDE.md's
canonical-values table alone, since that table describes a future state. `CLAUDE.md` and the ci-gate
skill (renamed from `cichecker` 29 Jul 2026) were both updated 24 Jul 2026 with an explicit ❌/✅ example covering this.
