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
// Labels match the public navigation. Home/latest remain aggregate views;
// their editorial values reuse existing categories, without changing stored data.
export const navigationCategories = [
  { label: "الرئيسية", value: "أخبار محلية", href: "#home" },
  { label: "الهجرة", value: "الهجرة والإقامة", href: "#immigration" },
  { label: "المساعدات", value: "المساعدات الحكومية", href: "#benefits" },
  { label: "الجالية", value: "الجالية العربية والمسلمة", href: "#community" },
  { label: "المدارس والعائلة", value: "تعليم", href: "#family" },
  { label: "آخر الأخبار", value: "عام", href: "#latest" },
] as const;
export function isKnownCategory(value: string, scope: "all" | "navigation" = "all"): boolean {
  const normalized = normalizeCategory(value);
  return scope === "navigation"
    ? navigationCategories.some(item => item.value === normalized)
    : (categories as readonly string[]).includes(normalized);
}
export function editorCategory(value: string): string {
  // Preserve legacy classifications in the editor until the admin chooses a section.
  return normalizeCategory(value);
}
