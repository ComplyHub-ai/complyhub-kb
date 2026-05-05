> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Nov 2026 · **Confidence:** high — flows are stable; verify file paths against current codebase if investigating a specific flow.

# Key Flows

The critical user journeys. If these break, the product breaks.

---

## Flow Investigation Checklist

When investigating any flow, always ask:
1. **Entry point** — which URL/button triggers this?
2. **Auth state** — does it work logged out? For what roles?
3. **Tenant context** — which tenant owns the data?
4. **External calls** — Stripe/Mailgun/TGA/Claude?
5. **Persistence** — which table(s) get written?
6. **Async side-effects** — webhooks, crons, emails?
7. **Error states** — what if any step fails?

---

## 1. Login → Dashboard

```
User opens app
  ↓
Not authenticated → redirected to /login
  ↓
User enters email/password (or OAuth)
  ↓
Supabase Auth validates → issues JWT
  ↓
Redirect to /post-auth or /auth/continue
  ↓
OAuthCallbackGate (if OAuth) processes callback
  ↓
AuthContext loads session, profile
  ↓
AppContext calls get_app_context RPC
  ↓ (returns: mode, active_tenant_id, role, roles[], is_superadmin)
OrphanRecoveryGate runs:
  ├─ Has active tenant + roles → ✅ proceed
  ├─ Super admin → ✅ bypass
  ├─ No active tenant + has memberships → /choose-workspace
  └─ No active tenant + no memberships → /auth/recover
  ↓
RoleLandingRedirect routes to correct dashboard:
  ├─ superadmin → /superadmin/dashboard
  ├─ consultant → /consultant/dashboard
  ├─ admin → /dashboard/admin
  ├─ trainer → /dashboard/trainer-portal/dashboard
  └─ ...
```

**Key files:** `src/routes/OAuthCallbackGate.tsx`, `src/routes/OrphanRecoveryGate.tsx`, `src/routes/RoleLandingRedirect.tsx`, `src/contexts/AuthContext.tsx`, `src/contexts/AppContext.tsx`

**Known issue:** Redirect loop between `/dashboard` and `/choose-workspace` for single-tenant users — see `reference/known-issues.md` BUG-001.

---

## 2. Tenant Switching (workspace switcher)

```
User clicks workspace switcher in UI
  ↓
Picks a different tenant
  ↓
handleSelect in WorkspaceChooser / TenantSwitcher
  ↓
Calls setActiveTenantRpc(tenantId)
  ↓ (writes to profiles.active_tenant_id)
  ↓
window.location.href = '/dashboard'   ← HARD RELOAD (required)
  ↓
App re-initialises with new tenant context
```

**Why hard reload?** `active_tenant_id` is baked into the JWT as a claim. Supabase doesn't re-issue the JWT on soft navigation. A full reload forces session refresh.

---

## 3. Invitation → Accepted Account

```
Admin sends invite via UI
  ↓
invitation-create edge function runs
  ↓ (creates row in user_invitations, status=pending)
send-invite edge function → Mailgun → email
  ↓
Recipient clicks email link
  ↓
Lands on /auth/accept-invite?token=...
  ↓
Backend validates token, creates auth user + profile + tenant_members row
  ↓
Redirects to login → standard login flow
```

**Gotcha:** This flow creates the `tenant_members` row but may not call `setActiveTenantRpc`, leaving `active_tenant_id` = null. This is why new invited single-tenant users can hit the login redirect loop.

---

## 4. Billing / Subscription

```
Admin clicks "Upgrade" or "Subscribe"
  ↓
Frontend calls stripe-create-checkout-session edge function
  ↓
Returns Stripe Checkout URL
  ↓
User redirected to Stripe-hosted checkout
  ↓
User completes payment
  ↓
Stripe → stripe-webhook edge function (async)
  ↓
Webhook updates tenants table (tier, subscription_status, etc.)
  ↓
User sees upgraded features
```

**Key edge functions:** `stripe-create-checkout-session`, `stripe-create-portal-session`, `stripe-webhook`, `stripe-sync-customer`, `billing-gate`, `cancel-subscription`, `change-plan`

---

## 5. TAS Generation

TAS = Training and Adequacy/Suitability plan. Required for ASQA audit.

```
User picks a unit (e.g. BSBWHS411)
  ↓
Calls tas-create edge function
  ↓
tas-ai-engine analyses unit + context → generates draft
  ↓
Saved to tas_register table
  ↓
User edits in UI
  ↓
Can export via tas-export-pdf / tas-export-data
  ↓
Can run audit simulation via tas-audit-simulate
  ↓
Can run red-team via tas-redteam-simulate
```

---

## 6. Governance Meeting

```
Admin schedules meeting via Governance Meeting Manager
  ↓
System generates readiness checklist (governance_meeting_checklist)
  ↓
Admin prepares: action items, register reviews, etc.
  ↓
Meeting runs
  ↓
Admin logs minutes → meeting-minutes-summarize edge function (AI summary)
  ↓
Generates governance_meeting_reports entry
  ↓
Can output as board report via generate-board-report
```

---

## 7. ComplyBot Conversation

```
User types question in ComplyBot UI
  ↓
Saved to complybot_messages
  ↓
ai-router edge function → Claude API
  ↓ (with context: tenant data, documents, registers)
Response streamed back
  ↓
Logged to complybot_queries
```

**Risk:** AI outputs can hallucinate. Cross-tenant leakage is a critical concern — ComplyBot must never reference another tenant's data.

---

## 8. Evidence Upload + AI Tagging

```
User uploads document
  ↓
document-file-manager edge function stores in Supabase Storage (service role)
  ↓
Metadata row in documents table
  ↓
bulk-ai-document-tagging or analyze-* runs on upload
  ↓
Claude analyses content → extracts tags, metadata
  ↓
Written to ai_tagging_audit + document fields
  ↓
User sees auto-tagged doc in repository
```

**Note:** All Storage operations for the `documents` bucket route through the `document-file-manager` edge function. Do not add direct `supabase.storage.from('documents')` calls in frontend code.
