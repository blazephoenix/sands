/**
 * Dates and times, all through dayjs (AGENTS.md: never the built-in `Date`).
 * The domain contracts carry ISO strings; elapsed times are milliseconds.
 */
import dayjs from "dayjs"
import localizedFormat from "dayjs/plugin/localizedFormat"
import relativeTime from "dayjs/plugin/relativeTime"

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

export { dayjs }

/** The current time as the ISO string the domain contracts carry. */
export function nowIso() {
  return dayjs().toISOString()
}

/** The current time in milliseconds, for elapsed times and timers. */
export function nowMs() {
  return dayjs().valueOf()
}

/** "5 minutes ago", "in 2 days": `iso` relative to `now` (milliseconds). */
export function fromNow(iso: string, now: number) {
  return dayjs(iso).from(dayjs(now))
}

/** A full local date and time, e.g. "Sep 24, 2026 4:05 PM". */
export function formatDateTime(iso: string) {
  return dayjs(iso).format("lll")
}

/** A short local date and time without the year, e.g. "24 Sep, 16:05". */
export function formatDayAndTime(iso: string) {
  return dayjs(iso).format("D MMM, LT")
}

/** A local time with seconds, e.g. "4:05:09 PM". */
export function formatTimeWithSeconds(iso: string | number) {
  return dayjs(iso).format("LTS")
}
