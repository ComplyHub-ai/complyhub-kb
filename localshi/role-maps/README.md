# role-maps — README

**Read this file first.**

This folder contains the role feature mapping and seed planning work for ComplyHub. It was produced as part of the seeding workflow documented in `c:\Users\brian\complyhubworkspace\SEED-PLAN.md`.

---

## What this folder is for

Before writing `supabase/seed.sql`, we need to know exactly what each role does, what edge functions it triggers, and what data must exist in the DB for those functions to work. That is what every file in this folder answers.

This is **not** a bug report folder — that is `c:\Users\brian\complyhubworkspace\role-audit\`. The role-audit folder is about what is broken. This folder is about what each role is supposed to do and what data it needs to do it.

---

## Read order

Read in this sequence. Each file builds on the previous ones.

| Order | File | What it contains |
|---|---|---|
| 1 | `README.md` | This file — start here |
| 2 | `qa-protocol-crosscheck.md` | The synthesis. Maps every QA category to the roles that trigger it, identifies gaps in Carl's seed spec, and lists the 13 missing tables and 5 missing users. **Read this before any of the role files to understand scope.** |
| 3 | `super-admin.md` | `super_admin` role — all `/superadmin/*` routes, 6 edge function categories, SA-specific DB requirements, seed user template |
| 4 | `administrator.md` | `Administrator` role — full nav access, ~100 triggerable functions across 12 categories, seed user + tenant + subscription template |
| 5 | `compliance-manager.md` | `Compliance Manager` role — 38 nav paths, ~69 functions across 8 categories (the most complex non-admin role), detailed table requirements per category |
| 6 | `trainer-assessor.md` | `Trainer/Assessor` role — trainer portal, 5 edge function categories, full SQL seed template with 13 INSERT steps |
| 7 | `student-support.md` | `Student` and `Student Support Officer` roles — SSO work queue, monthly packs, wellbeing/placement/at-risk flows, seed templates for both |
| 8 | `external-roles.md` | `Governing Person`, `Consultant`, `Regulatory Officer` — includes critical RBAC gaps for GP, Consultant dashboard live status, and Regulatory Officer flagged as placeholder-only |
| 9 | `employer-third-party.md` | `Employer` and `Third Party` roles — both portals are unbuilt (no route components); data model gaps identified; seed user templates for placeholder accounts |
| 10 | `data-shapes.md` | **Step 4 output — read this before writing seed.sql.** Exact column names, types, NOT NULL constraints, and defaults confirmed from live DB queries. Includes critical corrections to role-map SQL templates (wrong column names caught here), pre-seeded table counts, FK-safe insert order, and enum values. |

---

## Key facts to carry into seed.sql (confirmed, do not re-investigate)

**Canonical role values** — use these exact strings in all seed data:

| Role | Value stored in DB |
|---|---|
| Super Administrator | `super_admin` |
| Administrator | `Administrator` |
| Governing Person | `Governing Person` |
| Compliance Manager | `Compliance Manager` |
| Trainer / Assessor | `Trainer/Assessor` |
| Student Support Officer | `Student Support Officer` |
| Consultant | `Consultant` |
| Student | `Student` |
| Regulatory Officer | `Regulatory Officer` |
| Employer | `Employer` |
| Third Party | `Third Party` |

**Note on enum migration:** A partial `app_role` enum exists in the DB but is missing `Governing Person`, `Trainer/Assessor`, `Student Support Officer`, and `Consultant`. The column is still TEXT. Do not seed against the enum — use the Title Case strings above. Update seed.sql when Dave completes the enum migration.

**Branch DB project ID:** `agcdvmrwzzgnlmfyrxtb`
**Production DB project ID:** `gdwhlstfguxarnxasrrs` (read-only reference)

---

## Roles that are placeholder-only

These roles need a seed user for auth testing but their portal routes have no live functionality. All their routes should be covered with a Coming Soon screen:

- `Regulatory Officer` — auditor dashboard is entirely hardcoded; `/auditor/*` sub-routes are 404
- `Employer` — no `/employer/*` route components exist
- `Third Party` — no `/third-party/*` route components; data model linkage missing

---

## Where this work fits in the overall plan

```
SEED-PLAN.md          ← master plan with all steps and dispatch prompts
role-maps/            ← YOU ARE HERE (Steps 2 and 3 output)
  README.md
  qa-protocol-crosscheck.md
  super-admin.md
  administrator.md
  compliance-manager.md
  trainer-assessor.md
  student-support.md
  external-roles.md
  employer-third-party.md
role-audit/           ← separate folder — bugs and coming soon findings per role
AUDIT-REPORT.md       ← platform-wide security and stability audit
ROLE-AUDIT-RUNBOOK.md ← how to re-run the role-audit agents
```

**Next step after reading this folder:** Step 4 — read-only DB queries to confirm production data shapes. Then Step 5 — write `supabase/seed.sql` on `fix/local-run`.
