// Temporary RSS diagnostics: metadata counters only; never pass raw errors or URLs.
export type RssReason = "access_flag" | "missing_fields" | "invalid_url" | "wrong_host" | "invalid_text" | "invalid_date" | "future_date" | "duplicate" | "section" | "limit" | "insufficient_facts";
export type RssCounters = { read: number; saved: number; shown: number; skipped: number; reasons: Partial<Record<RssReason, number>> };
export function rssCounters(read = 0): RssCounters {
  return { read, saved: 0, shown: 0, skipped: 0, reasons: {} };
}
export function skipRss(stats: RssCounters, reason: RssReason, count = 1) {
  stats.skipped += count;
  stats.reasons[reason] = (stats.reasons[reason] ?? 0) + count;
}
export function reportRss(sourceId: string, phase: "discovery" | "import" | "prepare", stats: RssCounters, outcome: string, httpStatus?: number) {
  // Callers supply fixed source IDs and outcome codes, not publisher text or exceptions.
  console.info("[rss-diagnostic]", JSON.stringify({ sourceId, phase, outcome, ...stats, ...(httpStatus ? { httpStatus } : {}) }));
}
export class RssReadError extends Error {
  constructor(public readonly kind: "http" | "timeout" | "network_or_parse", public readonly httpStatus?: number) {
    super("RSS read failed");
  }
}
export class NewsFlowError extends Error {
  constructor(public readonly kind: "read_only" | "auth" | "database_guard") { super(kind); }
}
export function rssReadError(error: unknown): RssReadError {
  if (error instanceof RssReadError) return error;
  // rss-parser 3.x uses these exact messages instead of a typed HTTP/timeout error.
  // Extract only the numeric status; never expose or log the original message.
  const value = error as { statusCode?: unknown; name?: unknown; code?: unknown; message?: unknown } | null;
  const parserStatus = typeof value?.message === "string" ? /^Status code ([3-5]\d{2})$/.exec(value.message) : null;
  const status = parserStatus ? Number(parserStatus[1]) : value?.statusCode;
  if (typeof status === "number" && Number.isInteger(status) && status >= 300 && status <= 599) return new RssReadError("http", status);
  if (value?.name === "TimeoutError" || value?.name === "AbortError" || value?.code === "ETIMEDOUT" || (typeof value?.message === "string" && /^Request timed out after \d+ms$/.test(value.message))) return new RssReadError("timeout");
  return new RssReadError("network_or_parse");
}
