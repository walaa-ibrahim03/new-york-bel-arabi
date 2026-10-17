import { assertNewsOperationAllowed, requireDatabaseTarget } from "./database-guard";

import Parser from "rss-parser";

import { requireApprovedSource, requireDiscoverySource, requireRssFactsSource } from "./news-sources";
const parser = new Parser({ timeout: 15000, maxRedirects: 0 });

export async function fetchRSS(feedUrl: string, purpose: "import" | "headlines" | "facts" = "import") {
  let source;
  if (purpose === "facts") source = requireRssFactsSource(feedUrl);
  else if (purpose === "headlines") source = requireDiscoverySource(feedUrl);
  else { assertNewsOperationAllowed(); source = requireApprovedSource(feedUrl); }
  requireDatabaseTarget();
  const feed = source?.officialNY ? await officialFeed(feedUrl) : await parser.parseURL(feedUrl);

  return feed.items.map((item) => ({
    title: item.title?.trim() ?? "",
    link: item.link?.trim() ?? "",
    publishedAt: item.pubDate ?? "",
    topics: (item.categories ?? []).filter(value => typeof value === "string").slice(0, 20).map(value => value.slice(0, 100)),
    summary: purpose === "headlines" ? "" : (item.contentSnippet?.trim() ?? "").slice(0, purpose === "facts" ? 1200 : 8000),
  }));
}

// Three fixed official endpoints only. One request per feed/minute per process,
// including concurrent searches. No redirects, article fetches, or stale fallback.
const officialCache = new Map<string, { until: number; value: ReturnType<typeof readOfficialFeed> }>();
async function officialFeed(url: string) {
  const cached = officialCache.get(url);
  if (cached && cached.until > Date.now()) return cached.value;
  const value = readOfficialFeed(url);
  officialCache.set(url, { until: Date.now() + 60_000, value });
  try { return await value; } catch (error) { officialCache.delete(url); throw error; }
}
async function readOfficialFeed(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000), redirect: "error", cache: "no-store", headers: { Accept: "application/rss+xml, application/xml, text/xml" } });
  if (!response.ok || !response.body) { await response.body?.cancel(); throw new Error("Official feed unavailable"); }
  const reader = response.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 512_000) throw new Error("Official feed exceeds size limit");
      chunks.push(part.value);
    }
  } finally { await reader.cancel().catch(() => {}); }
  const xml = Buffer.concat(chunks).toString("utf8");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("Unsupported XML declaration");
  const feed = await parser.parseString(xml);
  return { ...feed, items: feed.items.slice(0, 200) };
}
