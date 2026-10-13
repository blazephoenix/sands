# Secrets are found by counting Clues, and Endings fire on found Secrets

Status: accepted

Sands is not only for mysteries, so the mechanics built for one go: Knowledge gated by Band, the global Reputation, Red herrings and Decisive actions. The Author's Secrets replace them. Each Secret surfaces through Clues, found at a Place or given up by a character who knows it. Code counts a Secret as found once its Clues are found (all of them, or the number the Author sets), and never before its Earliest Arc. An Ending trigger requires found Secrets, which code checks, and an event, which the Judge checks. The Judge only rules on whether a Passage revealed a Clue; code decides everything that follows, so a Replay with the same seed and inputs reaches the same Secrets and Endings.

Decided in [Which story mechanics survive](https://github.com/blazephoenix/sands/issues/31).

## Considered Options

- **The Judge rules on each Secret directly.** Rejected: progress would rest on one model call per Passage, with no partial discovery and no reproducible count.
- **Clues are tracked, but a Secret is found only when the Judge sees the Player character act on it.** Rejected: that deduction already sits in the Ending trigger's event (the accusation, the confession, the choice).
- **Reputation stays the default, with per-character Meters as overrides.** Rejected: one number cannot tell one character's regard from another's, and its two jobs, gating reveals and penalising off-script play, are replaced by the Secret's How it surfaces and Earliest Arc and by the Claim and Attempt split.
- **Decisive actions stay, firing an Ending instead of a win.** Rejected: they would describe the same moment as the Ending trigger, twice.

## Consequences

- **Playability replaces Solvability.** Every listed Ending must pass it; an Invented Ending is not checked until the Author keeps it.
- **A wrong target ends the Session only if the Author lists that Ending.** Otherwise it is a consequence that plays out.
- **The social cost of unwarranted hostility no longer rides on Reputation.** Wronged characters react and hold grudges through the Writer's character instructions until the story repairs it.
- **Clues can be found before their Secret's Earliest Arc.** Only the Secret waits, so setups can be planted early.
