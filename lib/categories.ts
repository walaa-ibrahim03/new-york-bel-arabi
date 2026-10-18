export const categories = ["عام", "الهجرة والإقامة", "المساعدات الحكومية", "أخبار محلية", "السكن", "سكن واقتصاد", "تعليم", "اقتصاد", "صحة", "مجتمع", "مواصلات", "الجالية العربية والمسلمة", "أخبار أمريكا", "أخبار العالم", "ترند"] as const;
const aliases: Record<string, string> = {
  "الهجرة": "الهجرة والإقامة",
  "المساعدات": "المساعدات الحكومية",
  "الجالية": "الجالية العربية والمسلمة",
  "المدارس والعائلة": "تعليم",
};
export function normalizeCategory(value: string): string {
  const category = value.trim();
  return Object.prototype.hasOwnProperty.call(aliases, category) ? aliases[category] : category;
}
export function isKnownCategory(value: string): boolean {
  return (categories as readonly string[]).includes(normalizeCategory(value));
}
