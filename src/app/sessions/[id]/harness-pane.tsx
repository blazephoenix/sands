"use client"

/**
 * The harness pane: for each Turn, exactly what the Writer was given and what
 * it sent back, so the Author can see why a Passage reads the way it does.
 * Newest Turn first, open; older Turns collapsed.
 */
import { CircleAlertIcon } from "lucide-react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Turn } from "@/domain/session"

export function turnLabel(turn: Turn) {
  return turn.index === 0 ? "Opening" : `Turn ${turn.index}`
}

/** Raw output is JSON; show it indented when it parses. */
function readableOutput(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function Block({ text }: { text: string }) {
  return (
    <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap">
      {text}
    </pre>
  )
}

export function HarnessPane({ turns }: { turns: readonly Turn[] }) {
  const newestFirst = [...turns].reverse()
  const latest = newestFirst[0]
  return (
    <Accordion
      // A new Turn remounts the list, so it arrives open.
      key={latest?.id}
      multiple
      defaultValue={latest ? [latest.id] : []}
    >
      {newestFirst.map((turn) => (
        <AccordionItem key={turn.id} value={turn.id}>
          <AccordionTrigger>
            <span className="flex flex-col gap-0.5">
              <span>{turnLabel(turn)}</span>
              <span className="text-xs font-normal text-muted-foreground">
                {turn.log.model} · {turn.log.latencyMs.toLocaleString()} ms ·{" "}
                {turn.log.inputTokens.toLocaleString()} in /{" "}
                {turn.log.outputTokens.toLocaleString()} out
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-3">
            {turn.log.notes.length > 0 ? (
              <Alert>
                <CircleAlertIcon aria-hidden />
                <AlertTitle>What code did</AlertTitle>
                <AlertDescription>
                  {turn.log.notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </AlertDescription>
              </Alert>
            ) : null}
            <Tabs defaultValue="output">
              <TabsList>
                <TabsTrigger value="output">Raw output</TabsTrigger>
                <TabsTrigger value="prompt">Prompt</TabsTrigger>
                <TabsTrigger value="instructions">Instructions</TabsTrigger>
              </TabsList>
              <TabsContent value="output">
                <Block text={readableOutput(turn.log.rawOutput)} />
              </TabsContent>
              <TabsContent value="prompt">
                <Block text={turn.log.prompt} />
              </TabsContent>
              <TabsContent value="instructions">
                <Block text={turn.log.instructions} />
              </TabsContent>
            </Tabs>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
