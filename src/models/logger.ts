/**
 * Where the model clients write their per-call lines (model version, tokens,
 * latency, failures). The server console by default; tests pass their own.
 */
export interface ModelLogger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

export const consoleLogger: ModelLogger = {
  info: (message) => console.info(message),
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
}
