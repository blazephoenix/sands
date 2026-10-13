# Sessions fail forward, and end only on listed Endings

Status: accepted

A Session ends only on an Ending the Author lists, or an Invented Ending in Playtest. There are no built-in death or removed Endings and no Ending kinds. Every other setback fails forward: code calls for a lasting consequence when the Reading recognises a reckless input, unwarranted hostility toward a character, or an Ending move made too early (the trigger's event without its found Secrets, or before its Earliest Arc). Code sets its severity from a fixed table, with no roll. The Writer writes what the consequence is; a record-only Consequence Rule (ADR-0006) records whether it shows, is proportional, leaves a way back and leaves every unfound Clue reachable. Background work records it as a Complication, which every later Passage carries until the story resolves it. Characters may still react in the moment however the Writer plays them; only a lasting consequence needs code.

Decided in [How a Turn resolves: Claims, consequences and Endings](https://github.com/blazephoenix/sands/issues/47), carrying [Failing forward](https://github.com/blazephoenix/sands/issues/15) and [The Player's actions always land](https://github.com/blazephoenix/sands/issues/16).

## Considered Options

- **Code-gated consequences only.** Rejected: it fights the Writer's living characters, who refuse, bargain and react.
- **The Writer imposes consequences freely.** Rejected: the Writer would quietly steer the story, and a Replay could not reproduce it.
- **Built-in death and removed Endings, with a seeded death roll for reckless play.** Rejected: win and lose are genre judgements the Skeleton shouldn't force. An Author who wants a death Ending lists one with its trigger.
- **Risks as an Author-placed World entry kind.** Rejected for now: a Place's What happens here and an Arc's Stakes cover the same ground.

## Consequences

- **The off-script count, its warnings and Reputation's social cost go.** Wronging a character becomes a minor Complication attached to them, repaired only through the story. Warmth has no mechanic.
- **Ending triggers are checked on the Player's input, or fired by an Agenda's final Step.** Story-caused events reach an Ending through the Player's response to them, or through another character's Agenda.
- **When two Endings are met at once, the one listed first fires.**
- **A Warning beat offers Commit and Turn back.** Turning back drops the input's Ending move, and the Ending can warn again.
- **State flags are set each Turn** in background work, one choice question per flag, starting at their first listed value.
