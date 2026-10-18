import SourceCredit from "../SourceCredit";
import { validateWebUrl } from "../../lib/article-policy";

export type PreviewArticle = { title: string; summary: string; content: string; category: string; sourceName: string; sourceUrl: string; imageUrl: string };
function safeUrl(value: string) { try { return validateWebUrl(value); } catch { return undefined; } }

export default function ArticlePreview({ article }: { article: PreviewArticle }) {
  const image = safeUrl(article.imageUrl);
  return <section aria-label="معاينة الخبر" className="mt-6 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-sm">
    <p className="bg-amber-50 p-4 text-sm font-bold text-amber-900">معاينة فقط — لا تحفظ الخبر ولا تنشره</p>
    {image && <div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image} alt="الصورة الرئيسية للخبر" referrerPolicy="no-referrer" className="max-h-80 w-full object-cover" />
    </div>}
    <article className="space-y-5 p-6" dir="auto">
      <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900">{article.category}</span>
      <h2 className="break-words text-2xl font-bold leading-relaxed">{article.title || "عنوان الخبر"}</h2>
      <p className="whitespace-pre-wrap break-words text-lg leading-8 text-zinc-600">{article.summary}</p>
      <SourceCredit sourceName={article.sourceName} sourceUrl={article.sourceUrl} />
    </article>
  </section>;
}
