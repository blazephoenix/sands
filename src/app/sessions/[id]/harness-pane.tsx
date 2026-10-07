"use client"

/**
 * The harness pane (test mode): the Session's state after the latest Turn,
 * and a log of every finished Turn's inner workings, newest first. Finished
 * Turns only; nothing streams in here (ADR-0003). Background results fill in
 * when the page's poll picks them up. Turn 0 reads "Opening": no reading and
 * no Outcome, but its Directive, Rounds, Drafts and Rule results as usual.
 */
import * as React from "react"
import {
  CheckIcon,
  ChevronRightIcon,
  CircleDashedIcon,
  CircleIcon,
  CircleCheckIcon,
  FlagIcon,
  FlaskConicalIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { formatProbability } from "@/components/codex/entry-badges"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import type { Entry } from "@/domain/entry"
import {
  RULE_LABELS,
  turnLabel,
  type ActionResult,
  type Classification,
  type Draft,
  type Outcome,
  type Round,
  type Turn,
  type TurnLog as TurnLogData,
} from "@/domain/session"
import type { GetSessionResponse } from "@/domain/session-view"
import { ENGINE_CONFIG, bandFor } from "@/engine/config"
import { cn } from "@/lib/utils"

const CLASSIFICATION_LABELS: Record<Classification, string> = {
  on_script: "on-script",
  tangential: "tangential",
  off_script: "off-script",
  reckless: "reckless",
}

const ACTION_LABELS: Record<ActionResult, string> = {
  moved: "Moved",
  move_refused: "Move refused",
  examined: "Examined",
  questioned: "Questioned",
  decisive_success: "Decisive action succeeded",
  decisive_premature: "Decisive action too early",
  decisive_wrong_target: "Decisive action, wrong target",
  narrated: "Narrated",
}

type Names = (id: string) => string

function signed(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

/** A small uppercase section label, like the editor's kind labels. */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </h3>
  )
}

function P({ value }: { value: number }) {
  return (
    <span className="text-muted-foreground tabular-nums">
      p {formatProbability(value)}
    </span>
  )
}

// State summary

function StateSummary({
  data,
  turn,
  names,
}: {
  data: GetSessionResponse
  turn: Turn
  names: Names
}) {
  const { state } = turn
  const arcs = data.world.brief?.arcs ?? []
  const arc = arcs[state.arcIndex]
  const exits = data.entries.filter(
    (entry) =>
      entry.kind === "exit_condition" &&
      entry.data.arcIndex === state.arcIndex &&
      entry.status !== "rejected"
  )
  // The latest Arc check for each Exit condition, across the log.
  const checks = new Map<string, { met: boolean; probability: number }>()
  for (const t of data.turns)
    for (const check of t.log.background?.arcCheck ?? [])
      checks.set(check.exitConditionId, check)
  const band = bandFor(state.reputation)
  const [low, high] = ENGINE_CONFIG.reputationRange
  const knowledge = Object.entries(state.knowledgeRevealed).filter(
    ([, ids]) => ids.length > 0
  )

  return (
    <section
      aria-label="State after the latest Turn"
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <Label>
          Arc {state.arcIndex + 1} of{" "}
          {Math.max(arcs.length, state.arcIndex + 1)}
          {arc?.name ? ` · ${arc.name}` : ""}
        </Label>
        {exits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This Arc has no Exit conditions in the Codex.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {exits.map((exit) => {
              const check = checks.get(exit.id)
              const met = check?.met ?? false
              const Icon = met ? CircleCheckIcon : CircleIcon
              return (
                <li key={exit.id} className="flex items-start gap-2 text-sm">
                  <Icon
                    aria-hidden
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      !met && "text-muted-foreground"
                    )}
                  />
                  <span className="flex-1">
                    {exit.kind === "exit_condition"
                      ? exit.data.condition || exit.name
                      : exit.name}
                    <span className="sr-only">
                      {met ? " (met)" : " (not met)"}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs">
                    {check ? (
                      <P value={check.probability} />
                    ) : (
                      <span className="text-muted-foreground">not checked</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <Label>Reputation</Label>
          <span className="flex items-center gap-2 text-sm tabular-nums">
            {state.reputation} / {high}
            <Badge variant={band === "low" ? "destructive" : "secondary"}>
              {band} Band
            </Badge>
          </span>
        </div>
        <Progress
          value={state.reputation}
          min={low}
          max={high}
          aria-label={`Reputation ${state.reputation} of ${high}, ${band} Band`}
        />
        <p className="text-xs text-muted-foreground">
          Off-script {state.offScriptCount} of{" "}
          {ENGINE_CONFIG.offScriptThreshold}
          {state.warningsGiven.length > 0
            ? ` · warned at ${state.warningsGiven.join(" and ")}`
            : ""}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Clues found ({state.cluesFound.length})</Label>
        {state.cluesFound.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {state.cluesFound.map((id) => (
              <li key={id}>
                <Badge variant="outline">{names(id)}</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Knowledge revealed</Label>
        {knowledge.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No character has revealed anything yet.
          </p>
        ) : (
          <dl className="flex flex-col gap-1.5 text-sm">
            {knowledge.map(([characterId, ids]) => (
              <div key={characterId} className="flex flex-col">
                <dt className="font-medium">{names(characterId)}</dt>
                <dd className="text-muted-foreground">
                  {ids.map(names).join("; ")}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {state.pacingNudge.active ? (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>Pacing nudge set</AlertTitle>
          <AlertDescription>
            {state.pacingNudge.reason ??
              "The next Directive asks the Writer to surface an opportunity."}
          </AlertDescription>
        </Alert>
      ) : (
        <p className="text-xs text-muted-foreground">No pacing nudge.</p>
      )}
    </section>
  )
}

// Turn log

function RuleRows({ draft }: { draft: Draft }) {
  return (
    <ul
      className="grid grid-cols-[minmax(7rem,auto)_1fr_auto_3.5rem] items-center gap-x-3 gap-y-1 text-xs"
      aria-label="Rule results"
    >
      {draft.rules.map((result, index) => (
        <li key={`${result.rule}-${index}`} className="contents">
          <span className={cn(result.failed && "font-medium text-destructive")}>
            {RULE_LABELS[result.rule]}
          </span>
          <Progress
            value={result.probability * 100}
            aria-label={`${RULE_LABELS[result.rule]} probability`}
            className="gap-0"
          />
          <span
            className={cn(
              "text-right tabular-nums",
              result.failed && "font-medium text-destructive"
            )}
          >
            {formatProbability(result.probability)}
          </span>
          <span className="flex justify-end">
            {result.failed ? (
              <Badge variant="destructive">fail</Badge>
            ) : result.unsure ? (
              <Badge variant="outline">unsure</Badge>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

function DraftBlock({ draft, index }: { draft: Draft; index: number }) {
  const letter = String.fromCharCode(65 + index)
  const status = draft.shipped
    ? draft.passed
      ? "shipped"
      : "shipped, failing"
    : draft.passed
      ? "passed, not shipped"
      : "rejected"
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium">Draft {letter}</span>
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground tabular-nums">
            highest {formatProbability(draft.highestViolation)}
          </span>
          <Badge
            variant={
              draft.shipped
                ? "default"
                : draft.passed
                  ? "secondary"
                  : "destructive"
            }
          >
            {draft.shipped ? (
              <CheckIcon data-icon="inline-start" aria-hidden />
            ) : null}
            {status}
          </Badge>
        </span>
      </div>
      <p
        className={cn(
          "text-sm leading-relaxed whitespace-pre-line",
          !draft.passed &&
            !draft.shipped &&
            "text-muted-foreground line-through"
        )}
      >
        {draft.text}
      </p>
      <RuleRows draft={draft} />
    </div>
  )
}

function RoundBlock({ round }: { round: Round }) {
  const passed = round.drafts.some((draft) => draft.passed)
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        Round {round.index}
        <span className="text-xs font-normal text-muted-foreground">
          {passed ? "a Draft passed" : "every Draft failed"}
        </span>
      </div>
      {round.feedback.length > 0 ? (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span>Feedback to the Writer:</span>
          <ul className="flex list-disc flex-col gap-0.5 ps-4">
            {round.feedback.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {round.drafts.map((draft, index) => (
        <DraftBlock key={draft.id} draft={draft} index={index} />
      ))}
    </div>
  )
}

function Background({
  turn,
  names,
  arcName,
}: {
  turn: Turn
  names: Names
  arcName: (index: number) => string
}) {
  const results = turn.log.background
  if (
    turn.backgroundStatus === "done" &&
    turn.log.timings.backgroundMs === null
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        No Background work ran for this Turn.
      </p>
    )
  }
  if (turn.backgroundStatus === "pending" || !results) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Spinner aria-hidden />
        Background work is running. Results appear here when it finishes.
      </p>
    )
  }
  if (turn.backgroundStatus === "failed") {
    return (
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>Background work failed</AlertTitle>
        <AlertDescription>
          {results.error ?? "No cause was recorded."} The Arc and pacing checks
          run again next Turn.
        </AlertDescription>
      </Alert>
    )
  }
  return (
    <ul className="flex flex-col gap-1.5 text-sm">
      <li>
        New Entries:{" "}
        {results.newEntryIds.length === 0 ? (
          <span className="text-muted-foreground">none</span>
        ) : (
          results.newEntryIds.map(names).join(", ")
        )}
      </li>
      {results.arcCheck.map((check) => (
        <li
          key={check.exitConditionId}
          className="flex items-start justify-between gap-2"
        >
          <span>
            Exit condition {names(check.exitConditionId)}:{" "}
            {check.met ? "met" : "not met"}
          </span>
          <P value={check.probability} />
        </li>
      ))}
      {results.arcAdvancedTo !== null ? (
        <li>Arc advanced to {arcName(results.arcAdvancedTo)}</li>
      ) : null}
      {results.pacing ? (
        <li className="flex items-start justify-between gap-2">
          <span>
            Pacing:{" "}
            {results.pacing.nudge
              ? `nudge set. ${results.pacing.reason ?? ""}`
              : "progress made, no nudge"}
          </span>
          <P value={results.pacing.probability} />
        </li>
      ) : null}
    </ul>
  )
}

function ReadingSection({
  reading,
}: {
  reading: NonNullable<TurnLogData["reading"]>
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Reading</Label>
      <ul className="flex flex-col gap-1 text-sm">
        <li className="flex justify-between gap-2">
          <span>Intent: {reading.intent.value}</span>
          <P value={reading.intent.probability} />
        </li>
        <li className="flex justify-between gap-2">
          <span>Target: {reading.target.label}</span>
          <P value={reading.target.probability} />
        </li>
        <li className="flex justify-between gap-2">
          <span>
            Classification:{" "}
            {CLASSIFICATION_LABELS[reading.classification.value]}
            {reading.classification.belowFloor ? (
              <span className="text-muted-foreground">
                {" "}
                (below the floor, treated as tangential)
              </span>
            ) : null}
          </span>
          <P value={reading.classification.probability} />
        </li>
      </ul>
    </div>
  )
}

function OutcomeSection({
  outcome,
  directive,
}: {
  outcome: Outcome
  directive: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>Outcome</Label>
      <p className="text-sm">
        {outcome.action ? (
          <>
            <span className="font-medium">
              {ACTION_LABELS[outcome.action.kind]}.
            </span>{" "}
            {outcome.action.summary}
            {outcome.action.reputationDelta !== 0 ? (
              <span className="text-muted-foreground tabular-nums">
                {" "}
                Reputation {signed(outcome.action.reputationDelta)}.
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-muted-foreground">
            The action did not resolve: the death roll ended the Session first.
          </span>
        )}
      </p>
      <p className="text-sm">{outcome.penalty.summary}</p>
      <p className="text-xs text-muted-foreground">
        Penalty: Reputation {signed(outcome.penalty.reputationDelta)} ·
        off-script {signed(outcome.penalty.offScriptDelta)}
        {outcome.penalty.deathRoll
          ? ` · death roll ${formatProbability(outcome.penalty.deathRoll.roll)} against odds ${formatProbability(outcome.penalty.deathRoll.odds)}, ${outcome.penalty.deathRoll.lethal ? "lethal" : "survived"}`
          : ""}
      </p>
      {outcome.endingReason ? (
        <p className="text-sm font-medium">{outcome.endingReason}</p>
      ) : null}
      <p className="text-xs whitespace-pre-line text-muted-foreground">
        Directive: {directive}
      </p>
    </div>
  )
}

function TurnLog({
  turn,
  names,
  arcName,
  open,
  onOpenChange,
}: {
  turn: Turn
  names: Names
  arcName: (index: number) => string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { log } = turn
  const { reading, outcome } = log
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="group/turn flex flex-col"
    >
      <CollapsibleTrigger className="flex w-full items-start gap-2 rounded-md px-1 py-2 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50">
        <ChevronRightIcon
          aria-hidden
          className="mt-0.5 size-4 shrink-0 transition-transform duration-150 group-data-[open]/turn:rotate-90 motion-reduce:transition-none"
        />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
            {turnLabel(turn)}
            {turn.flagged ? (
              <Badge variant="destructive">
                <FlagIcon data-icon="inline-start" aria-hidden />
                Flagged
              </Badge>
            ) : null}
            {log.rounds.length > 1 ? (
              <Badge variant="outline">{log.rounds.length} Rounds</Badge>
            ) : null}
            {turn.state.ending !== "none" ? (
              <Badge variant="secondary">Ending: {turn.state.ending}</Badge>
            ) : null}
            {turn.backgroundStatus === "pending" ? (
              <Badge variant="outline">
                <CircleDashedIcon data-icon="inline-start" aria-hidden />
                background running
              </Badge>
            ) : null}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {turn.playerInput === null
              ? "The first scene, before the Player acts"
              : `› ${turn.playerInput}`}
          </span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 ps-7 pe-1 pt-1 pb-4">
        {reading && outcome ? (
          <>
            <ReadingSection reading={reading} />
            <OutcomeSection outcome={outcome} directive={log.directive} />
          </>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label>Directive</Label>
            <p className="text-sm whitespace-pre-line">{log.directive}</p>
            <p className="text-xs text-muted-foreground">
              No Player input, so nothing was read and no Outcome was resolved.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Label>Rounds</Label>
          {log.rounds.map((round) => (
            <RoundBlock key={round.index} round={round} />
          ))}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Discovery</Label>
          {log.discovery.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing was discoverable this Turn.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm">
              {log.discovery.map((item) => (
                <li
                  key={`${item.target.entryId}-${item.question}`}
                  className="flex justify-between gap-2"
                >
                  <span>
                    {names(item.target.entryId)}:{" "}
                    {item.revealed ? "revealed" : "not revealed"}
                    {item.reputationDelta > 0
                      ? `, Reputation ${signed(item.reputationDelta)}`
                      : ""}
                    <span className="block text-xs text-muted-foreground">
                      {item.question}
                    </span>
                  </span>
                  <P value={item.probability} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Background</Label>
          <Background turn={turn} names={names} arcName={arcName} />
        </div>

        <p className="text-xs text-muted-foreground tabular-nums">
          {(log.timings.totalMs / 1000).toFixed(1)} s to the Passage (
          {reading ? `reading ${log.timings.readingMs} ms, ` : ""}writing{" "}
          {log.timings.writingMs} ms, judging {log.timings.judgingMs} ms)
          {log.timings.backgroundMs !== null
            ? `, background ${log.timings.backgroundMs} ms`
            : ""}{" "}
          · {log.jevModelVersion}
        </p>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function HarnessPane({ data }: { data: GetSessionResponse }) {
  const byId = React.useMemo(
    () =>
      new Map<string, Entry>(data.entries.map((entry) => [entry.id, entry])),
    [data.entries]
  )
  const names: Names = React.useCallback(
    (id: string) => byId.get(id)?.name ?? id,
    [byId]
  )
  const arcName = React.useCallback(
    (index: number) => {
      const name = data.world.brief?.arcs[index]?.name
      return name ? `Arc ${index + 1}, ${name}` : `Arc ${index + 1}`
    },
    [data.world.brief]
  )
  const turns = [...data.turns].reverse()
  const latest = turns[0]
  // Controlled, so a new Turn can open itself: the latest Turn is open and
  // older ones closed, unless the Author opened or closed one by hand.
  const [toggled, setToggled] = React.useState<Record<string, boolean>>({})

  if (!latest) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FlaskConicalIcon />
          </EmptyMedia>
          <EmptyTitle>No Turns yet</EmptyTitle>
          <EmptyDescription>
            The Opening is being written. Its Drafts and Rule results appear
            here once the Judge has passed it.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      <StateSummary data={data} turn={latest} names={names} />
      <Separator />
      <section
        aria-label="Turn log, newest first"
        className="flex flex-col gap-1"
      >
        <Label>Turn log</Label>
        {turns.map((turn) => (
          <TurnLog
            key={turn.id}
            turn={turn}
            names={names}
            arcName={arcName}
            open={toggled[turn.id] ?? turn.id === latest.id}
            onOpenChange={(open) =>
              setToggled((current) => ({ ...current, [turn.id]: open }))
            }
          />
        ))}
      </section>
    </div>
  )
}
