# Sands

A creation harness: an author fixes a story's premise, characters, hidden truth and arcs; an AI writes the story inside those constraints; code and a judge model hold it to them. It exists to test whether an AI can be creative within human-authored constraints.

The language is genre-agnostic: a story may be a mystery, a romance or anything else. Terms name story mechanics, never one genre's furniture.

## Language

### Authoring

**Author**:
The person who writes the Skeleton and controls the Codex.
_Avoid_: user, creator, admin, writer (the Writer is the model)

**Skeleton**:
The Author's description of a story. Only the Author edits it; play never does, and nothing the Writer or Judge produces may contradict it.
_Avoid_: Brief, prompt, spec, config

**World rule**:
One way the story's world works, as the Skeleton states it: what it allows, its cost or limit, what it cannot do, and its exceptions.
_Avoid_: rule (alone; reserved for the Judge's checks), law, magic system

**Earliest Arc**:
The first Arc in which a planned moment may happen: a Promise paying off, a Secret surfacing, an Ending firing. Code alone checks it.
_Avoid_: not before

**Hidden text**:
Text anywhere in the Skeleton that the Author marks as not to be told. The Writer never states it outright, but it may show through how characters behave. What the Player can earn is a Secret, not Hidden text.
_Avoid_: Hidden field, spoiler, private field

**Secret**:
One row of the Hidden truth: what is true, who knows it, how it surfaces, its Earliest Arc, and what the Player can do with it. The Player earns it through its Clues: it is found once they are (all of them, or the number the Author sets), and never before its Earliest Arc. Misleading material is not a Secret; it belongs in a character's Believes or in direction for the Writer.
_Avoid_: twist, reveal, mystery, red herring

**Hidden truth**:
All the Secrets of a Skeleton taken together; what the Player must earn through play rather than be told.
_Avoid_: the solution, the twist

**Arc**:
One ordered phase of the story, with a name, a description and a Function. Arc order is story order.
_Avoid_: act, chapter, stage, phase

**Function**:
What an Arc must make true before the story moves on, written so the Judge can check it. Play may not prevent or undo it.
_Avoid_: Exit condition, goal, trigger, milestone, purpose

**Agenda**:
One character's plan for one Arc: their want for that Arc, ordered Steps, and what they do If blocked.
_Avoid_: plan, script, schedule

**Promise**:
Something the story sets up and must pay off, no earlier than its Earliest Arc.
_Avoid_: foreshadowing, setup

**Set piece**:
A scene the Author wants in an Arc. The Writer stages it when the story allows, and draws Forced events from it first. Unlike a Must-land moment, the Arc can end without it.
_Avoid_: spectacle, highlight

**Must-land moment**:
A moment that must happen inside its Arc. Once it happens, it has landed.
_Avoid_: key moment, milestone, beat

**If landed early**:
An Arc's instruction for when play lands a Must-land moment before the Agenda Step meant to cause it.
_Avoid_: fallback

**Stakes**:
What an Arc puts at risk, and how it worsens if the story stalls.
_Avoid_: risk, threat, consequences

**Ending**:
One way a Session can conclude: listed in the Skeleton with its Ending trigger and Earliest Arc, or, in Playtest, an Invented Ending.
_Avoid_: outcome (reserved for a Turn's resolved result), conclusion

**Ending trigger**:
What must happen in play for an Ending to fire: Secrets the Player must have found, which code checks, and an event, which the Judge checks. Either part may be absent.
_Avoid_: win condition, condition, Decisive action

**State flag**:
A named fact the Skeleton tracks about a Session, with a fixed set of values that play sets.
_Avoid_: variable, meter, stat

**Epilogue**:
The lines shown after an Ending: one per State flag, chosen by that flag's value.
_Avoid_: outro, recap

**Warning beat**:
The moment before an Ending that can fire early, when the Player sees one consequence and can commit or turn back.
_Avoid_: confirmation

**Voice**:
The Author's optional guidance on how the prose should sound, as guidelines or sample passages. Voice is always the prose's; a character's way of talking is their Speech.
_Avoid_: tone, style guide, character voice

**Fixed fact**:
A fact the Writer must hold to that isn't a Secret: a name, an age, a date.
_Avoid_: lore, canon fact

**Prose ban**:
One prose habit the Writer must avoid. Some apply to every World; the Skeleton's Never field adds the Author's own.
_Avoid_: style rule (Rule is the Judge's), banned phrase

**Speech**:
How one character talks, with a sample line.
_Avoid_: voice (reserved for the prose), dialect, dialogue style

**Core**:
The traits a character always shows, whatever happens.
_Avoid_: personality, nature

**Line**:
Something a character will never do, whatever happens. A character may have more than one.
_Avoid_: limit, taboo, boundary

**Want**:
What a character is after across the story. When its parts conflict, the Skeleton ranks them.
_Avoid_: goal, motivation, desire

**Believes**:
What a character holds true that may be false, such as a cover story.
_Avoid_: assumption, misconception

**Tie**:
One character's relationship to another at full strength: what they want from them, and the friction. A Tie is one-way, and its Starts as says where it stands when play begins (strangers, family, old rivals).
_Avoid_: relationship, bond, link

**Setting**:
Where the whole story takes place. Its Period says when; its Places are the spots within it.
_Avoid_: world (reserved for the World), Place

**Place**:
One spot in the Setting where scenes happen, with what it connects to and what happens there.
_Avoid_: Location, room, area, scene

### World and play

**World**:
A Skeleton plus everything setup derived from it and the Author reviewed. Sessions are played in a World. The Author can delete a World; deleting is permanent and takes its Sessions, Turns and Entries with it.
_Avoid_: universe, setting (reserved for the story's overall where), game, book

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
The Skeleton character the Player controls in a Session.
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
A Clue a character holds and may give up this Turn, not yet found.
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
What the harness does after a Passage ships that only matters from the next Turn on: naming new characters, checking whether the current Arc's Function is met and checking pacing.
_Avoid_: post-processing, async jobs

**Claim**:
A Player input that states its own result. A Claim that fails becomes an Attempt.
_Avoid_: claimed outcome, assertion

**Attempt**:
A Player input whose result the harness decides.
_Avoid_: try, action (for the whole input)

**Outcome**:
What code decided a Player's action achieved in this Turn, before any prose is written.
_Avoid_: result, resolution, ending

**Classification**:
How an action relates to the story: on-script, tangential, off-script or reckless.
_Avoid_: category, alignment

**Event**:
An on-page change in what the story is about that forces a response. Reveals told in dialogue, and warnings of trouble to come, don't count.
_Avoid_: beat, incident

**Stall**:
A run of Passages with no Event, whoever caused it.
_Avoid_: lull, dead air

**Forced event**:
An Event the next Passage must open with because the story has stalled too long, drawn from the Arc's Set pieces first, then its Stakes.
_Avoid_: random event

**Pacing nudge**:
A signal that recent Turns made no progress, telling the Writer to surface an opportunity. It never advances an Arc.
_Avoid_: hint, push, forced progress

### Playtest and publishing

**Expected path**:
The route the Skeleton plans: Arc order, each Arc's Function, Earliest Arcs and the listed Endings. Canon holds play to it; in Playtest, leaving it is a Divergence.
_Avoid_: rails, plot, script

**Published**:
The state of a World that Players may play.
_Avoid_: live, released, draft (for an unpublished World; a Draft is a candidate Passage)

**Playtest**:
A Session mode in which the Author plays their own World off the expected path, to find what the Skeleton is missing. Only the Author starts one, and it is kept apart from Players' Sessions.
_Avoid_: test mode, test run, sandbox

**Canon**:
A Session mode in which play holds to the Skeleton's expected path. Every Player's Session is Canon.
_Avoid_: published mode, rails mode, live mode

**Branch**:
One line of Turns in a Session, forked from an earlier Turn by a Rewind.
_Avoid_: timeline, fork, divergence (reserved for a Turn that left the expected path)

**Divergence**:
A Turn in which play left the Skeleton's expected path. Divergences happen with or without a Rewind.
_Avoid_: branch (reserved for a line of Turns), deviation, departure

**Rewind**:
Returning a Playtest Session to an earlier Turn to try a different input. The Turns after it stay as their own Branch.
_Avoid_: undo, reload, save point

**Harvest**:
The Author's review of what a Playtest Session produced that the Skeleton doesn't contain.
_Avoid_: report, debrief, export

**Harvest item**:
One thing a Harvest lists, of one kind: an Invention; a Behavior, where a character does something their card doesn't cover without breaking their Core or a Line; a Divergence; or an Invented Ending, one reached in play that the Skeleton doesn't list. The Author keeps or removes each.
_Avoid_: finding, suggestion

**Invention**:
A detail the Writer made up to fill a gap in the Skeleton. The Skeleton says what the Writer may and must not invent.
_Avoid_: improvisation, hallucination

**Tracked suggestion**:
A kept Harvest item shown in its Skeleton field for the Author to accept, reword or reject. The Writer and the Judge never see it until it is accepted.
_Avoid_: pending edit, proposal, draft

### Codex

**Codex**:
Every Entry a World or Session holds; the Author's view and control over what the story contains.
_Avoid_: wiki, lore, database, knowledge base

**Entry**:
One item in the Codex, with a source (author, setup, play) and a status (locked, proposed, accepted, edited, rejected).
_Avoid_: record, item, card, block

**World entry**:
An Entry for a thing in the story: a Place, character, NPC, faction, Clue or object.
_Avoid_: asset, element

**Story logic entry**:
An Entry for a condition code enforces, such as a Function or an Ending trigger.
_Avoid_: plan, rule (reserved for the Judge's checks), mechanic

**Clue**:
One piece through which a Secret surfaces: found at a Place, or given up by a character who knows the Secret. Setup proposes Clues from the Secret's How it surfaces, and the Author accepts each.
_Avoid_: evidence (as a noun for one item), hint, Knowledge, red herring

**Template Entry**:
An Entry a World holds, which every new Session copies.
_Avoid_: world entry (that names the group of things in the story), master, original

**Session copy**:
A Session's own copy of a Template Entry. Changing it changes only that Session.
_Avoid_: instance, clone, override

### Setup

**Setup**:
The one-time step that turns a Skeleton into a World: the Drafter proposes Entries, the Judge checks them against the Skeleton, and code checks Playability.
_Avoid_: generation, expansion, onboarding

**Playability**:
Whether a World or Session can be played to every listed Ending as its Entries stand. Code alone checks it. An Invented Ending is not checked until the Author keeps it.
_Avoid_: Solvability, validity, completeness

**Gap**:
One reason a World is not playable, stated so the Author can fix it.
_Avoid_: error, failure, issue

### Evaluation

**Replay**:
A fixed script of Player inputs played in a World with a set seed, producing an ordinary Session.
_Avoid_: test run, playback

**Baseline**:
A Session played with the Skeleton alone as the Writer's prompt and no harness; the control a harness Session is compared against.
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
_Avoid_: guard, constraint, policy, World rule
