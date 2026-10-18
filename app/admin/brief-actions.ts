"use server";
import { auth } from "../../auth";
import { assertNewsOperationAllowed, requireDatabaseTarget } from "../../lib/database-guard";
import { validateFactBrief, validateBriefNumbers, attributeBrief } from "../../lib/factual-brief";
import { translateNewsToArabic } from "../../lib/translate-news";
import { aiFailureMessage } from "../../lib/ai-errors";

export async function prepareFactualBrief(input: { facts: string; sourceName: string; sourceUrl: string; confirmed: boolean }) {
  try {
    assertNewsOperationAllowed();
    const session = await auth(), admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!admin || session?.user?.email?.trim().toLowerCase() !== admin) return { ok: false as const, message: "سجلي الدخول بحساب المدير." };
    requireDatabaseTarget();
    const checked = validateFactBrief(input);
    const draft = await translateNewsToArabic(checked.facts.split("\n")[0].slice(0, 180), checked.facts, "", "facts");
    validateBriefNumbers(checked.facts, draft);
    return { ok: true as const, draft: attributeBrief(draft, checked.sourceName) };
  } catch (error) { return { ok: false as const, message: aiFailureMessage(error) ?? "تعذر إعداد الموجز. راجعي الوقائع واسم المصدر ورابطه وتأكيد المراجعة وإعداد النموذج. لم يُحفظ أو يُنشر شيء." }; }
}
