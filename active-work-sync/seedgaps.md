# Seed Gaps — Supabase Preview Branches

> Purpose: Supabase Branching preview databases (one per PR) are created with `with_data: false` —
> schema only, zero rows copied from production. `supabase/seed.sql` (the repo's local-dev seed
> script) does NOT run automatically against these branches, and even where it's been run manually
> it doesn't cover several tables real feature testing needs. This file records exactly what's
> missing, what's already been seeded on which branch, and the SQL to re-run the same seed on a
> future preview branch. Delete or update this file once the branch-DB seeding gap is fixed
> properly (e.g. a CI step that seeds every new preview branch automatically) — it's a workaround
> record, not a permanent process doc.

## The gap, in plain terms

`supabase/seed.sql` creates the 9 seed user accounts (`admin@complyhub-seed.com` etc.) and the two
seed tenants (`seed-rto`, `trial-rto`) — but only when actually run against a database. Supabase
Branching's preview databases don't run it automatically, and confirmed on PR #334's branch
(`bmglqiuqthazcdcoyfjk`) even after the accounts/tenants existed, these tables were still completely
empty for both seed tenants:

- `training_products` — 0 rows (production has ~2,110, synced from training.gov.au)
- `training_product_scope` — 0 rows (this is what the RPL Register course picker, and most TAS
  builder features, actually read — NOT `tenant_scope_items`, which `seed.sql` does populate with a
  single BSB50420 row)
- `q1_tas_builder` / `q1_tas_units` — 0 rows (no TAS builds exist at all)
- `trainer_vocational_competency` — 0 rows (no trainer competency records)
- `rpl_register` — 0 rows

So a feature branch that touches the TAS builder, RPL Register, or Trainer Matrix will show **empty
states everywhere** on a fresh preview branch even though the seed accounts log in fine — this looks
like a bug but is actually just missing test data.

## How to check a given branch quickly

```sql
select
  (select count(*) from training_products where tenant_id = '<tenant_id>') as products,
  (select count(*) from training_product_scope where tenant_id = '<tenant_id>') as scope_rows,
  (select count(*) from q1_tas_builder where tenant_id = '<tenant_id>') as tas_builds,
  (select count(*) from tp_trainers where tenant_id = '<tenant_id>') as trainers,
  (select count(*) from trainer_vocational_competency where tenant_id = '<tenant_id>') as competency_rows,
  (select count(*) from rpl_register where tenant_id = '<tenant_id>') as rpl_rows;
```

Seed tenant IDs (from `supabase/seed.sql`, stable across every branch that's had `seed.sql` run
against it):
- `seed-rto` (Administrator's tenant): `10000000-0000-0000-0000-000000000001`
- `trial-rto`: `10000000-0000-0000-0000-000000000002`

## What's been seeded so far

### PR #334 (`fix/tickets+otherissuesfoundinTAS`) — branch `bmglqiuqthazcdcoyfjk`

Seeded 1 Aug 2026: 5 real qualifications, scoped active to `seed-rto`, so the RPL Register course
picker and TAS builder "Import Units and Packaging Rules" flow have real codes to work with.

```sql
WITH new_products AS (
  INSERT INTO training_products (tenant_id, code, title, status, type, origin, raw_payload)
  VALUES
    ('10000000-0000-0000-0000-000000000001', 'BSB40120', 'Certificate IV in Business', 'Current', 'qualification', 'seed', '{}'::jsonb),
    ('10000000-0000-0000-0000-000000000001', 'BSB50420', 'Diploma of Leadership and Management', 'Current', 'qualification', 'seed', '{}'::jsonb),
    ('10000000-0000-0000-0000-000000000001', 'SIS40221', 'Certificate IV in Fitness', 'Current', 'qualification', 'seed', '{}'::jsonb),
    ('10000000-0000-0000-0000-000000000001', 'CHC43121', 'Certificate IV in Community Services', 'Current', 'qualification', 'seed', '{}'::jsonb),
    ('10000000-0000-0000-0000-000000000001', 'CPP51122', 'Diploma of Property (Agency Management)', 'Current', 'qualification', 'seed', '{}'::jsonb)
  ON CONFLICT DO NOTHING
  RETURNING id, code
)
INSERT INTO training_product_scope (tenant_id, training_product_id, is_active, scoped_at)
SELECT '10000000-0000-0000-0000-000000000001', np.id, true, now()
FROM new_products np;
```

These 5 codes were chosen because they're the exact qualifications already named and reasoned about
in `ticketImplementationplan.md` (CB1's Save-button regression test cases, the Adding Electives
ticket's SIS40221/CPP51122 worked examples) — using the same codes means the branch's own written
test expectations (e.g. "CHC43121 and BSB40120 both hit this") are directly checkable.

Also seeded 1 Aug 2026: one `rpl_register` row using a course code **outside** current active scope
(`ICT30118`, a legacy code not in the 5 above), specifically to exercise WSL9's fix (the course
filter must still be able to match/select a legacy code that's no longer in active scope):

```sql
INSERT INTO rpl_register (custom_id, application_date, student_name, course_code, units_applied_for, assessment_outcome, tenant_id)
VALUES ('RPL-SEED-001', '2026-06-01', 'Test Legacy Applicant', 'ICT30118', 'ICTICT418, ICTPRG418', 'pending_review', '10000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;
```

**Still NOT seeded on this branch** (deliberately — see "Why not seed these via SQL" below):
- No `q1_tas_builder`/`q1_tas_units` rows — no TAS build exists yet for any of these 5 qualifications.
- No `tp_trainers` / `trainer_vocational_competency` rows beyond whatever auto-links from seed
  profiles.

## Why not seed TAS builds / competency rows directly via SQL

`q1_tas_builder` has ~40 NOT NULL columns including several JSONB fields (`packaging_rules`,
`delivery_modes`, `delivery_methodology`, `builder_state`) whose expected shape is produced by the
app itself (AI extraction via `tga-extract-packaging-rules`, the builder's own state machine) — not
documented anywhere as a stable insertable shape. Hand-crafting these via raw SQL risks producing a
"TAS build" that satisfies the DB's NOT NULL constraints but doesn't match what the real app ever
produces, which would give a false pass/fail signal when testing this branch's fixes (several of
which — CB1, CB2, CB3 — specifically depend on the shape of AI-extracted `packaging_rules`).

**Safer path:** now that `training_product_scope` has real qualifications, use the app's own UI to
create a real TAS build (Administrator → Training & Assessment → the TAS builder → new build →
"Import Units and Packaging Rules" against one of the 5 seeded codes). This exercises the actual
extraction edge function and produces genuinely realistic data, which is a better test of the
branch's fixes than synthetic SQL rows would be. Once one real TAS build exists this way, Delivery
Readiness / Trainer Matrix / Adding Electives can all be tested against it directly.

### ⚠️ This safer path is blocked on the seed tenant — confirmed 1 Aug 2026

Attempting to create a TAS build for `seed-rto` fails: the qualification-extraction/TGA lookup flow
needs a **valid, real RTO ID** to call training.gov.au against, and `seed-rto`'s RTO ID (`99999` per
`supabase/seed.sql`) is a placeholder, not a real ASQA-registered RTO. So the AI extraction step
cannot produce real `packaging_rules` data for the seed tenant no matter how `training_products`/
`training_product_scope` are seeded — **this isn't fixable by seeding more rows.**

**Consequence for QA:** any feature that depends on a real TAS build with real extracted packaging
rules (Adding Electives, Delivery Readiness, Trainer Matrix competency-vs-unit testing) cannot be
exercised end-to-end on a seed-tenant preview branch. These need to be tested either:
- against a real tenant with a real registered RTO ID (e.g. via a merge to `main` and testing in
  production with real test accounts on a real RTO), or
- by finding/using an existing real TAS build already on a real tenant, rather than creating a new one.

This is why QA for this branch moved to "commit, push, merge, then continue in production" rather
than continuing to force everything through the seed-tenant preview branch.

## Recommended fix (not done here — flagged for a separate decision)

Either:
1. Add a step to the Supabase Branching / CI setup that runs `supabase/seed.sql` automatically
   against every new preview branch (would need updating `seed.sql` itself to also populate
   `training_product_scope`, not just `tenant_scope_items`), or
2. Keep this manual-seed-per-branch workaround, but make this file's SQL block copy-pasteable with a
   single tenant/branch substitution so it's fast to re-run.

Not attempted as part of this branch's fixes — touches CI/Supabase Branching config, which needs its
own decision, not a drive-by change.
