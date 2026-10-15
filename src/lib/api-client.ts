/**
 * The client side of the route handlers: typed JSON calls. Every response is
 * parsed with its zod contract, and every failure becomes an `ApiError` whose
 * message says what happened and what to do.
 *
 *   const { world } = await api.getWorld(id)
 *   await api.deleteWorld(id)
 */
import { z } from "zod"

import {
  apiErrorBodySchema,
  createWorldResponseSchema,
  getSessionResponseSchema,
  getWorldResponseSchema,
  listWorldsResponseSchema,
  playTurnResponseSchema,
  type CreateSessionRequest,
  type CreateWorldRequest,
  type PlayTurnRequest,
} from "@/domain/api"
import { sessionSchema, turnSchema } from "@/domain/session"

export class ApiError extends Error {
  constructor(
    /** HTTP status, or 0 when the request never got an answer. */
    readonly status: number,
    /** Stable code: the route's error code, or `network`, `contract`, `aborted`. */
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
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof ApiError && error.code === "aborted")
  )
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  signal?: AbortSignal
  /** Let the request outlive the page (a last save as the page unloads). Bodies over 64 KB are refused by the browser. */
  keepalive?: boolean
}

async function send(
  path: string,
  { method = "GET", body, signal, keepalive }: RequestOptions,
  accept: string
): Promise<Response> {
  const headers: Record<string, string> = { accept }
  if (body !== undefined) headers["content-type"] = "application/json"

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
    if (isAbortError(error))
      throw new ApiError(0, "aborted", "The request was cancelled.")
    throw new ApiError(
      0,
      "network",
      "Could not reach the server. Check your connection and try again."
    )
  }
  if (!response.ok) throw await errorFrom(response)
  return response
}

async function errorFrom(response: Response): Promise<ApiError> {
  try {
    const parsed = apiErrorBodySchema.safeParse(await response.json())
    if (parsed.success)
      return new ApiError(
        response.status,
        parsed.data.error.code,
        parsed.data.error.message
      )
  } catch {
    // Not JSON; fall through.
  }
  return new ApiError(
    response.status,
    "http_error",
    `The server answered ${response.status}. Try again in a moment.`
  )
}

function parseContract<S extends z.ZodType>(
  schema: S,
  data: unknown,
  path: string
): z.infer<S> {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    console.error(
      `[sands] ${path} broke its contract`,
      z.prettifyError(parsed.error)
    )
    throw new ApiError(
      0,
      "contract",
      "The server sent something this page does not understand. Reload the page; if it persists, the route and the page disagree."
    )
  }
  return parsed.data
}

/** A JSON route call, parsed with `schema`. Throws `ApiError`. */
export async function apiFetch<S extends z.ZodType>(
  path: string,
  schema: S,
  options: RequestOptions = {}
): Promise<z.infer<S>> {
  const response = await send(path, options, "application/json")
  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new ApiError(
      response.status,
      "contract",
      "The server sent an empty or malformed reply. Try again."
    )
  }
  return parseContract(schema, data, path)
}

/** A route call that answers 204 with no body. Throws `ApiError`. */
export async function apiSend(
  path: string,
  options: RequestOptions = {}
): Promise<void> {
  await send(path, options, "application/json")
}

const enc = encodeURIComponent

const startSessionResponseSchema = z.object({
  session: sessionSchema,
  turns: z.array(turnSchema),
})

/** Typed calls for every route. */
export const api = {
  /** GET /api/worlds: the Worlds home list. */
  listWorlds: (signal?: AbortSignal) =>
    apiFetch("/api/worlds", listWorldsResponseSchema, { signal }),

  /** POST /api/worlds: a new World with an empty Skeleton. */
  createWorld: (body: CreateWorldRequest = {}, signal?: AbortSignal) =>
    apiFetch("/api/worlds", createWorldResponseSchema, {
      method: "POST",
      body,
      signal,
    }),

  /** GET /api/worlds/[id]: the World, its Skeleton's issues and its Sessions. */
  getWorld: (id: string, signal?: AbortSignal) =>
    apiFetch(`/api/worlds/${enc(id)}`, getWorldResponseSchema, { signal }),

  /** DELETE /api/worlds/[id]: the World for good, with its Sessions and Turns. */
  deleteWorld: (id: string, signal?: AbortSignal) =>
    apiSend(`/api/worlds/${enc(id)}`, { method: "DELETE", signal }),

  /** POST /api/sessions: a new Session and its Opening. Takes as long as the Writer does. */
  startSession: (body: CreateSessionRequest, signal?: AbortSignal) =>
    apiFetch("/api/sessions", startSessionResponseSchema, {
      method: "POST",
      body,
      signal,
    }),

  /** GET /api/sessions/[id]: the Session and its Turns. */
  getSession: (id: string, signal?: AbortSignal) =>
    apiFetch(`/api/sessions/${enc(id)}`, getSessionResponseSchema, { signal }),

  /** POST /api/sessions/[id]/turns: one Turn. Takes as long as the Writer does. */
  playTurn: (sessionId: string, body: PlayTurnRequest, signal?: AbortSignal) =>
    apiFetch(`/api/sessions/${enc(sessionId)}/turns`, playTurnResponseSchema, {
      method: "POST",
      body,
      signal,
    }),
}
