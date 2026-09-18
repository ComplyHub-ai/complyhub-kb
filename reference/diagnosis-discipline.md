> **Last updated:** 18 Sep 2026 · **Reconsider by:** 18 Mar 2027 · **Confidence:** high — consolidated from prior incident write-ups plus `/fresh-eyes`'s standing review principles.

# Diagnosis discipline

Consolidated 18 Sep 2026: previously a chronological list of "Learned from PR/finding X" incident
write-ups. The incident narratives are gone — they're what happened once, not what to do next time.
What's kept below is the durable principle each one produced, plus the reusable principles
`/fresh-eyes` already applies on every adversarial branch review, so both live in one place instead
of two.

## Trace the full flow — never hand off mid-chain

When diagnosing a bug or tracing a feature, follow the execution path all the way to the end before
reporting findings. Start at the actual user action (button click, route load, login event) and
follow the code forward — not at the file that merely looks responsible. Don't stop at a
plausible-looking file and hand the problem back with "this is probably where it is."

The complete trace means:
- User action → component → hook → RPC/edge function → DB function → return value → UI render
- Follow every branch of the chain that could affect the outcome
- Confirm each step is actually called in the right context — grep callers, don't assume
- Only report findings once the full path is traced and the root cause is confirmed, not suspected

If the trace is genuinely blocked (missing source, external service), state exactly where it stops
and why — not just "it might be here."

## DB data-state check — standard first step, not a last resort

For any bug involving data not loading, links not working, or content appearing missing: query the
relevant database rows early — before theorising about code causes. The actual data state (status,
token, expiry, flags) resolves most hypotheses in a single step. Use a read-only DB query as the
first investigative tool, not the last.

## Grep callers before editing any function

If a function's real callers can't be seen from the place being fixed, the right fix target hasn't
been found yet. A function that looks correct in isolation can be called from the wrong place
entirely — verify the actual call site, not the assumed one.

## Audit every entry in the same block, not just the one being fixed

Switch/case blocks, role arrays, and directories of similar files (guards, configs) tend to share
one bug across every entry, introduced once and copied forward. When fixing one case, read every
other case in the same block and ask: does each entry have the equivalent config the one being
fixed just got? When fixing one guard, grep every guard in the same folder for the same wrong value
before reporting the broader area clean.

## Cross-reference field names against the actual schema before wiring up a component

A feature-parity check (does it have the right columns, the right form?) does not substitute for a
field-name correctness check (are the actual property names correct?). This is mandatory when the
file has `// @ts-nocheck` — TypeScript cannot catch a field-name mismatch there, so it has to be
done manually against `src/types/` and the live schema.

## A live DB fetch alone is not proof of the correct guard set

Reading a function's live definition before `CREATE OR REPLACE` protects against dropping something
yourself — it does not protect against the live database already being **behind** what's merged in
git. Before replacing an existing function, in addition to fetching its live definition, check
`git log` (content search, not filename) for any migration touching that function more recent than
what the live fetch reflects. If one exists, check `list_migrations`/`schema_migrations` for a
version gap before treating the live fetch as ground truth.

## Before deleting anything, search for the literal identifier — not a call-pattern grep

"Is this still referenced?" checked via one specific call shape (e.g. `storage.from('<id>')`) misses
references held as a **string value inside a config/lookup/dispatch object**, resolved dynamically
at runtime. Before deleting or dropping anything (buckets, tables, columns, functions):

1. Search for the literal identifier as an unrestricted string, no method-call wrapper assumed,
   across the entire relevant codebase (frontend and edge functions both) — a cheap false positive
   beats a missed true one.
2. Explicitly check config objects, lookup/dispatch maps, and `Record<string, ...>`-shaped
   structures separately — edge functions are easy to under-scrutinize relative to frontend screens.
3. Only after the unrestricted pass is clean does a narrower, call-pattern-specific search count as
   confirmation, never as the sole check.
4. Re-run the check immediately before executing the delete, not just once during planning — code
   can change between the two points.

## A "skip if already done" guard must read live state, not a client-side cache

A check like "has this already run" that reads a client-side cache can't see a *previous* attempt at
the same operation that partially failed. Ask explicitly: if this exact code path partially failed
and the user retries, what does the check actually see? The guard must query the database directly,
immediately before deciding.

## `.insert(...).select(...)` depends on the SELECT policy too, not just INSERT

Confirming the INSERT policy allows a role is not "permissions checked" if the code also reads the
row back (`.select().maybeSingle()`) — that triggers a separate SELECT RLS check. A role that can
insert but can't read back its own new row makes the insert silently succeed while the code treats
the null read-back as a failure. Check the SELECT policy for every role the write path needs to
support, or avoid the read-back entirely (client-generated `secureId()`, no `.select()`).

## A blanket policy across many tables needs a per-table check, not one batch review

A single RESTRICTIVE (or otherwise AND-combining) policy applied across a loop of many tables in one
migration must be checked **one table at a time**, not once against the batch's stated intent:

1. Read each table's *other* pre-existing policies, not just confirm the new policy's own logic.
2. Explicitly look for non-membership-by-design patterns before assuming a tenant-membership AND is
   safe: owner/author-only checks, public/unauthenticated access, cross-tenant affiliate/consultant
   flows, and super-admin-only tables where the caller may have no membership anywhere.
3. For every flagged table, grep real call sites and confirm which Supabase client is used — a
   service-role client bypasses RLS regardless of what the new policy says on paper; resolve this
   with file:line evidence, not as "theoretical."
4. A table with a genuine public/unauthenticated access requirement is a design decision to flag,
   not a mechanical fix to silently patch or silently leave broken.

## Verify against live state — never trust the diff's own assumptions (from `/fresh-eyes`)

For every RPC, direct table read/write, or edge-function call touched in a review or a fix, verify
against the **live** project instead of trusting the code's own assumptions:

- **RPC calls** — pull the live definition and confirm every field the client sends is actually
  read/used by the function. A client sending a field the RPC silently ignores is a real bug.
- **Direct table writes** — pull the live RLS policies and confirm the roles/conditions the
  client-side code assumes are allowed actually match what the policy permits.
- **`SECURITY DEFINER` functions** — confirm an independent authorization check exists, not just
  `auth.uid() IS NOT NULL`. A `SECURITY DEFINER` function bypasses RLS entirely, so with no
  independent role/tenant check, anyone authenticated can call it directly regardless of what the
  UI allows.
- **Edge functions** — pull the live deployed source and confirm it matches git; a PR can silently
  assume a deployed function still matches its git source when it doesn't.
- **Migrations** — confirm idempotency (safe to run twice), and that any replaced function/policy
  re-implements every guard of what it replaces (checked via git history, not just the live version).

## Multi-statement migrations on trigger-guarded tables need trigger-order tracing

If a migration writes to the same table more than once (raw `UPDATE`s, RPC calls, or a mix), pull
every `BEFORE INSERT`/`BEFORE UPDATE` trigger on that table and trace, in the exact order the
migration executes its statements, whether a later statement's touched columns re-fire a trigger
whose logic could overwrite a value an earlier statement intentionally set. Checking each statement
in isolation is not enough — treat any migration touching 2+ trigger-watched columns across multiple
statements as requiring this trace regardless of how simple it otherwise looks.

## Report findings in three buckets, every time

Confirmed bug (verified against live state where applicable) / worth a second look (plausible, not
fully nailed down, or a judgment call) / checked and cleared (explicitly verified and ruled out, so
it doesn't get silently re-litigated later). Don't blur a suspicion into a confirmed finding, and
don't drop something that was actually checked — a cleared item is worth recording too.
