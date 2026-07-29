---
name: feedback-pr-audit-functional-deps
description: "PR cross-referencing must check functional/runtime dependencies between PRs, not just file-line conflicts"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 44ba1363-2be5-4375-8cca-ab1bae04c032
  modified: 2026-07-27T02:35:26.272Z
---

When auditing multiple open PRs against each other (see [[project_pr_review_open_prs]]), checking for git merge-tree conflicts and file overlap is NOT enough. A PR can dry-run merge perfectly clean and still be unmergeable/broken on its own because it depends on something (a hook, a type, a helper, a migration, an edge function) that only exists in a *different* open PR, not yet on `main`.

**Why:** Brian caught this directly — #165 was rated "clean, no real overlap with #166 (just a trivial adjacent-import conflict)" but actually could not be merged/build without a fix that only existed in #166. The original audit treated file-overlap as the only signal of cross-PR relationship and missed the functional dependency.

**How to apply:** For every PR in a batch review, beyond `git merge-tree` diffing:
1. Check whether the PR's diff *references* anything (imports, hook calls, RPC/edge function names, types) that doesn't already exist on `main` and isn't added within that same PR's diff — if so, check every other open PR to see if it's the source.
2. When two PRs touch the same feature area (e.g. same module/page), don't stop at "do they conflict on the same lines" — ask "would PR A actually build/run correctly on `main` alone, without PR B."
3. Where feasible, actually attempt a build/typecheck of the dry-run-merged result rather than trusting a clean text merge as proof of mergeability.
