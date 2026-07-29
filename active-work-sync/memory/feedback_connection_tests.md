---
name: feedback-connection-tests
description: "When testing an MCP connection (Supabase, Vercel, etc.), use the lightest possible read call — not a data/schema-listing call."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 12c9f65a-e9ee-4f9e-8cf6-e6266643ab5f
  modified: 2026-07-27T02:35:15.760Z
---

When Brian asks to "test" a connection (e.g. Supabase, Vercel), use the smallest, cheapest read-only call available to confirm reachability — e.g. Supabase `get_project_url` — not something that pulls real schema or data like `list_tables`.

**Why:** Brian pushed back when Claude called `list_tables` just to verify the Supabase MCP server was connected ("why would u list all tables, just test something simple"). A connectivity check should prove the server is authenticated and reachable, not enumerate production data.

**How to apply:** For any "test the connection" / "is X connected" request against Supabase, Vercel, or similar MCP servers, default to a minimal metadata-only call first. Only escalate to broader reads (`list_tables`, `list_deployments`, etc.) if the user asks for something beyond a basic connectivity check.
