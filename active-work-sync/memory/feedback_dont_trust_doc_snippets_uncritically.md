---
name: dont-trust-doc-snippets-uncritically
description: "Living-doc \"exact code\" snippets can themselves contain bugs — trace control-flow/scoping yourself, don't transcribe verbatim on trust"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5730e265-5131-4a81-83f9-edc012532fe7
  modified: 2026-07-31T02:06:03.452Z
---

A living-doc implementation plan (`ticketImplementationplan.md`, CB6 — bulk trainer assignment
batching) specified an "exact new code" snippet that declared `const writtenIds`/`const qualifyingUnits`
with `writtenIds` outside `try` (correct) but `qualifyingUnits` **inside** the `try` block, then had the
`catch` block's toast message read `qualifyingUnits.length`. That's a real scope violation — a `const`
declared inside `try` is not visible in the sibling `catch` block — but it read as plausible on a
skim, and [[feedback_vacuous_typecheck_command]] meant `tsc` never caught it either. It shipped in the
initial commit and was only caught by Cursor Bugbot / Vercel bot on the pushed PR.

**Why this matters:** a doc marked "LOCKED — approved as written" or "exact code, verified against
branch HEAD" is a claim about *what the doc author intended*, not a guarantee the snippet is
control-flow-correct. Docs get this wrong the same way any code review can miss a scoping bug —
especially across `try`/`catch`, closures, or conditional branches where a variable's declared block
and its usage site are visually close but structurally siblings, not parent/child.

**How to apply:** when implementing a locked plan's "exact code" block, don't just diff it against the
current file and paste — mentally trace (or isolate-test, see
[[feedback_vacuous_typecheck_command]]) any variable that crosses a `try`/`catch`, loop, or conditional
boundary between where it's declared and where it's read. This is a cheap, fast check
(seconds per variable) relative to the cost of a shipped scope bug reaching a bot/human reviewer
instead of being caught before the first push. Apply this scrutiny even when the plan doc is
explicitly "LOCKED" or "approved as written" — locked means the *decision* is final, not that the
literal code is bug-free.
