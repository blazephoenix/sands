> **Superseded** on 2026-10-13 by [Map: the skeleton and Playtest, from a clean slate](https://github.com/blazephoenix/sands/issues/25). Read it only as history.

# Requirements: Creation Harness MVP

**Due:** Friday
**Purpose:** MVP for the Lossfunk sabbatical

The harness is genre-agnostic: the brief may describe a mystery, a romance, an adventure or anything else, and nothing below assumes one. The appendix's test World (London, 1888) is a testing reference only.

---

## 1. What we're testing

Can an AI tell a compelling, creative story when a human author has fixed the premise, the characters, the hidden truth and the arc?

The author writes a short brief. The AI expands it, describes it and fills in what the author left open. Everything the AI invents lands in a codex the author controls. Jev checks every step so characters, arcs, locations and facts don't drift.

The MVP passes if a viewer can see three things:

1. **The brief holds.** Characters stay in character, arcs happen in order, the hidden truth stays hidden until it's earned, and the story ends in one of the ways the author allows.
2. **The story is alive.** Different players, or the same player replaying, get different routes, prose and invented details.
3. **The author stays in charge.** AI inventions are visible and editable, and the story follows the author's edits.

---

## 2. The author's brief

The brief can be light. The system must work with one as sparse as this (the appendix has a worked example):

- **Setting:** place and period.
- **Characters:** name, role, age, personality and backstory. One is flagged as the player character. The brief may include deceased characters, and may mark any fact hidden: a character's true identity, a motive, a past event.
- **Arcs:** ordered phases, each with a name and a short description of what happens. Exit conditions are optional.
- **Ending:** named in the final arc (for example, "the heir takes the throne" or "the rivals make peace").
- **Locations:** optional.
- **Voice:** optional, as guidelines or sample passages.

Everything in the brief is **locked**. Nothing in the system may contradict or edit it.

---

## 3. Content tiers

| Tier | Created by | Rules |
|---|---|---|
| **Locked** | Author | Everything in the brief. Never contradicted or altered. |
| **Expanded** | AI, during setup | Locations, exit conditions, clues, knowledge, decisive actions, supporting NPCs. Derived from the brief and reviewed by the author before play. |
| **Invented** | AI, during play | New places, NPCs, objects and details that come up in play. Must not contradict locked or expanded content. |
| **Description** | AI, always | Prose, sensory detail, rhythm, how events and characters come across on the page. Adds no facts. |

Expanded and invented content goes into the codex, which the author controls.

---

## 4. Setup phase (before play)

The **small OpenAI model** drafts the expansion as structured JSON. Every output goes into the codex as `proposed`.

### The setup must generate

- **Locations,** if the brief has none: 3 to 4 places that fit the setting (real and period-accurate when the setting is historical), each with a description and its connections.
- **Arc exit conditions** for any arc that doesn't have them: concrete, checkable statements. Example: "The player has learned what the stranger wants and has visited the harbour."
- **Clues:** facts derived from the hidden truth (a character's past, a hidden motive). Each clue records:
  - where it's found
  - who knows it
  - what it reveals
  - whether it points to the hidden truth
  - Red herrings are allowed but must be labeled.
- **Decisive actions:** the story-critical actions the brief implies (an arrest, a duel, a confession), each with its correct target, the clues (or how many of them) the player needs before it can succeed, and what success and a wrong target mean.
- **Knowledge:** what each character knows, and what they reveal at high, normal and low reputation.
- **Supporting NPCs** as the story needs them: allies, rivals, bystanders.

### Setup validation

- **Jev** checks that nothing in the expansion contradicts the brief, and that the locations fit the setting.
- **Code** checks that the story is solvable: some decisive action wins it, and every clue a decisive action needs exists, sits at a location that exists, and can be reached.
- **The author** reviews the expansion, including, for a real-world setting, whether the places are accurate (Jev can't be relied on for factual history). The author can accept, edit or reject any entry before starting play.

---

## 5. Codex

- **Entry fields:**
  - type (location, character, NPC, faction, clue, object)
  - name, description, key facts
  - source: `author`, `setup`, or `play` with a turn number
  - status: `locked`, `proposed`, `accepted`, `edited`, `rejected`
- `proposed` entries are canon as soon as they're created, so play doesn't stall. The author can change them at any time.
- Author edits apply from the next turn.
- Rejected entries must never appear again. If an earlier passage mentioned one, the writer lets it fade out.
- Entities invented during play are added automatically as `proposed`.
- Each turn, the relevant slice of the codex goes into both the writer's context and Jev's state.

---

## 6. Models

| Role | Model |
|---|---|
| Passage writing | Grok |
| Setup drafting, intent parsing, entity and clue extraction | Small OpenAI model |
| All judgment: drift, arcs, locations, knowledge, action classification, pacing, exit conditions, endings | Jev |

Each model sits behind its own interface so it can be swapped.

---

## 7. Player state

Code manages all of it. The model never writes state.

- **Location**
- **Current arc**
- **Clues found**
- **Knowledge revealed** (per character)
- **Reputation:** a number, mapped to bands (high, normal, low)
- **Off-script count**
- **Ending:** none, win, death or removed

---

## 8. Turn loop

1. **Parse intent** (OpenAI): turn the free text into an intent (move, examine, question, one per decisive action verb, other) with its targets.

2. **Classify the action** (Jev, `choice`). Using the brief, the current arc and the scene, classify the action as one of:
   - `on-script`: fits the player character's role in the current arc.
   - `tangential`: harmless, off to the side (buying a drink, wandering).
   - `off-script`: works against the role or the story (abandoning the role, turning on an ally, destroying a clue).
   - `reckless`: plausibly lethal (picking a fight with an armed stranger, walking alone into danger at night).

   A low-confidence classification counts as `tangential`, so the player is never punished on a guess.

3. **Resolve** (code):
   - **Move:** only to a location in the codex.
   - **Question:** the NPC reveals only what their knowledge allows at the current reputation band.
   - **A decisive action on the wrong target:** costs reputation.
   - **A decisive action on the correct target before its required clues are found:** fails and costs reputation.
   - **A decisive action on the correct target once its required clues are found:** succeeds, and this can satisfy the final arc.
   - **`off-script`:** costs reputation and adds 1 to the off-script count.
   - **`reckless`:** a chance of death, weighted by arc and state. A lethal result ends the game.
   - **`on-script` and `tangential`:** no penalty. The model describes what happens.

4. **Direct** (code): tell the writer the current arc, which exit conditions are still unmet, which clues can be found here, the reputation band, and any pacing nudge.

5. **Write** (Grok): one passage. Its input is the brief, the codex slice, the voice guidance, recent passages, the player input, the resolved outcome and the directive.

6. **Judge** (Jev): every active rule, in one call.

7. **Retry:** failed rules go back to Grok as feedback. At most 3 attempts. If all 3 fail, ship the last one and flag it in the log.

8. **Extract** (OpenAI): pull the new entities and revealed clues out of the passage.
   - New entities go into the codex as `proposed`.
   - Clues go into state only if they match a planned clue.
   - A clue that isn't planned and points to the hidden truth counts as a violation, and the passage goes back to step 7.

9. **Check the arc** (Jev plus code): if the current arc's exit conditions are met, advance to the next arc.

10. **Check pacing** (Jev, `noul`): "Over the last N turns, has the player made progress toward the current arc's exit conditions?" If not, set a pacing nudge for the next turn, and the writer surfaces an opportunity (a messenger, a chance meeting, an overheard remark). This never forces an arc forward. **It's experimental and needs testing.**

11. **Update state** (code).

12. **Check endings** (code):
    - **Win:** the final arc's condition is met.
    - **Death:** a reckless action resolved as lethal.
    - **Removed:** reputation reaches 0, or the off-script count reaches its threshold. The story's characters stop the player character, in the story's own terms.
    - Grok narrates whichever ending was reached, and Jev checks that the narration matches the outcome code decided.

There's no turn limit. Arcs and endings drive the game.

### Reputation in the story

Reputation has to be visible in the prose, not just in a number. At low reputation, NPCs are curt, a character the player character answers to issues warnings, and characters refuse to talk. The writer gets the reputation band each turn, and Jev checks that NPC behavior matches it.

---

## 9. Judge requirements (Jev)

- Every rule is a `noul` or `choice` question, with a configurable threshold.
- Answers below the confidence floor show as flagged in the log.
- The state sent to Jev includes: the passage, the relevant brief excerpts, the codex slice, the resolved outcome, the current arc and its conditions, knowledge revealed so far, and the reputation band.

### Rules the system must cover

| Rule | Checks |
|---|---|
| **Character drift** | Each character in the passage acts consistently with their personality and backstory. One question per character present. |
| **Arc validity** | The passage fits the current arc and pulls in no events from later arcs. |
| **Location** | The scene is set in a codex location, and its details match the entry. |
| **Knowledge** | No character reveals more than their knowledge allows. The narrator doesn't reveal the hidden truth before the clues found support it. |
| **Outcome** | The passage matches the resolved outcome. The player doesn't succeed at something the resolver rejected. |
| **Agency** | The passage doesn't act or speak for the player beyond their input. |
| **Period** | No anachronisms for the setting. |
| **Codex consistency** | No contradictions with accepted or edited entries. No rejected entries. |
| **Reputation** | NPC behavior matches the current reputation band. |
| **Voice** | The passage follows the author's voice guidance, if the brief gives any. |
| **Action classification** | Step 2 of the turn loop. |
| **Pacing** | Step 10 of the turn loop. |
| **Ending** | The ending passage matches the ending code decided. |

---

## 10. Showing the creativity

- **Variation:** play the same brief twice with different inputs. The locked truth and the arc order stay the same, while routes, prose and play-time inventions differ.
- **Codex view:** each entry is tagged by source, so a viewer can see what came from the author, from setup and from play.

---

## 11. Modes

- **Harness:** the full system.
- **Baseline:** the brief as a system prompt to Grok, with no setup expansion, resolver, Jev, codex or code-managed state.
- **Replay:** a fixed script of inputs that runs in either mode.

---

## 12. Interface

- **Brief editor:** the author's input form or file.
- **Setup review:** the expanded codex, clues, decisive actions, exit conditions and knowledge, each with accept, edit and reject. A **Start** button.
- **Story pane:** passages, free-text input and the ending.
- **Harness pane:**
  - A per-turn log: action classification, resolved outcome, each attempt, rule results with confidence, and rejected passages struck through.
  - The current arc and its exit conditions.
  - Clues found and knowledge revealed.
  - Reputation (value and band), and the off-script count against its threshold.
  - Pacing nudges.
- **Codex pane:** entries grouped by type and tagged by source and status, editable during play.
- **Compare view:** baseline vs harness on the same replay script.

---

## 13. Friday acceptance criteria

### Setup
- [ ] A brief as detailed as the test World's, with no locations, expands into a playable world that the author can review and edit.
- [ ] The solvability check passes.

### Play
- [ ] A full playthrough reaches the **win** ending through clues the player discovered.
- [ ] At least one visible rejection and retry appears in the harness log.
- [ ] At least 2 codex entries are created by the AI during play.

### Adversarial replay: the harness handles each case correctly
- [ ] Attempting the winning decisive action in arc 1, before its clues are found, fails and costs reputation.
- [ ] Asking a character something they couldn't know gets no reveal.
- [ ] Going to a location that doesn't exist or doesn't fit the setting is refused inside the story.
- [ ] Provoking a character to act against their personality leaves them in character.
- [ ] A decisive action on the wrong target lowers reputation, and a later NPC is visibly less cooperative.
- [ ] A passive stretch triggers a pacing nudge, visible in the log.

### Losing
- [ ] A script that keeps going off-script ends with the player **removed**, with warnings visible in the story before it happens.
- [ ] A reckless action shows a death risk in the log, and at least one run reaches the **death** ending.

### Baseline
- [ ] On the same adversarial script, the baseline shows at least 2 visible violations.

### Authorship
- [ ] The author edits a codex entry mid-game (a location, an NPC or where a clue is placed), and later passages follow the edit.

---

## 14. Non-goals for Friday

Voice input, saves, accounts, multiple concurrent worlds, importing briefs from existing fiction, visual polish beyond legibility, and automated scoring of creativity.

---

## 15. Open decisions

- Starting reputation, the size of each penalty, band thresholds and the off-script threshold. Pick defaults and tune them in playtesting.
- Whether on-script actions such as finding a clue a decisive action requires, or making a correct deduction, can raise reputation, so the player can recover.
- The window N for the pacing check.
- Death odds for reckless actions, per arc.
- How many recent passages the writer sees.
- The Jev noul threshold and the confidence floor.
- Which Grok model variant to use, since latency matters in a live demo.

---

## Appendix: the test World

A testing reference only, not a template or a default: the smoke test and the unit tests use it because a fixed story makes results comparable. Nothing in the harness may depend on its genre, names or period.


> **Setting:** 1888, London
> **Location:** Scotland Yard
>
> **Characters**
> 1. Jacob Flannery (player character): a 38-year-old weary, alcoholic detective called over from the United States for a special case, a series of killings of merchants in London over the past three weeks.
> 2. Geoffrey James: police captain. Description, personality, backstory.
> 3. Amanda Hopkins: second in command. Description, personality, backstory.
> 4. Three or four deceased merchants, each with a description, personality and backstory.
> 5. Max Rober (the killer): a 21-year-old serial killer murdering merchants as revenge against his father, himself a merchant. This gave him a deep hatred of merchants in general.
>
> **Arcs**
> 1. Introduction: Jacob lands in London, meets the police and learns the state of the case.
> 2. Midpoint: the investigation begins. The player discovers evidence and backstories.
> 3. End: the killer is caught.
>
> **Locations:** the AI should pick 3 to 4 real ones.
