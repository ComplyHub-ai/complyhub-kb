> **Last updated:** 5 May 2026 · **Reconsider by:** 5 Aug 2026 · **Confidence:** medium — accurate as of late April 2026. Directory structure drifts as features are added; verify paths before citing.

# Codebase Map

Where things live in `rto-compass-hub/`. Use this when you need to find something fast.

---

## Repo Root

```
rto-compass-hub/
├── src/                    ← Frontend React app
├── supabase/
│   ├── functions/          ← 196 edge functions (Deno)
│   └── migrations/         ← SQL schema migrations
├── tests/                  ← Vitest unit + integration tests
├── cypress/                ← Cypress E2E tests
├── playwright.config.ts    ← Playwright E2E config
├── docs/                   ← Implementation docs + specs
├── sql/                    ← Ad-hoc SQL scripts
├── scripts/                ← Build/dev scripts
├── public/                 ← Static assets
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── bun.lock / bun.lockb    ← Package manager: Bun
└── 30+ .md files at root   ← Historical implementation notes; most not current
```

---

## Frontend (`src/`)

```
src/
├── AppRoutes.tsx              ← ★ ALL routes defined here (source of truth for URLs)
├── App.tsx                    ← Root app component
├── main.tsx                   ← Entry point
│
├── pages/                     ← Page components organised by domain
│   ├── auth/                    Login, signup, password reset
│   ├── dashboard/               Admin, trainer, manager, auditor dashboards
│   ├── trainer-portal/          Trainer self-service portal
│   ├── consultant/              Consultant cross-tenant portal
│   ├── superadmin/              ComplyHub internal portal
│   ├── registers/               Governance, risk, OFI, etc.
│   ├── billing/                 Checkout, subscriptions
│   ├── governance/              Meetings, reports
│   ├── assessment-validation/   Peer validation workflows
│   ├── WorkspaceChooser.tsx     ★ Multi-tenant workspace picker
│   └── ...
│
├── components/                ← Reusable UI (100+ subdirs by feature)
│   ├── ui/                      Shadcn primitives (buttons, dialogs, forms)
│   └── ...
│
├── contexts/                  ← ★ Global state providers
│   ├── AuthContext.tsx          Supabase session, profile
│   ├── AppContext.tsx           Active tenant, role, mode (★ key file)
│   └── TenantContext.tsx        Tenant-specific data
│
├── routes/                    ← Route infrastructure
│   ├── ProtectedRoute.tsx       Requires auth
│   ├── PublicOnlyRoute.tsx      Only for unauthenticated
│   ├── OrphanRecoveryGate.tsx   ★ Redirects users with no tenant context
│   ├── RoleLandingRedirect.tsx  Sends user to correct dashboard by role
│   ├── OAuthCallbackGate.tsx    Handles OAuth return
│   └── guards/
│       ├── AdminRoute.tsx
│       ├── ManagerRoute.tsx
│       ├── TrainerRoute.tsx
│       ├── StudentRoute.tsx
│       └── AuditorRoute.tsx
│
├── guards/                    ← Higher-level access guards
│   ├── SuperAdminGuard.tsx
│   ├── TenantGuard.tsx
│   └── QAAccessGuard.tsx
│
├── layouts/                   ← Page shells
│   ├── RootAppLayout.tsx
│   ├── PublicLayout.tsx
│   ├── ConsultantPortalLayout.tsx
│   └── ...
│
├── hooks/                     ← Custom React hooks (one file per concern)
├── lib/                       ← Pure utilities
│   ├── setActiveTenant.ts       ★ RPC wrapper for tenant switching
│   ├── documentFiles.ts         ★ Storage gateway for documents bucket
│   ├── auth/landing.ts          resolveLanding() — decides post-login destination
│   └── utils.ts
│
├── services/                  ← API call wrappers
├── modules/                   ← Feature-specific modules
├── types/                     ← TypeScript type definitions
├── config/                    ← Config constants
├── integrations/
│   └── supabase/client.ts       Supabase client singleton
└── constants/                 ← App-wide constants
```

---

## Backend (`supabase/`)

```
supabase/
├── functions/                 ← 196 edge functions (Deno)
│   ├── ai-*/                    AI/Claude integration
│   ├── tga-*/                   Training.gov.au sync
│   ├── tas-*/                   TAS engine
│   ├── generate-*/              Report generation
│   ├── stripe-*/                Billing
│   ├── send-*/                  Email sending
│   ├── cron-*/                  Scheduled jobs
│   ├── admin-*/                 Platform admin ops
│   ├── document-file-manager/   ★ Storage gateway for documents bucket
│   ├── register-evidence-manager/ ★ Storage gateway for trainer-evidence bucket
│   └── _shared/                 Shared helpers
│
├── migrations/                ← SQL schema migrations (timestamped)
│   └── YYYYMMDDHHMMSS_*.sql
│
└── config.toml                Supabase project config
```

---

## Tests

```
tests/                         ← Vitest (unit + integration)
├── e2e/
├── components/
├── hooks/
├── contexts/
├── api/
├── factories/                 ← Test data factories
├── fixtures/                  ← Static test fixtures
├── helpers/
└── *.spec.ts / *.test.tsx

cypress/
├── e2e/
└── support/

playwright.config.ts           ← Config file (verify test paths with RJ)
```

---

## Critical Files — Bookmark These

| File | Why |
|---|---|
| `src/AppRoutes.tsx` | All routes — find anything by URL |
| `src/contexts/AppContext.tsx` | Tenant/role state — auth bugs usually live here |
| `src/contexts/AuthContext.tsx` | Session state |
| `src/routes/OrphanRecoveryGate.tsx` | Post-login redirect logic |
| `src/lib/setActiveTenant.ts` | Tenant switching |
| `src/lib/documentFiles.ts` | Storage gateway for documents bucket |
| `src/pages/WorkspaceChooser.tsx` | Known bug source area |
| `supabase/migrations/` | DB schema evolution |
| `supabase/functions/document-file-manager/` | Storage gateway edge function |

---

## Known Gaps (verify with RJ)

- `package.json` has no test scripts defined — tests run via direct CLI (`bunx vitest`, `bunx playwright test`, `bunx cypress run`)
- 30+ historical `.md` files at repo root — most are not current; ask RJ before relying on any of them
- Edge function count (196) may have changed — re-verify if investigating a specific function namespace
