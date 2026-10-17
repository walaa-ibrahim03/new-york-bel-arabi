import { validateWebUrl } from "./article-policy";
export function validateFactBrief(input: { facts: string; sourceName: string; sourceUrl: string; confirmed: boolean }) {
  if (input.confirmed !== true) throw new Error("راجعي الوقائع في مصدر موثوق واحد وأكديها أولًا.");
  const facts = input.facts.trim(), sourceName = input.sourceName.trim();
  if (facts.length < 30 || facts.length > 2500 || !sourceName || sourceName.length > 120) throw new Error("أدخلي اسم المصدر وقائمة وقائع قصيرة، لا نص المقال الكامل.");
  validateWebUrl(input.sourceUrl);
  if (/https?:\/\/|<[^>]+>/.test(facts)) throw new Error("اكتبي الوقائع كنقاط نصية؛ ضعي الرابط في حقل المصدر.");
  return { facts, sourceName, sourceUrl: input.sourceUrl };
}
export function attributeBrief<T extends { title: string; summary: string; content: string }>(draft: T, sourceName: string) {
  const attribution = `بحسب ${sourceName}، `;
  return { ...draft, summary: (attribution + draft.summary).slice(0, 500), content: attribution + draft.content };
}
export function validateBriefNumbers(facts: string, draft: { title: string; summary: string; content: string }) {
  const normalize = (s: string) => s.replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)));
  const numbers = (s: string) => normalize(s).match(/\d+(?:[.,]\d+)*/g) ?? [];
  const allowed = new Set(numbers(facts));
  if (numbers(`${draft.title} ${draft.summary} ${draft.content}`).some(n => !allowed.has(n))) throw new Error("المسودة تتضمن رقمًا غير وارد في الوقائع؛ تحتاج مراجعة.");
  if (draft.content.split(/\s+/).length > 100) throw new Error("الموجز أطول من المطلوب.");
}
