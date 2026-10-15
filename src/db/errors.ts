/**
 * An expected failure of a stored operation: what was asked for does not
 * exist, does not fit the stored state, or is malformed. The route helper
 * (`src/server/http.ts`) maps it to 404, 409 or 422 with its message.
 */
export class StoreError extends Error {
  constructor(
    readonly code: "not_found" | "conflict" | "invalid",
    message: string
  ) {
    super(message)
    this.name = "StoreError"
  }
}

/** The Postgres error code (SQLSTATE) behind a failed query; drizzle wraps the driver's error. */
export function pgErrorCode(error: unknown): string | null {
  for (let e = error; e instanceof Error; e = e.cause) {
    const code = (e as { code?: unknown }).code
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code
  }
  return null
}

/** SQLSTATE for a unique constraint violation. */
export const UNIQUE_VIOLATION = "23505"
