# The Opening is a Turn with a null input, played once per Session

Status: accepted

The Opening (spec §9.0) is Turn 0, stored like any Turn, with `player_input` null, and its log's reading and Outcome null. The Turn schema enforces it both ways: Turn 0 has no Player input, reading or Outcome, and every later Turn has all three. The client plays it through the same route as any Turn, `POST /api/sessions/[id]/turn`, with `{ "input": null }`, which mirrors the stored Turn. The route streams the same progress events minus reading and resolving.

The route answers 409 before streaming when the request does not fit the Session: an Opening for a Session that already has Turns, or a Player input for a Session that has none. While one request is writing a Session's Opening, it holds a claim on that Session, and a second Opening request also gets 409. The claim is released however the stream ends. Nothing is saved before the Passage ships, so a released claim leaves the Session as it was.

The Session page starts the Opening when it loads a Session with no Turns. On a 409 it loads the Session again. If the Session still has no Turns, the page waits and asks again. So a second tab, a reload that races its own aborted request, or a doubled effect never writes a second Opening. The worst it costs is a short wait.

## Considered Options

- **An explicit flag (`{ "opening": true }`) instead of `input: null`.** Rejected: it is a second way to say what `playerInput: null` already says, and it lets a request carry both an input and the flag.
- **A separate route for the Opening.** Rejected: the Opening is a Turn by definition (CONTEXT.md), with the same progress, reveal and failure handling. A second route would duplicate the streaming contract.
- **Let a second Opening request join the first request's stream.** Rejected for the fixture store as more machinery than it needs. The 409-and-reload loop gives the same result for the Player. The engine may revisit this if Openings get slow.
- **Start the Opening on the server when the Session is created.** Rejected: nobody would be watching its progress, and a failure would have nowhere to show Retry.

## Consequences

- "Turns played" (the World page, the Ending screen) counts every Turn but the Opening. `SessionSummary.turnCount` still counts every Turn row.
- Turns are labelled "Opening", then "Turn 1", "Turn 2" and so on, so a Turn's number is its `idx`.
- The database guarantees it: `(session_id, idx)` is unique, so a second Turn 0 is refused whichever request writes second, and the refusal is a 409. The in-memory claim stays, per server process, so a second request is turned away before it spends model calls on an Opening that could never be saved.
