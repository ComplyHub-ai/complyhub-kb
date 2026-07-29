---
name: feedback-multi-item-fix-completeness
description: "Always re-check a multi-part fix against the original full list of affected items before applying/shipping, not a mental list built partway through the conversation"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 41caf249-3ab1-4ae6-a63a-d9dab9d674de
  modified: 2026-07-27T02:35:32.569Z
---

When a diagnosis identifies N broken items (e.g. N functions/files all referencing the same bad reference), and the conversation then spends most of its time deep-diving a subset of them (because that subset raised a harder decision), do not let that subset become the de facto "fix list." Before writing/applying the actual fix, re-grep or re-list against the *original* full finding — do not rely on memory of "the ones we've been discussing."

**Why:** On the ComplyHub `email_domain_rules` cleanup (10 July 2026), 5 functions were correctly identified as referencing a dropped table. Discussion focused on 3 of them (a harder call: retire vs rebuild a feature) plus a 4th got folded in. The 5th — `find_tenant_by_email_domain`, the original function that started the whole investigation — had already been explained earlier and was mistakenly treated as "already handled." It was left out of the migration, which was then applied to production, still leaving the original reported bug unfixed. Caught only because the user asked for a post-fix verification grep.

**How to apply:** For any fix spanning multiple items (files, functions, PRs, findings), before marking it complete:
1. Re-derive the original full list (grep/list again — don't trust notes from earlier in the conversation).
2. Diff it against what the actual fix/migration touches.
3. Only after they match, apply/ship, then verify directly against the live system (not just "the diff looks right") — e.g. re-query the DB for any remaining bad references after applying a migration, as was done successfully once this was caught.

This applies especially in long conversations where the main gathered context has been summarized/compacted — a stale mental list is easy to trust when the full derivation is not re-run.
