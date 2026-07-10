# Diagnosis discipline

> Moved from `CLAUDE.local.md` (10 July 2026). Content unchanged from the original. Kept as team-wide reference since these lessons apply to anyone diagnosing bugs in this codebase, not just Brian.

## Trace the full flow — never hand off mid-chain

When diagnosing a bug or tracing a feature, follow the execution path all the way to the end before reporting findings. Do not stop at a plausible-looking file or function and hand the problem back with "this is probably where it is." That approach misses bugs and adds unnecessary work hours.

The complete trace means:
- User action → component → hook → RPC/edge function → DB function → return value → UI render
- Follow every branch of the chain that could affect the outcome
- Confirm each step is actually called in the right context (grep callers, don't assume)
- Only report findings once the full path is traced and the root cause is confirmed, not suspected

If the trace is genuinely blocked (e.g., missing source, external service), state exactly where it stops and why — not just "it might be here."

## DB data-state check — standard diagnosis step

For any bug report involving data not loading, links not working, or content appearing missing: query the relevant database rows early in the diagnosis — before theorising about code causes. The actual data state (status, token, expiry, flags) resolves most hypotheses in a single step and avoids chasing the wrong fix. Use the Supabase MCP server (read-only) as the first investigative tool, not the last.

## Learned from NEW-013 multi-attempt failure

These rules apply to every bug fix, not just QA findings. Violating them is how a fix lands in the wrong file and wastes iterations.

1. **Trace the execution path from the user action, not from the plausible-looking file.** Start at the button click / route load / login event and follow the code forward to the actual decision point. Do not start at the file you expect is responsible.

2. **Grep callers before editing any function.** If you cannot see the function being called from the right place, you have not found the right fix target. (`routeAfterLogin` looked correct but was only called from `ResetPassword` — not normal login.)

3. **For switch/case blocks or arrays of roles — audit every entry.** When fixing one case, read every other case in the same block. Ask: does each entry have a corresponding config? This is how the Consultant sidebar bug was missed when fixing CM's case.

4. **For a directory of similar files — check all files for the same pattern.** When fixing one guard, grep all guards in the same folder for the same wrong value before reporting the BRC as clean.

5. **For context-switching bugs — query the DB early.** Check `profiles.active_tenant_id` and `tenant_members` for the affected user before theorising. The actual DB state resolves hypotheses in one step.

6. **Before routing any previously-unrouted component — cross-reference every DB field name used in the component against `src/types/` and the actual schema.** A feature parity check (does it have the right columns, the right form?) does NOT substitute for a field-name correctness check (are the actual property names correct?). This step is mandatory when the file has `// @ts-nocheck` on line 1 — TypeScript cannot catch mismatches, so the cross-reference must be done manually. Failure to do this was the root cause of the MCN register white screen (PR #98 route switch, July 2026): `change_title`, `description_of_change`, `submitted_to_asqa`, and `date_of_change` were used throughout `mcn/index.tsx` but none of them exist on `MCNRegister` — the correct fields are `title`, `change_description`, `date_submitted`, and `change_date`.
