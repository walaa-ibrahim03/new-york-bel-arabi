type TrendArticle = { id: number; title: string; publishedAt: Date | null; sourceName?: string | null; category: string };
// An explicit site-local signal, not invented social traffic or global popularity.
export function trendingNews<T extends TrendArticle>(articles: T[], now = new Date()): { article: T; mentions: number }[] {
  const recent = articles.filter(a => a.publishedAt && now.getTime() - a.publishedAt.getTime() >= 0 && now.getTime() - a.publishedAt.getTime() <= 86400000).slice(0, 200);
  const words = (title: string) => new Set(title.normalize("NFKC").replace(/[\u064B-\u065F]/g, "").toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 3 && !["نيويورك", "أخبار", "الجديد", "الجديدة", "اليوم", "news", "york", "after", "about", "with"].includes(w)));
  const groups: { article: T; words: Set<string>; mentions: number }[] = [];
  for (const article of recent) {
    const tokens = words(article.title);
    const group = groups.find(g => { const common = [...tokens].filter(w => g.words.has(w)).length; return common >= 3 && common / (new Set([...tokens, ...g.words]).size || 1) >= 0.45; });
    if (group) group.mentions++;
    else groups.push({ article, words: tokens, mentions: 1 });
  }
  return groups.filter(g => g.mentions > 1 || g.article.category === "ترند").sort((a, b) => b.mentions - a.mentions || b.article.publishedAt!.getTime() - a.article.publishedAt!.getTime()).slice(0, 6).map(({ article, mentions }) => ({ article, mentions }));
}
