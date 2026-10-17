import { assertNewsOperationAllowed, requireDatabaseTarget } from "./database-guard";

import Parser from "rss-parser";

import { requireApprovedSource } from "./news-sources";
const parser = new Parser({ timeout: 15000, maxRedirects: 0 });

export async function fetchRSS(feedUrl: string) {
  assertNewsOperationAllowed();
  requireApprovedSource(feedUrl);
  requireDatabaseTarget();
  const feed = await parser.parseURL(feedUrl);

  return feed.items.map((item) => ({
    title: item.title?.trim() ?? "",
    link: item.link?.trim() ?? "",
    publishedAt: item.pubDate ?? "",
    summary: item.contentSnippet?.trim() ?? "",
  }));
}
