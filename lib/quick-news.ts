import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizeImportedUrl } from "./article-policy";

import { quickSections } from "./quick-sections";
export { quickSections } from "./quick-sections";
const topics: Record<string, RegExp> = {
  ny: /\b(new york|nyc|manhattan|brooklyn|queens|bronx|staten island)\b|نيويورك|بروكلين|مانهاتن/i,
  us: /\b(united states|u\.s\.|american|congress|washington|nasa)\b|أمريك|الولايات المتحدة/i,
  world: /\b(world|global|international|europe|asia|africa|united nations)\b|عالمي|دولي|أوروبا|آسيا/i,
  immigration: /\b(immigra\w*|migrants?|asylum|visa|uscis|deport\w*|refugee\w*)\b|هجرة|مهاجر|لجوء|تأشيرة/i,
  health: /\b(health|medical|medicine|disease|hospital|vaccine|cancer)\b|صحة|صحي|طب|مستشفى|لقاح/i,
  schools: /\b(school\w*|student\w*|education|classroom|teacher\w*)\b|مدرس|طلاب|تعليم/i,
  economy: /\b(econom\w*|inflation|employment|jobs|budget|business|trade|unemployment)\b|اقتصاد|تضخم|بطالة|ميزانية/i,
};
export type QuickCandidate = { sourceId: string; sourceName: string; title: string; summary: string; url: string; date: string; category: string; borough: string; expires: number };
export function matchQuickSection(section: string, title: string, summary: string, coverage?: string) {
  if (section === "trend") return false; // No external interest metric is configured.
  return (section === "us" && (coverage === "US" || coverage === "NY")) || (section === "ny" && coverage === "NY") || Boolean(topics[section]?.test(`${title} ${summary}`));
}
export function quickCandidates(items: {title:string;summary:string;link:string;publishedAt:string;topics?:string[]}[], source: {id:string;name:string;feedUrl:string;coverage?:string}, section: string, existingUrls: string[], now = Date.now()): QuickCandidate[] {
  const selected = quickSections.find(item => item.id === section);
  if (!selected || section === "trend") throw new Error("لا يتوفر مؤشر اهتمام موثق للترند؛ اختاري قسمًا آخر.");
  const seen = new Set(existingUrls.flatMap(url => { try { return [normalizeImportedUrl(url)]; } catch { return []; } }));
  const host = new URL(source.feedUrl).hostname.replace(/^www\./, "");
  return [...items].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).flatMap(item => {
    try {
      const url = normalizeImportedUrl(item.link), title = item.title.replace(/<[^>]*>/g, "").trim(), summary = item.summary.trim();
      const date = Date.parse(item.publishedAt);
      if (new URL(url).hostname.replace(/^www\./, "") !== host || !title || title.length > 180 || summary.length > 8000 || !Number.isFinite(date) || date > now || seen.has(url) || !matchQuickSection(section, title, (item.topics ?? []).join(" "), source.coverage)) return [];
      seen.add(url);
      return [{ sourceId: source.id, sourceName: source.name, title, summary, url, date: new Date(date).toISOString(), category: selected.category, borough: section === "ny" ? "نيويورك" : section === "world" ? "العالم" : source.coverage === "NY" ? "نيويورك" : source.coverage === "US" ? "أمريكا" : "العالم", expires: now + 20 * 60_000 }];
    } catch { return []; }
  }).sort((a,b) => Date.parse(b.date)-Date.parse(a.date)).slice(0,5);
}
function key() { if (!process.env.AUTH_SECRET) throw new Error("Selection signing unavailable"); return process.env.AUTH_SECRET; }
export function signQuickCandidate(candidate: QuickCandidate) {
  const payload = Buffer.from(JSON.stringify(candidate)).toString("base64url");
  return `${payload}.${createHmac("sha256",key()).update(`quick-news-v1:${payload}`).digest("base64url")}`;
}
export function readQuickCandidate(token: string): QuickCandidate {
  if (typeof token !== "string" || token.length > 50000) throw new Error("Invalid selection");
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) throw new Error("Invalid selection");
  const expected = createHmac("sha256",key()).update(`quick-news-v1:${payload}`).digest();
  const supplied = Buffer.from(signature,"base64url");
  if (supplied.length !== expected.length || !timingSafeEqual(supplied,expected)) throw new Error("Invalid selection");
  const candidate = JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as QuickCandidate;
  if (!Number.isFinite(candidate.expires) || candidate.expires < Date.now()) throw new Error("انتهت صلاحية النتائج؛ أعيدي الجلب.");
  return candidate;
}

// Titles are metadata, not permission to fetch/translate the article behind them.
// Ambiguous questions and generic teasers need a permitted excerpt or optional facts.
export function headlineSupportsBrief(title: string) {
  const text = title.trim();
  return text.length >= 30 && text.split(/\s+/).length >= 5 && !/[?؟]/.test(text) &&
    !/^(?:what|why|how|who|when|where|opinion|analysis|explained|everything you need|live updates)\b/i.test(text) && !/^(?:ماذا|لماذا|كيف|متى|أين|رأي|تحليل)(?:\s|$)/.test(text);
}
