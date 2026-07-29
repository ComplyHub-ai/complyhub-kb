# Trainer Monthly Report — Stored Period Doesn't Re-Sync If an Earlier Meeting Is Inserted After Report Creation

> Living doc for a single tracked item. Disposable — delete once implementation is done and Brian has
> a separate audit file, per `CLAUDE.md` § "Living-doc workflow." Related: the now-mostly-resolved
> `monthly-reports-trainer-bug.md` items (1, 2, 4, 5, 6) — this is a newly-found edge case in the same
> reporting-period system, found 24 Jul 2026 while confirming that system's behavior post-fix.

## Status: ⬜ OPEN — known limitation, not yet fixed, not urgent

## What it is

`trainer_monthly_reports.period_start`/`period_end` and `meeting_id` are computed **once, at report
creation time**, from whichever governance meeting is nearest in the future at that exact moment
(`src/pages/trainer-portal/monthly-report.tsx:304-318`, the "upcoming meeting" query: `.gte('meeting_date',
todayStr).order('meeting_date', ascending).limit(1)`). Once a report exists, editing it does **not**
re-run this computation — confirmed directly in code
(`src/pages/trainer-portal/monthly-report.tsx:328-337`):

```ts
// When editing, keep the report's stored period; otherwise compute from meetings.
// Legacy reporting_month is derived from the period at submit time (see payload),
// so no effect-based sync is needed here.
const reportingPeriod =
  editReport?.period_start && editReport?.period_end
    ? { start: editReport.period_start as string, end: editReport.period_end as string }
    : computeReportingPeriod(
        lastMeeting?.meeting_date ?? null,
        upcomingMeeting?.meeting_date ?? null
      );
```

So the stored value is authoritative once written — it is never refreshed against the live meeting
schedule again.

## The gap

If a report is created today and anchors to the nearest scheduled meeting (e.g. 28 Aug 2026), and
**afterward** someone schedules an earlier ad-hoc governance meeting (e.g. 10 Aug 2026) — the
already-created report keeps its original stored period (`... – 28 Aug 2026`) and its original
`meeting_id` (pointing at the 28 Aug meeting). It does not pick up the new, earlier meeting at all.

This is the same *class* of bug as Item 4 in `monthly-reports-trainer-bug.md` (a report's stored period
drifting out of sync with live reality) — just triggered by inserting a meeting retroactively, rather
than by a cancellation. Item 4's fix (matching by `meeting_id` in `MonthlyReportsList.tsx`) does not cover
this case, because the report's own `meeting_id` is itself stale in this scenario — matching by it just
confirms a match against the wrong (stale) meeting, it doesn't detect the drift.

## Why it's not urgent

- Requires a specific, fairly unlikely sequence: a report gets created, *then* an earlier ad-hoc meeting
  is scheduled in between the report's creation and its originally-anchored meeting. Normal cadence
  (meetings scheduled well in advance, roughly monthly) doesn't trigger this.
- No data-integrity risk — worst case is a report showing a stale period/meeting link, not incorrect
  submission or a locked draft.
- Found 24 Jul 2026 while verifying the reporting-period system's behavior after Items 1/4/5/6 shipped
  (see `monthly-reports-trainer-bug.md`) — not reported by any user, not observed live yet.

## Options if this needs fixing later

1. **Re-resolve live on every render** (matching Decision 2/3's "live check" philosophy used elsewhere in
   the same bug-fix round) — recompute `meeting_id`/period from the current nearest-upcoming-meeting query
   every time the form loads, instead of trusting the stored value once written. Bigger change — needs to
   handle what happens to a report that's already partially filled in against the old period.
2. **Detect drift and prompt, don't auto-change** — on load, compare the stored `meeting_id`'s meeting date
   against what the live "nearest upcoming meeting" query would return today; if they differ, surface a
   banner ("A governance meeting has been scheduled earlier than this report's period — refresh?") rather
   than silently rewriting the trainer's in-progress draft.
3. **Leave as-is** — accept the edge case as a known limitation given how unlikely the trigger sequence is.

Not yet decided. No code changes made for this — this file exists purely to track the finding so it isn't
lost/forgotten.
