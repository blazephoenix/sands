/**
 * Jev smoke test (spec §9.5), with the day-1 latency measurements.
 *
 *   pnpm smoke:judge --dry-run          fakes for every model; costs nothing
 *   pnpm smoke:judge                    real APIs: 4 Judge/Writer/Drafter steps
 *   pnpm smoke:judge --only drafter     re-run one step (passages, writer,
 *                                       latency, drafter; latency needs writer)
 *   pnpm smoke:judge --out results.json raw answers and timings as JSON
 *
 * Real calls, each made once with retries off:
 *   passages  one Judge call: every Rule question for every smoke Draft
 *   writer    one Writer Round: two ~150-word Drafts in parallel
 *   latency   one Judge call of about 30 questions over the two Writer Drafts
 *   drafter   one Drafter structured-output call (naming new characters)
 */
import { writeFile } from "node:fs/promises"
import { parseArgs } from "node:util"

import { openai } from "@ai-sdk/openai"
import { xai } from "@ai-sdk/xai"
import { generateText, Output, type LanguageModel } from "ai"
import { MockLanguageModelV4 } from "ai/test"
import { z } from "zod"

import { ruleVerdict } from "@/engine/config"
import { FakeJudge } from "@/models/fake-judge"
import type { Judge, NoulQuestion } from "@/models/judge"
import { TypeSafeJudge } from "@/models/typesafe-judge"

import { passages, type Passage } from "./smoke-judge/passages"
import { ruleQuestions, type RuleQuestion } from "./smoke-judge/rules"
import { arrestTurn, questionTurn } from "./smoke-judge/world"

const STEPS = ["passages", "writer", "latency", "drafter"] as const
type Step = (typeof STEPS)[number]

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    only: { type: "string" },
    out: { type: "string" },
  },
})
const dryRun = args["dry-run"] ?? false
const steps = parseSteps(args.only)
const results: Record<string, unknown> = { dryRun, steps: [...steps] }

const judge: Judge = dryRun
  ? new FakeJudge({ model: "fake-judge", answer: fakeAnswer })
  : new TypeSafeJudge({ maxRetries: 0, timeoutMs: 60_000 })

// ---------------------------------------------------------------- passages

interface Asked {
  passage: Passage
  questions: RuleQuestion[]
}

async function runPassages() {
  const turns = { question: questionTurn, arrest: arrestTurn } as const
  const paths = { question: "question_turn.", arrest: "arrest_turn." } as const
  const asked: Asked[] = []
  const drafts = { question: [] as string[], arrest: [] as string[] }

  for (const passage of passages) {
    const index = drafts[passage.turn].push(passage.text) - 1
    const questions = ruleQuestions(
      turns[passage.turn],
      passage.text,
      paths[passage.turn],
      index,
      passage.id
    )
    asked.push({ passage, questions })
  }

  const questions: Record<string, NoulQuestion> = {}
  for (const { questions: qs } of asked) {
    for (const q of qs) questions[q.id] = q.question
  }
  const state = {
    question_turn: { ...questionTurn.state, drafts: drafts.question },
    arrest_turn: { ...arrestTurn.state, drafts: drafts.arrest },
  }

  const count = Object.keys(questions).length
  console.log(
    `\n# Passages: one Judge call, ${passages.length} Drafts, ${count} questions`
  )
  const result = await judge.ask({ state, questions })
  const p = (id: string) => result.answers[id].noul

  const rows = asked.map(({ passage, questions: qs }) => {
    const target = passage.breaks
      ? qs.find((q) => q.check === passage.breaks)
      : undefined
    if (passage.breaks && !target) {
      throw new Error(
        `${passage.id} breaks ${passage.breaks}, which was not asked.`
      )
    }
    const others = qs
      .filter((q) => q !== target && p(q.id) >= 0.5)
      .map((q) => ({
        check: q.check,
        p: p(q.id),
        expected: passage.alsoBreaks?.includes(q.check) ?? false,
      }))
    const flagged = qs
      .filter((q) => q !== target && ruleVerdict(p(q.id)).unsure)
      .map((q) => ({ check: q.check, p: p(q.id) }))
    return {
      passage: passage.id,
      breaks: passage.breaks,
      rule: target?.rule ?? null,
      p: target ? p(target.id) : null,
      caught: target ? ruleVerdict(p(target.id)).failed : null,
      othersFailed: others,
      othersFlagged: flagged,
    }
  })

  console.log(
    "\n| Draft | Breaks | Rule | p | Caught | Other questions at p >= 0.5 |\n|---|---|---|---|---|---|"
  )
  for (const row of rows) {
    const others =
      row.othersFailed
        .map(
          (o) =>
            `${o.check} ${o.p.toFixed(2)}${o.expected ? "" : " (false alarm)"}`
        )
        .join(", ") || "none"
    console.log(
      `| ${row.passage} | ${row.breaks ?? "nothing"} | ${row.rule ?? "-"} | ` +
        `${row.p?.toFixed(2) ?? "-"} | ${row.caught === null ? "-" : row.caught ? "yes" : "no"} | ${others} |`
    )
  }

  results.passages = {
    model: result.model,
    latencyMs: result.latencyMs,
    questions: count,
    usage: result.usage,
    rows,
    answers: Object.fromEntries(
      asked.flatMap(({ questions: qs }) => qs.map((q) => [q.id, p(q.id)]))
    ),
  }
  console.log(
    `\nJudge ${result.model}: ${count} questions, ${result.usage.inputTokens} input tokens, ${result.latencyMs} ms`
  )
}

// ------------------------------------------------------------------ writer

async function runWriter(): Promise<string[]> {
  const model = writerModel()
  const state = questionTurn.state
  const instructions = [
    "You are the Writer of an interactive detective story. Write the next Passage.",
    "Write about 150 words of prose. Third person, past tense, close on Jacob.",
    "Narrate only what the Player's input says Jacob does and says; add no other action or speech for him.",
    "Narrate the outcome given. Reveal nothing beyond the allowed reveals.",
    "Invent no new named places. Keep to the period.",
    "",
    `Setting: ${state.setting}`,
    `Voice: ${state.voice}`,
    `Codex slice: ${JSON.stringify(state.codex)}`,
    `Current Arc: ${JSON.stringify(state.current_arc)}`,
    `Outcome: ${JSON.stringify(state.outcome)}`,
    `Allowed reveals: ${JSON.stringify(state.allowed_reveals)}`,
    `Reputation band: ${JSON.stringify(state.reputation_band)}`,
  ].join("\n")

  console.log("\n# Writer: one Round, two Drafts in parallel")
  const started = performance.now()
  const drafts = await Promise.all(
    [0, 1].map(async (index) => {
      const t0 = performance.now()
      const result = await generateText({
        model,
        instructions,
        prompt: `Player input: ${String(state.player_input)}`,
        maxOutputTokens: 400,
        maxRetries: 0,
      })
      return {
        index,
        text: result.text,
        latencyMs: Math.round(performance.now() - t0),
        modelId: result.response.modelId,
        words: result.text.split(/\s+/).filter(Boolean).length,
        outputTokens: result.usage.outputTokens,
      }
    })
  )
  const roundMs = Math.round(performance.now() - started)
  for (const d of drafts) {
    console.log(
      `\nDraft ${d.index} (${d.modelId}, ${d.words} words, ${d.outputTokens} output tokens, ${d.latencyMs} ms):\n${d.text}`
    )
  }
  console.log(`\nWriter Round wall clock: ${roundMs} ms`)
  results.writer = { roundMs, drafts }
  return drafts.map((d) => d.text)
}

// ----------------------------------------------------------------- latency

async function runLatency(drafts: string[]) {
  const asked = drafts.flatMap((text, index) =>
    ruleQuestions(questionTurn, text, "", index, `draft_${index}`)
  )
  const questions: Record<string, NoulQuestion> = Object.fromEntries(
    asked.map((q) => [q.id, q.question])
  )
  const count = asked.length
  console.log(
    `\n# Latency: one Judge call, 2 Writer Drafts, ${count} questions`
  )
  const result = await judge.ask({
    state: { ...questionTurn.state, drafts },
    questions,
  })
  const failed = asked
    .map((q) => ({ id: q.id, p: result.answers[q.id].noul }))
    .filter((a) => a.p >= 0.5)
  console.log(
    `Judge ${result.model}: ${count} questions, ${result.usage.inputTokens} input tokens, ${result.latencyMs} ms`
  )
  console.log(
    `Rule questions at p >= 0.5 on the Writer Drafts: ${
      failed.map((f) => `${f.id} ${f.p.toFixed(2)}`).join(", ") || "none"
    }`
  )
  results.latency = {
    model: result.model,
    questions: count,
    latencyMs: result.latencyMs,
    usage: result.usage,
    failed,
    answers: Object.fromEntries(
      asked.map((q) => [q.id, result.answers[q.id].noul])
    ),
  }
}

// ----------------------------------------------------------------- drafter

const newCharacters = z.object({
  characters: z.array(
    z.object({
      name: z
        .string()
        .describe("The character's name as the Passage gives it."),
      description: z
        .string()
        .describe("One sentence: who they are, from the Passage alone."),
    })
  ),
})

async function runDrafter(passage: string) {
  const model = drafterModel()
  const known = questionTurn.characters.map((c) => c.name)
  console.log("\n# Drafter: one structured-output call")
  const t0 = performance.now()
  const result = await generateText({
    model,
    output: Output.object({ schema: newCharacters }),
    instructions:
      "You name new characters for a story's Codex. List every character " +
      "the Passage names who is not already in the Codex. Only named people; " +
      "no places, no unnamed crowds.",
    prompt: `Codex characters: ${known.join(", ")}\n\nPassage:\n${passage}`,
    maxRetries: 0,
  })
  const latencyMs = Math.round(performance.now() - t0)
  console.log(
    `Drafter ${result.response.modelId}: ${latencyMs} ms, ${result.usage.outputTokens} output tokens`
  )
  console.log(JSON.stringify(result.output))
  results.drafter = {
    modelId: result.response.modelId,
    latencyMs,
    usage: result.usage,
    output: result.output,
  }
}

// ------------------------------------------------------------------ models

function writerModel(): LanguageModel {
  if (dryRun) {
    return mockModel(
      "fake-writer",
      "Nell took the coin and told Jacob about a young clerk she saw at dawn."
    )
  }
  return xai(requireEnv("WRITER_MODEL"))
}

function drafterModel(): LanguageModel {
  if (dryRun) return mockModel("fake-drafter", '{"characters":[]}')
  return openai(requireEnv("DRAFTER_MODEL"))
}

function mockModel(modelId: string, text: string): LanguageModel {
  return new MockLanguageModelV4({
    modelId,
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: {
          total: 0,
          noCache: 0,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: 0, text: 0, reasoning: undefined },
      },
      warnings: [],
    }),
  })
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not set; see .env.example.`)
  return value
}

/** Dry run: the Judge "catches" each Draft's own violation and nothing else. */
function fakeAnswer(id: string): number {
  const [passageId, ...rest] = id.split(".")
  const check = rest.join(".")
  const passage = passages.find((p) => p.id === passageId)
  return passage?.breaks === check ? 0.9 : 0.05
}

function parseSteps(only: string | undefined): Set<Step> {
  if (!only) return new Set(STEPS)
  const picked = only.split(",").map((s) => s.trim())
  for (const step of picked) {
    if (!STEPS.includes(step as Step)) {
      throw new Error(`Unknown step "${step}". Steps: ${STEPS.join(", ")}.`)
    }
  }
  return new Set(picked as Step[])
}

// -------------------------------------------------------------------- main

async function main() {
  try {
    if (steps.has("passages")) await runPassages()
    let drafts: string[] | undefined
    if (steps.has("writer")) drafts = await runWriter()
    if (steps.has("latency")) {
      if (!drafts) throw new Error("The latency step needs the writer step.")
      await runLatency(drafts)
    }
    if (steps.has("drafter")) await runDrafter(drafts?.[0] ?? passages[0].text)
  } catch (error) {
    console.error("\nSmoke test stopped:", error)
    process.exitCode = 1
  } finally {
    if (args.out) {
      await writeFile(args.out, `${JSON.stringify(results, null, 2)}\n`)
      console.log(`\nWrote ${args.out}`)
    }
  }
}

await main()
