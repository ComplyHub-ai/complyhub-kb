---
name: vacuous-typecheck-command
description: "rto-compass-hub's tsc --noEmit (npm run type-check, pre-push hook, CI's type-check job) checks ZERO files — do not trust it as verification"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5730e265-5131-4a81-83f9-edc012532fe7
  modified: 2026-07-31T02:05:49.888Z
---

`npx tsc --noEmit` (and therefore `npm run type-check`, the `.husky/pre-push` hook, and CI's
"Type check (blocking)" job — all three call this exact command) silently checks **zero files** in
`rto-compass-hub`. Confirmed with `npx tsc --noEmit --extendedDiagnostics` → `Files: 0`, and by
appending a blatant `const x: number = "a string"` to a real file and re-running the command with
exit code 0, no output.

**Why:** the root `tsconfig.json` is a solution-style config — `"files": []` plus
`"references": [tsconfig.app.json, tsconfig.node.json]`. Plain `tsc` (no `--build`) only processes
the root's own (empty) `files` list; it does **not** expand into referenced projects unless invoked
with `tsc --build`. `git log` shows this config has been in place since the "Initial commit from
remix" (~26 Feb 2026) — i.e. this has likely been a no-op in CI the entire time the repo has existed
in its current form, not something introduced recently.

**Consequence, caught live on PR #334:** a genuine compile-time bug — `const qualifyingUnits`
declared inside a `try` block, then referenced from the sibling `catch` block (a real
`ReferenceError`/scope violation, not a style nit) — passed `npx tsc --incremental --noEmit` cleanly
multiple times across two files, because the command checked nothing. It was only caught by Cursor
Bugbot's and Vercel bot's post-push review, which do real semantic/control-flow analysis rather than
relying on `tsc`.

**How to actually verify a change compiles, until this is fixed properly:**
- `npx tsc --noEmit --project tsconfig.app.json` does check real files, but on this machine it OOMs
  (~2GB heap exhausted) on a full non-incremental run — consistent with the existing "`npm run build`
  hangs Brian's workstation" note in `CLAUDE.md`. `npx tsc --build --project tsconfig.app.json` also
  processes real files but is similarly heavy; an incremental `.tsbuildinfo` cache may make repeat runs
  viable but the first run is slow/heavy on this hardware.
- ESLint (`npx eslint <files>`) is TS-aware for style/hook-rule issues but does **not** catch this
  class of bug (block-scope/control-flow compile errors) — don't treat a clean lint pass as a
  substitute for a real type-check.
- Isolated repro is a fast, cheap sanity check for a specific pattern: paste the exact shape (e.g. a
  `const`/`let` declared in `try`, read in `catch`) into a throwaway `.ts` file and run
  `npx tsc --noEmit --strict <file>` directly (no project config) — this DOES check the file, since
  there's no solution-style config involved. Confirmed this catches the exact bug class described above.

**How to apply:** before telling Brian "tsc is clean" on this repo, do not just run
`npx tsc --incremental --noEmit` and treat exit-code-0 as meaning anything — verify file count first
(`--extendedDiagnostics`) or use `--project tsconfig.app.json` (accepting the memory/time cost) or an
isolated repro for the specific pattern in question. This is a repo-wide gap (affects Carl/RJ too,
and CI itself), not a personal workflow issue — flagged to Brian to raise with Carl about fixing
`ci.yml`/`package.json`/`tsconfig.json` properly (likely `tsc --build` with a memory bump in CI, or
restructuring the root config) rather than patching around it silently. See also
[[feedback_dont_trust_doc_snippets_uncritically]].
