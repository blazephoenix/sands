/**
 * Small helpers for route handlers: JSON errors with a stated cause, body
 * parsing with zod, and one wrapper that turns thrown errors into responses.
 */
import { z } from "zod"

import type { ApiErrorBody } from "@/domain/api"
import { StoreError } from "@/db/errors"

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string
  ) {
    super(message)
    this.name = "HttpError"
  }
}

export function apiError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } } satisfies ApiErrorBody, {
    status,
  })
}

/** Parses a JSON body with a schema, or throws a 400/422 HttpError that says what is wrong. */
export async function readJson<S extends z.ZodType>(
  request: Request,
  schema: S
): Promise<z.infer<S>> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new HttpError(
      400,
      "invalid_json",
      "The request body is not valid JSON."
    )
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new HttpError(
      422,
      "invalid_request",
      `The request does not match the contract: ${z.prettifyError(parsed.error)}`
    )
  }
  return parsed.data
}

const STORE_STATUS: Record<StoreError["code"], number> = {
  not_found: 404,
  conflict: 409,
  invalid: 422,
}

/** Wraps a handler so HttpError, StoreError and unexpected errors all become JSON error responses. */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>
) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args)
    } catch (error) {
      if (error instanceof HttpError)
        return apiError(error.status, error.code, error.message)
      if (error instanceof StoreError)
        return apiError(STORE_STATUS[error.code], error.code, error.message)
      console.error("[sands] unhandled route error", error)
      return apiError(
        500,
        "internal",
        "Something went wrong on the server. Try again."
      )
    }
  }
}
