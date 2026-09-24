# Engine libraries: Jev, AI SDK 7, Next 16, Drizzle 0.45

**Date:** 2026-09-24 · **Issue:** #1 · **Spec:** `docs/superpowers/specs/2026-09-23-creation-harness-design.md`

What each outside piece actually does today, checked against its own documentation or the installed package. Local paths are relative to the repo root. "Probe" means a throwaway script run against the installed package, not a claim from docs. The raw smoke-test answers are in [`2026-09-24-smoke-judge-results.json`](2026-09-24-smoke-judge-results.json).

Installed versions: `@typesafe-ai/sdk` 0.6.0, `ai` 7.0.109, `@ai-sdk/xai` 5.0.5, `@ai-sdk/openai` 4.0.72, `next` 16.3.4, `drizzle-orm` 0.45.3, `drizzle-kit` 0.31.11, `better-sqlite3` 13.0.3.

## Summary: what changes the plan

1. **The Judge catches violations; it also raises false alarms.** All 16 deliberate violations scored p ≥ 0.70 on their Rule question. But a Draft that breaks one Rule often scores high on unrelated Rules: 24 clear false alarms across 15 violating Drafts. They do not change whether a Draft fails. They would put wrong lines into Retry feedback (§10.4) and the harness pane. Clean Drafts were mostly quiet.
2. **Both real Writer Drafts failed Knowledge and Unplanned clue.** Grok added details the Allowed reveal does not contain: a leather case, and a direction of travel. The Judge was right to catch them. If this holds, most Turns will need a second Round. The Directive and the Knowledge Rule need work in #4 (see [Plan impact](#plan-impact-for-3-and-4)).
3. **Latency fits the 3–5 s target for a one-Round Turn.** Writer about 3.1 s (two Drafts in parallel cost one wall clock) plus the Judge at 0.55 s is about 3.7 s, before the Reading. Each extra Round adds about 3.7 s.
4. **better-sqlite3 transactions are synchronous.** An `async` callback throws. Model calls happen first; the writes then go in one synchronous transaction.
5. **§10.1 mostly holds.** The corrections: the thresholds are ours, not Jev's; compound Rule questions must be split; and the spec's "flagged" band is the glossary's **Unsure**.

---

## 1. Jev (TypeSafe)

Sources: [docs index](https://docs.typesafe.ai/llms.txt), the installed SDK's types (`node_modules/@typesafe-ai/sdk/dist/index.d.mts`).

### Request and answers

| Fact | Source |
|---|---|
| One endpoint, `POST https://api.typesafe.ai/v1/systemone`, bearer key. Body: `state`, `model`, `questions` (a map of id → question). | [API reference](https://docs.typesafe.ai/api) |
| Question types `noul`, `choice`, `score`. All take `instructions` (string, object or array). A `noul`'s `criteria` is an optional `{true, false}`. A `choice`'s `criteria` is required: option → description or `null`, at most 255 options. | [API reference](https://docs.typesafe.ai/api), [Choice](https://docs.typesafe.ai/primitives/choice) |
| Question ids are not sent to the model; the full question must be in `instructions`. | [Primitives](https://docs.typesafe.ai/primitives#define-a-question) |
| A `noul` answer is `{type, noul}`: the probability of yes, with no separate confidence. | [Noul](https://docs.typesafe.ai/primitives/noul#reading-a-noul) |
| A `choice` answer is `{type, choice, probabilities, confidence}`. The probabilities cover every option and sum to 1; `confidence` is derived from how peaked they are. | [API reference](https://docs.typesafe.ai/api#choice-answer), [Confidence](https://docs.typesafe.ai/confidence) |
| The response carries `model` (the versioned id that answered) and `usage` (input and output tokens). | [API reference](https://docs.typesafe.ai/api#response-body) |
| State is a string, a JSON object or an array. The SDK's `EntryType` rejects a bare number or boolean. | [State](https://docs.typesafe.ai/concepts/state), SDK types |
| Questions point into the state with backticked dot-and-index paths, e.g. `` `ticket.messages[0].text` ``. | [Primitives](https://docs.typesafe.ai/primitives#reference-specific-fields) |
| `instructions` and criteria can be objects: the question in one field, its data in others. | [Advanced: structure](https://docs.typesafe.ai/primitives/advanced), [API reference](https://docs.typesafe.ai/api#question-types) |

### Many questions in one call

- Every question in a request sees the same state and is evaluated independently and in parallel. No answer is context for another, and types can be mixed. ([Primitives](https://docs.typesafe.ai/primitives#ask-multiple-questions-together), [Speculative fan-out](https://docs.typesafe.ai/patterns/fan-out))
- Batching 13 questions was 12.2× cheaper and 10× faster than 13 calls, with the same answers. ([Parallel questions cookbook](https://docs.typesafe.ai/cookbooks/parallel_questions))
- Limits for `jev-1.13.0`: 64k tokens per request (state plus all questions), 32k for the state plus the longest question. No cap on the number of questions is documented. ([Models](https://docs.typesafe.ai/models))
- "Barely changes the response time" holds only loosely. Measured here: 30 questions (3,852 input tokens) took 553 ms; 272 questions (26,881 tokens) took 2,048 ms.

### Escape options, thresholds, identities

- Add `other` or `none of the above` when the options might not cover every input. This is a recommendation, not an API rule. ([Choice](https://docs.typesafe.ai/primitives/choice#good-practice-ask-more-than-one-question-per-call), [Primitives](https://docs.typesafe.ai/primitives#choose-a-question-type))
- The docs set no thresholds. They say to choose them by the cost of being wrong, and show a review band of 0.2–0.8 for Nouls and a 0.5 confidence floor for Choices. ([Noul](https://docs.typesafe.ai/primitives/noul#reading-a-noul), [Confidence](https://docs.typesafe.ai/confidence#thresholds-scale-with-risk))
- One condition per Noul: "If a question has two conditions … the value means less. Ask two Nouls and combine them in code." Phrase it so yes is high. ([Noul](https://docs.typesafe.ai/primitives/noul#writing-a-noul-question))
- A Noul and a yes/no Choice of the same question are not comparable. A question and its negation measured 0.72 and 0.47, not summing to 1. ([Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13#common-sense-structural-invariants))
- Known weak spots of `jev-1.13`: literal reading, indirection, arithmetic and counting, and "large state full of irrelevant detail". ([Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13))

### Model pinning and version

- `jev-latest` and `jev-preview` both point to `jev-1.13.0` today. An alias moves when a release ships. To keep tuned thresholds valid, pin the versioned id; the response's `model` field reports which version answered. ([Models](https://docs.typesafe.ai/models#aliases))
- The SDK reads `TYPESAFE_API_KEY`, `TYPESAFE_BASE_URL` and `TYPESAFE_DEFAULT_MODEL`, defaulting to `https://api.typesafe.ai` and `jev-latest`. ([JavaScript SDK](https://docs.typesafe.ai/sdk/javascript), SDK `ENV` and `TypeSafeClientConfig`)
- The SDK retries 408, 429 and 5xx twice by default, with backoff and a 10 s timeout per attempt. The browser is refused unless `dangerouslyAllowBrowser` is set. (SDK `RetryPolicy` and `TypeSafeClientConfig`)
- Price: $0.042 per million input tokens; output is free. Rate limits: 1,200 requests per minute and 250k tokens per second, currently "adjusting dynamically". ([Models](https://docs.typesafe.ai/models))
- **Measured:** both live calls requested `jev-1.13.0` and Jev reported `jev-1.13.0`.

### Spec §10.1 against the docs

| §10.1 said | Verdict |
|---|---|
| Rule questions are `noul`s, "does the draft violate X?", with `criteria {true, false}` | Confirmed. Correction: one condition per question, so §10.3's Arc and first Location questions are now two Nouls each (spec updated). |
| Fail at p ≥ 0.5; flagged at 0.35–0.65 | A design choice, not a Jev convention; the docs set no threshold. Renamed to **Unsure** in the spec, per `CONTEXT.md`. |
| Every `choice` has an escape option | Confirmed, as the docs' recommendation. |
| Questions reference state by path | Confirmed. Structured `instructions` are also available. |
| Pin `jev-1.13.0` and log the reported version | Confirmed. The pinned id works, and the response's `model` field is the version. |
| Noul and choice not comparable; complementary Nouls do not sum to 1 | Confirmed by the jaggedness page. |

The spec's §10.1 is rewritten with these points, §17 open item 1 is closed, and item 3 is closed with the measured model choice.

### The Judge client

`src/models/judge.ts` holds the interface. `src/models/typesafe-judge.ts` is the real Judge; `src/models/fake-judge.ts` is the fake. Tests are in `src/models/judge.test.ts`.

```ts
interface Judge {
  ask<const Q extends JudgeQuestions>(
    request: { state: JudgeText; questions: Q },
    options?: { signal?: AbortSignal }
  ): Promise<{
    answers: { [K in keyof Q]: AnswerFor<Q[K]> } // NoulAnswer | ChoiceAnswer<options>
    model: string // the version Jev reported
    usage: { inputTokens: number; outputTokens: number }
    latencyMs: number
  }>
}
```

- **One `ask` is one Jev request.** The interface is built around what one call can carry: any number of named `noul` and `choice` questions over one state, answered by id. A Round's Rule questions for both Drafts plus Discovery go in one `ask`, and so does a Reading's three choices. `noul()` and `choice()` build questions; the option keys of a `choice` type its answer.
- **Both implementations share the checks.** `assertValidQuestions` requires at least one question, instructions that are not blank, and 2 to 255 options per choice. `checkAnswers` requires every id answered, with the right type, a probability in 0–1 and a choice among its options. A test on the fake cannot pass on an answer the real Judge would reject.
- **`TypeSafeJudge`** requests `TYPESAFE_DEFAULT_MODEL` unless given a model. Every call logs `[judge] model=<reported> requested=<pinned> questions=… input_tokens=… latency_ms=…`. It warns when a pinned id comes back different; an alias is expected to resolve to a version. It retries once by default (§13) and is server-only.
- **`FakeJudge`** answers every Noul with 0.05 and every Choice with its first option. Answers can be overridden by id or computed from the question and state. Each call is recorded.

## 2. Jev smoke test (spec §9.5)

**Method.** `pnpm smoke:judge` (`scripts/smoke-judge.ts`), dry-run first with `--dry-run`. Two Turns of the test World (London, 1888; a testing reference, see the appendix of `docs/requirements.md`), written as the Judge state of §10.2 (`scripts/smoke-judge/world.ts`):

- **Question Turn:** Midpoint Arc, Spitalfields Market. Jacob buys violets and asks Nell what she saw; Band normal; Nell's sighting is the Allowed reveal.
- **Arrest Turn:** End Arc, St Katharine Docks. The arrest of Max Rober succeeds; the Ending is a win.

There are 18 Drafts: 3 clean, and 15 that each break one Rule question (`scripts/smoke-judge/passages.ts`). Every Draft was asked every Rule question in §10.3's wording (`scripts/smoke-judge/rules.ts`), plus Character drift for each named character. All 272 questions went in **one** Judge call, with both Turns in one state and 18 Drafts in it. Production has 2 Drafts per state; see the caveat below.

### Results

Fail threshold p ≥ 0.5 (§15). "Caught" means the target question failed. In the last column, **legit** is a second violation the Draft really has, **debatable** is arguable either way, and **false** is a clear false alarm. The labels are my reading of each Draft; neighbours I expected when writing the Draft are marked (exp).

| Draft | Rule broken (question) | p | Caught | Other questions at p ≥ 0.5 |
|---|---|---|---|---|
| clean-1 | none | – | – | Knowledge.character 0.62 (debatable: "ink on his cuffs" is a detail beyond the reveal) |
| clean-2 | none | – | – | none (highest: Knowledge.character 0.46) |
| arrest-clean | none | – | – | none (highest: Knowledge.character 0.48) |
| drift | Character drift (Nell) | 0.88 | yes | Codex 0.54 (exp), Reputation 0.92 (legit: fawning is "special deference"), Voice 0.59 (false) |
| arc | Arc | 0.93 | yes | Location.setting 0.65 (legit), Location.new_place 0.71 (debatable), Voice 0.71 (debatable), Drift 0.87, Codex 0.52, Reputation 0.78 (false) |
| location-setting | Location: set elsewhere | 0.96 | yes | Codex 0.77 (exp), Location.new_place 0.57 (debatable) |
| location-new-place | Location: new named place | 0.96 | yes | Knowledge.character 0.93 (exp) |
| knowledge-character | Knowledge: character reveals | 0.96 | yes | Unplanned clue 0.89 (legit), Knowledge.narration 0.88 (false: the reveal is in dialogue), Reputation 0.68 (false) |
| knowledge-narration | Knowledge: narration reveals | 0.94 | yes | Unplanned clue 0.67, Agency 0.63 (both debatable) |
| unplanned-clue | Unplanned clue | 0.91 | yes | Knowledge.character 0.91, Knowledge.narration 0.50 (exp) |
| outcome | Outcome | 0.95 | yes | Agency 0.53 (exp), Reputation 0.74 (legit: refusing a fair question) |
| agency | Agency | 0.96 | yes | Drift (Jacob) 0.67, Location.new_place 0.53 (debatable); Period 0.89, Outcome 0.72, Arc 0.70, Codex 0.69, Drift (Nell) 0.61, Reputation 0.78, Voice 0.65 (false) |
| period | Period | 0.79 | yes | Agency 0.72 (exp), Voice 0.54 (debatable), Codex 0.79, Drift (Jacob) 0.78, Drift (Nell) 0.56 (false) |
| codex-contradiction | Codex: contradicts entry | 0.70 | yes | Drift (Nell) 0.54 (exp), Codex.rejected 0.56 (false) |
| codex-rejected | Codex: rejected name | 0.95 | yes | Reputation 0.78 (false) |
| reputation | Reputation | 0.89 | yes | Drift (Nell) 0.64 (debatable), Voice 0.92, Drift (Jacob) 0.51 (false) |
| voice | Voice | 0.98 | yes | Agency 0.77, Reputation 0.83, Drift (Nell) 0.53 (false) |
| ending | Ending | 0.98 | yes | Outcome 0.98 (exp), Arc 0.93 (legit), Drift (Max) 0.50 (debatable), Location.new_place 0.56 (false) |

**Reading the results:**

- **Recall.** 16 of 16 caught. The weakest were Codex contradiction (0.70) and Period (0.79); everything else scored 0.88 or more.
- **Clean Drafts.** Only one of 47 questions reached 0.5: Knowledge.character at 0.62. That question sat at 0.46–0.62 on all three clean Drafts, inside the Unsure band, so it is the Rule most likely to cause needless Rounds.
- **False alarms.** Of the 40 unexpected hits (Knowledge.character on clean-1 included), 5 are legit, 11 debatable and 24 clearly false, all 24 on violating Drafts. The worst were Reputation (5 false), Voice (4) and Character drift (7, counting every character). A blatant Draft, like the one with Jacob drawing a revolver, raised nine other Rules; one of them was Period at 0.89 for a period-correct revolver.
- **Caveat: the batch.** All 18 Drafts shared one state, so every question saw 17 irrelevant Drafts. That is the docs' "large state full of irrelevant detail" case. The latency call below used the production shape (2 Drafts), and there every unrelated question stayed at 0.27 or below. My hypothesis is that much of the spillover comes from the big state. It is not proven; one run cannot separate the two causes.

### Rules the Judge missed, and proposed rewordings

No Rule was missed at the 0.5 threshold, so the proposals below target the weakest catches and the false-alarm-prone Rules. **None of them has been run**; they follow the docs' guidance and should be checked in #4's Rule tests with real calls.

| Rule | Problem | Proposed wording |
|---|---|---|
| Arc | Two conditions in one Noul | Split: "Does `drafts[i]` show events from `later_arcs`?" and "Does `drafts[i]` contradict `current_arc`?" |
| Location (first question) | Two conditions | Split: "Does `drafts[i]` take place somewhere other than `current_location`?" and "Does `drafts[i]` describe `current_location` against its entry?" |
| Codex contradiction (0.70) | One question over the whole slice is indirect | One Noul per Entry named in the Draft, with structured instructions: `{entry: {...}, question: "Does drafts[i] state something that conflicts with entry?"}` |
| Character drift | False alarms; points at a list | Put the entry beside the question: `{character: {...}, question: "Does anything character.name says or does in drafts[i] go against character.personality or character.backstory?"}`. Add a `false` criterion: "Rudeness, fear or courage the entry allows is not drift." |
| Reputation | Most false alarms; "contradict `reputation_band`" is abstract | Two concrete Nouls per Band from its guidance. For normal: "Does any character treat the Player character with open contempt (insults, jeering, refusing a fair question)?" and "Does any character treat the Player character with special deference (gifts, flattery, favours)?" |
| Voice | False alarms; "depart from `voice`" is abstract | One Noul per guideline, e.g. `{guideline: "Third person, past tense", question: "Does drafts[i] break guideline?"}`. Setup would split the Author's Voice into guidelines. |
| Knowledge (narration) | Fired on dialogue: literal reading of "narration" | "Leaving aside what characters say aloud, does the narrator state or hint at `hidden_truth` beyond `clues_found`?" |
| Knowledge (character) | Unsure on clean Drafts; catches embellishments | Define "information" in the criteria. Decided 2026-09-24 (spec §10.3): a new fact about any character counts (what they look like, carry, did, saw, know, or where they are or went); manner, mood, weather and scenery do not. The game is genre-agnostic, so the criteria must not assume suspects. |

### Writer Drafts through the Judge (the production shape)

These are the two Grok Drafts from the latency call, with 2 Drafts in the state and 30 questions. Both failed **Knowledge.character** (0.88 and 0.85) and **Unplanned clue** (0.89 and 0.84). Every other question was 0.27 or below. The failures are legitimate: both Drafts gave Nell's sighting plus a "small leather case" and "walked quick toward Whitechapel High Street". Neither detail is in the Allowed reveal, and the case is new evidence. The Writer prompt said "Reveal nothing beyond the allowed reveals", and Grok embellished anyway.

## 3. Latency (measured 2026-09-24, one run each)

| Call | Model reported | Size | Latency |
|---|---|---|---|
| Judge, production shape | `jev-1.13.0` | 30 questions, 2 Drafts, 3,852 input tokens | **553 ms** |
| Judge, smoke batch | `jev-1.13.0` | 272 questions, 18 Drafts, 26,881 input tokens | 2,048 ms |
| Writer, Draft 0 | `grok-4.20-0309-non-reasoning` | 148 words, 189 output tokens | 3,175 ms |
| Writer, Draft 1 (in parallel) | `grok-4.20-0309-non-reasoning` | 131 words, 168 output tokens | 2,922 ms |
| Writer Round, wall clock | | two Drafts via `Promise.all` | **3,175 ms** |
| Drafter, structured output | `gpt-5.6-sol` | 324 in, 99 out (53 reasoning) tokens, default effort | **4,561 ms** |

- **A one-Round Turn:** Reading (not measured; a 3-choice call should cost less than the 30-question call) + Writer 3.2 s + Judge 0.55 s ≈ 4 s. Each extra Round adds about 3.7 s, so three Rounds come to about 11.5 s.
- **Drafter:** 4.6 s is for a tiny extraction at the default reasoning effort (`medium` per the provider docs). Setup's World and Story logic calls produce much more output and will be much slower. `providerOptions.openai.reasoningEffort: "low"` is documented for GPT-5.6 models but was not measured.

**Setup, measured 2026-09-24 (#3, one real run through `POST /api/worlds/[id]/setup`).** A small Brief (2 characters, 1 Location, 2 Arcs), Drafter at `reasoning: "low"`:

| Call | Model reported | Size | Latency |
|---|---|---|---|
| World call | `gpt-5.6-sol` | 970 in, 1,039 out (276 reasoning) tokens | 20,573 ms |
| Story logic call | `gpt-5.6-sol` | 2,120 in, 1,424 out (494 reasoning) tokens | 27,575 ms |
| Judge validation | `jev-1.13.0` | 46 questions (23 drafted Entries), 11,850 input tokens | 1,367 ms |
| Whole setup, wall clock | | solvable on the first attempt, 27 Entries stored | **49.5 s** |

The Drafter dominates, and output tokens drive it: about 20 ms per output token at low effort. A Story logic retry would add about 29 s (the call plus validation), so a run that needs both retries would take about 1 min 50 s. The World call drafted 5 new Locations where its instructions asked for 3 to 4.

## 4. AI SDK 7

Sources: the bundled docs in `node_modules/ai/docs/` (also at https://ai-sdk.dev/docs), `node_modules/@ai-sdk/xai/docs/01-xai.mdx`, `node_modules/@ai-sdk/openai/docs/03-openai.mdx`, and `node_modules/ai/dist/index.d.ts`.

- **Structured output** is `generateText({ output: Output.object({ schema }) })`, read from `result.output`. `generateObject` still exists but is `@deprecated` ("Use `generateText` with an `output` setting instead", `index.d.ts`). Other outputs: `Output.array({ element, minItems, maxItems })`, `Output.choice`, `Output.json`. A failure throws `NoObjectGeneratedError`. (`03-ai-sdk-core/10-generating-structured-data.mdx`) **Measured:** a Zod object schema through `gpt-5.6-sol` returned valid, typed output.
- **OpenAI strict schemas.** `openai(id)` uses the Responses API, and strict JSON schema is on by default: `.optional()` fields are not supported, so use `.nullable()`. (`@ai-sdk/openai/docs/03-openai.mdx`, "Responses Models" and the strict-schema note) This matters for #3's Drafter schemas.
- **Renames in 7.0.** `system` is now `instructions` (the old name is a deprecated fallback), `onFinish` is now `onEnd`, and `stepCountIs` is now `isStepCount`. (`08-migration-guides/23-migration-guide-7-0.mdx`)
- **xAI.** `xai(id)` now uses the xAI **Responses API**; use `xai.chat(id)` for Chat Completions. Reads `XAI_API_KEY`. The `grok-4.20-*-non-reasoning` variants do not accept `reasoningEffort`. (Migration guide "xAI Provider"; `01-xai.mdx`) **Measured:** `xai(WRITER_MODEL)` with `instructions` and `prompt` worked as documented.
- **Two parallel Writer calls.** Two `generateText` promises under `Promise.all` ran concurrently: 3,175 ms wall clock against 2,922 and 3,175 ms each. The SDK needs no batching API for this.
- **Retries and timeouts.** `maxRetries` defaults to 2; set it to 1 to match §13. `timeout` takes milliseconds or `{ totalMs, stepMs, firstChunkMs }`, and `abortSignal` is supported. (`03-ai-sdk-core/25-settings.mdx`)
- **Model version.** `result.response.modelId` is the id that served the call; log it the way the Judge logs Jev's. `result.usage.outputTokenDetails.reasoningTokens` separates reasoning. In 7.0, `usage` covers all steps. (`index.d.ts` `LanguageModelResponseMetadata`; migration guide "Multi-Step Result Shape")
- **Fakes.** `MockLanguageModelV4` from `ai/test` returns a scripted `doGenerate` result. The smoke test's `--dry-run` uses it for the Writer and Drafter. (`03-ai-sdk-core/55-testing.mdx`) Its `doGenerateCalls` records each call's options: `responseFormat` (`{type: "json", schema, name}` from `Output.object`), the prompt with the instructions as its system message, and `reasoning`.
- **Reasoning effort.** `generateText` takes a top-level `reasoning` (`'provider-default' | 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh'`), which each provider maps to its own setting (for OpenAI, `reasoningEffort`); `providerOptions` take precedence when both are set. (`03-ai-sdk-core/25-settings.mdx`, `26-reasoning.mdx`) The Drafter uses `reasoning: "low"`; measured in §3.
- **Zod integers in strict schemas.** Zod 4's `.int()` becomes `"type": "integer"` with `minimum: -9007199254740991` and `maximum: 9007199254740991` in the JSON schema the SDK sends (probe: `asSchema(schema).jsonSchema`). The Drafter schemas use plain `z.number()` and round in code, so strict mode never has to accept the bounds. `.nullable()` becomes `"type": ["string", "null"]` (or `anyOf` with `null`), and every property is listed in `required` with `additionalProperties: false`.
- **Keys are read late.** `openai(id)` does not read `OPENAI_API_KEY` until the first call, while `new TypeSafeClient()` throws at once without `TYPESAFE_API_KEY` (SDK `missingApiKey`). The OpenAI Drafter checks `DRAFTER_MODEL` and `OPENAI_API_KEY` in its constructor, so setup refuses to start (503) rather than failing after a paid call.

## 5. Next 16: Background work and long streams

Sources: the bundled docs in `node_modules/next/dist/docs/01-app/`.

- **`after(callback)`** from `next/server` runs work after the response is finished, and works in Route Handlers. It runs even if the response failed. It lasts up to the route's `maxDuration` on platforms that enforce one, and is fully supported under `next start`. On shutdown, pending `after` callbacks run before exit, given SIGINT or SIGTERM and a drain period. It became stable in 15.1. (`03-api-reference/04-functions/after.md`; `02-guides/self-hosting.md` § after)
- **Background work needs a handle `after` does not give.** The next Turn must wait for the previous Turn's Background work (§9.1 step 1), and `after` returns nothing to await. Recommendation for #4: start the Background promise yourself, keep it in a per-Session map (on `globalThis`, so every route module sees one copy), and record `background_status` in the Turn row so a restart does not leave the next Turn waiting forever. Registering the promise with `after` as well keeps it alive on hosts that stop a function after its response.
- **Streaming responses.** A Route Handler can return `new Response(readableStream)`. The bundled example of that pattern still imports `StreamingTextResponse` from `ai`, which AI SDK 7 no longer exports; ignore that part of the example. (`03-api-reference/03-file-conventions/route.md` § Streaming; `StreamingTextResponse` appears 0 times in `ai/dist/index.d.ts`) The existing `src/server/ndjson.ts` already uses the plain Web Streams pattern.
- **Duration.** `maxDuration` is a hint that deployment platforms read. Under `next start` nothing in the docs imposes a limit. (`02-route-segment-config/maxDuration.md`) The `edge` runtime is deprecated, and the default is `nodejs`. (`runtime.md`)
- **Proxies buffer streams.** Behind nginx, send `X-Accel-Buffering: no`, and make sure load balancers pass chunked responses through. (`02-guides/self-hosting.md` § Streaming) `ndjsonResponse` does not set this header yet; it only matters when deploying behind a proxy.
- **GET Route Handlers are dynamic by default** since 15.0. (`route.md` version history)

## 6. Drizzle 0.45 with better-sqlite3 (research for #2)

Sources: [orm.drizzle.team](https://orm.drizzle.team/docs), the installed `drizzle-orm` 0.45.3, and a probe. **Caution:** the live docs now show installs as `drizzle-orm@rc` (the 1.0 line, [get started](https://orm.drizzle.team/docs/get-started-sqlite)). Every claim below was checked against the installed 0.45 package.

- **Connecting.** `drizzle(path)`, `drizzle({ client: new Database(path) })` or `drizzle({ connection: { source } })` from `drizzle-orm/better-sqlite3`. (`drizzle-orm/better-sqlite3/driver.d.ts`) `better-sqlite3` is on Next's built-in `serverExternalPackages` list, so it needs no config. (`next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/serverExternalPackages.md`)
- **JSON columns.** `text("state_json", { mode: "json" }).$type<T>()` stores JSON text and returns a parsed object. The docs prefer `text` over `blob` JSON because SQLite's JSON functions reject blobs. ([SQLite column types](https://orm.drizzle.team/docs/column-types/sqlite)) **Probe:** the round trip returned an object, and `json_extract(state_json, '$.rep')` worked in raw SQL. `$type` is compile-time only; nothing validates at runtime.
- **Unique constraints.** Composite: `sqliteTable(name, cols, (t) => [unique("turns_session_idx").on(t.sessionId, t.idx)])`; single column: `.unique()`; `uniqueIndex(name).on(...)` also exists. ([Indexes & constraints](https://orm.drizzle.team/docs/indexes-constraints)) **Probe:** a duplicate insert throws `SqliteError` with `code === "SQLITE_CONSTRAINT_UNIQUE"`. Match on that code to turn "two tabs wrote the same Opening" (#4) into "already written".
- **Transactions are synchronous.** `db.transaction((tx) => { ...; return value })` wraps better-sqlite3's own transaction. Inside it, use `.run()`, `.all()` and `.get()`; a thrown error rolls back. The config is `{ behavior: "deferred" | "immediate" | "exclusive" }`, and nested transactions use savepoints. **Probe:** an `async` callback throws "Transaction function cannot return a promise". (`drizzle-orm/better-sqlite3/session.js`; [drizzle-orm#5063](https://github.com/drizzle-team/drizzle-orm/issues/5063); [better-sqlite3 caveats](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md#caveats)) The docs' examples are `async (tx)` and do not apply to this driver. Consequence: call the models first, then write the Turn row and state in one synchronous transaction. Spec §13 already wants that ("state is saved only when a passage ships").
- **Migrations.** `drizzle-kit generate` writes SQL plus `meta/_journal.json` to `out` (`src/db/migrations` in `drizzle.config.ts`). Apply them with `drizzle-kit migrate` or with `migrate(db, { migrationsFolder })` from `drizzle-orm/better-sqlite3/migrator`, which is synchronous. ([Migrations](https://orm.drizzle.team/docs/migrations), `migrator.d.ts`) **Probe:** a missing folder throws "Can't find meta/_journal.json file".
- **Server Components.** Queries through a synchronous driver finish during prerendering; call `connection()` first to keep them per request. (`next/dist/docs/01-app/03-api-reference/04-functions/connection.md`) This only matters if a page reads the database directly rather than through a Route Handler.

## Plan impact for #3 and #4

- **#4, Rules:** split the compound questions (Arc, Location). Move Character drift, Codex and Reputation to structured instructions that carry the relevant Entry or Band behaviours, as proposed above. Test each Rule's questions against a few real Drafts before tuning thresholds.
- **#4, Retry feedback (§10.4):** build feedback only from the Rules the Draft clearly fails. Decided 2026-09-24 (spec §10.4): only failures at p ≥ 0.8 become feedback lines. The spillover would otherwise tell the Writer to fix things it did not do.
- **#4, Writer and Knowledge:** both real Drafts embellished the Allowed reveal. The Directive should give the reveal as the exact fact to convey and forbid new facts about any character; spec §10.3 now defines information as such facts. Without both, expect most Turns to need Round 2 (+3.7 s).
- **#4, name matching:** Character drift and the Codex slice match names in code. Drafts use first names (in the test World, "Jacob" and "Nell"), which the test aliases do not include. The matcher needs given names and surnames, or the Drafter should add them as aliases.
- **#4, Background work:** use a per-Session promise map plus `background_status`, with `after` only for lifetime; see §5.
- **#4, glossary drift:** `engine/config.ts` still says `ruleFlaggedBand` and `flagged` for the Unsure band; rename it when the Rules land.
- **#3, Drafter (done):** use `Output.object` with `.nullable()`, never `.optional()` (strict schemas). Give the extraction the full Codex name list, not the slice: the smoke Drafter proposed "Carrow", a character the test World's Brief already has. Expect the setup calls to take tens of seconds at default effort, and consider `reasoningEffort`.
- **#3, Judge validation (done):** two Nouls per drafted Entry fit easily in one call. Measured: 23 Entries, 46 questions, 11,850 input tokens, 1.4 s (§3). Each Entry sits in its question's structured instructions, so the tokens grow with the Entries, not only with the state.
- **#2 and #4, storage:** synchronous transactions and `SQLITE_CONSTRAINT_UNIQUE` handling, as above.

## Real API calls made for #3 (setup)

One real setup run on 2026-09-24, through the dev server, with SDK retries left at their setup defaults (one retry each; none happened):

| Service | Calls | Why |
|---|---|---|
| OpenAI (`gpt-5.6-sol`) | 2 | The World call and the Story logic call |
| TypeSafe (Jev) | 1 | Judge validation of the 23 drafted Entries |

No call failed, and solvability passed on the first attempt, so no retry was made. Every test uses the fake Drafter and the fake Judge.

## Real API calls made for this research

All in one run of `pnpm smoke:judge`, with retries off, on 2026-09-24:

| Service | Calls | Why |
|---|---|---|
| TypeSafe (Jev) | 2 | The smoke batch (272 questions) and the latency call (30 questions) |
| xAI (Grok) | 2 | One Writer Round: two Drafts in parallel |
| OpenAI | 1 | One Drafter structured-output call |

No call failed. The Vitest tests use the fake Judge; the real Judge's tests inject `fetch` and make no network call.
