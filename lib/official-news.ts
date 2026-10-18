import { newsSources, isSourceArticleUrl, canDiscoverHeadlines } from "./news-sources";
import { quickCandidates, headlineKey, officialCategory } from "./quick-news";
import type { QuickCandidate } from "./quick-news";

type FeedItem = { title: string; summary: string; link: string; publishedAt: string; topics?: string[] };
type Reader = (url: string, purpose: "facts") => Promise<FeedItem[]>;
const ny = /\b(new york|nyc|brooklyn|manhattan|queens|bronx|staten island)\b|نيويورك/i;
const generalImmigration = /\b(policy|policies|filing fees?|registration period|application process|eligibility|form i-\d+|form n-\d+|temporary protected status|h-1b cap)\b/i;

export async function collectOfficialNews(section: string, existing: { sourceUrl: string; title?: string }[], read: Reader, now = Date.now()) {
  const sources = newsSources.filter(source => source.officialNY && canDiscoverHeadlines(source) && source.rssFacts?.allowed);
  const responses = await Promise.allSettled(sources.map(source => read(source.feedUrl, "facts")));
  const candidates: QuickCandidate[] = [], working: string[] = [];
  responses.forEach((response, index) => {
    if (response.status !== "fulfilled") return;
    const source = sources[index];
    working.push(source.name);
    const rows = response.value.filter(item => {
      const age = now - Date.parse(item.publishedAt);
      if (!Number.isFinite(age) || age < 0 || age > (source.maxAgeHours ?? 336) * 3_600_000 || !isSourceArticleUrl(source, item.link)) return false;
      // National policy affects NY applicants; unrelated criminal cases elsewhere do not.
      return source.id !== "uscis-ny" || ny.test(`${item.title} ${item.summary}`) || generalImmigration.test(item.title);
    });
    const byUrl = new Map(rows.map(item => [item.link, item]));
    const mapped = quickCandidates(rows, { ...source, coverage: "NY" }, section, existing.map(item => item.sourceUrl), now, 200);
    for (const item of mapped) {
      const row = rows.find(row => row.link === item.url) ?? byUrl.get(item.url);
      candidates.push({ ...item, summary: "", category: section === "ny" ? officialCategory(item.title, (row?.topics ?? []).join(" "), source.category) : item.category, borough: "نيويورك" });
    }
  });
  const urls = new Set<string>(), titles = new Set(existing.map(item => headlineKey(item.title ?? "")).filter(Boolean));
  const items = candidates.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).filter(item => {
    const key = headlineKey(item.title);
    if (urls.has(item.url) || titles.has(key)) return false;
    urls.add(item.url); titles.add(key); return true;
  }).slice(0, 5);
  return { items, workingSources: working, unavailableSources: sources.length - working.length };
}
