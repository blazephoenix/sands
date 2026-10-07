# Sands

A creation harness: an author fixes a story's premise, characters, hidden truth and arcs; an AI writes the story inside those constraints; code and a judge model hold it to them. It exists to test whether an AI can be creative within human-authored constraints.

The language is genre-agnostic: a story may be a mystery, a romance or anything else. Terms name story mechanics, never one genre's furniture.

## Language

### Authoring

**Author**:
The person who writes the Brief and controls the Codex.
_Avoid_: user, creator, admin

**Brief**:
The Author's locked description of a story: setting, characters, arcs, ending, and optionally locations, voice and free prose. Nothing may contradict or edit it.
_Avoid_: prompt, premise, spec, config

**Hidden field**:
A Brief field the Author marks secret.
_Avoid_: spoiler, private field

**Hidden truth**:
All Hidden fields of a Brief taken together; what the Player must earn through play rather than be told.
_Avoid_: the secret, the solution, the twist

**Arc**:
One ordered phase of the story, with a name, a description and one or more Exit conditions. Arc order is story order.
_Avoid_: act, chapter, stage, phase

**Ending**:
How a Session concludes: win, death or removed. The Brief names the win condition.
_Avoid_: outcome (reserved for a Turn's resolved result), conclusion

**Voice**:
The Author's optional guidance on how the prose should sound, as guidelines or sample passages.
_Avoid_: tone, style guide

### World and play

**World**:
A Brief plus everything setup derived from it and the Author reviewed. Sessions are played in a World. The Author can delete a World; deleting is permanent and takes its Sessions, Turns and Entries with it.
_Avoid_: universe, setting (reserved for place and period), game

**Session**:
One playthrough of a World, from its first Turn to its Ending.
_Avoid_: run, playthrough, game, save

**Turn**:
One Player input and everything the harness does in response to it, ending in one shipped Passage. The Opening is the one Turn without a Player input.
_Avoid_: step, round (reserved for one writing attempt within a Turn), move

**Opening**:
Turn 0 of every Session: the Writer sets the first scene as a cold open, the world already in motion and what the Player character is there to do made plain, before the Player acts. It is written and judged like any Turn, but nothing is read from the Player and no Outcome is resolved.
_Avoid_: intro, prologue, first message

**Player**:
The person playing a Session, acting as the Player character.
_Avoid_: user, reader

**Player character**:
The one Brief character the Player controls.
_Avoid_: protagonist, PC, hero

**Passage**:
The prose shipped to the Player at the end of a Turn.
_Avoid_: response, message, output, chapter

**Draft**:
One candidate Passage the Writer produces before the Judge rules on it. Several Drafts can precede one Passage.
_Avoid_: attempt, candidate, version

**Round**:
One pass of the Writer producing Drafts in parallel and the Judge ruling on them. A Turn has at most three Rounds.
_Avoid_: retry, attempt, iteration

**Retry feedback**:
The lines the Writer gets for its next Round: one per Rule question a Draft of the last Round failed clearly (p ≥ 0.8). Weaker failures still fail the Draft but add no line.
_Avoid_: critique, hints

**Unsure**:
A Judge answer too close to call either way. It is shown to the Author, not acted on differently.
_Avoid_: flagged (reserved for a Flagged Turn), borderline

**Flagged Turn**:
A Turn whose Passage shipped after three failed Rounds, as the least-violating Draft.
_Avoid_: failed turn, forced turn

**Directive**:
The instructions code gives the Writer for one Turn: what happened, what may be revealed, how NPCs should behave.
_Avoid_: prompt, instructions, context

**Reading**:
What the Judge takes from one Player input: its intent (the kind of action), its target (the Entry acted on) and its Classification. The Opening has none.
_Avoid_: parse, interpretation, intent (for the whole)

**Allowed reveal**:
A piece of Knowledge a character may give up this Turn: at or below the current Band, and not yet revealed.
_Avoid_: unlocked knowledge, available secret

**Discoverable Clue**:
A Clue the Player's action makes findable this Turn but has not yet found.
_Avoid_: available clue, visible clue

**Discovery**:
The Judge's ruling on whether a Passage actually revealed an Allowed reveal or a Discoverable Clue. Only a Discovery changes what the Player has found.
_Avoid_: reveal check, detection

**Codex slice**:
The part of a Session's Codex the Writer and the Judge see for one Turn, narrowed to the scene.
_Avoid_: context, window, relevant entries

**Background work**:
What the harness does after a Passage ships that only matters from the next Turn on: naming new characters, checking Exit conditions and checking pacing.
_Avoid_: post-processing, async jobs

**Outcome**:
What code decided a Player's action achieved in this Turn, before any prose is written.
_Avoid_: result, resolution, ending

**Reputation**:
A number tracking how the story's characters regard the Player character, read through its Band.
_Avoid_: score, standing, karma

**Band**:
The coarse level of Reputation (high, normal, low) that governs what characters reveal and how they lean toward the Player character: a lean, not a mandate.
_Avoid_: tier, level

**Classification**:
How an action relates to the story: on-script, tangential, off-script or reckless.
_Avoid_: category, alignment

**Pacing nudge**:
A signal that recent Turns made no progress, telling the Writer to surface an opportunity. It never advances an Arc.
_Avoid_: hint, push, forced progress

### Codex

**Codex**:
Every Entry a World or Session holds; the Author's view and control over what the story contains.
_Avoid_: wiki, lore, database, knowledge base

**Entry**:
One item in the Codex, with a source (author, setup, play) and a status (locked, proposed, accepted, edited, rejected).
_Avoid_: record, item, card, block

**World entry**:
An Entry for a thing in the story: a location, character, NPC, faction, Clue or object.
_Avoid_: asset, element

**Story logic entry**:
An Entry for a condition code enforces: an Exit condition, a piece of Knowledge or a Decisive action.
_Avoid_: plan, rule (reserved for the Judge's checks), mechanic

**Clue**:
A discoverable fact placed at a location, or held by a character who gives it up as Knowledge. It may point to the Hidden truth, or be a labelled Red herring.
_Avoid_: evidence (as a noun for one item), hint

**Red herring**:
A Clue the Author marks as misleading. It can be found, but no Decisive action may require it.
_Avoid_: decoy, false clue

**Knowledge**:
One fact one character knows, with the lowest Band at which they will reveal it.
_Avoid_: knowledge map (the whole set), secret, dialogue tree

**Decisive action**:
A story-critical action declared as data: who it targets, which Clues it requires, and what success and a wrong target mean. Its verb comes from the Brief: an arrest, a duel, a confession, a heist.
_Avoid_: capture condition, win condition, key action

**Exit condition**:
A checkable statement that, once true, lets the story move from one Arc to the next.
_Avoid_: goal, trigger, milestone

**Template Entry**:
An Entry a World holds, which every new Session copies.
_Avoid_: world entry (that names the group of things in the story), master, original

**Session copy**:
A Session's own copy of a Template Entry. Changing it changes only that Session.
_Avoid_: instance, clone, override

### Setup

**Setup**:
The one-time step that turns a Brief into a World: the Drafter proposes Entries, the Judge checks them against the Brief, and code checks Solvability.
_Avoid_: generation, expansion, onboarding

**Solvability**:
Whether a World or Session can be won as its Entries stand: some Decisive action wins the story, some Location is where the Player begins, every Decisive action can be completed with Clues the Player can reach, and every Arc has an Exit condition.
_Avoid_: validity, completeness

**Gap**:
One reason a World is not solvable, stated so the Author can fix it.
_Avoid_: error, failure, issue

### Evaluation

**Replay**:
A fixed script of Player inputs played in a World with a set seed, producing an ordinary Session.
_Avoid_: test run, playback

**Baseline**:
A Session played with the Brief alone as the Writer's prompt and no harness; the control a harness Session is compared against.
_Avoid_: control run, vanilla mode

### Roles

**Writer**:
The model that writes Drafts.
_Avoid_: narrator (the voice inside the prose), generator, LLM

**Drafter**:
The model that proposes setup Entries and names new characters found in Passages.
_Avoid_: extractor, planner

**Judge**:
The model that turns prose and player input into facts: whether a Draft breaks a Rule, what an input intends, what a Passage revealed.
_Avoid_: validator, critic, evaluator

**Rule**:
One check the Judge applies to every Draft, such as Character drift or Agency.
_Avoid_: guard, constraint, policy
