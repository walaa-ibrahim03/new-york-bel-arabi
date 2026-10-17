"use server";
import { auth } from "../../auth";
import { prisma } from "../../lib/prisma";
import { assertNewsOperationAllowed, requireDatabaseTarget } from "../../lib/database-guard";
import { requireFullTranslationPermission } from "../../lib/news-sources";
import { validateWebUrl } from "../../lib/article-policy";
import { validateEditorText, type EditorText, type EditorOperation } from "../../lib/editor-assistant";
import { validateFactBrief, validateBriefNumbers } from "../../lib/factual-brief";
import { translateNewsToArabic } from "../../lib/translate-news";
import { aiFailureMessage } from "../../lib/ai-errors";

export async function prepareEditorText(input: { text: EditorText; operation: EditorOperation; sourceUrl: string; rightsConfirmed: boolean; id?: number; revision?: number; targetWords?: number; factsOnly?: boolean }) {
  try {
    assertNewsOperationAllowed();
    const session = await auth(), admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!admin || session?.user?.email?.trim().toLowerCase() !== admin) return { ok: false as const, message: "سجلي الدخول بحساب المدير." };
    requireDatabaseTarget();
    if (!["translate", "simplify"].includes(input.operation)) throw new Error("Invalid operation");
    if (input.rightsConfirmed !== true) return { ok: false as const, message: "أكدي ملكية النص أو إذن ترجمته وتلخيصه؛ للنصوص المحمية اكتبي الوقائع المؤكدة بأسلوبك واختاري تغطية الوقائع." };
    validateWebUrl(input.sourceUrl);
    if (input.factsOnly !== true) requireFullTranslationPermission(input.sourceUrl);
    const targetWords = input.targetWords ?? 60;
    if (!Number.isInteger(targetWords) || targetWords < 30 || targetWords > 160) throw new Error("Invalid summary length");
    if (input.id !== undefined) {
      if (!Number.isSafeInteger(input.id) || input.id <= 0) throw new Error("Invalid id");
      const current = await prisma.article.findUnique({ where: { id: input.id }, select: { status: true, revision: true, sourceUrl: true } });
      if (!current || !["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED"].includes(current.status) || current.revision !== input.revision || current.sourceUrl !== input.sourceUrl) return { ok: false as const, message: "أعيدي تحميل الخبر؛ تغيّرت نسخته أو مصدره." };
    }
    const text = validateEditorText(input.text);
    if (input.factsOnly === true) validateFactBrief({ facts: text.content, sourceName: "مصدر الخبر", sourceUrl: input.sourceUrl, confirmed: true });
    const draft = await translateNewsToArabic(text.title, text.summary, text.content, input.factsOnly === true ? "facts" : input.operation === "simplify" ? "simplify" : "licensed", targetWords);
    validateBriefNumbers(`${text.title} ${text.summary} ${text.content}`, draft, false);
    return { ok: true as const, draft };
  } catch (error) { return { ok: false as const, message: aiFailureMessage(error) ?? "تعذرت المعالجة. راجعي طول النص والحقوق وإعداد النموذج. لم يتغير الأصل ولم يُحفظ أو يُنشر شيء. يمكن إعداد موجز وقائعي دون إعادة صياغة النص المحمي." }; }
}
