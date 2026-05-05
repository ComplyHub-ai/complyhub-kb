> **Last updated:** 5 May 2026 · **Reconsider by:** ongoing — update weekly. Stale bug lists are worse than none.

# Known Issues

Current known bugs, workarounds, and investigation status.

---

## 🔴 Active / Unverified

### BUG-001: Login redirect loop (`/dashboard` ↔ `/choose-workspace`)

**Status:** Diagnosed. Fix was attempted in commit `c1abf997d` ("Fixed login redirect race") but as of April 22 testing the loop was still occurring for single-tenant invited users. **Verify against current codebase — may be resolved in commits after April 22.**

**Symptom:** Certain users get stuck in an infinite redirect loop after login, bouncing between `/dashboard` and `/choose-workspace`.

**Who's affected:**
- Single-tenant users added via invitation where `active_tenant_id` was never set
- New signups where onboarding didn't complete

**Who's NOT affected:**
- Multi-tenant users (they use a hard reload path that works)
- Users with `active_tenant_id` already set in their profile

**Root cause (diagnosed):**
1. `WorkspaceChooser` auto-redirects via soft `navigate()` instead of hard `window.location.href` — AppContext never refreshes
2. `OrphanRecoveryGate`'s `checkedRef` is a `useRef` which resets on remount, so dedup doesn't hold across the loop

**Files:**
- `src/pages/WorkspaceChooser.tsx` (lines ~43–65)
- `src/routes/OrphanRecoveryGate.tsx` (line ~59 for checkedRef)

**Workaround for affected users:** Manually clear localStorage + cookies and log in again.

**Test to add:** E2E test for single-tenant invited user login flow.

---

### BUG-002: Navigation bar white page at ~960px width

**Status:** In review — needs exact pixel-width confirmation.

**Symptom:** Navigation bar shows a white page when browser is minimised to approximately half-screen width (~960px). Does NOT occur at quarter-screen size. Suggests a CSS breakpoint conflict.

**Reproduction:**
1. Load the app
2. Minimise browser to approximately half-screen
3. Navigate — observe nav bar

**Severity:** Medium (P2) — cosmetic at an uncommon viewport. Pending confirmation of exact breakpoint.

**Action:** Measure exact pixel width where it breaks vs where it works. Likely a Tailwind media query conflict.

---

## 🟡 Suspected / Open Questions

### SUSPECTED-001: Three E2E frameworks coexist

Not a bug — the codebase has Vitest, Playwright, AND Cypress. Unclear which is canonical for new tests.

**Action:** Ask RJ which framework owns what.

---

### SUSPECTED-002: No test scripts in package.json

`package.json` has no `test`, `test:e2e`, `cypress`, or `playwright` scripts. Tests must be invoked via direct CLI.

**Action:** Verify CI config. Ask RJ if standard scripts should be added.

---

### SUSPECTED-003: Trial-active exemption bug in `enforce_tenant_upload_limit`

The trial-active exemption branch reads `storage.foldername(t.name)[1]` (the tenant's name string) instead of `storage.foldername(name)[1]` (the storage object path). `try_cast_uuid` always returns NULL for a company name, so the trial-active bypass is silently broken for every non-exempt bucket.

**Impact:** Does not affect `documents` bucket (which is now exempt). May affect other non-exempt buckets for trial tenants.

**Action:** Fix the exemption logic or confirm the scope of affected buckets with RJ.

---

## 🟢 Resolved

### RESOLVED-001: Document download 400 error (all users)

**Date resolved:** 4–5 May 2026
**Root cause:** Multiple layered issues — `enforce_tenant_upload_limit` blocking downloads, followed by Supabase internal storage table RLS issues that proved unresolvable from the browser.
**Fix:** All `documents` bucket operations routed through the `document-file-manager` Edge Function (service role bypasses RLS). See `decisions.md` and `conventions.md`.
**Full debug log:** `audit/2026-05-04-document-download-bug.md`

### RESOLVED-002: PGRST200 consultant page crash

**Date resolved:** 4 May 2026 (commit `81c9de9a3`)
**Root cause:** `useConsultantClients.ts` attempted a PostgREST FK join from `tenant_members` → `tenant_plans` — a relationship that doesn't exist in the schema.
**Fix:** Changed query to read plan data directly from `tenants` table (already joined).

### RESOLVED-003: Login redirect race (prior incident)

**Commit:** `c1abf997d` — addressed a race in a specific code path. BUG-001 is a separate race in a different path.

---

## Triage Guide

| Severity | Definition | Example |
|---|---|---|
| **P0 / Blocker** | Data loss, security breach, can't use product | BUG-001 for affected users |
| **P1 / High** | Core feature broken, no workaround | TAS export corrupt |
| **P2 / Medium** | Feature broken, workaround exists | Nav bar layout at 960px |
| **P3 / Low** | Cosmetic, minor | Button misaligned by 2px |

**Tenant isolation bugs are always P0 regardless of apparent impact.**

---

## Adding a New Bug

1. Reproduce it twice (once could be a fluke)
2. Check this file — is it already known?
3. If new, file using the template in `reference/qa-handbook.md`
4. Add here under 🔴 or 🟡 after triage
