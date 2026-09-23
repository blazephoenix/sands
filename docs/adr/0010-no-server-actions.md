# No server actions; the client calls route handlers

Status: accepted

Every server call from the browser goes through a Next.js route handler under `src/app/api/`. Server actions are not used. This is the Author's constraint for this project; it keeps every server entry point an explicit HTTP route that the replay runner and tests can call the same way the UI does.

## Consequences

- Long-running calls (setup, a Turn) return progress as NDJSON from a route handler rather than through a server action's pending state.
