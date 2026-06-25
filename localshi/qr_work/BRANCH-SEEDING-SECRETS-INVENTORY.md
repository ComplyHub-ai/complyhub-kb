# ComplyHub — Branch Seeding: Secrets & Config Inventory

**Purpose:** Everything a PR preview **branch database** needs — beyond `seed.sql` data — to make features work end-to-end during QA. Companion to `SEED-PLAN.md` (which covers the seed *data*). This doc covers the *wiring*: the `config.toml` change that auto-runs the seed, plus every secret / vault entry / config value the edge functions and DB functions depend on.

**Compiled:** 24 June 2026, by Khian (read-only discovery against production `gdwhlstfguxarnxasrrs`).
**Authorisation:** Carl approved Khian to action the branch-seeding setup.

> ⚠️ **No secret VALUES are recorded in this doc — names/keys only.** Values live in the Supabase project secrets, the DB `vault`, and `app_config`. Never paste values into docs or chat.

---

## 1. The `config.toml` change (the actual "turn seeding on" switch)

`supabase/config.toml` currently has **no `[db.seed]` block** (1008 lines, all of it `project_id` + 334 `[functions.*]` entries — no `[db]`, `[auth]`, `[storage]`, etc.). Without this block, auto-created branch databases come up **empty of test accounts**, which is why previews fall back to production.

**Add to `config.toml`:**

```toml
[db.seed]
enabled = true
sql_paths = ["./seed.sql"]
```

**Safety:** This only affects local `supabase db reset` and **branch** creation. It does **not** run against production (production is never reset). Low risk.

**Still to verify (needs a real branch DB):** whether the hosted branching integration honours `[db.seed]` the same way the local CLI does. The only way to confirm is to open a PR, let the branch DB spin up, and check the 10 seed accounts exist. This is the planned next step (a `feat/branch-seeding` branch + PR) — **not yet done**.

---

## 2. Edge function secrets (set in the branch project's Function Secrets)

Discovered via `Deno.env.get(...)` across `supabase/functions`. Counts = number of references.

### Tier 0 — Auto-provided by Supabase (NO action needed on a branch)
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_JWT_SECRET`
*(`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` are frontend build vars — set in Vercel, not Supabase.)*

### Tier 1 — AI providers (QA critical path — AI features)
| Secret | Refs |
|---|---|
| `LOVABLE_API_KEY` | 55 |
| `OPENAI_API_KEY` | 11 |
| `ANTHROPIC_API_KEY` | 8 |
| `PERPLEXITY_API_KEY` | 4 |
| `FIRECRAWL_API_KEY` | 3 |

Config (not secret): `AI_TIMEOUT_MS`, `AI_MODEL_NAME`.

### Tier 2 — Email / Mailgun (invites, notifications)
`MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`, `MAILGUN_BASE_URL`, `MAILGUN_SIGNING_KEY`, `MAILGUN_WEBHOOK_SIGNING_KEY`, `MAILGUN_FROM_EMAIL`, `MAIL_FROM`, `MAILGUN_HEALTH_RECIPIENT`, `RESEND_API_KEY` (alt provider), `EMAIL_WORKER_SECRET`
Flags: `EMAILS_ENABLED`, `EMAIL_ENABLED`, `EMAIL_PROVIDER` — for QA set emails **off / sandbox** so seeded users don't get real mail.

### Tier 3 — Stripe (billing gate QA)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the full price/coupon/URL set:
`STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_ANNUAL`, `STRIPE_PRICE_STANDARD_MONTHLY_AUD`, `STRIPE_PRICE_STANDARD_MONTHLY_AMOUNT`, `STRIPE_PRICE_STANDARD_ANNUAL_AUD`, `STRIPE_PRICE_STANDARD_ANNUAL_AMOUNT`, `STRIPE_PRICE_EARLY_ADOPTER_MONTHLY_AUD`, `STRIPE_PRICE_EARLY_ADOPTER_MONTHLY_AMOUNT`, `STRIPE_PRICE_EARLY_ADOPTER_ANNUAL_AUD`, `STRIPE_PRICE_EARLY_ADOPTER_ANNUAL_AMOUNT`, `STRIPE_PRICE_TRIAL_CONVERSION_MONTHLY_AUD`, `STRIPE_PRICE_TRIAL_CONVERSION_MONTHLY_AMOUNT`, `STRIPE_PRICE_TRIAL_CONVERSION_ANNUAL_AUD`, `STRIPE_PRICE_TRIAL_CONVERSION_ANNUAL_AMOUNT`, `STRIPE_COUPON_TRIAL25`, `STRIPE_COUPON_EARLY10`, `STRIPE_CHECKOUT_SUCCESS_URL`, `STRIPE_CHECKOUT_CANCEL_URL`, `STRIPE_SETUP_SUCCESS_URL`, `STRIPE_SETUP_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL`, `EARLY_ADOPTER_CUTOFF_DATE`
Use **Stripe test keys only** on a branch.

### Tier 4 — TGA / training.gov.au
`TGA_USERNAME`, `TGA_PASSWORD`, `TGA_MODE`, `TGA_BASE_URL`, `TGA_API_BASE`, and SOAP/WS variants: `TGA_WS_USERNAME`, `TGA_WS_PASSWORD`, `TGA_WS_BASE`, `TGA_SOAP_USERNAME`, `TGA_SOAP_PASSWORD`, `TGA_SOAP_AUTH_MODE`, `TGA_SOAP_FALLBACK_TO_PROD`, `TGA_ALLOW_SOAP_FALLBACK`, `TGA_ENABLE_HTML_FALLBACK`.

### Tier 5 — Other integrations / config
`SLACK_API_KEY`, `SLACK_BILLING_CHANNEL`, `AXCELERATE_API_KEY`, `JWT_SECRET`, `JWT_SECRET_SECONDARY`, `SUPABASE_JWT_SECRET`, `AUTH_HOOK_SECRET`, `SYSTEM_USER_ID`, `DOCS_BUCKET`, `DUMMY_MODE`, `EMAILS_ENABLED`.

### URLs — must point at the BRANCH/preview, not production
`SITE_URL`, `APP_BASE_URL`, `APP_URL` (+ the Stripe `*_URL` above). If these point at prod, invite links and post-checkout redirects break.

---

## 3. Database-side config the branch also needs (NOT covered by seed.sql)

These live in the DB itself, separate from function secrets. A branch DB starts without them.

### `app_config` table — keys present in production (names only)
- `app_base_url`
- `invites_send_url`

Also referenced in active migrations: `service_role_key`, `site_url`.

### `vault.secrets` — names present in production (names only, never decrypted)
- `app.mailgun_api_key`
- `app.mailgun_domain`
- `app.mailgun_from_email`
- `cms.complyhub.ai`

---

## 4. 🚩 Risks / decisions for Carl

1. **Inconsistent secret names = silent failures.** The same secret is read under different names across functions:
   - Mailgun key: `MAILGUN_API_KEY` vs `MAILGUN_KEY` vs vault `app.mailgun_api_key`
   - From address: `MAILGUN_FROM` vs `MAILGUN_FROM_EMAIL` vs `MAIL_FROM`
   - JWT: `JWT_SECRET` vs `SUPABASE_JWT_SECRET`
   For a *fully* working branch, either set every alias **or** consolidate the names in code. This is a latent production bug too, not just QA friction.

2. **Test/sandbox secrets only.** Per `SEED-PLAN.md` Step 6 — Stripe **test** keys, Mailgun **sandbox**, Anthropic **dev** key. Never production secrets on a branch.

3. **Two population surfaces:** (a) edge-function secrets and (b) DB (`app_config` rows + `vault.secrets`). `seed.sql` populates neither — they are branch-environment config Carl owns.

4. **Enum dependency** (from `SEED-PLAN.md`): seed role values are Title Case TEXT pending Dave's `app_role` enum migration.

---

## 5. Status / next steps (none actioned yet)

- [x] Secret & config inventory compiled (this doc).
- [ ] Add `[db.seed]` block to `config.toml` on a `feat/branch-seeding` branch.
- [ ] Open PR → branch DB spins up → verify (read-only) the 10 seed accounts exist.
- [ ] Carl: populate branch function secrets (test/sandbox) + `app_config` + `vault` entries.
- [ ] Carl: decide on the secret-name consolidation (risk #1).
