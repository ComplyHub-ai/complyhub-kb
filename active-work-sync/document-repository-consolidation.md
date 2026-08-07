# Document Repository Consolidation — Soak Watch

**Status (6 Aug 2026):** Implementation complete. All migrations applied, code repointed, soak timers running.
**Waiting on:** 14-day soak (~17–20 Aug 2026), then source-bucket decommission with explicit approval.

**Full history:** [`complyhub-kb/audit/2026-08-06_document-repository-consolidation-index.md`](complyhub-kb/audit/2026-08-06_document-repository-consolidation-index.md) (19 PR audit entries).

**Project:** `gdwhlstfguxarnxasrrs` ("ComplyHub Project")

---

## What happens after soak

1. Confirm soak monitor shows no new violations (or only known pre-migration ones).
2. Brian manual QA as non-SuperAdmin tenant user (branding/avatar uploads — PR #385 scope) if not done yet.
3. **Explicit Brian approval** before deleting any source bucket objects or dropping buckets.
4. Decommission each source bucket as a separate, explicitly-approved action (not automatic).

**Already decommissioned (outside soak gate):** `organization-logos` (4 orphan objects, PR #386).

---

## Source buckets — soak schedule

All 21 watched buckets have active timers in `storage_soak_buckets` (seeded migration `20260806120900`; PR #384 batch started `2026-08-06 07:20:29 UTC`).

| Source bucket | Target bucket | Soak completes (UTC) | PR |
|---|---|---|---|
| `documents` | `tenant-documents` | 17 Aug 2026 | #353 |
| `evidence-private` | `tenant-documents` | 18 Aug 2026 | #364 |
| `trainer-credentials` | `tenant-documents` | 18 Aug 2026 | #367 |
| `trainer-evidence` | `tenant-documents` | 18 Aug 2026 | #367 |
| `qi-evidence` | `tenant-documents` | 19 Aug 2026 | #378 |
| `branding` | `tenant-branding` | ~20 Aug 2026 | #385 |
| `organisation-assets` | `tenant-branding` | ~20 Aug 2026 | #385 |
| `avatars` | `user-avatars` | ~20 Aug 2026 | #385 |
| `dap-documents` | `tenant-documents` | ~20 Aug 2026 | #385 |
| `industry-evidence` | `tenant-documents` | ~20 Aug 2026 | #385 |
| `TAS-attachments` | `tenant-documents` | ~20 Aug 2026 | #384 |
| `evidence-complybot` | `tenant-documents` | ~20 Aug 2026 | #384 |
| `audit-reports` | `tenant-documents` | ~20 Aug 2026 | #384 |
| `rpl-attachments` | `tenant-documents` | ~20 Aug 2026 | #384 |
| `pli-evidence` | `tenant-documents` | ~20 Aug 2026 | #384 |
| `fpp-evidence` | `tenant-documents` | ~20 Aug 2026 | #384 |
| `meeting-documents` | `tenant-documents` | ~20 Aug 2026 | #384 |
| `tenant-evidence-private` | `tenant-documents` | ~20 Aug 2026 | #384 |
| `compliance-evidence` | `tenant-documents` | ~20 Aug 2026 | #384 |
| `suggestion-attachments` | `tenant-documents` | ~20 Aug 2026 | #384 |
| `tas-imports` | `tenant-documents` | ~20 Aug 2026 | #384 |

**Rule:** Leave source bucket *objects* in place until soak completes. The monitor only watches for *new* writes during soak — it never deletes or moves anything.

**Live dates:** query `storage_soak_buckets` (see SQL below) — authoritative over this table if they drift.

---

## Soak monitor cron — live (PR #386)

**Migrations (applied + ledger synced):**
- `20260806120800` — `storage_soak_buckets` table + `run_storage_soak_monitor()` RPC
- `20260806120900` — seed 21 source buckets
- `20260806121000` — pg_cron schedule

**Edge function:** `storage-soak-monitor` deployed (optional manual trigger only — scheduled runs call the SQL RPC directly).

**Schedule:** Every night at **03:00 UTC**, job `storage-soak-monitor-daily` (pg_cron job id 50) runs `SELECT public.run_storage_soak_monitor();`.

**Note:** The migration's `app.settings.env = 'production'` guard does not work on hosted Supabase (permission denied on `ALTER DATABASE SET`). Brian rescheduled the job directly in SQL Editor.

**What it checks:** For each active row in `storage_soak_buckets` with a `soak_started_at`, scans `storage.objects` for files whose `created_at` is **on or after** soak start. Pre-migration files are ignored.

**Alerts written to `admin_audit`:**
- `storage_soak_violation` — new write detected in a legacy source bucket during soak
- `storage_soak_check_clean` — nightly heartbeat when all watched buckets are clean

Dedup: re-alerts only if sample paths change or 24+ hours since last alert for that bucket.

**v1 has no email/Slack/push** — check logs manually using one of:

### 1. SQL (fastest — Supabase SQL editor or MCP `execute_sql`)

```sql
-- Last 20 soak monitor events
SELECT action, target, payload, created_at
FROM public.admin_audit
WHERE action IN ('storage_soak_violation', 'storage_soak_check_clean')
ORDER BY created_at DESC
LIMIT 20;

-- Current watch list + last alert time per bucket
SELECT bucket_id, soak_started_at, soak_ends_at, active, last_alerted_at, notes
FROM public.storage_soak_buckets
ORDER BY soak_started_at NULLS LAST, bucket_id;

-- On-demand manual run (returns JSON summary)
SELECT public.run_storage_soak_monitor();
```

### 2. SuperAdmin UI

**SuperAdmin → Analytics** (uses `sa_audit_query`, which merges `admin_audit` rows).
Filter/scan for actions `storage_soak_violation` or `storage_soak_check_clean`.

**Note:** **SuperAdmin → Audit Trail** reads `admin_action_log` — a different table. Soak alerts will **not** appear there.

### 3. pg_cron job health

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'storage-soak-monitor-daily';
```

### 4. Edge function logs (manual HTTP trigger only)

Supabase Dashboard → **Edge Functions** → `storage-soak-monitor` → **Logs**.
Invoke manually as SuperAdmin or with `x-cron-secret` header (env: `STORAGE_SOAK_MONITOR_CRON_SECRET`).
Scheduled runs do **not** hit the edge function — they call the SQL RPC directly.

**Optional:** Set `STORAGE_SOAK_MONITOR_CRON_SECRET` in Supabase if using the HTTP trigger path.
