# Gating and record-only Rules

Status: accepted

The Writer works under as few Rules as possible. A Writer held to many Rules, each able to throw a Draft away, writes safe, flat prose: the problem [The Writer plays characters with their own wants](https://github.com/blazephoenix/sands/issues/18) set out to fix. So every Draft is still judged before the Player sees it, but only a gating Rule can reject one. **The principle: gate only what a Player or Author would see as broken.** Everything else is a record-only Rule: logged in the harness pane and fed back to the Writer, never a reason to throw a Draft away.

The gating Rules are:

- **Fidelity:** the Draft keeps what the Player character did and said.
- **Agency:** the Draft doesn't make the Player character do or say more than the input.
- **Secret:** the Draft reveals no Clue that isn't an Allowed reveal or a Discoverable Clue, and states no Hidden text outright.
- **Core and Line:** no character breaks their Core or crosses a Line.
- **Ending,** on an Ending Turn: the Draft shows the Ending that fired.

Function, World rules, Outcome, Consequence, Complication, Codex and Place are record-only. So are the prose bans when "Directive and prose rules" adds them. Reputation goes, and Voice and Period become direction for the Writer only.

A gating Rule fails at p ≥ 0.65, just above the Unsure band, and every gating failure gives the Writer a line of Retry feedback. A record-only Rule gives Retry feedback at p ≥ 0.8.

Decided in [How a Turn resolves: Claims, consequences and Endings](https://github.com/blazephoenix/sands/issues/47), on evidence from [The Author can compare Passages with and without the Rules](https://github.com/blazephoenix/sands/issues/22): in one Turn, 10 of 13 Rule failures fell inside the Unsure band and still threw Drafts away.

## Considered Options

- **Every Rule gates, failing at p ≥ 0.5 (the old loop).** Rejected: it threw away good Drafts on answers the Judge itself rated too close to call, and pushed the Writer toward safe prose.
- **Gate everything that guards the Skeleton,** adding Function, World rules, Outcome, Consequence and Place in Canon. Rejected: it rebuilds the wall of Rules this decision removes. Code already protects a Function where it decides (a Claim that undoes one fails), and the Author reads the record-only failures in the harness pane.
- **Ship first, judge after, only to keep score.** Rejected: the Player could see a Passage that states a Secret or overrides their input.

## Consequences

- **Promoting a Rule to gating needs Playtest evidence:** Sessions where its failures shipped and read as broken to the Player or the Author. The evidence and the promotion are recorded below, by amending this ADR.
- **When every Draft fails,** a Draft with no Agency or Fidelity failure ships ahead of any that has one; among the rest, the least-violating ships, as a Flagged Turn.
- **A Turn keeps 2 Drafts per Round and at most 3 Rounds,** as config to revisit with evidence. With five gating Rules, most Turns should pass in the first Round.
- **The Opening skips the Rules that read a Player input:** Fidelity, Agency, Outcome and Consequence.

## Promotions

None yet.
