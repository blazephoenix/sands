# Sands

A creation harness: an author fixes a story's premise, characters, hidden truth and arcs; an AI writes the story inside those constraints, one Passage at a time, while a Player plays it. It exists to test whether an AI can be creative within human-authored constraints.

The harness is being rebuilt from that core outward: today the Writer alone plays the Skeleton. Checks on its work come back one at a time, each decided fresh.

The language is genre-agnostic: a story may be a mystery, a romance or anything else. Terms name story mechanics, never one genre's furniture.

## Language

### Authoring

**Author**:
The person who writes the Skeleton.
_Avoid_: user, creator, admin, writer (the Writer is the model)

**Skeleton**:
The Author's description of a story. Only the Author edits it; play never does, and nothing the Writer produces may contradict it.
_Avoid_: Brief, prompt, spec, config

**World rule**:
One way the story's world works, as the Skeleton states it: what it allows, its cost or limit, what it cannot do, and its exceptions.
_Avoid_: rule (alone), law, magic system

**Earliest Arc**:
The first Arc in which a planned moment may happen: a Promise paying off, a Secret surfacing, an Ending firing.
_Avoid_: not before

**Hidden text**:
Text anywhere in the Skeleton that the Author marks as not to be told. The Writer never states it outright, but it may show through how characters behave. What the Player can earn is a Secret, not Hidden text.
_Avoid_: Hidden field, spoiler, private field

**Secret**:
One row of the Hidden truth: what is true, who knows it, how it surfaces, its Earliest Arc, and what the Player can do with it. Misleading material is not a Secret; it belongs in a character's Believes or in direction for the Writer.
_Avoid_: twist, reveal, mystery, red herring

**Hidden truth**:
All the Secrets of a Skeleton taken together; what the Player must earn through play rather than be told.
_Avoid_: the solution, the twist

**Arc**:
One ordered phase of the story, with a name, a description and a Function. Arc order is story order.
_Avoid_: act, chapter, stage, phase

**Function**:
What an Arc must make true before the story moves on, written so it can be checked. Play may not prevent or undo it.
_Avoid_: Exit condition, goal, trigger, milestone, purpose

**Agenda**:
One character's plan for one Arc: their want for that Arc, ordered Steps, and what they do If blocked.
_Avoid_: plan, script, schedule

**Promise**:
Something the story sets up and must pay off, no earlier than its Earliest Arc.
_Avoid_: foreshadowing, setup

**Set piece**:
A scene the Author wants in an Arc. The Writer stages it when the story allows. Unlike a Must-land moment, the Arc can end without it.
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
One way a Session can conclude, listed in the Skeleton with its Kind (good, bad or neutral), its Ending trigger and its Earliest Arc. When the Skeleton allows it, the Writer may also end on one it invents. A Session ends on nothing else.
_Avoid_: outcome (reserved for a Turn's resolved result), conclusion

**Ending trigger**:
What must happen in play for an Ending to fire. The Writer names the Ending a Passage reached; code ends the Session only on one the Skeleton allows.
_Avoid_: win condition, condition, Decisive action

**State flag**:
A named fact the Skeleton tracks about a Session, with a fixed set of values that play sets.
_Avoid_: variable, meter, stat

**Epilogue**:
The lines that close an Ending's Passage: one per State flag, chosen by the value play gave it.
_Avoid_: outro, recap

**Voice**:
The Author's optional guidance on how the prose should sound, as guidelines or sample passages. Voice is always the prose's; a character's way of talking is their Speech.
_Avoid_: tone, style guide, character voice

**Fixed fact**:
A fact the Writer must hold to that isn't a Secret: a name, an age, a date.
_Avoid_: lore, canon fact

**Prose ban**:
One prose habit the Writer must avoid, listed in the Skeleton's Never field.
_Avoid_: style rule, banned phrase

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
A Skeleton the Author writes, in which Sessions are played. The Author can delete a World; deleting is permanent and takes its Sessions and Turns with it.
_Avoid_: universe, setting (reserved for the story's overall where), game, book

**Playable**:
A World whose Skeleton has nothing that stops a Session from starting: a Title, a Premise, a Player character with a card, at least one Arc, and at least one Ending, each with a name, a Kind and a Trigger.
_Avoid_: ready, valid, complete

**Session**:
One playthrough of a World, from its first Turn to its Ending. It plays the World's Skeleton as it stood when the Session started.
_Avoid_: run, playthrough, game, save

**Turn**:
One Player input and everything the harness does in response to it, ending in one shipped Passage. The Opening is the one Turn without a Player input.
_Avoid_: step, round, move

**Opening**:
Turn 0 of every Session: the first scene, which the Writer sets from the Skeleton before the Player acts.
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

**Choice**:
One of the two to four things the Writer offers the Player character to do next, below a Passage. The Player picks one or types their own input.
_Avoid_: option, suggestion

**Harness pane**:
The Author's view, per Turn, of exactly what the Writer was given and what it sent back. The harness pane switch makes it available.
_Avoid_: debug panel, test mode

**Claim**:
A Player input that states its own result beyond the Player character's own deeds. The Skeleton's Claims setting says how far a Claim may go.
_Avoid_: claimed outcome, assertion

**Event**:
An on-page change in what the story is about that forces a response. Reveals told in dialogue, and warnings of trouble to come, don't count.
_Avoid_: beat, incident

**Stall**:
A run of Passages with no Event, whoever caused it.
_Avoid_: lull, dead air

### Evaluation

**Baseline**:
A Session played with the Skeleton alone as the Writer's prompt and no harness; the control a harness Session is compared against.
_Avoid_: control run, vanilla mode

### Roles

**Writer**:
The model that plays the Skeleton: it writes each Passage, offers the Choices and names the Ending a Passage reached.
_Avoid_: narrator (the voice inside the prose), generator, LLM
