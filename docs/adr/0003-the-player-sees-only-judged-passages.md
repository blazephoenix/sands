# The Player sees only judged Passages

Status: accepted

Nothing reaches the story pane until the Judge has passed it, so the server streams no prose: it streams progress, then sends the whole Passage, and the client animates the reveal. To keep a Turn near 3–5 seconds anyway, each Round has the Writer produce two Drafts in parallel and the Judge rule on both in one call, so one failing Draft usually costs no time. A Turn has at most three Rounds; after the third, the least-violating Draft ships and the Turn is flagged.

Only the steps whose result the Player reads block the Passage: reading the input, resolving the Outcome, writing and judging. Naming new characters, checking Exit conditions and checking pacing affect only the next Turn, so they run after the Passage is shown, and the next Turn waits for them if the Player is faster.

## Considered Options

- **Stream the Draft to the Player and replace it on rejection.** Rejected: text that appears and then vanishes reads as a bug and undercuts the claim that the Brief holds.
- **Stream Drafts into the harness pane.** Rejected by the Author: harness internals go to the server console, and the harness pane shows finished Turns only, in test mode.
- **One Draft per Round.** Rejected: every failed Draft adds a full write, 3–8 seconds.

## Consequences

- Two Drafts roughly double Writer cost per Turn. Accepted for latency, and because choosing between passing Drafts is part of the creativity story.
- A Draft the Judge has not ruled on never ships; a Judge outage fails the Turn.
- The Opening (ADR-0014) follows the same rule: the first scene of a Session is written, judged and only then revealed.
