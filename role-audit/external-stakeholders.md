# Role Audit — External Stakeholders (Employer, Third Party, Consultant, Regulatory Officer)

**Date:** 4 June 2026
**Branch audited:** `main` (read-only)
**Auditor:** Brian (Khian)
**Scope:** The four external-facing roles — **Employer**, **Third Party**, **Consultant**, **Regulatory Officer** — plus the admin portal previews (`/admin/user-portals/*`), the Consultant Portal (`/consultant/*`) and `ConsultantGuard`, and the auditor/regulator surfaces (`/dashboard/auditor`, `/regulator/:token`).

Reads were against source and the live Supabase project (`gdwhlstfguxarnxasrrs`, SELECT/catalogue only). No writes were made.

---

## Headline

There are **two completely separate "portal" stacks** for these roles, and the audit needs to keep them apart:

1. **Admin previews** — `/admin/user-portals/{employer,third-party,consultant,regulator}`, gated by `AdminRoute`. These are **what an Administrator sees** when previewing a role. Three are pure hardcoded placeholders; one is a thin wrapper. All four → **COMING SOON**.
2. **The roles' own logged-in experience** — driven by `src/config/roleNavigation.ts` + `landingRoutes.ts`. This is where the real damage is: **Employer and Third Party roles have a sidebar full of links to routes that do not exist**, **Regulatory Officer lands on a dead placeholder and has a broken login redirect**, and **the entire `/regulator/:token` external read-only feature is broken at the database layer** (its table was deprecated/renamed).

The Consultant role is the healthiest: its real portal (`/consultant/dashboard`) loads live data. But its other five tabs are all "Coming soon" stubs.

Net: most of the *role-owned* surface for these four roles is either non-functional or dead-ends. The prior `AUDIT-REPORT.md` flagged the four admin-preview pages (its "Coming Soon Candidates" table) but **missed the role-owned breakage entirely** — that is the substance of this report.

---

## Surface map

### Employer (role string `'Employer'`)
| Surface | Route → component | Guard | State |
|---|---|---|---|
| Admin preview | `/admin/user-portals/employer` → `EmployerPortalPage` | `AdminRoute` | Hardcoded placeholder |
| Role sidebar | `EMPLOYER_NAV` → `/employer/dashboard`, `/employer/trainees`, `/employer/assessments`, `/employer/feedback` | — | **No routes exist — all 404** |
| Login landing | `getLandingPath('Employer')` → falls to default `/dashboard/admin` | `AdminRoute` denies | **Broken — bounced to /not-authorized** |

### Third Party (role string `'Third Party'`)
| Surface | Route → component | Guard | State |
|---|---|---|---|
| Admin preview | `/admin/user-portals/third-party` → `ThirdPartyPortalPage` | `AdminRoute` | Hardcoded placeholder |
| Role sidebar | `THIRD_PARTY_NAV` → `/third-party/dashboard`, `/third-party/agreements`, `/third-party/reports` | — | **No routes exist — all 404** |
| Login landing | `getLandingPath('Third Party')` → default `/dashboard/admin` | `AdminRoute` denies | **Broken** |

### Consultant (role string `'Consultant'`)
| Surface | Route → component | Guard | State |
|---|---|---|---|
| Admin preview | `/admin/user-portals/consultant` → `ConsultantPortalPage` | `AdminRoute` | Hardcoded placeholder |
| Real portal — dashboard | `/consultant/dashboard` → `ConsultantDashboard` | `ProtectedRoute` + `ConsultantGuard` | **Real data (live)** |
| Real portal — other tabs | `/consultant/my-tenants`, `/tenants-hub`, `/calendar`, `/suggestions`, `/account-settings` | same | **All "Coming soon" stubs** |
| Login landing | `getLandingPath('Consultant')` → `/dashboard/admin` (Administrator-equivalent inside a client tenant); portfolio reached via `RoleLandingRedirect` when no tenant context | `ConsultantGuard` | Works |

### Regulatory Officer (role string `'Regulatory Officer'`; legacy `'Auditor'`)
| Surface | Route → component | Guard | State |
|---|---|---|---|
| Role dashboard | `/dashboard/auditor` → `AuditorDashboard` | `AuditorRoute` (accepts `Regulatory Officer` / `Auditor` / `super_admin`) | **Placeholder — 3 static cards, no data** |
| Admin preview | `/admin/user-portals/regulator` → `RegulatorPortalPage` (wraps `AuditorDashboard`) | `AdminRoute` | Placeholder |
| Role sidebar | `REGULATOR_NAV` → read-only views of real register pages (`/dashboard/registers/*`, governance, TAS engine, etc.) | per-route via `allowedRoles` map | Links resolve to real pages (read-only mode via `useRegulatorMode`) |
| External read-only viewer | `/regulator/:token` → `RegulatorModePage` (public, no auth) | none (token-based) | **Broken — backing table deprecated** |
| Login landing | `getLandingPath('Regulatory Officer')` → default `/dashboard/admin` | `AdminRoute` denies | **Broken** (only legacy `'Auditor'` maps to `/dashboard/auditor`) |

Guards involved: `src/guards/ConsultantGuard.tsx`, `src/routes/guards/AuditorRoute.tsx` (wired, `@deprecated`), `src/routes/guards/RegulatoryOfficerRoute.tsx` (exists, **never imported** — dead).

---

## Findings

### 1. Regulator token feature is broken end-to-end — backing table was deprecated/renamed
- Role(s): Regulatory Officer (external, unauthenticated link recipient) + any Administrator generating a link
- Page/route: `/regulator/:token` (public viewer); `useRegulatorTokens` / `useGenerateRegulatorToken` / `useRevokeRegulatorToken`
- File:line: `src/pages/regulator/[token].tsx:44`; `src/hooks/useRegulatorMode.ts:170,198,227`; `src/components/settings/RegulatorAccessPanel.tsx:26`
- Issue: All four call sites query `supabase.from('regulator_tokens')`. The live database has **no `public.regulator_tokens`** — it was renamed to `public._zz_deprecated_regulator_tokens` (confirmed via `information_schema.tables`). Every query therefore errors:
  - Public viewer: token validation fails → page renders the **"Access Denied — Access link is invalid or has expired"** state for *every* link. The external regulator can never see anything.
  - `useGenerateRegulatorToken` (insert) → toast "Failed to generate access link".
  - `useRegulatorTokens` (list) / `useRevokeRegulatorToken` (update) → throw.
  The file carries `// @ts-nocheck` (`[token].tsx:1`), which is why the dead-table reference compiled.
- Severity: High (a headline external-facing feature is 100% non-functional). Note it **fails closed** (denies access), so this is functional breakage, not a data leak.
- Classification: **COMING SOON**
- Recommended action: Put a `<ComingSoon />` cover on the `/regulator/:token` route element in `src/AppRoutes.tsx:449` and hide any entry point to `RegulatorAccessPanel`. A future FIX is bounded but **not small** — it requires (a) repointing all four call sites to a live table, and (b) an anon-readable data path (see Finding 2), so it is not a quick repair today.
- Relates to existing AUDIT-REPORT finding: new (the addendum's `_zz_deprecated_*` note is adjacent but did not identify this feature)

### 2. `audit_reports` / `audit_findings` have no anonymous SELECT policy — the public regulator viewer could never show data even with a valid token
- Role(s): Regulatory Officer (external, unauthenticated)
- Page/route: `/regulator/:token`
- File:line: `src/pages/regulator/[token].tsx:70-85` (reads `audit_reports`, `audit_findings` via the **anon** `supabase` client on a public route)
- Issue: Live RLS on both tables grants SELECT only to `authenticated` with `sec.is_super_admin() OR sec.is_tenant_member(tenant_id)`. There is **no `anon` policy**. So even if Finding 1 were fixed, the anon client on this public route would read zero rows — the summary cards and tables would always render empty. The architecture (anon client reading tenant-scoped tables directly) cannot work without either an anon-scoped policy keyed to the token or a service-role edge function.
- Severity: High (design gap that blocks the feature) — but note it is also why there is *no* cross-tenant leak today.
- Classification: **COMING SOON** (same cover as Finding 1; this is the reason the fix is non-trivial)
- Recommended action: When the feature is rebuilt, route the read through a token-validating edge function (service-role, scoped to the token's `tenant_id`) rather than the anon client. Flag the RLS/edge design for Carl + Dave. Do **not** simply open these tables to `anon`.
- Relates to existing AUDIT-REPORT finding: new

### 3. Employer & Third Party roles' navigation points entirely to non-existent routes
- Role(s): Employer, Third Party
- Page/route: `/employer/dashboard`, `/employer/trainees`, `/employer/assessments`, `/employer/feedback`, `/third-party/dashboard`, `/third-party/agreements`, `/third-party/reports`
- File:line: `src/config/roleNavigation.ts:412-415` (Employer), `:430-432` (Third Party)
- Issue: `EMPLOYER_NAV` and `THIRD_PARTY_NAV` are registered in `roleNavigationConfigs` (`:464-465`), so a user with role `Employer` or `Third Party` gets a full sidebar. **None of these paths are defined in `src/AppRoutes.tsx`** (confirmed: zero route matches for `/employer*` or `/third-party*`). Every sidebar click dead-ends in `AuthAwareCatchAll`. There is no Employer/Third Party functionality anywhere in the app — only the hardcoded admin-preview placeholders, which these roles cannot reach (they sit behind `AdminRoute`).
- Severity: Med
- Classification: **COMING SOON**
- Recommended action: Until Employer/Third Party portals are built, gate these two nav configs out (e.g. remove `Employer`/`Third Party` from `roleNavigationConfigs`, or render a single `<ComingSoon />` landing for the role) so the roles do not present dead links. Pair with Finding 4 (landing).
- Relates to existing AUDIT-REPORT finding: new

### 4. `getLandingPath` has no case for `Regulatory Officer`, `Employer`, or `Third Party` — broken post-login redirect
- Role(s): Regulatory Officer, Employer, Third Party
- Page/route: post-login → `RoleLandingRedirect`
- File:line: `src/config/landingRoutes.ts:2-30` (used by `src/routes/RoleLandingRedirect.tsx:47`)
- Issue: The `switch` handles only the legacy `'Auditor'` (→ `/dashboard/auditor`). The current role name `'Regulatory Officer'` (and `Employer`, `Third Party`) fall to `default → /dashboard/admin`. `/dashboard/admin` is behind `AdminRoute`, which denies non-Administrators and redirects to `/not-authorized`. So a Regulatory Officer / Employer / Third Party landing on login is bounced away from their own dashboard. (Their sidebar config is keyed on the *new* names, so there is a name mismatch between `landingRoutes.ts` and `roleNavigation.ts`.)
- Severity: Med–High (these roles cannot reliably reach their landing on login)
- Classification: **FIX**
- Recommended action: Add cases to `getLandingPath`: `'Regulatory Officer'` → `/dashboard/auditor` (alongside the existing `'Auditor'`); `'Employer'` / `'Third Party'` → their portal landing once it exists, or a `/coming-soon` page in the interim. Small, bounded edit. Flag for RJ (owns landing/redirect flow).
- Relates to existing AUDIT-REPORT finding: new (adjacent to addendum §2D guard/landing notes)

### 5. `AuditorDashboard` is a non-functional placeholder — and it is the Regulatory Officer's actual landing dashboard
- Role(s): Regulatory Officer
- Page/route: `/dashboard/auditor` (via `AuditorRoute`) and `/admin/user-portals/regulator` (via `RegulatorPortalPage`)
- File:line: `src/pages/dashboard/AuditorDashboard.tsx:4-28`
- Issue: Three static `<div>` cards ("Standards View", "Evidence Viewer", "Audit Reports") with descriptive text only — **no data fetch, no links, no actions**. This is not just an admin preview: it is the page a logged-in Regulatory Officer lands on (`roleNavigation.ts:315`, `landingRoutes.ts:14` for legacy `Auditor`). `RegulatorPortalPage.tsx:3-5` simply re-renders it.
- Severity: Med
- Classification: **COMING SOON**
- Recommended action: Cover `/dashboard/auditor` and `/admin/user-portals/regulator` with `<ComingSoon />`. Note the Regulatory Officer sidebar (`REGULATOR_NAV`) still provides read-only access to the real register pages, so the role is not left with nothing — but the *dashboard* card itself should not present as a finished feature.
- Relates to existing AUDIT-REPORT finding: extends the original "RegulatorPortalPage — thin wrapper" Coming Soon candidate (it missed that the wrapped dashboard is the live Regulatory Officer landing)

### 6. Employer admin-preview portal — hardcoded KPIs, no data wiring
- Role(s): Employer (admin preview)
- Page/route: `/admin/user-portals/employer`
- File:line: `src/pages/admin/portals/EmployerPortalPage.tsx:20,28,36,44` (KPIs `12`, `3`, `28`, `94%`); `:59,72,85,98` ("… coming soon")
- Issue: Every KPI is a literal integer; all four feature cards say "coming soon". No queries, no edge calls.
- Severity: Low
- Classification: **COMING SOON**
- Recommended action: Wrap the route element at `AppRoutes.tsx:1211` in `<ComingSoon />` (or gate the `UserPortalsHub` card at `UserPortalsHub.tsx:44-51`).
- Relates to existing AUDIT-REPORT finding: confirms existing Coming Soon candidate `EmployerPortalPage`

### 7. Third Party admin-preview portal — hardcoded KPIs, no data wiring
- Role(s): Third Party (admin preview)
- Page/route: `/admin/user-portals/third-party`
- File:line: `src/pages/admin/portals/ThirdPartyPortalPage.tsx:20,28,36,44` (KPIs `5`, `2`, `1`, `98%`); `:59,72,85,98` ("… coming soon")
- Issue: Same pattern — hardcoded integers, four "coming soon" cards, no DB.
- Severity: Low
- Classification: **COMING SOON**
- Recommended action: Wrap the route element at `AppRoutes.tsx:1212` in `<ComingSoon />` / gate the hub card.
- Relates to existing AUDIT-REPORT finding: confirms existing candidate `ThirdPartyPortalPage`

### 8. Consultant admin-preview portal — hardcoded KPIs (distinct from the real `/consultant` portal)
- Role(s): Consultant (admin preview)
- Page/route: `/admin/user-portals/consultant`
- File:line: `src/pages/admin/portals/ConsultantPortalPage.tsx:20,28,36,44` (KPIs `3`, `2`, `15`, `8`); `:59,71,84,98` ("… coming soon")
- Issue: Hardcoded placeholder. **Important:** this is NOT the consultants' real portal — the live, data-driven portal is `/consultant/dashboard` (Finding 10). This admin-preview page duplicates the concept with fake numbers and risks confusing the team into thinking the consultant feature is unbuilt.
- Severity: Low
- Classification: **COMING SOON**
- Recommended action: Wrap the route element at `AppRoutes.tsx:1213` in `<ComingSoon />`. Consider relabeling the `UserPortalsHub` consultant card to point Administrators to the real `/consultant` experience instead.
- Relates to existing AUDIT-REPORT finding: confirms existing candidate `ConsultantPortalPage`

### 9. Consultant Portal sub-pages are all "Coming soon" stubs while their sidebar links are live
- Role(s): Consultant
- Page/route: `/consultant/my-tenants`, `/consultant/tenants-hub`, `/consultant/calendar`, `/consultant/suggestions`, `/consultant/account-settings`
- File:line: `ConsultantMyTenants.tsx`, `ConsultantTenantsHub.tsx`, `ConsultantCalendar.tsx`, `ConsultantSuggestions.tsx`, `ConsultantAccountSettings.tsx` (each is a single "Coming soon" `<Card>`)
- Issue: Five of the six consultant routes are stubs. They already display "Coming soon" text, but the routes are live and linked from `ConsultantSidebar`, so a consultant clicks through to empty cards. Note `ConsultantTenantsHub.tsx:8` advertises a "Platform-wide tenant directory" — if that is ever wired without strict scoping it would be a cross-tenant exposure risk; flag the intent before building.
- Severity: Low–Med
- Classification: **COMING SOON**
- Recommended action: Hide these five items in `ConsultantSidebar` (or cover the routes) until built, leaving only `/consultant/dashboard` active. The in-page "Coming soon" card is acceptable as an interim but the nav items shouldn't present as working features.
- Relates to existing AUDIT-REPORT finding: new

### 10. Consultant Portal dashboard — genuinely wired (positive finding, with one note)
- Role(s): Consultant
- Page/route: `/consultant/dashboard`
- File:line: `src/pages/consultant/ConsultantDashboard.tsx`; data via `src/hooks/useConsultantClients.ts:45-66`
- Issue: This page **works** — it queries `tenant_members` (real table) joined to `tenants!inner(name, plan)`, classifies the official sandbox by fixed UUID, and renders real client/workspace cards (`ClientCard.tsx`) with a working `switchToTenant` enter action. No placeholder data. Minor: the query uses `(supabase as any)` (loses type safety) and the hook surfaces no error UI — if the query throws, `isConsultant` resolves false and `ConsultantGuard` silently redirects to `/dashboard`. Not a bug, but a soft-fail to watch.
- Severity: Low
- Classification: **FIX** (optional hardening only — drop the `as any`, surface query errors). The feature itself is sound.
- Relates to existing AUDIT-REPORT finding: new

### 11. `RegulatoryOfficerRoute` is dead code; the `@deprecated` `AuditorRoute` is the one wired
- Role(s): Regulatory Officer
- File:line: `src/routes/guards/RegulatoryOfficerRoute.tsx` (never imported); `src/routes/guards/AuditorRoute.tsx:6` (`@deprecated`, but imported and used at `AppRoutes.tsx:352,805`)
- Issue: The deprecation is backwards — the guard marked "use RegulatoryOfficerRoute instead" is the live one, and its intended replacement is unused. `AuditorRoute` functionally covers both role names (`:23`) plus `super_admin`, so behaviour is correct today; this is code rot, not a security gap.
- Severity: Low
- Classification: **REMOVE** (delete `RegulatoryOfficerRoute.tsx`, or finish the swap and delete `AuditorRoute` — pick one; do not leave both)
- Recommended action: Flag for RJ/Carl. Confirms addendum §2D ("deprecation is backwards") with the per-role lens. Decision needed before deletion — escalate, don't pick autonomously.
- Relates to existing AUDIT-REPORT finding: addendum §2D; original Cluster 2 listed `RegulatoryOfficerRoute` for removal

### 12. `RegulatorAccessPanel` is an unwired component (no entry point to generate links)
- Role(s): Regulatory Officer (the admin who would issue a link)
- File:line: `src/components/settings/RegulatorAccessPanel.tsx`
- Issue: Defined but **never imported** anywhere (confirmed by grep). Combined with Finding 1, this means there is currently no UI path at all to generate a regulator link, and the link target is broken regardless. The component is effectively dead.
- Severity: Low
- Classification: **REMOVE** (or re-wire as part of the Finding 1 rebuild)
- Recommended action: If the regulator feature is deferred (Finding 1), delete or shelve this component so it isn't mistaken for a live surface.
- Relates to existing AUDIT-REPORT finding: new

---

## Summary table

| # | Title | Severity | Classification |
|---|---|---|---|
| 1 | Regulator token feature broken — table deprecated/renamed | High | COMING SOON |
| 2 | `audit_reports`/`audit_findings` no anon SELECT — viewer can't read data | High | COMING SOON |
| 3 | Employer & Third Party nav links point to non-existent routes | Med | COMING SOON |
| 4 | `getLandingPath` missing Regulatory Officer/Employer/Third Party → broken landing | Med–High | FIX |
| 5 | `AuditorDashboard` placeholder is the Regulatory Officer's live landing | Med | COMING SOON |
| 6 | Employer admin-preview portal — hardcoded KPIs | Low | COMING SOON |
| 7 | Third Party admin-preview portal — hardcoded KPIs | Low | COMING SOON |
| 8 | Consultant admin-preview portal — hardcoded KPIs | Low | COMING SOON |
| 9 | Consultant Portal sub-pages are "Coming soon" stubs with live nav | Low–Med | COMING SOON |
| 10 | Consultant Portal dashboard genuinely wired (hardening note only) | Low | FIX (optional) |
| 11 | `RegulatoryOfficerRoute` dead; deprecated `AuditorRoute` wired | Low | REMOVE |
| 12 | `RegulatorAccessPanel` unwired / dead component | Low | REMOVE |

---

## Coming Soon cover list

Actionable list of routes/pages to cover so external-role users can't reach unfinished or broken surfaces:

- **`/regulator/:token`** — `AppRoutes.tsx:449`. Wrap `<RegulatorViewPage />` in a `<ComingSoon />` cover (feature broken at DB layer — Findings 1 & 2).
- **`/dashboard/auditor`** — `AppRoutes.tsx:806` (`AuditorDashboard` via `AuditorRoute`). Cover the dashboard element (placeholder — Finding 5).
- **`/admin/user-portals/regulator`** — `AppRoutes.tsx:1214`. Cover `<RegulatorPortalPage />` (wraps the placeholder).
- **`/admin/user-portals/employer`** — `AppRoutes.tsx:1211`. Cover `<EmployerPortalPage />` (hardcoded KPIs).
- **`/admin/user-portals/third-party`** — `AppRoutes.tsx:1212`. Cover `<ThirdPartyPortalPage />` (hardcoded KPIs).
- **`/admin/user-portals/consultant`** — `AppRoutes.tsx:1213`. Cover `<ConsultantPortalPage />` (hardcoded KPIs; real portal is `/consultant`).
- **Consultant sub-pages** — `/consultant/my-tenants`, `/consultant/tenants-hub`, `/consultant/calendar`, `/consultant/suggestions`, `/consultant/account-settings` (`AppRoutes.tsx:464-468`). Hide the matching items in `ConsultantSidebar` (preferred) or cover the route elements; leave `/consultant/dashboard` active.
- **Employer & Third Party role navigation** — gate `EMPLOYER_NAV` and `THIRD_PARTY_NAV` out of `roleNavigationConfigs` (`roleNavigation.ts:464-465`) until the portals exist, so the roles don't render sidebars full of 404 links (Finding 3). Pair with the `getLandingPath` fix (Finding 4) so these roles land somewhere valid.

**Not a cover — needs a code FIX:**
- `getLandingPath` (`landingRoutes.ts`) — add `Regulatory Officer` / `Employer` / `Third Party` cases (Finding 4). Flag for RJ.

**Removal candidates:** `RegulatoryOfficerRoute.tsx` (or `AuditorRoute.tsx` — pick one, Finding 11); `RegulatorAccessPanel.tsx` (Finding 12).

---

*All work was read-only on `main` and the live DB (SELECT/catalogue only). Per workspace rules, `AppRoutes.tsx`, `roleNavigation.ts`, `landingRoutes.ts`, guards, `config.toml`, and migrations are Carl's/RJ's domain — these are diagnoses to flag, not changes to make.*
