# Living scenes: exits, momentum and novel prose — Design

**Date:** 2026-09-24
**Builds on:** `2026-09-23-creation-harness-design.md` §9–§11, the Turn engine of #4 (PR #13)
**Status:** Draft for the Author's review.
**Built so far (2026-09-30):** the prose lines of §3.6 as plain prose, not Markdown, with Passages kept at about 150 words; paragraphs in the story pane, the reveal and the harness pane instead of §3.8's Markdown renderer; a cold-open Opening. Nothing else here is built.

---

## 1. Problem

Played in a real World (the Rajesh Khanna World, one Session, three Turns), the Passages read as bland, static blocks:

- **Nothing happens unless the Player makes it happen.** The Passage that finally passed Turn 1 ends "Nothing else shifted… waiting." The Writer's brief is eight prohibitions and no craft.
- **The Player does not know where they can go.** The Directive never names the Locations reachable from here.
- **The Rules punish description.** Most failed Drafts failed on false alarms at p 0.50–0.56: the Knowledge question fired on Openings that have no characters to reveal anything, and the Location question "describes the current Location against its entry" fired on ordinary description. The Opening took three Rounds; Turn 2 was Flagged. A Writer thrown out for describing things learns to describe nothing.
- **Passages render as one block.** The Writer does write paragraphs, but the story pane puts each Passage in one `<p>` and the reveal splits on spaces, so line breaks collapse.

## 2. Evidence: two probes of the Judge (2026-09-24)

A throwaway script (not committed) rebuilt each Turn's real Judge context from the dev database and asked Jev, in the production shape (two Drafts per state), the current Rule questions plus candidate questions. Drafts: the Session's 16 real Grok Drafts, plus 9 hand-written (lively, lively with an off-scene reveal, novel-style) and 2 Location contradictions as a control. **26 Jev calls in total, no Grok or OpenAI calls.** One run each; the labels are the author of the probe's.

| Question | Clean Drafts | Drafts that should fail |
|---|---|---|
| Momentum (yes = static), new | lively 0.02–0.07 | static 0.29–0.93 |
| Knowledge (character reveals), current | 0.16–0.86; 10 of 22 fail | reveals 0.92–0.96 |
| Knowledge, reworded to people in the Codex (§3.3) | 0.04–0.38; none fail | reveals 0.75–0.94 |
| Location description, current | 0.25–0.60; 5 fail | contradictions 0.52, 0.63 |
| Location description, reworded (§3.4) | 0.03–0.06 | contradictions 0.96, 0.90 |

Also seen: novel-style Drafts (varied paragraphs, dialogue) pass Momentum and Knowledge but fail Agency (0.73–0.86) because they give the Player character lines the Player did not type. Agency was right; §3.5 settles how much the Player character may speak.

## 3. Design

The Writer invents what happens (the Author's choice: Writer-led, no new Entries, no setup change). Code still decides every Outcome (ADR-0001); the Judge still guards the Brief.

### 3.1 Exits in the Directive

`buildDirective` gains `exits`: every live Location connected to the current one, either direction. The Directive says: "Ways on from here: A, B. Let the scene show at least one." No Rule checks it; the suggestions (§3.7) show them to the Player regardless.

### 3.2 Momentum Rule

A new Rule, `momentum`, one question per Draft, the Opening included:

- **Question:** "Apart from what `player_character` does, is `drafts[i]` static: does no other character act or speak of their own accord, and does nothing in the scene change?"
- **true:** only the Player character acts, or nothing happens; everyone else is background; the scene ends as it began.
- **false:** another character does or says something of their own accord, or something changes the Player character could respond to (someone arrives, leaves, interrupts, offers, refuses, an event happens). Scenery, weather and crowds as backdrop do not count.
- **Fails at p ≥ 0.25**, a per-Rule override (§10.1 allows them): at the default 0.5 half the static Drafts pass. Unsure band 0.15–0.35.
- **Feedback** (p ≥ 0.8, as every Rule): "nothing happens beyond the Player's action. Have a character or the world act, and end on something the Player can respond to."

### 3.3 Knowledge: only people in the Codex, and the Hidden truth

The first Knowledge question is replaced:

- **Question:** "Does a character in `drafts[i]` reveal a fact about someone in `known_people`, or part of `hidden_truth`, that is not in `allowed_reveals`, `knowledge_revealed` or `codex`?"
- **true:** a fact about a person in `known_people` (what they look like, carry, did, saw or know, where they are or went), or part of `hidden_truth`, not already given.
- **false:** talk about people not in `known_people`, about the world, work, places or plans, and what characters do or say about themselves in the scene, is not revealed information. Facts in `codex` without a [HIDDEN] mark are not new. Manner, mood, weather and scenery are not information.
- **Judge state gains `known_people`:** every live character and NPC but the Player character. The Codex slice holds only the scene's people, so without it the question cannot see the people a reveal is about.

The narration question (spec §10.3) stays as it is.

### 3.4 Location description: only a direct contradiction

The second Location question is replaced, with the Location beside it:

- **Question:** `{question: "Does drafts[i] state something about this place that location.description makes impossible?", location: {name, description}}`
- **true:** something that cannot be true if the description is: a different kind of place, size, era or purpose.
- **false:** anything the description does not rule out; added detail, people, noise, weather, light, smells and activity never conflict.

### 3.5 Agency: how much the Player character may speak

The Player character says only what the Player's input says or clearly implies, in their own words: "I ask Nell what she saw" lets them ask it. Other characters carry the dialogue and address the Player character; a Passage often ends on a line spoken to them. In the Opening they say nothing. Agency's `false` criterion gains: "Saying, in their own words, what `player_input` says they say or ask is not more than `player_input`." **Not yet probed.**

### 3.6 The Writer's brief: craft first, then the rules

`WRITER_INSTRUCTIONS` opens with how to write, then keeps the eight rules:

- Write like a novel, in Markdown: paragraphs separated by a blank line, their lengths following the scene (a one-line paragraph for a beat, longer ones for description); dialogue on its own lines, each speaker a new paragraph; *italics* for emphasis, thoughts and titles; `* * *` for a scene break. No headings, lists or tables.
- In every Passage someone other than the Player character acts or speaks, or the world changes; end on something the Player can respond to.
- Make a way onward visible: at least one of the exits, or a person who could be spoken to.
- Concrete, specific detail over atmosphere.
- The Player character speaks only as §3.5 allows.
- Passage length: about 200 words (up from 150), since dialogue and short paragraphs take room. Latency cost: about +0.8 s per Draft, estimated from the measured ~20 ms per output token.

The Opening's line becomes "the world is already in motion when the Player character arrives; they do nothing beyond arriving and say nothing."

### 3.7 Suggestions under every Passage

The Session page already shows clickable suggestions after the Opening (`FirstActionHints`: two fixed lines, "I look around." and "I wait and listen."). It becomes:

- **Built by code** from the Codex and the latest Turn (pure, unit-tested): "Go to {exit}" per exit, then "Talk to {name}" per non-player character the latest Passage names; at most four, exits first. Nothing model-written reaches the Player unjudged (ADR-0003).
- **Shown under the latest Passage after every Turn**, not only the Opening, while the Player has not started typing. A click fills the input; it does not send.
- Same component and look as today, so no prototype round; the Author can ask for one.

### 3.8 Passages render as Markdown

The Author's request: Passages read like a book, not one paragraph tag.

- **Renderer:** `react-markdown` 10.1 (MIT, React ≥ 18), a new dependency. It never renders raw HTML by default. Allowed elements: paragraph, emphasis, strong, line break and thematic break (the scene break); anything else is unwrapped to its text, so a stray heading or list from the Writer shows as plain prose.
- **Where:** the story pane, and each Draft in the harness pane, so the Author judges Drafts as the Player would read them.
- **Reveal: unchanged.** Today each word fades in from a blur over 0.5 s, the next starting 0.04 s later, so about twelve words are in motion at once and the Passage sweeps in phrase by phrase (`TextGenerateEffect`). That stays: a step in the Markdown pipeline wraps every word in its own span, italics included, and the same stagger runs over the spans in reading order across paragraphs. Click, Space or Esc still shows the whole Passage at once, and reduced motion shows it at once.
- **The Judge reads the Markdown source.** Asterisks do not change a Rule's meaning; nothing to strip.

## 4. Not changed

- **Which passing Draft ships:** still the lower highest violation. The Author chose Momentum as a Rule over re-weighting the choice.
- **Background work and the Pacing nudge (#5):** unaffected. Momentum asks for something to happen in every Passage; the nudge asks for Arc progress after two stalled Turns. Both keep.
- **No new Entry kinds, no setup change, no new ADR.** This tunes Rules and prompts inside ADR-0001 and ADR-0003.

## 5. Testing

- **Unit:** exits in the Directive; the Momentum question on every Draft and its 0.25 threshold; the new Knowledge and Location questions and `known_people` in the Judge state; Agency's new criterion; the suggestions function; the Passage Markdown component (allowed elements, a stray heading unwrapped, no raw HTML).
- **Real run, once, after it is built:** one Opening and three Turns in the Rajesh Khanna World. Pass: most Turns ship in one or two Rounds, Momentum fails only static Drafts, and the Passages read as Markdown with paragraphs and dialogue. About 2 Grok calls and 1 Jev call per Round.

## 6. Where it lands

§3.1–§3.6 and §3.8 on PR #13 (unmerged; they are the Turn engine's prompts and Rules). §3.7 in the same PR if the Author agrees, since it reuses the existing component; otherwise a new ticket.

## 7. Risks

- Every threshold and wording here rests on one run of 26 Jev calls and hand-labelled Drafts. The real run in §5 is the check.
- Momentum at 0.25 fails a Draft on a weak signal; a lively Draft scoring 0.25–0.35 costs a Round. Watch the harness pane for it.
- The Agency change (§3.5) is unprobed.
