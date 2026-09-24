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

/** The SQLite error code behind a failed query (drizzle wraps the driver's error). */
export function sqliteErrorCode(error: unknown): string | null {
  for (let e = error; e instanceof Error; e = e.cause) {
    const code = (e as { code?: unknown }).code
    if (typeof code === "string" && code.startsWith("SQLITE_")) return code
  }
  return null
}
