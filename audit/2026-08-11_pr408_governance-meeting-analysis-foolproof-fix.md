# Audit — PR #408

> **Date:** 11 August 2026 (audit written); **Merged:** 11 August 2026
> **Scope:** Governance meeting close/AI-analysis flow — made it impossible to close a meeting in a
> broken/unanalysed state; fixed the underlying pipeline bugs that caused the original incident
> **Project:** `gdwhlstfguxarnxasrrs` · **Living doc:** none — worked directly in conversation, no
> intermediate `.md` file created for this body of work

---

## Summary

Started from a real incident: a consultant (Nova, AJ's colleague) ran a governance meeting for tenant
AHMRC, uploaded a transcript when closing it, but no action items were ever generated in Action
Follow-up — silently, with no error, and no way back in once the meeting's date passed (a separate
"Live Meeting" tab only ever loads meetings dated today-or-later). Root-caused via live DB
(`governance_meeting_history`, `governance_meeting_minutes.artefact_refs_json`) to three compounding
gaps, then widened during implementation to five more once the fix was underway. Manually unblocked
AHMRC's specific meeting first (extracted the two real action items from the transcript by hand,
inserted the tasks directly), then built the permanent fix — Approach B: make the close action itself
refuse to complete in a broken state, enforced at the database level, not just patched in the UI.

**Branch:** `fix/governance-meeting-analysis-foolproof` (not yet deleted) · **Merge commit:**
`256638bcc` · **Merged:** 11 Aug 2026 · **Migration:** `20260811025625`

## Root cause (original incident)

1. Uploading a transcript only stored the file — it never fed the file's text into anything unless a
   separate "Generate AI Analysis" button was also clicked in the same browser session.
2. Even when analysis ran automatically on close, nothing converted the AI's extracted actions into
   real `tasks` rows (what Action Follow-up actually reads) unless a human separately opened a review
   panel and clicked "Apply" — never wired into the automatic path.
3. The meeting detail drawer's empty-state UI hid its own "Add Notes"/"Run AI Analysis" recovery
   buttons whenever a file had been uploaded but not analysed — a dead end once the meeting's date
   passed and the Live Meeting tab could no longer reach it.

## Fixes shipped in PR #408

### Database — close gate (migration `20260811025625_add_governance_meeting_analysis_gate.sql`)

- Added `ai_analysis_completed_at` (timestamptz) and `no_actions_confirmed` (boolean) to
  `governance_meeting_minutes`.
- `assert_meeting_closeable()` re-created with one new guard: a meeting cannot close unless analysis
  genuinely completed or a human explicitly waived having any action items. Diffed against live
  `pg_get_functiondef` before writing — confirmed every pre-existing guard (active-tenant,
  meeting-tenant-ownership, trainer-report-review, SSO-report-review) reproduced byte-for-byte, no
  drift.

### `governance-meeting-analyser` edge function

- Fixed a stale storage bucket reference (`meeting-documents` → `tenant-documents`) that silently
  broke every file-based analysis attempt since an earlier bucket-consolidation migration.
- Unreadable/unsupported files (PDF, corrupt DOCX, unknown type) now return an explicit error instead
  of a placeholder string that would have satisfied the close-gate for content nobody actually
  analysed — but only when there's no `raw_content` to fall back on; typed notes are still analysed
  even if an attached file couldn't be read.
- Now reads an uploaded transcript even when typed notes are also present in the same request
  (previously one silently discarded the other) — combines both into `raw_notes_text`.
- Auto-creates real `tasks` (+ `calendar_events`) rows from extracted actions server-side, so Action
  Follow-up populates without a separate manual "Apply" step — idempotency-guarded (skips if the
  meeting already has linked tasks) and opt-out via `auto_create_tasks` for the one caller
  (Live Meeting tab's manual review-then-apply flow) that already creates tasks itself.
- Added a cross-tenant IDOR fix: verifies `meeting_id` and `storage_path` actually belong to the
  caller's `tenant_id` before touching anything — previously membership only proved the caller
  belonged to *some* tenant, so a member of tenant A could pass another tenant's `meeting_id` or
  `storage_path` and the service-role client would read/write against it.
- Coerces an out-of-range AI-suggested task priority to `medium` instead of silently dropping the
  whole action on a `tasks_priority_check` violation.

### Frontend — upload modal, drawer, History, close-flow

- `MeetingMinutesUploadModal.tsx`: analysis now runs automatically on Save/Close instead of a separate
  button; a "no action items" waiver checkbox is always visible and can override a failed/unsupported
  analysis attempt; files are uploaded once per session (cache invalidated on file
  change/remove/replace) and `artefact_refs_json` merges are deduped by `storage_path` so retries
  can't create duplicate entries.
- `MeetingDetailDrawer.tsx`: fixed the empty-state bug hiding recovery buttons whenever a file existed
  without typed notes; added a permanent, always-visible analysis-status card reachable from History
  regardless of the meeting's date; all data fetching/mutations moved into a new
  `useMeetingDetailActions` hook (was previously calling Supabase directly in the component body —
  pre-existing architecture debt fixed while already touching this file).
- `useAutoAnalyseMeetingOnClose.ts`: now looks up both typed notes and an uploaded transcript
  regardless of which is present, and skips entirely if the meeting is already analysed or waived
  (previously would silently re-run and potentially overwrite minutes with a different
  non-deterministic AI result).
- `HistoryTab.tsx`: new "Needs Analysis" badge on any past meeting with real content but no resolved
  gate, refreshed live via the drawer's `onStatusChange` callback.
- `useGovernanceActionSync.ts` (pre-existing file, not otherwise part of this fix): fixed the same
  invalid `calendar_events.event_type` value (`'governance_action'` → `'task_due'`, confirmed against
  the live CHECK constraint) that the edge function fix above also had — this path's calendar events
  had been silently failing to save since the feature was built. Also fixed two banned `.single()`
  calls and removed a stale `@ts-nocheck` that no longer suppressed anything (confirmed clean without
  it) while already touching the file.

### Bot review round (Cursor Bugbot + Vercel bot, post-push)

All 8 findings verified real against HEAD (no false positives):
- Upload cache going stale on file removal/replace, causing duplicate artefact refs on retry.
- Unsupported file hard-blocking otherwise-good typed notes (a regression from the notes+transcript
  merge fix above).
- Close-path safety net re-running analysis after the modal already succeeded or the user waived it.
- A successful analysis's persisted notes+transcript merge being immediately overwritten by a second
  save call using typed notes alone.
- Two more callers (drawer, auto-close hook) reintroducing the "one or the other, not both"
  notes/transcript gap the edge function fix already covered.
- A stale-closure bug where a toast read React state immediately after the setter that would update
  it, before the re-render landed.
- The cross-tenant IDOR (Vercel) — see above.

**Mid-review complication:** while fixing these, the **Cursor Bugbot auto-fix feature independently
pushed its own commit** (`18f7fa80e`, author `Cursor Agent <cursoragent@cursor.com>`) to the same
branch, fixing 6 of the same 8 findings in a functionally equivalent way — but missing the IDOR fix
entirely and with no added test coverage. Not triggered by Brian (confirmed "no I did not click, it's
automatic"). Reconciled via `git merge -X ours` (verified diff-by-diff first that nothing unique from
the bot's commit was being dropped), then caught and fixed one real bug the auto-merge introduced on
its own — a stray leftover call using a pre-merge function signature, which would have been a type
error and double-persisted on every successful analysis. **Action item for Brian:** turn off Bugbot
auto-fix from Cursor's dashboard for this repo — it isn't controlled from repo config, so it could
collide with in-progress work again.

**Test coverage:** 29 tests total (migration content, edge function behaviour incl. IDOR guards,
modal gating/retry/dedup, hook fixes, calendar_events fix) — all passing. Type-check and lint clean
throughout every round.

## Production rollout (post-merge)

1. **Schema change applied to production** via Supabase MCP `execute_sql` (not `apply_migration`, per
   this repo's interim migration procedure) — both new columns and the recreated function, verified
   live afterward via `information_schema.columns` and `pg_get_functiondef`. Confirmed no drift on the
   live function immediately before applying (re-checked, since time had passed since the original
   diff-based check).
2. **Migration ledger repaired** — Brian ran `supabase migration repair --status applied 20260811025625`
   from his terminal; confirmed `version`/`name` match the file exactly
   (`add_governance_meeting_analysis_gate`) in `supabase_migrations.schema_migrations`.
3. **Edge function deployment confirmed** — `get_edge_function` showed the live
   `governance-meeting-analyser` already matching git exactly, including the IDOR fix; this repo's CI
   auto-deploys Supabase edge functions on merge to `main`, no manual deploy step needed.
4. **Vercel production build confirmed `READY`** for the merge commit (`dpl_3BB1SmZdP5R674keRpLE8JRJu366`).

Deploy-ordering risk flagged pre-merge (migration must land before/with the frontend deploy, not
after, or minutes-saving would break for everyone in the gap) — mitigated by applying the schema
change manually via MCP immediately after confirming the merge, ahead of relying on any automatic
ordering between the two deploy pipelines.

## Still open / follow-up

- **Cursor Bugbot auto-fix setting** — not yet disabled (external to this repo, needs Brian in
  Cursor's dashboard). Until then, any future bot-finding round on an in-progress branch risks the
  same collision.
- **Live Meeting tab's date filter** (only loads meetings dated today-or-later) was deliberately *not*
  fixed — Approach B's drawer-based "Needs Analysis" recovery path (reachable from History regardless
  of date) was judged sufficient and lower-risk than changing the Live Meeting tab's meeting-picker
  query. Worth a small follow-up if a future incident specifically needs a reopened past meeting
  visible in that tab too.
- **Manual QA on production** — not yet performed by a human: upload a transcript and close a meeting
  end-to-end, confirm a task appears in Action Follow-up; try closing with an unsupported file and
  confirm the waiver checkbox actually unblocks it; open a past meeting only ever touched via the old
  flow and confirm the "Needs Analysis" badge/recovery path works from History.
- AHMRC's specific 07 Aug 2026 meeting was already manually unblocked earlier in this session (2 tasks
  inserted directly, assigned to Gemma Frith and Chris Margaritis) — that data fix is independent of
  and unaffected by this code fix.

## Soak status

No feature flag, no gradual rollout — the close-gate is enforced immediately for every tenant as of
the migration apply above. Any meeting currently `scheduled`/`in_progress` with no minutes content
will now be blocked from closing via the normal flow until analysed or waived; already-`completed`
meetings are untouched (the gate only fires inside `governance_meeting_end`, which no-ops on rows
already closed). Worth keeping an eye on support tickets in the next few days in case a tenant hits
the new gate on a meeting they expect to close trivially with no content.
