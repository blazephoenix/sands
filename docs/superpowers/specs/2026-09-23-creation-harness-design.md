# Creation Harness — Design

**Date:** 2026-09-23
**Due:** Friday 2026-09-25
**Source requirements:** `docs/requirements.md`
**Status:** Approved. Project scaffolded (Next.js 16, shadcn, SQLite, BlockNote, AI SDK, TypeSafe SDK). Next step: implementation plan. See §17.

---

## 1. Purpose

Test one thesis: **can an AI be creative when working within human-authored constraints?**

An author writes a brief. The AI expands it, writes the story, and invents what the author left open. Code enforces the brief's rules. Jev judges every passage. The author can see and edit every AI invention.

This is a **writing harness**, not a mystery engine. The code knows generic story mechanics; the specific story (a mystery, a romance, anything) lives in the brief's data, and nothing in code, prompts, Rules or UI copy may assume a genre. The 1888 London World in the appendix of `docs/requirements.md` is the **test World**: the smoke test and the unit tests use it. It is a testing reference, not a default; every World that is played is written by the author in the UI.

The MVP passes if a viewer can see:

1. **The brief holds.** Characters stay in character, arcs happen in order, the hidden truth stays hidden until earned, and the story ends in a way the author allows.
2. **The story is alive.** Different sessions of the same world produce different routes, prose and invented characters.
3. **The author stays in charge.** AI inventions are visible and editable, and later passages follow the edits.

---

## 2. Core principles

1. **Jev recognizes, code decides.** Jev turns prose and free text into facts (intent, classification, "was this clue revealed?", "was this rule violated?"). Plain code applies rules to those facts (a decisive action succeeds or fails, reputation changes, arc advances, ending reached). No model ever writes state.
2. **Nothing unapproved reaches the player.** A passage appears in the story pane only after Jev passes it.
3. **Everything that decides an outcome is a pure function.** The resolver, solvability check, directive builder and ending check take data in and return data out, with no I/O. Randomness uses a seeded generator so replays reproduce outcomes.
4. **Only authored places exist.** Places come from the brief or from setup (reviewed by the author). During play, the AI may invent **characters only**.
5. **Each model sits behind an interface** so it can be swapped.

---

## 3. Glossary

| Term | Meaning |
|---|---|
| **Brief** | The author's locked input: setting, characters, arcs, ending, optional locations, optional voice, optional custom sections and fields. |
| **Hidden field** | A brief field the author marks as secret (e.g. a character's true identity, or the motive behind a past event). Together, the hidden fields are the **hidden truth**. |
| **World** | A brief plus its setup output (the template entries). |
| **Session** | One playthrough of a world. Starts with its own copy of the world's entries. |
| **Turn** | One player input and everything the harness does in response. |
| **Entry** | One codex item. Kinds are grouped into **World** (location, character, npc, faction, clue, object) and **Story logic** (exit_condition, knowledge, decisive_action). World entries are things in the story; story-logic entries are conditions code enforces. Group is independent of source: both groups hold author (`locked`) and AI (`proposed`) entries. |
| **Clue** | A discoverable fact, placed at a location or held by a character. May point to the hidden truth. May be a labeled red herring. |
| **Knowledge** | One fact one character knows, with the lowest reputation band at which they reveal it. |
| **Decisive action** | A story-ending or story-critical move declared as data, e.g. "challenge the usurper to a duel; requires clues C1, C3, C5; wrong target costs 15 reputation." |
| **Directive** | Code-built instructions to the writer for this turn. |
| **Drafter** | The small OpenAI model (setup drafting, entity extraction). |
| **Writer** | Grok (passage writing). |
| **Judge** | Jev (all judgment). |

---

## 4. Scope and cut order

Friday acceptance criteria are those in `docs/requirements.md` §13 (15 criteria).

**Build order, which is also the reverse cut order** (last item is cut first if time runs short):

1. Day-1 tests (first thing): Jev smoke test (§9.5) and BlockNote custom-block test (§7.4)
2. Brief editor (BlockNote) and brief conversion
3. Setup: draft, validate, solvability
4. Setup review (BlockNote entry blocks)
5. Turn loop with Jev
6. Harness pane (test mode)
7. Codex pane editing during play
8. Replay runner and adversarial scripts
9. Pacing check
10. Baseline mode and compare view

Accepted consequence: the BlockNote editor consumes about one of the two days, so **baseline and compare (criterion 14) are expected to be cut for Friday**, and pacing (criterion 11) is at risk.

Non-goals (from `docs/requirements.md` §14, plus decisions made here): voice input, saves beyond the session table, accounts, multiple concurrent worlds as a feature, importing briefs from fiction, visual polish beyond legibility, automated creativity scoring, AI-invented places or objects, rolling story summaries (see §12), event-sourced state.

---

## 5. Architecture

**Stack:** Next.js (App Router), shadcn/ui, BlockNote (`@blocknote/react`, MPL-2.0, built on Tiptap; no `@blocknote/xl-*` packages), SQLite via Drizzle + better-sqlite3, Vercel AI SDK (Grok via the xAI provider, OpenAI via the OpenAI provider), TypeSafe SDK `@typesafe-ai/sdk` for Jev (falling back to `fetch` if the SDK cannot target the endpoint we are given). **No server actions:** client components call route handlers.

### 5.1 Modules (`src/`)

| Module | Responsibility | I/O |
|---|---|---|
| `brief/` | Brief schema (zod); BlockNote document → brief conversion; brief → YAML rendering for prompts | None |
| `models/` | `Writer`, `Drafter`, `Judge` interfaces; real implementations; fakes for tests | Model APIs |
| `codex/` | Entry create/edit/reject; session copy; codex slice selection per turn | DB |
| `setup/` | Draft calls, Jev validation, solvability check (pure) | Models, DB |
| `engine/` | Turn loop orchestration; pure core: `resolve`, `direct`, `checkEndings`; `config.ts` | Via injected interfaces only |
| `rules/` | Rule catalog: each rule builds its Jev questions, holds thresholds and a feedback template | None |
| `db/` | Drizzle schema, client, migrations | DB |
| `editor/` | BlockNote schema: custom typed blocks and the entry mention, shared by brief, setup review and codex pane | Browser |

### 5.2 Routes

| Route | Purpose |
|---|---|
| `POST /api/worlds` | Create a world from a brief (BlockNote document) |
| `PUT /api/worlds/[id]/brief` | Save brief edits |
| `POST /api/worlds/[id]/setup` | Run setup (draft → validate → solvability); returns progress events as NDJSON, then the result |
| `GET /api/worlds/[id]` | World, brief, entries, solvability result |
| `PATCH /api/entries/[id]` | Accept, edit or reject an entry (world template or session copy) |
| `POST /api/sessions` | Start a session from a world |
| `POST /api/sessions/[id]/turn` | Play one turn, or the Opening with `input: null` (ADR-0014); returns progress events as NDJSON, then the approved passage and turn summary. 404, writing nothing, for a session whose world was deleted |
| `GET /api/sessions/[id]` | Story, current state, entries, harness log |
| `GET /api/worlds` | Every world, for the Worlds home (added with the UI) |
| `POST /api/entries` | An entry the author adds in the entry editor: source `author`, status `accepted` (added with the UI; only brief-derived entries are `locked`) |
| `DELETE /api/worlds/[id]` | Delete a world for good, with its sessions, turns and entries (the foreign keys cascade). 204; 404 for an unknown world; 409 while setup is running (`drafting`), because setup is still writing to it. A confirmation dialog, not an Undo toast: Undo would need a soft delete every query filters on (added with #10) |

The turn route does not stream passage text; the passage is final before it is sent. The client performs the animated reveal (animation design is later work).

---

## 6. Data model

Four tables.

### `worlds`

| Column | Notes |
|---|---|
| `id` | |
| `name` | |
| `brief_doc` | BlockNote document JSON, so the editor reopens exactly as left |
| `brief_json` | Validated brief; locked |
| `setup_status` | `draft` / `drafting` / `review` / `ready`. `ready` once the first session starts; a failed setup returns to `draft` |
| `solvability_json` | Latest solvability result |
| `created_at`, `updated_at` | |

### `entries`

| Column | Notes |
|---|---|
| `id` | |
| `world_id` | |
| `session_id` | Null = world template entry; set = session copy |
| `template_id` | For session copies: the world entry it was copied from (null for play inventions) |
| `kind` | `location`, `character`, `npc`, `faction`, `clue`, `object`, `exit_condition`, `knowledge`, `decisive_action` |
| `name` | For clues, a short handle (C1, C2, …) plus title |
| `description` | |
| `key_facts` | JSON array of strings (custom brief fields on an item land here) |
| `data_json` | Kind-specific fields (below) |
| `source` | `author`, `setup`, `play` |
| `source_turn` | Turn index when `source = play` |
| `status` | `locked`, `proposed`, `accepted`, `edited`, `rejected` |
| `jev_flags` | JSON: setup validation results (contradiction / period fit) |
| `created_at`, `updated_at` | |

Kind-specific `data_json`:

- **location:** `connections` (entry ids), `is_start` (bool)
- **character / npc:** `role`, `age`, `personality`, `backstory`, `is_player`, `hidden_fields` (names of fields that are secret), `aliases`
- **clue:** `location_id` (nullable), `known_by` (character ids), `reveals` (text), `points_to_hidden` (bool), `red_herring` (bool)
- **exit_condition:** `arc_index`, `condition` (text, checkable)
- **knowledge:** `character_id`, `fact`, `min_band` (`low` / `normal` / `high`), `clue_id` (nullable)
- **decisive_action:** `verb` (e.g. "arrest", "duel", "confess to"), `correct_target_id`, `requires` (clue ids) or `requires_count` (n of listed clues), `on_success` (`win` to end the session, or `none` to continue play), `wrong_target_penalty`, `premature_penalty`

**Session copy:** starting a session copies every non-rejected template entry into rows with `session_id` set. Mid-game edits touch only that session. Two sessions of one world start identical, which the variation claim needs. (Alternative for later: store only per-session overrides and merge on read. Not chosen: every read becomes a merge, and later template edits would leak into running sessions.)

### `sessions`

| Column | Notes |
|---|---|
| `id` | |
| `world_id` | |
| `mode` | `harness` / `baseline` |
| `seed` | For the seeded random generator |
| `ending` | `none` / `win` / `death` / `removed` |
| `created_at`, `updated_at` | |

### `turns`

| Column | Notes |
|---|---|
| `id` | |
| `session_id` | |
| `idx` | 0-based, monotonic per session |
| `player_input` | Null for the Opening (turn 0) |
| `passage` | The shipped passage |
| `flagged` | True if shipped after 3 failed rounds |
| `log_json` | Intent, classification, outcome, directive, every draft with rule results, discovery answers, background results, timings, Jev model version |
| `state_json` | Full player state after this turn |
| `background_status` | `pending` / `done` / `failed` |
| `created_at` | |

A turn row is written only when a passage ships. Background results are merged into `log_json` and the latest `state_json` when they finish.

### Player state (`state_json`)

```
location_id, arc_index, clues_found[], knowledge_revealed{character_id: knowledge_id[]},
reputation, off_script_count, warnings_given[], pacing_nudge (bool + reason), ending
```

---

## 7. The brief and editors

### 7.1 Brief editor (BlockNote)

A Notion-style block editor. The document mixes **section headings with `Label: value` fields** (which drive mechanics) with **free prose** (which is locked text for the writer and judge).

- **The editor is a plain BlockNote document** (Author's choice from a UI prototype, 2026-09-23): no form controls inside blocks; every control lives in BlockNote's own menus (slash menu, ⠿ side menu, formatting toolbar).
- **Section headings** are the only custom blocks, inserted with the slash menu (`/character`, `/arc`, `/location`, `/setting`, `/ending`, `/voice`): an icon and kind label, then the name for Character, Arc and Location. They have no children. **Document order is arc order.**
- **Fields** are ordinary paragraphs under a section heading that read `Label: value` (Shift+Enter for a second line). The known labels per kind are:
  - **Setting:** Place, Period.
  - **Character:** Role, Age, Personality, Backstory, Aliases. **Player character** is a prop on the heading, toggled from the ⠿ menu.
  - **Arc:** Description, Exit condition.
  - **Ending:** Condition (e.g. "the heir takes the throne").
  - **Location** (optional): Description.
  - **Voice** (optional): Guidelines, Sample passage.
- **Custom fields:** any other label is an Author-labelled field and becomes the item's `key_facts`. A near-miss of a known label is reported as a probable typo.
- **Free prose:** any block that is not `Label: value` under a section heading becomes locked brief text, grouped under the nearest standard heading, and ends the current section. It reaches the writer and the judge; code cannot act on it. Only section headings and their fields drive mechanics.
- **Hidden** is a text style applied from the formatting toolbar; a field whose value carries it is secret. Together, hidden fields are the hidden truth.
- **New brief template:** a new world opens with one Setting block, one player Character block, three Arc blocks and one Ending block, so a sparse brief is quick to fill in.
- **Conversion:** a function walks the BlockNote document and builds the brief object, validated with zod. Validation errors carry the block id so the editor highlights the field.
- **Storage:** BlockNote document JSON and validated brief JSON. YAML is rendered from the brief JSON for prompts and export; hidden fields are rendered with a `SECRET — never state or imply` marker in the writer's prompt.
- **Validation rules:** exactly one player character; at least one arc; exactly one ending; every character has a name.

### 7.2 Entry editor (setup review and codex pane)

The same BlockNote editor and pattern as §7.1, with one section heading per entry kind (location, character, npc, faction, clue, object, exit condition, knowledge, decisive action):

- **Entry heading:** kind icon and kind, handle, source, status and Jev-flag marker as a plain-text label line, then the name. **Accept**, **Reject** and **Restore** are in the ⠿ menu. Fields are `Label: value` paragraphs, including kind-specific data (e.g. `Red herring: yes`, `Requires: @C1, @C3`).
- **References** use a custom inline mention (`@The harbour`, `@C1`). The mention menu lists only existing, non-rejected entries, so the author cannot point at something that does not exist.
- **Editing** a block sets status `edited`, then re-runs solvability (setup review) or takes effect from the next turn (play).
- **Edits in play** re-run solvability over the Session's copies and show any gaps in the codex pane as a warning; the edit still goes through. Clues already found count as usable even if their entry is later rejected.
- **Rejecting in play changes only the future.** Clues found and knowledge revealed stay in state and still count. The location the player stands in cannot be rejected (409 with the reason).
- **Locked** entries render read-only.
- Blocks are grouped under **World** and **Story logic** headings; the slash menu is limited to entry kinds (no free prose) on these surfaces.

### 7.3 Licensing

Use only MPL-2.0 BlockNote packages (`@blocknote/core`, `@blocknote/react`, and a UI package such as `@blocknote/shadcn` or `@blocknote/mantine`). Do not use `@blocknote/xl-*` packages (GPL-3.0 or commercial).

### 7.4 Day-1 BlockNote test (1 hour) — passed; superseded by the §7.1 design

A BlockNote custom block has flat typed props plus one content area; a Character needs several multi-paragraph fields. Verify on day 1 that a typed block can hold multiple labeled, multi-paragraph fields with a per-field hidden toggle, most likely as nested child blocks (one "field" block per field) under a typed parent block. Pass: a Character block with personality, backstory and one custom field round-trips through conversion to the brief object. **Fallback** if it fails: plain Tiptap with custom nodes (section → card → field), the open-source Tiptap drag-handle extension, and a slash menu built on `@tiptap/suggestion`.

---

## 8. Setup phase

1. **Parse.** Convert and validate the brief. Create `locked` entries with source `author`: characters, any locations, any exit conditions. Arcs and the ending stay in `brief_json`.
2. **Draft** (Drafter, structured output, two sequential calls):
   1. **World call:** 3–4 locations that fit the setting (real and period-accurate when the setting is historical) with descriptions and connections (if the brief has none), supporting NPCs, exit conditions for arcs that lack them. The start location is the brief's location if given, else the first drafted location.
   2. **Story logic call** (sees call 1's output): clues (location or holder, what each reveals, `points_to_hidden`, `red_herring`), knowledge entries, decisive actions derived from the ending, and exit conditions for any arc still without one (so a retry can close an arc gap).
   The Drafter refers to things by name, and to clues by the key it gave them (C1, C2, …); code resolves names to ids, by name or a character's alias, ignoring case. An unresolved name in the story logic call is a gap (`unknown_name`), fed back to the retry and never stored. The world call is not retried, so there an unresolved connection or arc is dropped and logged, as is a drafted location or NPC repeating a name the world already has. Penalties are not drafted: code sets the §15 defaults.
3. **Validate.**
   - **Solvability (code, pure):** at least one non-rejected decisive action has `on_success = win` (else the gap "nothing in this World wins the story"); some non-rejected location is the start location (else the gap `no_start_location`, "there is no start Location: the Player has nowhere to begin", #3; it holds in the setup review too, so removing the start location disables Start). The story logic call drafts no locations, so this gap fails setup right after the world call, without spending a story logic call. For every decisive action, each required clue exists, is not a red herring, and is reachable: either at a location connected to the start location, or held by a character with a knowledge entry revealing it at `normal` band or lower. Every arc has at least one exit condition.
   - **Jev:** one call with two `noul` questions per drafted entry of every kind (#3) — "does this conflict with the brief?" and "is this out of place in the setting?" (asked only when the brief has a setting) — each with the entry in structured instructions and a `false` criterion that says what does not count (research §2). A failed or Unsure answer sets `jev_flags`; nothing is deleted. Validation runs on every attempt, over that attempt's new entries; world call entries are asked once.
   - **On solvability failure:** re-run the story logic call with its previous draft and the failure list as feedback, at most 2 times. If it still fails, show the author the exact gaps (e.g. "C4 sits at an unreachable location"), return the world to `draft` and store nothing.
   - **Storage:** models first, then one synchronous transaction stores every entry and moves the world to `review` (research §6). A Drafter or Judge failure, or the author leaving mid-setup (the request aborts), returns the world to `draft` with nothing stored.
4. **Review.** Author accepts, edits or rejects entries in the entry editor (§7.2). Solvability re-runs after every change. **Start** is enabled while solvability passes. Entries may remain `proposed`; proposed entries are canon (`docs/requirements.md` §5). Historical accuracy of real places is the author's call; Jev is not relied on for factual history.

Expected setup time: 30–60 seconds, once per world.

---

## 9. Turn loop

Target: **3–5 seconds** from submit to passage on a turn that needs no retry. All timings in this spec are estimates to be confirmed by measurement on day 1.

### 9.0 The Opening (turn 0)

A Session never starts blank. As soon as it is created, the harness plays its **Opening**: the Writer writes the first scene as a cold open (the Player character at the start location, the first Arc under way and the world already in motion, what the Player character is there to do made plain, ending on something the Player can act on) and the Judge rules on it like any Turn. There is no player input, so steps 2 and 3 below are skipped: nothing is read or classified, and no Outcome is resolved. The directive asks for an opening scene and allows no reveals. The Agency rule checks that the Player character does nothing beyond arriving. The Opening is turn 0, with `player_input` null. The Session page plays it automatically, with the same progress events and reveal as any Turn; a failure leaves the Session with no Turns and offers Retry.

### 9.1 Critical path (before the passage appears)

1. **Wait** for the previous turn's background work if it is still running.
2. **Jev call 1 — read the input.** One request, three `choice` questions:
   - **Intent:** `move`, `examine`, `question`, one option per declared decisive-action verb (e.g. `arrest`, `duel`, `confess to`), `other`.
   - **Target:** every non-rejected session entry that can be targeted (locations, characters, NPCs, objects), plus `none` and `not_in_codex`.
   - **Classification:** `on_script`, `tangential`, `off_script`, `reckless`. Confidence below the floor (0.6) is treated as `tangential`.
3. **Resolve (code, pure).** Input: state, intent, target, classification, session entries, seeded RNG, config. Output: outcome plus state changes. Endings are decided here, so the passage written next is the ending scene.
   - **move:** allowed only to a non-rejected location entry; `not_in_codex` or a non-location target is refused inside the story.
   - **question:** the target may reveal only knowledge entries with `min_band` at or below the current band that are not yet revealed ("allowed reveals").
   - **examine:** clues at the current location that are not yet found become "discoverable."
   - **decisive action:** correct target and requirements met → success (may trigger `win`); correct target, requirements unmet → fail, `premature_penalty` (default 20); wrong target, or no target → fail, `wrong_target_penalty` (default 15). Every penalty is a positive number subtracted from reputation (decided 2026-09-24); the entry schema rejects a negative one.
   - **off_script:** reputation − 10, +1 off-script count. Warnings at counts 2 and 3 are added to the directive so a character the player character answers to warns them in the story.
   - **reckless:** seeded death roll with the current arc's odds. Lethal → `death`.
   - **on_script / tangential:** no penalty.
   - **removed:** reputation ≤ 0 or off-script count ≥ 4 after this turn's changes → `removed`.
   - **Order:** the intent and the classification both apply; a classification never cancels the intent (an off-script move still moves the player, then costs 10). A reckless action rolls for death first; lethal ends the session and nothing else resolves. Otherwise the intent resolves, then the classification's penalty, then the removed check. The Outcome records the intent's result and the classification's effect separately.
4. **Direct (code, pure).** Build the directive: current arc and its unmet exit conditions, allowed reveals, discoverable clues, reputation band plus the lean for that band (high: inclined to trust; normal: judge on what they have seen and heard; low: wary; each character in their own way), warnings to deliver, pacing nudge if set, the outcome to narrate, and the ending if one was decided. An action that changes nothing code tracks reaches the Writer as the player character's action as typed, to show along with how the characters present react. Reveal and clue lines appear only when the turn has some in play. Characters may say new things about themselves, their past and what they want, as long as nothing contradicts the brief or the codex (#18).
5. **Write (Grok, two drafts in parallel).** Input: brief YAML (hidden fields marked), codex slice (§9.3), voice guidance, last 4 passages, player input, directive. Passage cap from config (`passageWords`, 300). The Writer instructions are the Author's SillyTavern-style prompt generalized to every character in the scene (#18): characters with their own wants who may refuse, persistent consequences, and a "before writing" checklist answered in the model's reasoning. Use a reasoning Grok model (`grok-4.7`, configurable via env) so the checklist runs; the output-token ceiling (`writerMaxOutputTokens`) leaves room for its reasoning. The Writer asks for a reasoning summary and each Draft's is logged with it, shown in the harness pane.
6. **Jev call 2 — judge both drafts in one request.** All rule questions (§10) for each draft, plus one discovery `noul` per allowed reveal and per discoverable clue ("did this draft reveal it?"), plus the unplanned-clue check (§10).
   - If one or both drafts pass, ship the passing draft with the lower highest-violation score.
   - If both fail, build feedback from the clearly failed rules (§10.4) and write two new drafts. Maximum 3 rounds. After round 3, ship the draft with the lowest highest-violation score and set `flagged`.
   - Discovery answers for the shipped draft update `clues_found` and `knowledge_revealed`. Revealed knowledge that carries a clue (`clue_id`) also finds that clue, as the solvability check assumes. A found clue that a decisive action requires gives +5 reputation (recovery).
7. **Commit and return.** Write the turn row with state and log; return the passage.

### 9.2 Background (after the passage appears)

8. **Extraction (Drafter):** named characters in the passage that are not in the codex become `npc` entries with `status = proposed`, `source = play`, `source_turn = idx`.
9. **Arc check (Jev):** one `noul` per unmet exit condition of the current arc, using recent passages and state. When all are met, code advances `arc_index`.
10. **Pacing check (Jev):** "Over the last 2 turns, has the player made progress toward the current arc's exit conditions?" If not, set `pacing_nudge`; the next directive tells the writer to surface an opportunity (a messenger, a chance meeting, an overheard remark). The nudge never advances an arc. Experimental.

Results are written into the turn's `log_json` and `state_json`; `background_status` becomes `done` or `failed`.

### 9.3 Codex slice

Sent to the writer and the judge each turn:

- Current location entry and its connected locations
- Player character
- Characters and NPCs named or aliased in the player input, the last passage, or the directive's target
- Allowed reveals and discoverable clues
- Current arc and later arcs (names and descriptions)
- For the judge only: the hidden truth, names of rejected entries

Rejected entries are never included for the writer. If an earlier passage mentioned one, the writer simply does not continue it.

### 9.4 Size over time

The judge state stays roughly constant (about 5k–10k tokens) across the session: past passages are not sent to Jev, the codex slice is filtered to the scene, and growing lists are capped by the plan's size. The writer's prompt is capped by the 4-passage window (about 6k–12k tokens). Trade-off: events older than 4 passages are remembered only through state and codex (see §12).

### 9.5 Jev smoke test (day 1, first task)

Before building the turn loop, write about 10 short passages set in the test World (London, 1888), each deliberately violating one rule (plus a few clean ones), and run them through the rule questions. Record which violations Jev catches and at what probability. This is a smoke test for "does the rule work at all," not calibration; thresholds are tuned in playtesting. Measure Grok and Drafter latency in the same session.

**Done 2026-09-24** (`pnpm smoke:judge`; results in `docs/research/2026-09-24-engine-libraries.md`). Every one of 16 deliberate violations scored p ≥ 0.70 on its Rule question. The weakness is the other direction: a Draft that breaks one Rule often scores high on unrelated Rules, and the Knowledge question sits in the Unsure band on clean Drafts. Measured: Judge 553 ms for 30 questions, Writer about 3.1 s per ~140-word Draft (two in parallel, same wall clock), Drafter 4.6 s.

---

## 10. Judge rules (Jev)

### 10.1 Conventions (checked against the Jev docs, 2026-09-24)

Verified against https://docs.typesafe.ai and the installed `@typesafe-ai/sdk` 0.6.0; sources and the smoke test are in `docs/research/2026-09-24-engine-libraries.md`.

- **One call, many questions.** A request is one `state` and a map of named questions; Jev evaluates each independently and in parallel, and no answer sees another. Types can be mixed. Question ids are not sent to the model, so each question must be complete in its `instructions`. Limits for `jev-1.13.0`: 64k tokens per request (state plus every question), 32k for the state plus the longest question, 255 options per `choice`; no cap on the number of questions is documented. Latency grows with tokens: 30 questions (3.9k tokens) took 553 ms, 272 questions (26.9k tokens) 2,048 ms.
- **Answers.** A `noul` answer is one number, the probability of yes, with no separate confidence. A `choice` answer is the chosen option, a probability for every option (summing to 1) and a `confidence` derived from how peaked they are. The `choice` confidence floor (0.6, §9.1) is our choice; the docs' example floor is 0.5.
- Every Rule question is a `noul` phrased so that yes means **"the Draft violates X"**, with `criteria: {true, false}` spelling out what yes and no mean. **One condition per question:** the docs say a question with two conditions makes the value mean less, so a Rule with an "or" in it asks two Nouls (correction: §10.3's Arc and first Location questions are now split).
- Thresholds are ours, not Jev's; the docs set none. Each Rule **fails** at p ≥ 0.5 and is **Unsure** when 0.35 ≤ p < 0.65. Per-Rule overrides in `engine/config.ts`.
- Every `choice` includes an escape option (`other`, `none`, `not_in_codex`), as the docs recommend when the options might not cover every input.
- Questions point into the state by backticked path, e.g. `` `drafts[0]` ``, `` `current_arc.exit_conditions` ``. `instructions` and `criteria` may also be JSON objects that carry the data a question needs next to the question.
- Pin the model version: `TYPESAFE_DEFAULT_MODEL=jev-1.13.0` (the alias `jev-latest` points to it today and can move). The response's `model` field reports the versioned id that answered; the Judge logs it on every call and warns when it differs from the pinned one.
- A `noul` and a `choice` version of the same question are not comparable, and a question and its negation do not sum to 1 (the docs measured 0.72 and 0.47); do not mix them or rely on such identities.
- Keep the state small. The docs list a large state full of irrelevant detail, indirection and literal reading as known weak spots of `jev-1.13`, which is why the Judge sees a Codex slice (§9.3), not the Codex.
- The SDK retries 408, 429 and 5xx twice by default with a 10 s timeout per attempt; the Judge sets one retry to match §13.

### 10.2 Judge state

`drafts[]`, `player_input`, `outcome`, `current_arc` (with exit conditions), `later_arcs`, `setting`, `voice`, `codex` (slice), `rejected_names`, `allowed_reveals`, `knowledge_revealed`, `clues_found`, `reputation_band` (with behavior guidance), `hidden_truth`, `ending` (on ending turns).

### 10.3 Rules (asked once per draft)

The wordings below include the rewordings the smoke test proposed (research §2) for Character drift, Codex, Reputation, Voice and the Knowledge narration question, and a Location question checked against `known_places`. They were applied with #4 on 2026-09-24 and **have not yet been checked against real Drafts**; tune or revert each after the first real Turns.

| Rule | Question(s) |
|---|---|
| Character drift | Per non-player character named in the draft (matched in code by full name, alias, given name or surname), with their entry beside the question: "Does anything `character.name` says or does go against `character.personality` or `character.backstory`?" The `false` criterion: behaviour the entry allows is not drift. |
| Arc | "Does the draft depict events from `later_arcs`?" and "Does the draft contradict `current_arc`?" (split per §10.1: one condition per question) |
| Location | "Does the draft take place somewhere other than `current_location`?", "Does the draft describe `current_location` against its description?" and "Does the draft name a place a character could travel to that is not in `known_places`?" (`known_places` is every live Location, since the slice holds only nearby ones. Detail inside a location, such as a back office, is description and allowed.) |
| Knowledge | Only when the scene's characters (those in the codex slice or named in the draft) hold knowledge entries neither allowed this turn nor already revealed, with those facts beside the question: "Does a character give away a fact in `knowledge`?" A character saying something new about themselves, their past or what they want is not a reveal (#18). And "Leaving aside what characters say aloud, does the narrator state or hint at `hidden_truth` beyond what `clues_found` supports?" (reworded: the first wording fired on dialogue). Until #18 the first question counted any new fact about a character as information; it threw out Drafts where characters talked about themselves. |
| Unplanned clue | "Does the draft present a fact pointing to `hidden_truth` that is not one of the discoverable or found clues?" (Replaces the blocking part of `docs/requirements.md` §8 step 8.) |
| Outcome | "Does the draft contradict `outcome`?" |
| Agency | "Does the player character say or do more than `player_input`?" |
| Period | "Does the draft contain anachronisms for `setting`?" |
| Codex | One question per live Entry the draft names (location, character, NPC, faction, object), with the Entry beside it: "Does the draft state something that conflicts with `entry`?" (proposed entries are canon), and, when any Entry is removed, "Does the draft mention anything in `rejected_names`?" |
| Reputation | One **Pushover** question in every Band: "Does a character agree with, give in to, or flatter the player character against their own wants, with no reason in the story?" Characters may feel strongly in either direction; the rule stops sycophancy (#18). |
| Voice | Only if the brief has voice guidance: one question per guideline (the guidelines split by line and sentence), with the guideline beside it: "Does the draft break `guideline`?" |
| Ending | Only on ending turns: "Does the draft narrate an ending other than `ending`?" |

Action classification and pacing are covered in §9.1 step 2 and §9.2 step 10.

### 10.4 Retry feedback

Each rule has a feedback template. A Rule question the draft fails at p ≥ 0.8 becomes one line to the writer, e.g.: *"Agency (0.82): the draft has the player character speak beyond the player's input. Rewrite without adding their words or actions."* Failures between 0.5 and 0.8 still fail the draft but add no line: the smoke test (§9.5) showed a draft that breaks one Rule often scores above 0.5 on unrelated Rules, and a wrong line tells the writer to fix something it did not do. If no failure reaches 0.8, the next Round is written with no feedback lines. The harness pane still shows every Rule answer.

---

## 11. UI

- **`/worlds/[id]/brief`:** BlockNote brief editor; **Run setup** button with progress; **Delete World** in the header's world actions menu.
- **`/worlds/[id]`:** a ready world's sessions, most recent first, and **New Session**; **Delete World** in the header's world actions menu. A world that is not ready goes to its brief or its setup review.
- **Delete World** (also in each Worlds home row's menu) asks for confirmation, and is disabled while setup runs. Not on the setup review page.
- **`/worlds/[id]/setup`:** entry editor grouped into **World** (locations, characters, NPCs, factions, clues, objects) and **Story logic** (exit conditions, knowledge, decisive actions); per-block accept / edit / reject; Jev flags; solvability banner listing any gaps; **Start**.
- **`/sessions/[id]`:**
  - **Story pane** (center): passages with a client-side animated reveal; free-text input; ending screen.
  - **Codex pane** (right drawer): the same entry editor, grouped by kind, tagged by source and status, editable during play. Edits apply from the next turn.
  - **Harness pane**, shown only when **test mode** is on (header switch, remembered in `localStorage`): per finished turn — intent, classification with confidence, resolved outcome, each draft with rule results and probabilities (rejected drafts struck through), Unsure answers, discovery results, background results; current arc and exit conditions; clues found; knowledge revealed; reputation value and band; off-script count against threshold; pacing nudges.
  - Raw detail (prompts, full Jev payloads, timings) goes to the server console.
- **Compare view** (last in build order, expected cut): two sessions of the same replay script side by side, harness vs baseline.

---

## 12. Replay, baseline and memory

- **Replay scripts:** YAML files in `replays/` — one per adversarial criterion, plus an off-script run, a reckless run, and a winning run. `npm run replay <script> [--mode harness|baseline] [--seed n]` drives the engine directly (no browser) and writes a normal session, viewable in the UI with test mode on.
- **Baseline mode:** a session whose turns send the brief YAML as the system prompt to Grok with recent passages and the player input; no setup expansion, resolver, Jev, codex or code-managed state.
- **Story-so-far summary:** not built. If playtesting shows the 4-passage window loses important events, add a background-maintained list of 5–10 key events sent to the writer.

---

## 13. Error handling

- A turn's state is saved only when a passage ships.
- A Grok or Jev failure on the critical path retries once, then the turn fails with a visible error and no state change. **A passage Jev did not judge is never shipped.**
- A background failure is recorded in the turn's log (`background_status = failed`); play continues. Arc and pacing checks run again on the next turn.
- Setup failures leave the world in `draft` with the error shown; the author can retry. A setup cut off by the server stopping leaves the world `drafting`; when the server next starts (`src/instrumentation.ts`), every `drafting` world returns to `draft`, since setup runs only inside the server process (#3). This assumes one process runs setups against a database file; a second one (such as a Replay runner) would need a stale-claim expiry instead.

---

## 14. Testing

- **Unit (Vitest), with fake models:** resolver (every intent × classification branch, penalties, endings, seeded death roll), solvability check, directive builder, ending check, codex slice selection, BlockNote document → brief conversion and validation.
- **Jev smoke test:** §9.5, day 1.
- **Acceptance:** replay scripts against real APIs, one per criterion in `docs/requirements.md` §13, checked by reading the session's harness log.

---

## 15. Configuration defaults (`engine/config.ts`)

| Setting | Default |
|---|---|
| Starting reputation | 60 (range 0–100) |
| Bands | high ≥ 70, normal 30–69, low < 30 |
| Off-script penalty | 10, subtracted from reputation |
| Wrong-target penalty | 15 (overridable per decisive action) |
| Premature decisive action | 20 (overridable per decisive action) |
| Recovery | +5 for finding a clue a decisive action requires |
| Off-script threshold | 4 (warnings at 2 and 3) |
| Death odds per arc | 20%, 35%, 50% (last value used for later arcs) |
| Pacing window | 2 turns |
| Writer's recent passages | 4 |
| Drafts per round / max rounds | 2 / 3 |
| Jev noul fail / Unsure band | p ≥ 0.5 / 0.35–0.65 |
| Retry feedback floor | p ≥ 0.8 |
| Jev choice confidence floor | 0.6 |
| Passage cap | under 300 words (`passageWords`) |
| Writer output-token ceiling | 6,000, reasoning included (`writerMaxOutputTokens`) |

Environment: `XAI_API_KEY`, `WRITER_MODEL`, `OPENAI_API_KEY`, `DRAFTER_MODEL`, `TYPESAFE_API_KEY`, `TYPESAFE_BASE_URL` (`https://api.typesafe.ai`, also the SDK's default) and `TYPESAFE_DEFAULT_MODEL` (`jev-1.13.0`, pinned; `jev-latest` points to it today). All three are the names the TypeSafe SDK reads, so the client needs no configuration in code, `DB_URL`.

---

## 16. Risks

1. **Jev on long prose is unproven.** Its published examples are short, dense inputs. Mitigation: day-1 smoke test; rephrase or split rules that fail; tune thresholds in playtesting.
2. **Schedule.** The BlockNote editor for three surfaces consumes about a day of two. Mitigation: agreed cut order (§4).
3. **BlockNote custom blocks with multi-field content are unverified.** Mitigation: 1-hour test on day 1 (§7.4) with a defined fallback.
4. **Latency estimates are unmeasured.** Mitigation: day-1 measurement; passage length and model choice are config.
5. **Two drafts double Grok cost per turn.** Accepted for the latency gain.
6. **Short memory.** Events older than 4 passages survive only through state and codex (§12).

---

## 17. Precedence and handoff

### Precedence

This spec and the ADRs in `docs/adr/` take precedence over `docs/requirements.md`. Where they differ, the difference is deliberate:

| Requirements say | This design | ADR |
|---|---|---|
| Play may invent places, NPCs and objects | Only authored places; play invents characters only | 0004 |
| The small OpenAI model parses intent; extraction catches unplanned clues | The Judge does both | 0009 |
| Codex types: location, character, NPC, faction, clue, object | Plus Story logic Entries: exit condition, knowledge, decisive action | 0007 |
| Up to 3 attempts, one passage at a time | Up to 3 Rounds of 2 parallel Drafts | 0003 |
| Harness pane shows each attempt | Harness pane shows finished Turns only, in test mode; drafts go to the console | 0003 |
| Baseline and compare view are acceptance scope | Cut first if time runs short | 0012 |

Domain vocabulary is defined in `CONTEXT.md`. Where the requirements use other words (attempt, run), the glossary term wins.

### State at handoff (2026-09-23)

- Scaffold committed: Next.js 16.3 (code in `src/`), shadcn `base-nova`, `drizzle-orm` 0.45 + `better-sqlite3`, BlockNote 0.54, AI SDK 7 with the xAI and OpenAI providers, `@typesafe-ai/sdk`, Vitest. `pnpm typecheck`, `lint`, `test` and `build` pass. No application code yet.
- ESLint is pinned to v9: `eslint-plugin-react` (via `eslint-config-next`) does not support ESLint 10.
- The TypeSafe plugin (`typesafe@typesafe-ai`) is enabled at project scope.

### Open items

1. **Re-verify §10 against the official Jev docs:** resolved 2026-09-24. §10.1 is rewritten from https://docs.typesafe.ai and the SDK types. The endpoint, question shapes, answer shapes and `jev-1.13.0` pin were right; the fail and Unsure thresholds are our design, not a Jev convention; compound Rule questions must be split. Sources: `docs/research/2026-09-24-engine-libraries.md`.
2. **Jev endpoint:** resolved. `https://api.typesafe.ai` (`POST /v1/systemone`), per https://docs.typesafe.ai/api.
3. **Writer and Drafter model names:** resolved 2026-09-24 by the latency test: `WRITER_MODEL=grok-4.20-0309-non-reasoning` (about 3.1 s per ~140-word Draft) and `DRAFTER_MODEL=gpt-5.6-sol` (4.6 s for one small structured-output call at the default reasoning effort). #18 moved the Writer to `grok-4.7`, a reasoning model that returns a readable reasoning summary.

### Next step

Write the implementation plan from this spec with the `superpowers:writing-plans` skill, following the build order in §4.
