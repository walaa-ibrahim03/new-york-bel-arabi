// One server-side policy for every transition into PUBLISHED. Originals are untouched.
export class PublicationValidationError extends Error {
  readonly code = "PUBLICATION_VALIDATION";
}
export function summaryWordCount(text: string): number {
  return text.trim().split(/\s+/u).filter(word => /\p{L}|\p{N}/u.test(word)).length;
}
function mostlyArabic(text: string): boolean {
  const letters = [...text].filter(char => /\p{L}/u.test(char));
  const arabic = letters.filter(char => /\p{Script=Arabic}/u.test(char)).length;
  return arabic >= 6 && arabic / Math.max(letters.length, 1) >= 0.65;
}
export function validatePublication(article: { title: string; summary: string }, shortSummaryConfirmed = false): void {
  if (!mostlyArabic(article.title) || summaryWordCount(article.title) < 2) throw new PublicationValidationError("اكتبي عنوانًا يغلب عليه النص العربي من كلمتين على الأقل قبل النشر.");
  if (!mostlyArabic(article.summary)) throw new PublicationValidationError("يجب أن يغلب النص العربي على الملخص؛ لا يمكن نشر ملخص إنجليزي.");
  const words = summaryWordCount(article.summary);
  if (words > 80) throw new PublicationValidationError("اختصري الملخص إلى 80 كلمة كحد أقصى قبل النشر.");
  if (words < 40 && (shortSummaryConfirmed !== true || words < 8)) throw new PublicationValidationError("الملخص المقترح 40–80 كلمة. إذا كانت الوقائع محدودة، أكدي استثناء الملخص القصير (8 كلمات على الأقل)، دون إضافة تفاصيل غير متوفرة.");
}
