> **Last updated:** 5 May 2026 · **Reconsider by:** ongoing — update every morning before testing.

# GitHub Trail — Commit Baseline Log

Track every commit baseline tested against, flag notable changes, maintain an audit trail of what version was tested when.

---

## How to Use

1. Run `git log --oneline -10` every morning before testing
2. If new commits appear above the last baseline → create a new entry below
3. Flag anything that looks like it touches a critical feature
4. Update the "Tested Against" field in your QA tracker to match the commit hash

---

## Entries

---

### Baseline #1 — 21 April 2026

| Field | Value |
|---|---|
| **Commit Hash** | `0626962a9` |
| **Message** | Wired Add External Unit |
| **Branch** | main (origin/main) |
| **Tester** | Brian |
| **QA Phase** | Phase 1 — Auth & Critical Paths |
| **Status** | 🟡 In Progress |

**Recent commit history at baseline:**
```
0626962a9 Wired Add External Unit
63857b0e4 Changes
44ed3b6ed Changes
86ed50e01 Save plan in Lovable
c1abf997d Fixed login redirect race
f11768434 Save plan in Lovable
f858ed1de Added popover search to single
```

**Flagged commits:**

| Commit | Message | Why it matters |
|---|---|---|
| `c1abf997d` | Fixed login redirect race | Race condition fix on auth — high risk. Verify login redirect works consistently. |
| `f858ed1de` | Added popover search to single | New UI feature — needs happy path + edge cases |

**Notes:** "Changes" commit messages make it hard to know what was touched. Raise with RJ.

---

### Baseline #2 — 4 May 2026

| Field | Value |
|---|---|
| **Commit Hash** | `c95c39656` (session start) → `81c9de9a3` (end of session) |
| **Message** | Document download bug investigation and fixes |
| **Branch** | main (origin/main) |
| **Tester** | Brian |
| **QA Phase** | Bug fix — document downloads |
| **Status** | 🔴 Downloads still broken at session end (Supabase internal table RLS) |

**Key commits this session:**
```
81c9de9a3  Fixed PGRST200 consultant page crash
           (+ storage migrations, RLS policies via Supabase dashboard)
```

**Notes:** Full debug log in `complyhub-kb/audit/2026-05-04-document-download-bug.md`. Downloads were ultimately resolved by routing through `document-file-manager` Edge Function (see `decisions.md`).

---

### Baseline #3 — 5 May 2026

| Field | Value |
|---|---|
| **Commit Hash** | `a2603af66` |
| **Message** | Added JWT fallback to FPP delete |
| **Branch** | main (origin/main) |
| **Tester** | Brian |
| **QA Phase** | KB restructure / setup session |
| **Status** | 🟢 No testing this session |

**Notes:** Session focused on KB and tooling setup (Claude Desktop, Codex, gh CLI). No feature testing.

---

<!-- TEMPLATE — copy and paste when new commits appear

### Baseline #N — [Date]

| Field | Value |
|---|---|
| **Commit Hash** | `` |
| **Message** | |
| **Branch** | main (origin/main) |
| **Tester** | Brian |
| **QA Phase** | |
| **Status** | 🟡 In Progress |

**Recent commit history at baseline:**
```

```

**Flagged commits:**

| Commit | Message | Why it matters |
|---|---|---|

**Notes:**

-->
