// Best-effort operational evidence, not a durable database audit trail.
// Never record email, title, source URL, text, credentials or raw errors.
export function recordDeletionAudit(articleId: number, outcome: "attempt" | "deleted" | "failed") {
  try { console.info(JSON.stringify({ event: "news.delete", articleId, actorRole: "admin", outcome, at: new Date().toISOString() })); }
  catch { /* Logging must not turn a completed deletion into a reported failure. */ }
}
