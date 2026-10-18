import { isKnownCategory } from "./categories";

export const statusLabels: Record<string, string> = {
  DRAFT: "مسودة", IN_REVIEW: "قيد المراجعة", APPROVED: "معتمد", PUBLISHED: "منشور",
};
export function validateArticleId(id: number) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("معرّف الخبر غير صالح.");
}
export function validateWebUrl(value: string): string {
  if (!value || value.length > 2000) throw new Error("رابط غير صالح.");
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password ||
      !host.includes(".") || host.endsWith(".localhost") || host.endsWith(".local") ||
      /^[\d.]+$/.test(host) || host.includes(":")) {
    throw new Error("يجب استخدام رابط ويب عام دون بيانات دخول.");
  }
  return url.href;
}
export function normalizeImportedUrl(value: string): string {
  const url = new URL(validateWebUrl(value));
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^utm_/i.test(key) || /^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.href;
}
export function validateEditorialArticle(article: { title: string; summary: string; content: string; category: string; sourceUrl: string }) {
  for (const [value, max] of [[article.title, 180], [article.summary, 2000], [article.content, 20000]] as const) {
    if (!value.trim() || value.length > max) throw new Error("نص الخبر فارغ أو يتجاوز الحد المسموح.");
  }
  if (!isKnownCategory(article.category)) throw new Error("راجعي تصنيف الخبر قبل اعتماده.");
  validateWebUrl(article.sourceUrl);
}
export function canPublish(article: { status: string; approvedAt: Date | null; approvedBy: string | null }) {
  return article.status === "APPROVED" && article.approvedAt !== null && Boolean(article.approvedBy);
}
