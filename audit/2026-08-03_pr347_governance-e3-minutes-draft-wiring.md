# Audit — Governance E3: Generate Minutes Wiring

**Date:** 3 August 2026
**Branch:** `fix/governance-e3-minutes-wiring` (deleted post-merge, local; remote auto-deleted on merge)
**PR:** [#347](https://github.com/ComplyHub-ai/rto-compass-hub/pull/347) — merged to `main`
**Source:** RJ's daily ticket batch, Item "Governance E3 — Verify frontend wiring"

## What was fixed

The completed-meeting "Generate Minutes" button (`LiveMeetingTab.tsx`) called
`generate-governance-minutes` (v3) via `useGenerateMeetingMinutes`. That function is not independent —
it's a thin wrapper that itself calls `governance-minutes-draft` (v5) server-side, invisible in a
browser Network tab — while hardcoding `regenerate: true` on every invocation (no first-draft-only
behaviour) and dropping `summary` entirely from what it returned to the frontend.

A separate component, `MeetingMinutesSection.tsx`, already implemented the correct behaviour exactly as
specified — direct POST to `governance-minutes-draft` with `{ meeting_id, regenerate }` + the user's JWT,
correct handling of `formatted_minutes`/`summary`, and a real Regenerate-with-confirmation flow — but had
no caller anywhere in the app (confirmed via repo-wide grep before touching anything).

Fix: mount `MeetingMinutesSection` in `LiveMeetingTab.tsx` once a meeting is completed
(`meetingStartedAt && meetingEndedAt`), in place of the old button + `useGenerateMeetingMinutes` +
`MinutesPreviewPanel` combination. Deleted `useGenerateMeetingMinutes.ts` and `MinutesPreviewPanel.tsx` —
both fully orphaned after the swap (verified no other consumers before deleting).

**Scoping decision:** displaying `summary` on a Governing Person dashboard card (part of the original
ticket wording) was left out of this PR — no such card exists anywhere yet (checked `CeoGovernancePortal.tsx`
and elsewhere), so it's net-new UI, not a wiring fix. Confirmed with RJ before shipping; tracked as a
separate follow-up.

**UX change worth knowing:** the "Generate Minutes" button no longer sits in the toolbar — the whole
draft/regenerate flow now lives inside the new "Meeting Minutes" card itself (which has its own "Draft
Minutes with AI" button), appearing below the toolbar once a meeting is completed. Flagged to RJ
alongside the PR link as a layout change, not just a swapped endpoint.

## Blast radius

- `src/components/governance/tabs/LiveMeetingTab.tsx` — completed-meeting toolbar + bottom panel render
- `src/components/governance/MinutesPreviewPanel.tsx` — deleted (no other callers)
- `src/hooks/governance/useGenerateMeetingMinutes.ts` — deleted (no other callers)
- `src/components/governance/MeetingMinutesSection.tsx` — unchanged, gained its first real caller
- `generate-governance-minutes` edge function — left deployed but now unused; retiring it is a separate
  decision, not actioned here
- "Notify Governing Persons" button — confirmed independent (own mutation, own meeting_id/tenant_id args),
  unaffected by this change

## DB/RLS impact

None. `governance-minutes-draft` (v5) already had correct tenant/role gating; no schema or RLS change
involved — this was purely a frontend wiring correction.

## Files changed

- `src/components/governance/tabs/LiveMeetingTab.tsx` (modified)
- `src/components/governance/MinutesPreviewPanel.tsx` (deleted)
- `src/hooks/governance/useGenerateMeetingMinutes.ts` (deleted)

## Commit

- `95921cb72` — single commit, all three file changes

## Not yet tested

No browser/DevTools access in this session — verified via source trace (confirmed the wrapper's
server-side delegation, hardcoded `regenerate: true`, dropped `summary`; confirmed `MeetingMinutesSection`
had zero callers before wiring it in) and a clean `eslint --max-warnings=0` pass, not a live click-through.

RJ to confirm live: completed meeting shows the new "Meeting Minutes" card (no separate toolbar button);
clicking "Draft Minutes with AI" shows a Network tab POST to `governance-minutes-draft` (not
`generate-governance-minutes`) with the drafted minutes + executive summary rendering; "Regenerate" on a
meeting that already has minutes shows the confirmation dialog and sends `regenerate: true`; "Notify
Governing Persons" still works.
