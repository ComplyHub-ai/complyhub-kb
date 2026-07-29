---
name: feedback-handover-scope
description: "Handover text must cover only the next single step/PR, not the full remaining roadmap"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 44ba1363-2be5-4375-8cca-ab1bae04c032
  modified: 2026-07-27T02:35:20.178Z
---

When giving a handover text block (see the general handover-prompt practice) during multi-PR work like the rto-compass-hub PR cleanup, scope it to ONE step or ONE PR (or however many PRs make up the *next* discrete unit of work) — never restate the entire remaining queue/roadmap.

**Why:** Brian explicitly corrected this — the full plan already lives in the tracking doc (`pr-review-open-prs.md`); repeating it in every handover is noise he has to read past each time, and defeats the point of a lightweight handover.

**How to apply:** A handover should say: what was just done, what the single next action is (name the PR(s) involved in just that step), and where the full plan/doc lives if more context is needed. Do not list "then #X, then #Y, then #Z..." for everything still pending — that belongs only in the tracking doc, not the handover.
