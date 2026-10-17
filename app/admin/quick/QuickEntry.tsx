"use client";
import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { prepareEditorText } from "../assistant-actions";
import { saveArticle } from "../editor-actions";
import { quickEntryInput } from "../../../lib/quick-entry";

export default function QuickEntry({ readOnly, source }: { readOnly: boolean; source?: { name: string; url: string } }) {
  const [url, setUrl] = useState("");
  const [facts, setFacts] = useState("");
  const [draft, setDraft] = useState<{ title: string; summary: string; sourceUrl: string; sourceName: string; facts: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const locked = useRef(false);
  const previous = useRef<{ key: string; title: string; summary: string } | null>(null);
  const [saved, save, saving] = useActionState(saveArticle, { error: "" });
  const form = useRef<HTMLFormElement>(null);
  function prepare() {
    if (readOnly || locked.current || busy || saving) return;
    setError("");
    let checked: ReturnType<typeof quickEntryInput>;
    try { checked = quickEntryInput(url, facts); }
    catch { setError("أدخلي رابطًا عامًا صحيحًا ووقائع قصيرة من 30 إلى 2500 حرف، دون لصق المقال أو روابط داخل الوقائع."); return; }
    const key = JSON.stringify(checked);
    if (previous.current?.key === key) { setDraft({ ...checked, ...previous.current }); return; }
    locked.current = true;
    start(async () => {
      try {
        const result = await prepareEditorText({ text: { title: checked.facts.split("\n")[0].slice(0, 180), summary: "", content: checked.facts }, operation: "simplify", sourceUrl: checked.sourceUrl, rightsConfirmed: true, factsOnly: true, targetWords: 60 });
        if (!result.ok) { setError(result.message); return; }
        previous.current = { key, title: result.draft.title, summary: result.draft.summary };
        setDraft({ ...checked, title: result.draft.title, summary: result.draft.summary });
      } catch { setError("تعذر تجهيز الخبر. لم يُحفظ أو يُنشر شيء."); }
      finally { locked.current = false; }
    });
  }
  return <main dir="rtl" className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900"><div className="mx-auto max-w-2xl space-y-5">
    <Link href="/admin" className="text-amber-800 underline">العودة إلى لوحة الإدارة</Link>
    <h1 className="text-3xl font-bold">إضافة خبر سريع</h1>
    {source && <p className="rounded-xl bg-amber-50 p-4">المصدر المختار: {source.name} · <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline">فتح أخبار المصدر</a>. الصقي رابط المقال المحدد والوقائع التي راجعتِها أدناه.</p>}
    <p>الرابط للتوثيق فقط؛ لا نجلب المقال أو الصور. اكتبي الوقائع بأسلوبك، دون لصق نص محمي. راجعي الأسماء والأرقام قبل النشر.</p>
    {readOnly && <p role="status">هذه النسخة للقراءة فقط؛ التجهيز والحفظ والنشر متوقفة.</p>}
    <label className="block">رابط الخبر الأصلي<input className="input-style mt-2 w-full" type="url" dir="ltr" maxLength={2000} value={url} disabled={busy || saving} onChange={e => { setUrl(e.target.value); setDraft(null); }} /></label>
    <label className="block">الوقائع الأساسية<textarea className="input-style mt-2 min-h-40 w-full" maxLength={2500} value={facts} disabled={busy || saving} onChange={e => { setFacts(e.target.value); setDraft(null); }} /></label>
    <button type="button" onClick={prepare} disabled={readOnly || busy || saving || !url || facts.trim().length < 30} className="rounded-xl bg-amber-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "جارٍ التجهيز…" : "تجهيز الخبر بالذكاء الاصطناعي"}</button>
    <p className="text-sm text-zinc-500">ملخص 40–80 كلمة، أو أقصر إذا كانت الوقائع محدودة. SEO تلقائي. التكلفة التقديرية نحو سنت واحد لكل تجهيز؛ لا نشر تلقائي.</p>
    {(error || saved.error) && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{error || saved.error}</p>}
    {draft && <form ref={form} action={save} className="space-y-4 rounded-2xl border bg-white p-5" onSubmit={e => {
      const intent = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value");
      const field = form.current?.elements.namedItem("publicationConfirmed") as HTMLInputElement | null;
      if (field) field.value = "";
      if (intent === "publish") {
        if (!window.confirm("هل راجعتِ الوقائع والصياغة وحقوق الاستخدام وتريدين اعتماد الخبر ونشره الآن؟")) { e.preventDefault(); return; }
        if (field) field.value = "yes";
      }
    }}>
      <h2 className="text-xl font-bold">معاينة قابلة للتعديل — الخبر في دقيقة</h2>
      <p>المصدر: {draft.sourceName}</p>
      <label className="block">عنوان الخبر<input name="title" className="input-style mt-2 w-full" required maxLength={180} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="block">ملخص الخبر<textarea name="summary" className="input-style mt-2 min-h-40 w-full" required maxLength={2000} value={draft.summary} onChange={e => setDraft({ ...draft, summary: e.target.value })} /></label>
      <input type="hidden" name="format" value="minute" /><input type="hidden" name="sourceUrl" value={draft.sourceUrl} /><input type="hidden" name="sourceName" value={draft.sourceName} /><input type="hidden" name="category" value="أخبار محلية" /><input type="hidden" name="borough" value="نيويورك" /><input type="hidden" name="imageUrl" value="" /><input type="hidden" name="publicationConfirmed" defaultValue="" />
      <input type="hidden" name="pendingOriginal" value={JSON.stringify({ title: draft.facts.split("\n")[0].slice(0, 180), summary: "", content: draft.facts, sourceUrl: draft.sourceUrl })} />
      <div className="flex flex-wrap gap-3"><button name="intent" value="draft" disabled={readOnly || saving || busy} className="rounded-xl border px-5 py-3 disabled:opacity-50">حفظ كمسودة</button><button name="intent" value="publish" disabled={readOnly || saving || busy} className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "جارٍ الحفظ…" : "نشر الآن"}</button></div>
    </form>}
    <p><Link href="/admin/new" className="text-amber-800 underline">فتح محرر الأخبار المعتاد</Link></p>
  </div></main>;
}
