import { assertNewsOperationAllowed } from "./database-guard";

import { normalizeCategory } from "./categories";
import { normalizeImportedUrl } from "./article-policy";
import { prisma } from "./prisma";
import { fetchRSS } from "./rss";
import { requireApprovedSource } from "./news-sources";

type ImportRSSOptions = {
  feedUrl: string;
  sourceName?: string;
  category?: string;
  limit?: number;
};

const topicRules = [
  {
    category: "الهجرة والإقامة",
    keywords: [
      "immigration",
      "immigrant",
      "migrants",
      "uscis",
      "green card",
      "citizenship",
      "naturalization",
      "asylum",
      "deportation",
      "visa",
      "refugee",
      "family reunification",
      "ice detention",
    ],
  },
  {
    category: "المساعدات الحكومية",
    keywords: [
      "snap benefits",
      "food stamps",
      "medicaid",
      "medicare",
      "cash assistance",
      "public assistance",
      "wic",
      "food assistance",
      "heating assistance",
      "heap",
      "benefit payments",
      "social services",
    ],
  },
  {
    category: "السكن",
    keywords: [
      "affordable housing",
      "housing lottery",
      "section 8",
      "nycha",
      "housing connect",
      "rent assistance",
      "rental assistance",
      "eviction",
      "tenant rights",
    ],
  },
  {
    category: "الجالية العربية والمسلمة",
    keywords: [
      "arab american",
      "arab-american",
      "muslim community",
      "muslim americans",
      "mosque",
      "islamic center",
      "palestinian community",
      "arab community",
      "islamophobia",
      "eid celebration",
      "ramadan",
      "halal food",
    ],
  },
  {
    category: "تعليم",
    keywords: [
      "nyc public schools",
      "school enrollment",
      "school closures",
      "school calendar",
      "pre-k",
      "3-k",
      "childcare assistance",
      "child care subsidy",
      "daycare assistance",
      "education benefits",
    ],
  },
];

function detectCategory(title: string, summary: string) {
  const text = `${title} ${summary}`.toLowerCase();

  for (const rule of topicRules) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.category;
    }
  }

  return null;
}

export async function importRSS({
  feedUrl,
  sourceName = "مصدر غير معروف",
  limit = 5,
}: ImportRSSOptions) {
  assertNewsOperationAllowed();
  const source = requireApprovedSource(feedUrl);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 40) throw new Error("Invalid import limit");
  const articles = await fetchRSS(feedUrl);
  // Match old tracking URLs too, without changing any existing record.
  const existing = await prisma.article.findMany({ select: { sourceUrl: true } });
  const seen = new Set(existing.flatMap(item => { try { return [normalizeImportedUrl(item.sourceUrl)]; } catch { return []; } }));

  let imported = 0;
  let skipped = 0;
  let irrelevant = 0;

  // نفحص حتى 40 خبرًا، بدل الاكتفاء بأول 5.
  const candidates = articles.slice(0, 40);

  for (const article of candidates) {
    if (imported >= limit) break;

    if (!article.title || !article.link) {
      skipped++;
      continue;
    }

    let sourceUrl: string;
    try {
      sourceUrl = normalizeImportedUrl(article.link);
      const itemHost = new URL(sourceUrl).hostname.replace(/^www\./, "");
      const feedHost = new URL(source.feedUrl).hostname.replace(/^www\./, "");
      if (itemHost !== feedHost) throw new Error("RSS item belongs to another source");
      if (article.title.length > 180 || article.summary.length > 20000 ||
          (article.publishedAt && !Number.isFinite(Date.parse(article.publishedAt)))) throw new Error("Invalid RSS item");
    } catch {
      skipped++;
      continue;
    }
    if (seen.has(sourceUrl)) { skipped++; continue; }
    const detectedCategory = detectCategory(
      article.title,
      article.summary
    );

    if (!detectedCategory) {
      irrelevant++;
      continue;
    }

    try {
      await prisma.article.create({
        data: {
          title: article.title,
          content: article.summary || article.title,
          summary: article.summary.slice(0, 500),
          originalTitle: article.title,
          originalSummary: article.summary,
          originalContent: article.summary || article.title,
          sourceUrl,
          sourceName: source.name,
          status: "DRAFT",
          category: normalizeCategory(detectedCategory),
          borough: "نيويورك",
        },
      });

      imported++;
      seen.add(sourceUrl);
    } catch (error) {
      if (
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "P2002"
      ) {
        skipped++;
      } else {
        throw error;
      }
    }
  }

  return {
    source: source.name || sourceName,
    total: candidates.length,
    imported,
    skipped,
    irrelevant,
  };
}
