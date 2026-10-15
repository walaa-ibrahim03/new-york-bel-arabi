
import { importRSS } from "./lib/import-rss";

async function main() {
  const result = await importRSS({
    feedUrl: "https://gothamist.com/feed",
    sourceName: "Gothamist",
    category: "أخبار محلية",
    limit: 1,
  });

  console.log("RSS Import Results:");
  console.log(result);
}

main().catch(console.error);
