import { assertNewsOperationAllowed } from "./database-guard";

import Parser from "rss-parser";

import { newsSources } from "./news-sources";
const parser = new Parser({ timeout: 15000, maxRedirects: 0 });

export async function fetchRSS(feedUrl: string) {
  assertNewsOperationAllowed();
  if (!newsSources.some((source) => source.feedUrl === feedUrl)) {
    throw new Error("مصدر RSS غير معتمد.");
  }
  const feed = await parser.parseURL(feedUrl);

  return feed.items.map((item) => ({
    title: item.title?.trim() ?? "",
    link: item.link?.trim() ?? "",
    publishedAt: item.pubDate ?? "",
    summary: item.contentSnippet?.trim() ?? "",
  }));
}
