# Sands

A creation harness: an author fixes a story's premise, characters, hidden truth and arcs; an AI writes the story inside those constraints; code and a judge model hold it to them. It exists to test whether an AI can be creative within human-authored constraints.

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
A Brief plus everything setup derived from it and the Author reviewed. Sessions are played in a World.
_Avoid_: universe, setting (reserved for place and period), game

**Session**:
One playthrough of a World, from its first Turn to its Ending.
_Avoid_: run, playthrough, game, save

**Turn**:
One Player input and everything the harness does in response to it, ending in one shipped Passage. The Opening is the one Turn without a Player input.
_Avoid_: step, round (reserved for one writing attempt within a Turn), move

**Opening**:
Turn 0 of every Session: the Writer sets the first scene, like the first page of a novel, before the Player acts. It is written and judged like any Turn, but nothing is read from the Player and no Outcome is resolved.
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

**Directive**:
The instructions code gives the Writer for one Turn: what happened, what may be revealed, how NPCs should behave.
_Avoid_: prompt, instructions, context

**Outcome**:
What code decided a Player's action achieved in this Turn, before any prose is written.
_Avoid_: result, resolution, ending

**Reputation**:
A number tracking how the story's authorities regard the Player character, read through its Band.
_Avoid_: score, standing, karma

**Band**:
The coarse level of Reputation (high, normal, low) that governs what characters reveal and how they behave.
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
An Entry for a thing in the story: a location, character, NPC, faction, clue or object.
_Avoid_: asset, element

**Story logic entry**:
An Entry for a condition code enforces: an Exit condition, a piece of Knowledge or a Decisive action.
_Avoid_: plan, rule (reserved for the Judge's checks), mechanic

**Clue**:
A discoverable fact placed at a location or held by a character. It may point to the Hidden truth, or be a labelled red herring.
_Avoid_: evidence (as a noun for one item), hint

**Knowledge**:
One fact one character knows, with the lowest Band at which they will reveal it.
_Avoid_: knowledge map (the whole set), secret, dialogue tree

**Decisive action**:
A story-critical action declared as data: who it targets, which Clues it requires, and what success and a wrong target mean. An arrest is a Decisive action.
_Avoid_: capture condition, win condition, key action

**Exit condition**:
A checkable statement that, once true, lets the story move from one Arc to the next.
_Avoid_: goal, trigger, milestone

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
