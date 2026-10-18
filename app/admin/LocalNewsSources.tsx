import Link from "next/link";
import { localNewsSources } from "../../lib/local-news-sources";

export default function LocalNewsSources() {
  return <section id="local-news" aria-label="مصادر نيويورك المحلية" className="mb-6 space-y-4">
    <h2 className="text-2xl font-bold">أخبار نيويورك المحلية</h2>
    <p className="leading-7 text-zinc-600">افتحي المصدر، اختاري الخبر، ثم أضيفي رابطه ووقائعه بأسلوبك. المحرر السريع يجهّز عنوانًا عربيًا وملخصًا 40–80 كلمة للمراجعة والنشر، دون جلب المقال أو الصور.</p>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{localNewsSources.map(source => <article key={source.id} className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-xl font-bold" dir="ltr">{source.name}</h3>
      <p className="text-sm font-semibold text-amber-800">متابعة مباشرة — العناوين غير متاحة داخل اللوحة حاليًا</p>
      <p className="flex-1 text-sm leading-7 text-zinc-600">{source.status}</p>
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border px-4 py-3 text-center font-bold">فتح أخبار المصدر<span className="sr-only"> — {source.name}، في تبويب جديد</span></a>
      <Link href={`/admin/quick?source=${source.id}`} className="rounded-xl bg-amber-600 px-4 py-3 text-center font-bold text-white">إضافة الخبر الذي اخترته<span className="sr-only"> من {source.name}</span></Link>
    </article>)}</div>
    <p className="text-sm text-zinc-500">لا ترخيص تلقائي لنسخ النصوص أو الصور. ستظهر أحدث خمسة عناوين هنا عند توفر وصول مسموح وموثق؛ لا نعرض نتائج وهمية أو قوائم فارغة.</p>
  </section>;
}
