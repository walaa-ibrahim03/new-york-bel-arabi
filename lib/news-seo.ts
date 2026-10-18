import type { Metadata } from "next";

export const publicationName = "نيويورك بالعربي";
export function searchIndexable() {
  return Boolean(siteOrigin()) && process.env.NYBA_DATABASE_PROFILE !== "isolated-test" && (!process.env.VERCEL || process.env.VERCEL_ENV === "production");
}
export function siteOrigin(): string | null {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    return u.protocol === "https:" && !u.username && !u.password && u.pathname === "/" && !u.search && !u.hash ? u.origin : null;
  } catch { return null; }
}
export function articleId(segment: string): number | null {
  if (!/^[1-9]\d*(?:-[\p{L}\p{N}-]+)?$/u.test(segment)) return null;
  const id = Number(segment.split("-")[0]);
  return Number.isSafeInteger(id) ? id : null;
}
export function articlePath(article: { id: number; title: string }): string {
  const slug = article.title.normalize("NFKC").replace(/[\u064B-\u065F\u0670]/g, "").toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 85).replace(/-$/, "");
  return `/news/${article.id}${slug ? `-${slug}` : ""}`;
}
export function focusKeywords(title: string, category: string): string[] {
  const stop = new Set(["في", "من", "على", "إلى", "عن", "مع", "هذا", "هذه", "بعد", "قبل", "التي", "الذي", "the", "and", "for", "with"]);
  return [...new Set([category, ...title.split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2 && !stop.has(w.toLowerCase()))])].slice(0, 8);
}
export type SeoArticle = { id: number; title: string; summary: string; category: string; imageUrl: string | null; publishedAt: Date | null; sourceName?: string | null; sourceUrl?: string };
function publicImage(value: string | null) {
  try { const u = new URL(value ?? ""); return u.protocol === "https:" && !u.username && !u.password && !u.hostname.includes(":") && !/^[\d.]+$/.test(u.hostname) && !u.hostname.endsWith(".local") && !u.hostname.endsWith(".localhost") && u.hostname.includes(".") ? u.href : undefined; } catch { return undefined; }
}
export function newsMetadata(article: SeoArticle): Metadata {
  const base = siteOrigin(), image = publicImage(article.imageUrl), description = article.summary.trim().slice(0, 160);
  const url = base ? `${base}${articlePath(article)}` : undefined;
  return {
    title: `${article.title.slice(0, 75)} | ${publicationName}`, description,
    keywords: focusKeywords(article.title, article.category), alternates: url ? { canonical: url } : undefined,
    robots: { index: searchIndexable(), follow: searchIndexable() },
    openGraph: { title: article.title, description, url, siteName: publicationName, locale: "ar_US", type: "article", publishedTime: article.publishedAt?.toISOString(), images: image ? [{ url: image, alt: article.title }] : undefined },
    twitter: { card: image ? "summary_large_image" : "summary", title: article.title, description, images: image ? [image] : undefined },
  };
}
export function newsSchema(article: SeoArticle) {
  const base = siteOrigin(), image = publicImage(article.imageUrl);
  return { "@context": "https://schema.org", "@type": "NewsArticle", headline: article.title, description: article.summary,
    inLanguage: "ar", articleSection: article.category, keywords: focusKeywords(article.title, article.category),
    ...(base ? { mainEntityOfPage: `${base}${articlePath(article)}`, url: `${base}${articlePath(article)}` } : {}),
    datePublished: article.publishedAt?.toISOString(),
    author: { "@type": "Organization", name: publicationName, ...(base ? { url: `${base}/about` } : {}) },
    publisher: { "@type": "Organization", name: publicationName, ...(base ? { url: base } : {}) },
    ...(image ? { image: [image] } : {}),
    ...(article.sourceUrl ? { citation: { "@type": "CreativeWork", url: article.sourceUrl, name: article.sourceName || "المصدر الأصلي" } } : {}),
  };
}
export const safeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, "\\u003c");
export const xmlEscape = (value: string) => value.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);
export function newsSitemap(articles: SeoArticle[], now = new Date()) {
  const base = siteOrigin();
  const entries = base ? articles.filter(a => a.publishedAt && a.publishedAt.getTime() <= now.getTime() && a.publishedAt.getTime() >= now.getTime() - 48 * 3600000).slice(0, 1000).map(a => `<url><loc>${xmlEscape(base + articlePath(a))}</loc><news:news><news:publication><news:name>${publicationName}</news:name><news:language>ar</news:language></news:publication><news:publication_date>${a.publishedAt!.toISOString()}</news:publication_date><news:title>${xmlEscape(a.title)}</news:title></news:news></url>`).join("") : "";
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">${entries}</urlset>`;
}
