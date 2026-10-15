import { fetchRSS } from "./lib/rss";

async function main() {
  const articles = await fetchRSS("https://gothamist.com/feed");

  console.log(`Found ${articles.length} articles`);

  articles.slice(0, 5).forEach((article, index) => {
    console.log(`\nArticle ${index + 1}`);
    console.log("Title:", article.title);
    console.log("Link:", article.link);
    console.log("Date:", article.publishedAt);
  });
}

main().catch(console.error);