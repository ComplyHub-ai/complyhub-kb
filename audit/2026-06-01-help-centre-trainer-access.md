> **Archived:** 01 June 2026 · **Event date:** 01 June 2026 · **Type:** Feature — role access config

# Help Centre Added to Trainer Sidebar Navigation

**Date:** 01 June 2026
**Developer:** Brian (with Claude Code)
**Requested by:** RJ (app engineering lead)
**Branch:** `main` on `ComplyHub-ai/rto-compass-hub` (via Lovable)
**Commit:** `192970a9c`
**Purpose:** Surface the Help Centre in the trainer sidebar so Trainer/Assessor users can find it without hunting through the avatar dropdown

---

## Context

The Help Centre has always been accessible to trainers (no route guard, avatar dropdown link, direct URL) but it was absent from the trainer sidebar navigation config. RJ requested it be added to the trainer role menu so it is consistently discoverable.

---

## Pre-change Verification

Before writing the prompt, a full blast radius and database check was completed:

- **Blast radius:** One file only — `src/config/roleMenuConfigs.ts`. No routing, layout, or other role config changes needed. The `/help-centre` route already carries no role guard.
- **Components consuming `roleMenuConfigs`:** `EnhancedRoleSidebar.tsx`, `NavBreadcrumb.tsx`, `SectionChip.tsx` — all handle new items generically, no custom handling required.
- **Database / Dave standard check:** Only one table queried by the Help Centre — `help_centre_content`. RLS policy: `authenticated` role SELECT on `is_published = true`. Trainers are authenticated users and pass cleanly. No `tenant_id` on the table — platform-wide content, no cross-tenant risk. Live data: 4 records, all published, all videos.

---

## Change Applied

**File:** `src/config/roleMenuConfigs.ts`

**Change 1 — Import:**
Added `HelpCircle` to the existing lucide-react import block.

**Change 2 — Trainer Support section:**
Appended one item to the `Support` section of the `'trainer'` role config:

```ts
{ label: 'Help Centre', path: '/help-centre', icon: HelpCircle }
```

Support section after change:
- ComplyBot
- Documents
- Improvement Plan
- **Help Centre** ← added

---

## Outcome

- Trainer sidebar now shows Help Centre under the Support section
- All 6 Help Centre articles accessible (5 static, 1 database-driven)
- Training Recordings page fetches and displays all 4 published videos
- No regressions to other roles — change is scoped to trainer config only

---

## Files Changed

| File | Change |
|---|---|
| `src/config/roleMenuConfigs.ts` | Added `HelpCircle` import + one menu item in trainer Support section |
| `.lovable/plan.md` | Updated by Lovable (automated) |
