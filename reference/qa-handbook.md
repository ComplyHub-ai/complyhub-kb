> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** high — testing patterns are stable; verify test command syntax against current `package.json` before running.

# QA Handbook

How to test this codebase effectively. Applies to Brian (QA lead) and RJ (senior dev reviewing QA work).

---

## The Testing Stack

Three frameworks coexist — confirm with RJ which is canonical for new tests.

| Tool | Purpose | Location |
|---|---|---|
| **Vitest** | Unit + integration (React components, hooks, utilities) | `tests/` |
| **Playwright** | E2E (browser automation) | Config: `playwright.config.ts` |
| **Cypress** | E2E (alternative) | `cypress/e2e/` |

> `package.json` currently has no test scripts. Tests run via direct CLI — verify commands below with RJ before running in CI.

---

## Running Tests

```bash
# Unit tests
bunx vitest              # watch mode
bunx vitest run          # single run
bunx vitest run tests/contexts/AppContext.test.tsx   # single file

# Playwright
bunx playwright test
bunx playwright test --ui        # interactive mode
bunx playwright test --debug     # step through

# Cypress
bunx cypress open        # interactive
bunx cypress run         # headless
```

---

## What To Test — QA Mental Model

For every feature, walk these axes:

### 1. Happy Path
Prove the basic scenario works. Rarely where bugs hide, but always verify first.

### 2. Edge Cases
- Empty states (no data)
- Maximum data (1000+ rows)
- Invalid input (empty strings, too long, special characters, emoji)
- Boundary values (0, -1, max int)

### 3. Permissions
- Can a trainer access admin-only pages? (Must be NO)
- Can a consultant see tenant data they don't belong to? (Must be NO)
- Can a user bypass via URL manipulation? (Must be NO)

### 4. Tenant Isolation — HIGHEST PRIORITY
- Create data in Tenant A → log in as user in Tenant B → is it visible? (MUST be NO)
- Switch tenants → does UI fully update? (No stale cached data)
- Does the URL alone leak anything across tenants?

### 5. Error States
- Network failure mid-request
- Server 500 error
- Rate limit hit
- Expired session / invalid JWT

### 6. Race Conditions
- Double-click submit button
- Rapid page navigation
- Simultaneous edits by two users

### 7. Responsive / Accessibility
- Mobile breakpoint
- Keyboard-only navigation
- Zoom to 200%

### 8. Data Integrity
- Refresh after action → does state persist?
- Log out and back in → same data visible?
- Export → re-import → data matches?

---

## Writing a Test (Vitest example)

```typescript
// tests/components/MyFeature.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MyFeature from '@/components/MyFeature';

describe('MyFeature', () => {
  it('renders the feature name', () => {
    render(<MyFeature />);
    expect(screen.getByText(/feature name/i)).toBeInTheDocument();
  });

  it('shows an error when required field is empty', async () => {
    const user = userEvent.setup();
    render(<MyFeature />);
    await user.click(screen.getByRole('button', { name: /submit/i }));
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });
});
```

Conventions (verify against existing tests):
- File naming: `*.test.tsx` or `*.spec.ts`
- Location: mirror `src/` structure under `tests/`
- Use `@testing-library/react` for rendering
- Use factories from `tests/factories/` for test data

---

## Bug Report Template

```markdown
## Summary
[One sentence — what's broken]

## Environment
- Branch / commit: main @ abc1234
- User role: admin
- Tenant: [test tenant name]
- Browser: Chrome 120 / Firefox 121

## Reproduction Steps
1. Log in as [role]
2. Navigate to [URL]
3. Click [X]
4. Observe [Y]

## Expected Behavior
[What should happen]

## Actual Behavior
[What does happen — include screenshots / console errors]

## Frequency
Every time / Intermittent / Once

## Severity
- Blocker (data loss / security / can't use product)
- High (feature broken, no workaround)
- Medium (feature broken, workaround exists)
- Low (cosmetic / minor)

## Console / Network Errors
[Paste verbatim — never summarise]

## Hypothesis (optional)
[Root cause guess — flag as guess]
```

---

## Common Bug Categories in This Codebase

1. **Auth/tenant state staleness** — JWT claims vs AppContext vs DB mismatches
2. **RLS policy gaps** — new tables added without RLS, or with buggy RLS
3. **Soft navigation vs hard reload** — tenant switching needs hard reload
4. **Edge function error handling** — 196 functions, patchy error surfacing
5. **AI output without verification prompts** — users trusting Claude outputs as fact
6. **Email deliverability** — Mailgun edge cases, bounces, spam
7. **Stripe webhook idempotency** — duplicate webhook processing
8. **Cron job silent failures** — no obvious alerting when crons fail
9. **Multi-role users** — users who are admin in one tenant and trainer in another
10. **Legacy redirects** — many `Navigate` redirects in AppRoutes (lines 1194+) — easy to break

---

## Bug Severity Guide

| Severity | Definition | Example |
|---|---|---|
| **P0 / Blocker** | Data loss, security breach, can't use product | Login loop, tenant data leak |
| **P1 / High** | Core feature broken, no workaround | TAS export corrupt |
| **P2 / Medium** | Feature broken, workaround exists | Tenant switcher slow but works |
| **P3 / Low** | Cosmetic, minor UX | Button alignment off by 2px |

**Tenant isolation bugs are always P0 regardless of apparent impact.**

---

## Pre-Release Checklist

- [ ] Login works for all role types
- [ ] Tenant switching works
- [ ] Critical registers load (governance, OFI, risk)
- [ ] Billing page loads for active and trial tenants
- [ ] ComplyBot responds to a basic query
- [ ] TAS can be created and exported
- [ ] No console errors on dashboard load or key flows
- [ ] Invitation flow works end-to-end
- [ ] All Playwright E2E tests pass
- [ ] All Vitest unit tests pass
- [ ] No new RLS-missing tables introduced
- [ ] Release notes drafted

Check `docs/RELEASE_CHECKLIST.md` and `docs/PRODUCTION_ROLLOUT_RUNBOOK.md` in the codebase for the authoritative version.
