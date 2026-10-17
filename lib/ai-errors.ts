// Never forward provider messages: they may contain credentials or account IDs.
export function aiFailureMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const item = error as { status?: unknown; code?: unknown; name?: unknown };
  const manual = " يمكنك متابعة إضافة الخبر يدويًا وتحسين SEO دون الذكاء الاصطناعي. لم يُحفظ أو يُنشر شيء.";
  if (item.code === "AI_NOT_CONFIGURED") return "خدمة الذكاء الاصطناعي غير مهيأة لهذه النسخة." + manual;
  if (item.status === 401 || item.status === 403) return "رفضت خدمة الذكاء الاصطناعي الطلب بسبب صلاحيات الوصول أو المصادقة. يلزم مراجعة إعداد الخدمة." + manual;
  if (item.status === 404 || item.code === "model_not_found") return "تعذر الوصول إلى نموذج الذكاء الاصطناعي المحدد بهذه الإعدادات." + manual;
  if (item.status === 429) return "خدمة الذكاء الاصطناعي متوقفة مؤقتًا بسبب حد الطلبات أو الرصيد." + manual;
  if (item.name === "APIConnectionError" || item.name === "APIConnectionTimeoutError" || (typeof item.status === "number" && item.status >= 500)) return "خدمة الذكاء الاصطناعي غير متاحة مؤقتًا أو تعذر الاتصال بها. حاولي لاحقًا." + manual;
  return null;
}
