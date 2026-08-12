# Audit — PR #425: Remove governance-priority fields from RPL form and table (12 August 2026)

**Date:** 12 August 2026
**Branch:** `feat/rpl-simplify-form-and-table`
**PR:** [#425](https://github.com/ComplyHub-ai/rto-compass-hub/pull/425)
**Merge commit:** `c8b57f78d`
**Merged:** 12 August 2026
**Purpose:** RJ flagged (screenshot, RPL "Add" modal) that RPL doesn't need the Title/Risk Level/Status/Responsible Role/Responsible Person/Due Date section — RPL is a straightforward compliance log, not a governance-tracked action item. Form should start at Student Name.

---

## What was implemented

- `RPLRegisterForm.tsx` — removed the `<GovernancePrioritySection>` block (the shared component used across ~26 registers); `title` relaxed from required to optional in the zod schema. Form now opens directly at Student Name.
- `pages/registers/rpl/index.tsx` — removed the matching table columns (Title, Status, Due Date, Risk Level, Responsible), which would otherwise show blank for every new record. Removed the now-dead `tenantMembers` fetch (only fed the removed Responsible column).

## Blast radius

2 files. `GovernancePrioritySection.tsx` itself untouched — RPL's form just stops rendering it, zero effect on the other ~26 registers using it. RPL's 4 KPI tiles (Total/Approved/Partially Approved/Pending Review) are all based on `assessment_outcome`, unaffected.

## Dave standard / DB impact

No migration. Confirmed in `types.ts`: `title`, `risk_level`, `status`, `responsible_person`, `responsible_role`, `due_date` were already nullable on `rpl_register`. Nothing for Dave. Governance-module linkage (`createGovernanceEntry`, called on RPL create/update) unaffected — it already has a fallback title generator for when no title is supplied.

## Test plan

- `npx tsc --noEmit` — clean.
- `npx eslint` on both changed files — clean.
- No existing tests reference RPL's form or table — nothing to update.
- CI green on merge; RJ confirmed manually merged and working live.

---

## Files changed

`src/components/rpl/RPLRegisterForm.tsx`, `src/pages/registers/rpl/index.tsx` — both frontend-only, no migration, no production DB step required.
