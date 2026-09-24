# The Judge recognizes, code decides

Status: accepted

No model decides an Outcome or writes Player state. The Judge (Jev) turns fuzzy input into facts: what a player input intends, how it is classified, whether a Passage revealed a Clue, whether a Draft breaks a Rule. Pure code then applies the Author's rules to those facts: whether a Decisive action succeeds, how Reputation changes, when an Arc advances, which Ending is reached. Randomness, such as a reckless action's death roll, comes from a seeded generator so a replayed Session reproduces its Outcomes.

The Author's constraints must hold every time, not whenever a probability clears a threshold. Asked whether a Decisive action's required Clues are found, the Judge can answer 0.7 while one is plainly missing from state; a lookup cannot. Replays also need the same inputs to produce the same wins and failures.

## Considered Options

- **The Judge decides Outcomes directly.** Rejected: probabilistic verdicts for what are really lookups, and replays that do not reproduce.
- **No enforced mechanics; only the Judge's Rules watch the prose.** Rejected: nothing would make a premature Decisive action fail, and the death and removed Endings would have nothing to trigger them.

## Consequences

- Where a condition is prose-shaped, such as an Exit condition, the Judge rules on it and code acts on the answer.
- Every function that decides an Outcome stays free of I/O, so it is tested without model calls.
