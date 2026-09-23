/**
 * The client side of the route handlers (ADR-0010): typed JSON calls and typed
 * NDJSON progress streams. Every response is parsed with its zod contract, and
 * every failure becomes an `ApiError` whose message says what happened and
 * what to do.
 *
 * Dev scenarios: when the page URL carries `?scenario=...`, every call
 * forwards it as the `x-sands-scenario` header (see src/fixtures/scenarios.ts).
 *
 *   const { world } = await api.getWorld(id)
 *   for await (const event of api.streamSetup(id, { signal })) { ... }
 */
import { z } from "zod"

import {
  apiErrorBodySchema,
  createEntryResponseSchema,
  createSessionResponseSchema,
  createWorldResponseSchema,
  getWorldResponseSchema,
  listWorldsResponseSchema,
  patchEntryResponseSchema,
  saveBriefResponseSchema,
  type CreateEntryRequest,
  type CreateSessionRequest,
  type CreateWorldRequest,
  type PatchEntryRequest,
  type SaveBriefRequest,
  type TurnRequest,
} from "@/domain/api"
import { setupEventSchema, turnEventSchema } from "@/domain/events"
import { getSessionResponseSchema } from "@/domain/session-view"
import { SCENARIO_HEADER, SCENARIO_QUERY } from "@/fixtures/scenarios"

export class ApiError extends Error {
  constructor(
    /** HTTP status, or 0 when the request never got an answer. */
    readonly status: number,
    /** Stable code: the route's error code, or `network`, `contract`, `stream_incomplete`, `aborted`. */
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "ApiError"
  }

  /** Worth offering Retry: the server or the network failed, not the request itself. */
  get retryable() {
    return this.status === 0 || this.status >= 500
  }
}

export function isAbortError(error: unknown) {
  return (error instanceof DOMException && error.name === "AbortError") || (error instanceof ApiError && error.code === "aborted")
}

/** The scenarios forced on the current page (`?scenario=`), forwarded to every API call. */
export function currentScenario(): string | null {
  if (typeof window === "undefined") return null
  return new URL(window.location.href).searchParams.get(SCENARIO_QUERY)
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  signal?: AbortSignal
  /** Let the request outlive the page (a last save as the page unloads). Bodies over 64 KB are refused by the browser. */
  keepalive?: boolean
}

async function send(path: string, { method = "GET", body, signal, keepalive }: RequestOptions, accept: string): Promise<Response> {
  const headers: Record<string, string> = { accept }
  if (body !== undefined) headers["content-type"] = "application/json"
  const scenario = currentScenario()
  if (scenario) headers[SCENARIO_HEADER] = scenario

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
      keepalive,
      cache: "no-store",
    })
  } catch (error) {
    if (isAbortError(error)) throw new ApiError(0, "aborted", "The request was cancelled.")
    throw new ApiError(0, "network", "Could not reach the server. Check your connection and try again.")
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

async function errorFrom(response: Response): Promise<ApiError> {
  try {
    const parsed = apiErrorBodySchema.safeParse(await response.json())
    if (parsed.success) return new ApiError(response.status, parsed.data.error.code, parsed.data.error.message)
  } catch {
    // Not JSON; fall through.
  }
  return new ApiError(response.status, "http_error", `The server answered ${response.status}. Try again in a moment.`)
}

function parseContract<S extends z.ZodType>(schema: S, data: unknown, path: string): z.infer<S> {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    console.error(`[sands] ${path} broke its contract`, z.prettifyError(parsed.error))
    throw new ApiError(0, "contract", "The server sent something this page does not understand. Reload the page; if it persists, the route and the page disagree.")
  }
  return parsed.data
}

/** A JSON route call, parsed with `schema`. Throws `ApiError`. */
export async function apiFetch<S extends z.ZodType>(path: string, schema: S, options: RequestOptions = {}): Promise<z.infer<S>> {
  const response = await send(path, options, "application/json")
  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new ApiError(response.status, "contract", "The server sent an empty or malformed reply. Try again.")
  }
  return parseContract(schema, data, path)
}

/**
 * Reads an NDJSON body, yielding each event parsed with `schema`. The stream
 * must end with a `result` or `error` event; if the connection drops first, it
 * throws `ApiError("stream_incomplete")`.
 */
export async function* readNdjson<S extends z.ZodType<{ type: string }>>(
  response: Response,
  schema: S,
  path = "stream"
): AsyncGenerator<z.infer<S>> {
  if (!response.body) throw new ApiError(response.status, "contract", "The server sent no progress. Try again.")
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let finished = false
  try {
    while (true) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split("\n")
      buffer = lines.pop() ?? ""
      if (done && buffer.trim()) lines.push(buffer)
      for (const line of lines) {
        if (!line.trim()) continue
        let raw: unknown
        try {
          raw = JSON.parse(line)
        } catch {
          throw new ApiError(0, "contract", "The server sent progress this page cannot read. Try again.")
        }
        const event = parseContract(schema, raw, path)
        if (event.type === "result" || event.type === "error") finished = true
        yield event
      }
      if (done) break
    }
  } catch (error) {
    if (isAbortError(error)) throw new ApiError(0, "aborted", "The request was cancelled.")
    throw error
  } finally {
    reader.releaseLock()
  }
  if (!finished) {
    throw new ApiError(0, "stream_incomplete", "The connection closed before the server finished. Nothing was saved; try again.")
  }
}

/** POSTs (or otherwise calls) a streaming route and yields its typed events. */
export async function* streamRoute<S extends z.ZodType<{ type: string }>>(
  path: string,
  schema: S,
  options: RequestOptions = {}
): AsyncGenerator<z.infer<S>> {
  const response = await send(path, { method: "POST", ...options }, "application/x-ndjson")
  yield* readNdjson(response, schema, path)
}

const enc = encodeURIComponent

/** Typed calls for the shared routes, plus the two streaming routes tickets 02 and 04 implement. */
export const api = {
  getWorld: (id: string, signal?: AbortSignal) => apiFetch(`/api/worlds/${enc(id)}`, getWorldResponseSchema, { signal }),

  /** GET /api/worlds (ticket 02): the Worlds home list. */
  listWorlds: (signal?: AbortSignal) => apiFetch("/api/worlds", listWorldsResponseSchema, { signal }),

  /** POST /api/worlds (ticket 02): a new World in draft, its Brief the new-Brief template unless one is given. */
  createWorld: (body: CreateWorldRequest = {}, signal?: AbortSignal) =>
    apiFetch("/api/worlds", createWorldResponseSchema, { method: "POST", body, signal }),

  /** PUT /api/worlds/[id]/brief (ticket 02): autosave of the Brief document and the World's name. */
  saveBrief: (worldId: string, body: SaveBriefRequest, options: { signal?: AbortSignal; keepalive?: boolean } = {}) =>
    apiFetch(`/api/worlds/${enc(worldId)}/brief`, saveBriefResponseSchema, { method: "PUT", body, ...options }),

  patchEntry: (id: string, body: PatchEntryRequest, signal?: AbortSignal) =>
    apiFetch(`/api/entries/${enc(id)}`, patchEntryResponseSchema, { method: "PATCH", body, signal }),

  createEntry: (body: CreateEntryRequest, signal?: AbortSignal) =>
    apiFetch("/api/entries", createEntryResponseSchema, { method: "POST", body, signal }),

  createSession: (body: CreateSessionRequest, signal?: AbortSignal) =>
    apiFetch("/api/sessions", createSessionResponseSchema, { method: "POST", body, signal }),

  getSession: (id: string, signal?: AbortSignal) => apiFetch(`/api/sessions/${enc(id)}`, getSessionResponseSchema, { signal }),

  /** POST /api/worlds/[id]/setup (ticket 02). */
  streamSetup: (worldId: string, options: { signal?: AbortSignal } = {}) =>
    streamRoute(`/api/worlds/${enc(worldId)}/setup`, setupEventSchema, { signal: options.signal }),

  /** POST /api/sessions/[id]/turn (ticket 04). */
  streamTurn: (sessionId: string, body: TurnRequest, options: { signal?: AbortSignal } = {}) =>
    streamRoute(`/api/sessions/${enc(sessionId)}/turn`, turnEventSchema, { body, signal: options.signal }),
}
