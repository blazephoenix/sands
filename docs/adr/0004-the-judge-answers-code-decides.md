# The Judge answers questions, code decides

Status: accepted

Whenever play needs a ruling, the Judge answers narrow questions and code combines the answers into the decision. A Claim gets one question per test: does the input claim a result beyond the Player character's own deeds; is that result plausible under the World rules; does it break the Core or a Line of a character it touches, the Player character included; does it prevent or undo a Function; does it pay off a Promise or land a Must-land moment; does it meet an Ending trigger's event. Code checks Earliest Arcs and found Secrets itself, and decides that the Claim stands only if every test passes, or if the Function test alone fails and a valid Ending fires. Endings, Discovery, consequences and State flags follow the same split, so a Replay with the same seed and inputs reaches the same Outcomes, and the harness pane can show which answer decided what.

Decided in [How a Turn resolves: Claims, consequences and Endings](https://github.com/blazephoenix/sands/issues/47). The old rule of the same spirit did not carry over ([Which old decisions carry over](https://github.com/blazephoenix/sands/issues/27)); this one is written fresh.

## Considered Options

- **One holistic question per Claim ("does it stand?").** Rejected: cheaper, but neither the Author nor a Replay can see why a Claim failed.
- **Split a Claim with several results, keeping the parts that pass.** Rejected: needs a parsing step and makes results harder to predict. A Claim is all or nothing.
- **A seeded success roll for risky Attempts.** Rejected: it hides a dice game under the story. Code decides only mechanical results (moving to a connected Place, making Clues findable, allowing a reveal); how characters respond is the Writer's, bounded by the Rules.

## Consequences

- **A Claim never finds a Clue or a Secret.** That part reads as an Attempt to search and goes through Discovery, so Secrets stay counted by code (ADR-0003).
- **The Player character's Line holds.** An input that would cross it becomes an Attempt the Player character balks at, shown on the page. In Playtest, `force:` lets it land and logs it.
- **The Skeleton's Claims setting** is On (Claims judged by these tests) or Off (every input is an Attempt).
