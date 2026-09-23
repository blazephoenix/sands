# Player state is saved as a full copy after every Turn, not rebuilt from events

Status: accepted

Each Turn row stores the complete Player state as it stood after that Turn, alongside the Turn's log of what happened inside it (intent, Classification, Outcome, each Draft and its Rule results). State is written only when a Passage ships. The harness pane reads these copies directly, replays can compare Sessions Turn by Turn, and a bad Turn can be rewound by discarding it.

## Considered Options

- **Event log: every step appends an event and state is recomputed from them.** Rejected: about half a day more work for the ability to rebuild state as it stood mid-Turn, which nothing needs, since the harness pane shows finished Turns only.
- **A separate backend service owning the Turn loop.** Rejected: two servers to run for no gain at this size.

## Consequences

- Work that finishes after the Passage is shown (new characters, Exit conditions, pacing) is merged into the latest Turn's state and log when it completes.
