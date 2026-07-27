> **Last updated:** 23 Jul 2026 · **Source:** live schema query against the rto-compass-hub Supabase project (`gdwhlstfguxarnxasrrs`) · **Confidence:** high — pulled directly from `information_schema`, not recalled.

# Support Tickets — Schema Map

The "Support Tickets" screen (Manage and triage suggestions, bugs, and feature
requests) is backed by a table literally named `suggestions`, not `tickets`.
Five tables total, all with RLS enabled and `billing_gate`/`write_lock_*`
policies (read via Supabase MCP `execute_sql`, same as any other live-DB check
in this workspace — see `supabase-mcp.md`).

## Tables

### `suggestions` — the ticket record
Key columns:
- Identity: `id`, `tenant_id`, `user_id`, `issue_key`
- Triage: `type`, `suggestion_type`, `category`, `status`, `urgency`,
  `severity_level`, `is_bug`, `is_blocking`, `is_internal`, `is_tenant_visible`
- Ownership: `assigned_to`, `assigned_team`, `triaged_at`, `triaged_by`
- Bug-report fields: `steps_to_reproduce`, `expected_result`, `actual_result`,
  `error_message_seen`, `client_error_fingerprint`, `error_fingerprint`,
  `is_reproducible`, `ui_route`, `app_build_version`, `browser_info`,
  `device_info`, `environment`, `what_were_you_doing`, `what_happened`
- Submitter context: `submitted_by_name`, `submitted_by_email`,
  `submitted_from_route`, `submitted_from_portal`, `submitted_from_role`,
  `source_type`, `source_channel`, `submission_type`
- Resolution: `ready_for_retest`, `retest_required`, `retest_status`,
  `resolution_summary`, `resolved_in_release`, `closed_at`, `closed_by`
- Public-facing status page mirror: `public_status`, `public_outcome`,
  `public_last_updated_at`, `last_public_update_at`
- `description`, `internal_notes`, `title`, `created_at`, `updated_at`

### `suggestion_comments` — the ticket thread
`suggestion_id`, `author_id`/`author_name`/`author_role`, `body`/`comment`,
`is_internal` (internal note vs tenant-visible reply), `tenant_id`, `created_at`

### `suggestion_attachments` — uploaded files
`suggestion_id`, `file_name`, `storage_path`, `content_type`,
`file_size_bytes`, `uploaded_by` — storage path only, never fetch/display file
contents without checking what's actually in the bucket first.

### `suggestion_activity_log` — status/audit trail
`suggestion_id`, `activity_type`, `old_value`, `new_value`, `actor_id`/`actor_name`,
`notes`, `created_at` — this is what feeds the status transitions (New → Under
Review → In Progress → Ready for Retest → Closed).

### `suggestion_views` — read receipts
`tenant_id`, `suggestion_id`, `profile_id`, `last_viewed_at`

### Rollup views
`v_suggestions_tenant_health_detailed`, `v_superadmin_suggestions` — pre-joined
views for dashboard/health-score use; check their definitions with
`execute_sql` before relying on them, they may filter or aggregate in ways
that don't match a raw `suggestions` query.

## Ready-to-use queries

Open, high-urgency, unassigned:
```sql
select id, issue_key, title, type, urgency, severity_level, status, tenant_id, created_at
from suggestions
where status not in ('closed', 'declined')
  and urgency in ('high', 'critical')
order by created_at asc;
```

Full thread for one ticket (comments + activity, chronological):
```sql
select 'comment' as kind, created_at, author_name as actor, coalesce(body, comment) as text
from suggestion_comments where suggestion_id = :id
union all
select 'activity', created_at, actor_name, activity_type || ': ' || coalesce(old_value,'') || ' -> ' || coalesce(new_value,'')
from suggestion_activity_log where suggestion_id = :id
order by created_at;
```

Bug tickets with repro info, for feeding straight into `complyhub-bug-fix`:
```sql
select issue_key, title, ui_route, steps_to_reproduce, expected_result,
       actual_result, error_message_seen, app_build_version, browser_info
from suggestions
where is_bug = true and status not in ('closed', 'declined')
order by urgency desc, created_at asc;
```

## Confidentiality note

`tenant_id`/`submitted_by_email`/`submitted_by_name` on a ticket identify a
specific tenant. Per workspace guardrails, never cross-reference one tenant's
ticket into another tenant's work, and de-identify (drop tenant/submitter
fields) before including ticket content in anything externally shareable.
