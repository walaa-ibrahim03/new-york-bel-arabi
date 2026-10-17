import { assertNewsOperationAllowed, requireDatabaseTarget } from "./database-guard";

import Parser from "rss-parser";

import { requireApprovedSource, requireDiscoverySource } from "./news-sources";
const parser = new Parser({ timeout: 15000, maxRedirects: 0 });

export async function fetchRSS(feedUrl: string, purpose: "import" | "headlines" = "import") {
  assertNewsOperationAllowed();
  if (purpose === "headlines") requireDiscoverySource(feedUrl);
  else requireApprovedSource(feedUrl);
  requireDatabaseTarget();
  const feed = await parser.parseURL(feedUrl);

  return feed.items.map((item) => ({
    title: item.title?.trim() ?? "",
    link: item.link?.trim() ?? "",
    publishedAt: item.pubDate ?? "",
    topics: (item.categories ?? []).filter(value => typeof value === "string").slice(0, 20).map(value => value.slice(0, 100)),
    summary: purpose === "headlines" ? "" : item.contentSnippet?.trim() ?? "",
  }));
}
