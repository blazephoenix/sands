# No server actions; the client calls route handlers

Status: accepted

Every server call from the browser goes through a Next.js route handler under `src/app/api/`. Server actions are not used. This is the project owner's constraint: every server entry point stays an explicit HTTP route that tests and scripts call the same way the UI does.

## Consequences

- A long-running call streams its progress from a route handler instead of relying on a server action's pending state.
