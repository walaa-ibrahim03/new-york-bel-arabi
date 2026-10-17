"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { sourceDirectory, discoveryEditorLink } from "../../lib/source-directory";
import { newsSources } from "../../lib/news-sources";
import { discoverNewsHeadlines } from "./discovery-actions";

export default function SourceDiscovery({ readOnly = true }: { readOnly?: boolean }) {
  const [selected, setSelected] = useState<string>(sourceDirectory[0].url);
  const source = sourceDirectory.find(item => item.url === selected)!;
  const automatic = newsSources.some(item => item.discovery?.automatic && Boolean(item.discovery.reference) && new URL(item.feedUrl).hostname.replace(/^www\./, "") === new URL(source.url).hostname.replace(/^www\./, ""));
  const [headlines, setHeadlines] = useState<{ title: string; url: string }[]>([]);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  function discover() {
    if (pending || readOnly || !automatic) return;
    start(async () => {
      try {
        const result = await discoverNewsHeadlines(source.url);
        if (!result.ok) { setMessage(result.message); return; }
        setHeadlines(result.headlines);
        setMessage(`آخر فحص للعناوين: ${new Date(result.checkedAt).toLocaleString("ar")} — ${result.headlines.length} نتيجة. لم تُحفظ مسودات أو نصوص مقالات.`);
      } catch { setMessage("تعذر الاتصال. يمكنك فتح المصدر الرسمي ومتابعة إعداد الخبر يدويًا."); }
    });
  }
  return <section id="news-discovery" aria-label="اكتشاف الأخبار" className="mb-6 space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
    <h2 className="text-xl font-bold">اكتشاف الأخبار وكتابة خبر في دقيقة</h2>
    <p className="text-sm leading-7">اختاري المصدر وافتحي موقعه الرسمي لمتابعة العناوين، ثم اكتبي الوقائع المتاحة لك قانونيًا بأسلوبك. لا نجلب مقالات المواقع ولا ننسخها. فتح الرابط لا يمنح ترخيص إعادة نشر.</p>
    <label className="block text-sm font-bold">مصدر المتابعة<select aria-label="مصدر المتابعة" value={selected} disabled={pending} onChange={e => { setSelected(e.target.value); setHeadlines([]); setMessage(""); }} className="mt-2 block w-full rounded-xl border bg-white p-3">{sourceDirectory.map(item => <option key={item.url} value={item.url}>{item.name}</option>)}</select></label>
    <div className="flex flex-wrap gap-3">
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border bg-white px-4 py-3 font-bold">فتح المصدر الرسمي ↗</a>
      <Link href={discoveryEditorLink(source.url)} className="rounded-xl bg-zinc-900 px-4 py-3 font-bold text-white">إعداد خبر من الوقائع</Link>
      {automatic && <button type="button" disabled={pending || readOnly} onClick={discover} className="rounded-xl bg-amber-400 px-4 py-3 font-bold disabled:opacity-50">{pending ? "جارٍ فحص العناوين..." : "عرض العناوين والروابط فقط"}</button>}
    </div>
    <p className="text-sm leading-7">{automatic ? "الاكتشاف الآلي للعناوين معتمد لهذا المصدر؛ الاستيراد النصي عملية مستقلة ولا يحدث هنا." : "الجمع الآلي للعناوين والنصوص معطّل لعدم توثيق إذن مناسب. المتابعة تكون على الموقع الرسمي ووفق شروط الوصول؛ لا نتجاوز حجبًا أو اشتراكًا."}</p>
    <a href={source.terms} target="_blank" rel="noopener noreferrer" className="text-sm text-amber-800 underline">شروط المصدر ↗</a>
    {message && <p role="status" className="text-sm leading-7">{message}</p>}
    {headlines.length > 0 && <ul className="space-y-3">{headlines.map(item => <li key={item.url} className="rounded-xl bg-white p-4"><p dir="auto" className="font-bold">{item.title}</p><div className="mt-3 flex flex-wrap gap-4 text-sm underline"><a href={item.url} target="_blank" rel="noopener noreferrer">فتح الخبر الأصلي ↗</a><Link href={discoveryEditorLink(source.url, item.url, item.title)}>اختيار الخبر وإعداد ملخص عربي</Link></div></li>)}</ul>}
  </section>;
}
