/**
 * The Writer the routes play with: Grok, configured from the environment.
 * Server-only. Route tests replace this module with a `FakeWriter`.
 */
import { GrokWriter } from "@/models/grok-writer"
import type { Writer } from "@/models/writer"

export function serverWriter(): Writer {
  return new GrokWriter()
}
