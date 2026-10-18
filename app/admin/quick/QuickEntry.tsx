"use client";
import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { prepareEditorText } from "../assistant-actions";
import { saveArticle } from "../editor-actions";
import { localNewsSources } from "../../../lib/local-news-sources";
import { summaryWordCount } from "../../../lib/publication-policy";
import { sourceForDirectory, canDiscoverHeadlines } from "../../../lib/news-sources";
import { searchQuickNews, prepareQuickDraft } from "../quick-actions";
import { QuickDraft } from "../SourceDiscovery";
import { quickEntryInput } from "../../../lib/quick-entry";

export default function QuickEntry({ readOnly, source, embedded = false }: { readOnly: boolean; source?: { name: string; url: string }; embedded?: boolean }) {
  const [sourceId, setSourceId] = useState(localNewsSources.find(item => item.name === source?.name)?.id ?? "other");
  const selectedSource = localNewsSources.find(item => item.id === sourceId);
  const available = canDiscoverHeadlines(selectedSource ? sourceForDirectory(selectedSource.url) : undefined);
  const [headlines,setHeadlines] = useState<{title:string;source:string;date:string;url:string;token:string}[]>([]);
  const [checked,setChecked] = useState<string[]>([]);
  const [prepared,setPrepared] = useState<{id:number;revision:number;title:string;summary:string;category:string;sourceName:string}[]>([]);
  async function discover() {
    if (!available || !selectedSource || locked.current) return;
    locked.current=true; setError(""); setHeadlines([]); setChecked([]);
    start(async()=>{try { const result=await searchQuickNews(selectedSource.url,"ny"); if(result.ok) {setHeadlines(result.items); if(!result.items.length)setError("لا توجد عناوين حديثة غير محفوظة حاليًا.");} else setError(result.message); } catch {setError("تعذر جلب العناوين؛ لم يُحفظ شيء.");} finally {locked.current=false;} });
  }
  function prepareSelected() {
    if(readOnly || !available || locked.current || !checked.length)return; locked.current=true;setError("");
    start(async()=>{try {for(const item of headlines.filter(row=>checked.includes(row.token))) {const result=await prepareQuickDraft(item.token); if(!result.ok){setError(result.message);break;} setPrepared(rows=>[...rows,result.draft]); setHeadlines(rows=>rows.filter(row=>row.token!==item.token));}setChecked([]);}catch{setError("تعذر استكمال التجهيز؛ راجعي المسودات قبل إعادة المحاولة.");}finally{locked.current=false;} });
  }
  const Container = embedded ? "section" : "main";
  const Heading = embedded ? "h2" : "h1";
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
  return <Container dir="rtl" aria-label="إعداد خبر" className={embedded ? "mb-6 rounded-2xl border border-amber-200 bg-white p-5 text-zinc-900" : "min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900"}><div className="mx-auto max-w-2xl space-y-5">
    {!embedded && <Link href="/admin" className="text-amber-800 underline">العودة إلى لوحة الإدارة</Link>}
    <Heading className="text-3xl font-bold">إعداد خبر</Heading>
    <label className="block">المصدر<select aria-label="مصدر إعداد الخبر" className="input-style mt-2 w-full" value={sourceId} disabled={busy || saving} onChange={e=>{setSourceId(e.target.value as typeof sourceId);setHeadlines([]);setChecked([]);setError("");}}><option value="other">مصدر موثوق آخر</option>{localNewsSources.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {selectedSource && <p className="text-sm leading-7"><a href={selectedSource.url} target="_blank" rel="noopener noreferrer" className="font-bold text-amber-800 underline">فتح أخبار {selectedSource.name}</a> · {available ? "اكتشاف العناوين متاح، دون جلب المقال أو الصور." : "متابعة مباشرة؛ الوصول الآلي مقيد بشروط المصدر. الصقي رابط الخبر ووقائعه أدناه."}</p>}
    {available && <div className="space-y-3"><button type="button" onClick={discover} disabled={busy || saving} className="rounded-xl bg-amber-600 px-5 py-3 font-bold text-white">جلب أحدث 5 عناوين</button>{headlines.map(item=><label key={item.token} className="flex gap-3 rounded-xl border p-3"><input type="checkbox" checked={checked.includes(item.token)} disabled={busy} onChange={e=>setChecked(rows=>e.target.checked?[...rows,item.token]:rows.filter(token=>token!==item.token))}/><span>{item.title}<span className="block text-sm">{item.source} · {new Date(item.date).toLocaleString("ar")} · <a href={item.url} target="_blank" rel="noopener noreferrer" className="underline">المصدر</a></span></span></label>)}{checked.length>0&&<button type="button" onClick={prepareSelected} disabled={readOnly || busy || saving} className="rounded-xl border px-5 py-3">تجهيز المسودات المختارة ({checked.length})</button>}</div>}
    {prepared.map(item=><QuickDraft key={item.id} initial={item} readOnly={readOnly} origin="https://www.new-york-bel-arabi.com"/>)}
    <p>الرابط للتوثيق فقط؛ لا نجلب المقال أو الصور. اكتبي الوقائع بأسلوبك، دون لصق نص محمي. راجعي الأسماء والأرقام قبل النشر.</p>
    {readOnly && <p role="status">هذه النسخة للقراءة فقط؛ التجهيز والحفظ والنشر متوقفة.</p>}
    <label className="block">رابط الخبر الأصلي<input className="input-style mt-2 w-full" type="url" dir="ltr" maxLength={2000} value={url} disabled={busy || saving} onChange={e => { setUrl(e.target.value); setDraft(null); }} /></label>
    <label className="block">الوقائع الأساسية<textarea className="input-style mt-2 min-h-40 w-full" maxLength={2500} value={facts} disabled={busy || saving} onChange={e => { setFacts(e.target.value); setDraft(null); }} /></label>
    <button type="button" onClick={prepare} disabled={readOnly || busy || saving || !url || facts.trim().length < 30} className="rounded-xl bg-amber-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "جارٍ التجهيز…" : "تجهيز بالعربية"}</button>
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
      <p className="text-sm">{summaryWordCount(draft.summary)} كلمة · المقترح 40–80 كلمة.</p>
      {summaryWordCount(draft.summary)<40 && <label className="flex gap-2 text-sm"><input type="checkbox" name="shortSummaryConfirmed" value="yes" key={draft.summary} />الوقائع محدودة؛ أؤكد استخدام ملخص أقصر دون حشو أو اختلاق.</label>}
      <div className="flex flex-wrap gap-3"><button name="intent" value="draft" disabled={readOnly || saving || busy} className="rounded-xl border px-5 py-3 disabled:opacity-50">حفظ كمسودة</button><button name="intent" value="publish" disabled={readOnly || saving || busy} className="rounded-xl bg-green-700 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "جارٍ الحفظ…" : "نشر الآن"}</button></div>
    </form>}
    {!embedded && <details><summary className="cursor-pointer">خيارات إضافية</summary><Link href="/admin/new" className="text-amber-800 underline">المحرر المطوّل</Link></details>}
  </div></Container>;
}
