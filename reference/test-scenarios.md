> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** high — journeys are stable; update coverage matrix as tests are written.

# Test Scenarios

User journeys that must work. Each should have automated coverage or be on the roadmap to get it.

**Legend:** [E2E] — Playwright/Cypress · [Unit] — Vitest · [Manual] — manual only for now

---

## 1. Authentication

### 1.1 Login with email + password [E2E]
- Happy path → land on dashboard matching role
- Wrong password → error shown, still on login
- Unknown email → error shown
- Empty fields → validation
- Rate limit hit → lockout message

### 1.2 OAuth login (Google) [E2E]
- First-time OAuth → creates profile, routes through onboarding
- Returning OAuth → straight to dashboard
- OAuth cancelled → back to login
- OAuth with existing email/password account → account linking or clear error

### 1.3 Password reset [E2E]
- Request reset → email received → link works → can set new password → login works
- Expired link → clear error
- Link used twice → second use rejected

### 1.4 Magic link [E2E]
- Request magic link → email received → link logs in
- Expired magic link → clear error

### 1.5 Logout [E2E]
- Click logout → redirected to /login
- Back button → cannot resume session
- localStorage cleared

---

## 2. Tenant Context

### 2.1 Single-tenant user login [E2E] ⚠️ BUG-001 — verify fixed
- User with exactly 1 membership
- Should skip WorkspaceChooser, land on role dashboard
- See `reference/known-issues.md`

### 2.2 Multi-tenant user login [E2E]
- User with 2+ memberships shows WorkspaceChooser
- Picks workspace → hard reload → lands on dashboard
- "Remember this workspace" works on next login

### 2.3 Tenant switcher mid-session [E2E]
- Switch tenant → hard reload → see new tenant data
- No old tenant data leaked in UI
- No stale React Query cache

### 2.4 Super admin login [E2E]
- Lands on `/superadmin/dashboard`
- Can see all tenants list
- Can enter support mode for a tenant

### 2.5 Consultant login [E2E]
- Lands on `/consultant/dashboard`
- Sees only assigned tenants
- Can switch between assigned tenants

### 2.6 Orphan user login [E2E]
- User with no memberships → routes to `/auth/recover`
- Recovery flow works

---

## 3. Invitation & Onboarding

### 3.1 Admin invites new user [E2E]
- Email sent via Mailgun
- Row created in `user_invitations`, status=pending

### 3.2 New user accepts invite [E2E]
- Sets password → account created, `tenant_members` row added
- Verify `active_tenant_id` is set (source of BUG-001)

### 3.3 Existing user invited to another tenant [E2E]
- Acceptance adds membership at new tenant without breaking existing one
- User sees both in WorkspaceChooser

### 3.4 Expired invite [E2E + Unit]
- Invite > configured limit → "expired" message
- `cron-expire-invites` cleans it up
- User can request re-invite

---

## 4. Permission Boundaries — HIGH PRIORITY

### 4.1 Role downgrade access [E2E]
- Trainer cannot access admin pages via URL
- Student cannot access trainer portal
- Each role-step-down → redirect or 403

### 4.2 Cross-tenant data access [E2E + Unit]
- User at Tenant A tries to access Tenant B resource via URL with known ID
- RLS blocks at DB layer
- UI shows 404/403, never leaks Tenant B data

### 4.3 Super admin impersonation audit trail [E2E]
- Enter support mode → banner visible
- All actions logged to `audit_log`
- Cannot write while in support mode

---

## 5. Registers (core product)

For each register (governance, risk, OFI, complaints, CI, etc.):

### 5.1 Empty state [E2E]
New tenant → empty state renders correctly

### 5.2 Create entry [E2E]
Form validation → submit → row appears → correct `tenant_id`

### 5.3 Edit entry [E2E]
Update fields → save → changes persist

### 5.4 Delete entry [E2E]
Delete → confirmation → gone from list → audit log entry created

### 5.5 Filter / search [E2E]
Filters apply correctly · Pagination works · Large datasets (1000+ rows) don't crash

### 5.6 Export [E2E]
CSV/PDF includes only this tenant's data · Format is readable

---

## 6. Trainer Portal

### 6.1 Trainer views dashboard [E2E]
Sees own credentials, PD, tasks · Does NOT see other trainers' data

### 6.2 Trainer logs PD activity [E2E]
Submission → saved → file upload for evidence works

### 6.3 Trainer submits monthly report [E2E]
Submit → saved → admin sees it

---

## 7. Billing

### 7.1 Trial account creation [E2E]
Sign up → trial tenant created → trial features enabled

### 7.2 Upgrade from trial [E2E]
Stripe Checkout → payment → webhook → tier upgraded in UI

### 7.3 Failed payment [E2E + Manual]
Stripe webhook failure → tenant marked past_due → billing warning shown → `billing-gate` restricts access

### 7.4 Cancellation [E2E]
Cancel → Stripe updated → tenant status reflects · Data retained per retention policy

### 7.5 Downgrade [E2E]
Lower tier → loses access to tier features · No data loss

---

## 8. AI Features

### 8.1 ComplyBot basic query [Manual + E2E smoke]
Question → reasonable response · Tenant context respected (no other tenant refs)

### 8.2 Document AI tagging [Manual + Unit]
Upload → tags appear → relevant (manual judgement) · Audit row in `ai_tagging_audit`

### 8.3 TAS generation [Manual + E2E]
Pick unit → generate → export PDF → formatting correct · Red-team simulation produces output

### 8.4 Report generation [Manual + E2E]
Governance pack/audit pack/board report → PDF correct → only this tenant's data

---

## 9. Edge / Stress

### 9.1 Network failure mid-action [Manual]
Error shown, allow retry, don't lose form data

### 9.2 Session expiry [E2E]
Next action prompts re-login, doesn't break

### 9.3 Concurrent editing [Manual]
Two admins edit same entry simultaneously → conflict handling (verify behaviour with RJ)

### 9.4 Large data set [Manual + Unit]
5000+ entries → load time, filter/search performance, export performance

---

## Journey Coverage Matrix

Fill in as you audit what's actually tested:

| Journey | Playwright | Cypress | Vitest | Manual |
|---|---|---|---|---|
| Login happy path | ? | ? | ? | ✅ |
| Single-tenant login | ❌ (BUG-001) | ❌ | ❌ | ⚠️ |
| Multi-tenant switcher | ? | ? | ? | ? |
| Invite → accept | ? | ? | ? | ? |
| Register CRUD | ? | ? | ? | ? |
| TAS generation | ? | ? | ? | ? |

Update this matrix as coverage is added.
