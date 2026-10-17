
"use client";

import { statusLabels } from "../../lib/article-policy";
import { newsSources, isSourceApproved } from "../../lib/news-sources";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import {
  submitArticleForReview,
  approveArticle,
  returnArticleToDraft,
  publishArticle,
  approveAndPublishArticle,
  unpublishArticle,
  deleteArticle,
  importNewsFromRSS,
} from "./actions";

type Article = {
  id: number;
  title: string;
  summary: string;
  category: string;
  borough: string;
  status: string;
  createdAt: string;
};

type Filter = "ALL" | "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED";

export default function ArticlesDashboard({
  articles,
  readOnly = true,
}: {
  articles: Article[];
  readOnly?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [deleteFeedback, setDeleteFeedback] = useState<{ id: number; ok: boolean; message: string } | null>(null);
const [importMessage, setImportMessage] = useState("");
const [isImporting, setIsImporting] = useState(false);
const [selectedSource, setSelectedSource] = useState("gothamist");
const selectedSourceDetails = newsSources.find(source => source.id === selectedSource);
const sourceApproved = Boolean(selectedSourceDetails && isSourceApproved(selectedSourceDetails));

function handleImportRSS() {
  if (isPending || isImporting || readOnly || !sourceApproved) return;

  setError("");
  setImportMessage("");
  setIsImporting(true);

  startTransition(async () => {
    try {
const result = await importNewsFromRSS(selectedSource);
      setImportMessage(
        `حُفظ ${result.imported} خبر كمسودة، وتُجاوز ${result.skipped} خبر مكرر أو غير صالح و${result.irrelevant} خبر خارج الأقسام المستهدفة. لا نشر تلقائي.`
      );
    } catch {
      setError("فشل جلب الأخبار من RSS. حاولي مرة أخرى.");
    } finally {
      setIsImporting(false);
    }
  });
}
  const visibleArticles = useMemo(() => articles.filter(article => !deletedIds.includes(article.id)), [articles, deletedIds]);
  const published = visibleArticles.filter(
    (a) => a.status === "PUBLISHED"
  ).length;

  const drafts = visibleArticles.filter(
    (a) => a.status === "DRAFT"
  ).length;

  const filteredArticles = useMemo(() => {
    return visibleArticles.filter((article) => {
      const matchesSearch = article.title
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesStatus =
        filter === "ALL" || article.status === filter;

      return matchesSearch && matchesStatus;
    });
  }, [visibleArticles, search, filter]);

  function runAction(
    id: number,
    action: (id: number) => Promise<void>
  ) {
    if (isPending) return;

    setError("");
    setBusyId(id);

    startTransition(async () => {
      try {
        await action(id);
      } catch {
        setError("تعذر تنفيذ العملية. حاولي مرة أخرى.");
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleDelete(id: number, title: string) {
    if (isPending || readOnly) return;

    if (
      !window.confirm(
        `حذف الخبر نهائيًا؟\n\n${title}\n\nلا يمكن التراجع عن الحذف.`
      )
    ) {
      return;
    }

    setError("");
    setDeleteFeedback(null);
    setBusyId(id);
    startTransition(async () => {
      try {
        const result = await deleteArticle(id);
        setDeleteFeedback({ id, ok: result.ok, message: result.message });
        if (result.ok) setDeletedIds(previous => [...previous, id]);
      } catch {
        setDeleteFeedback({ id, ok: false, message: "تعذّر إكمال طلب الحذف. أعيدي تحميل الصفحة للتحقق من حالة الخبر قبل المحاولة مجددًا." });
      } finally { setBusyId(null); }
    });
  }

  const filters: { label: string; value: Filter }[] = [
    { label: "جميع الأخبار", value: "ALL" },
    { label: "المسودات", value: "DRAFT" },
    { label: "قيد المراجعة", value: "IN_REVIEW" },
    { label: "المعتمدة", value: "APPROVED" },
    { label: "المنشورة", value: "PUBLISHED" },
  ];

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-8"
    >
      <div className="mx-auto max-w-6xl">
        {readOnly && <p role="status" className="mb-5 rounded-lg bg-amber-50 p-4 text-amber-900">هذه النسخة تعمل بوضع القراءة فقط؛ الحذف والتحرير والاستيراد متوقفة مؤقتًا لحماية البيانات.</p>}
        <p className="mb-4"><Link href="/admin/sources" className="font-bold text-amber-800 underline">دليل المصادر والمتابعة والجدولة ←</Link></p>
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-semibold text-amber-600">
              NEW YORK BEL ARABI
            </p>
            <h1 className="text-3xl font-bold">
              لوحة إدارة الأخبار
            </h1>
            <p className="mt-2 text-zinc-500">
              إنشاء الأخبار ومراجعتها ونشرها
            </p>
          </div>

        </header>

        <section aria-label="إضافة الأخبار" className="mb-6 grid gap-4 sm:grid-cols-2">
          <Link href="/admin/new" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-amber-400">
            <h2 className="text-xl font-bold">إضافة خبر يدويًا</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">اكتبي الخبر وأضيفي المصدر والصورة، ثم عاينيه واحفظيه كمسودة أو أرسليه للمراجعة.</p>
          </Link>
          <a href="#rss-import" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm transition hover:border-amber-400">
            <h2 className="text-xl font-bold">جلب الأخبار تلقائيًا</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">جلب وتصنيف الأخبار من المصادر المعتمدة عند الطلب، ومنع التكرار وحفظ النتائج كمسودات للمراجعة.</p>
          </a>
        </section>
        <section id="rss-import" aria-label="جلب الأخبار تلقائيًا" className="mb-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-xl font-bold">جلب الأخبار تلقائيًا</h2>
          <p className="text-sm leading-7 text-zinc-600">اختاري مصدرًا مرخّصًا ثم ابدئي الجلب. نستخدم النص المتاح في RSS فقط؛ لا نسحب المقال الكامل أو الصور، ولا ننشر أي خبر تلقائيًا.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
<select
  value={selectedSource}
  onChange={(e) => setSelectedSource(e.target.value)}
  disabled={isPending || isImporting}
  aria-label="اختيار مصدر الأخبار"
  className="rounded-xl border border-zinc-300 bg-white px-4 py-3 text-zinc-900"
>
  {newsSources.map((source) => <option key={source.id} value={source.id}>{source.name}</option>)}
</select>

          <button
  type="button"
  onClick={handleImportRSS}
  disabled={isPending || isImporting || readOnly || !sourceApproved}
  className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black hover:bg-amber-300 disabled:opacity-50"
>
  {isImporting ? "جارٍ جلب الأخبار..." : "جلب الأخبار من RSS كمسودات"}
</button>
          </div>
          {selectedSourceDetails && <a href={selectedSourceDetails.termsUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-sm text-amber-700 underline">شروط استخدام {selectedSourceDetails.name} ↗</a>}
          {!sourceApproved && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm leading-7 text-amber-900">هذا المصدر ينتظر توثيق إذن الاستيراد والترجمة قبل تفعيله. وجود رابط RSS لا يعني السماح بإعادة الاستخدام.</p>}
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard label="إجمالي الأخبار" value={visibleArticles.length} />
          <StatCard label="المنشورة" value={published} />
          <StatCard label="المسودات" value={drafts} />
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-bold">
              قائمة الأخبار
            </h2>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحثي عن خبر..."
              aria-label="البحث عن الأخبار"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-amber-500 sm:max-w-xs"
            />
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
                className={`rounded-lg px-4 py-2 text-sm ${
                  filter === item.value
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
{importMessage && (
  <p
    role="status"
    className="mb-4 rounded-lg bg-green-50 p-4 text-sm text-green-800"
  >
    {importMessage}
  </p>
)}
          {error && (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-red-50 p-4 text-red-700"
            >
              {error}
            </p>
          )}
          {deleteFeedback?.ok && <p role="status" className="mb-4 rounded-lg bg-green-50 p-4 text-green-800">{deleteFeedback.message}</p>}

          <p className="mb-4 text-sm text-zinc-500">
            عدد النتائج: {filteredArticles.length}
          </p>

          {filteredArticles.length === 0 ? (
            <p className="rounded-xl bg-zinc-50 p-8 text-center text-zinc-500">
              لا توجد أخبار مطابقة.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredArticles.map((article) => (
                <article
                  key={article.id}
                  className="rounded-xl border border-zinc-200 p-5"
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        article.status === "PUBLISHED"
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {statusLabels[article.status] ?? article.status}
                    </span>

                    <span className="text-xs text-zinc-500">
                      {article.category}
                    </span>

                    <span className="text-xs text-zinc-500">
                      {article.borough}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold">
                    {article.title}
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-zinc-600">
                    {article.summary || "لا يوجد ملخص."}
                  </p>

                  <p className="mt-3 text-xs text-zinc-400">
                    تاريخ الإضافة:{" "}
                    {new Date(article.createdAt).toLocaleDateString(
                      "ar",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        timeZone: "America/New_York",
                      }
                    )}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-100 pt-4">
                    <Link
                      href={`/admin/edit/${article.id}`}
                      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50"
                    >
                      تعديل الخبر
                    </Link>

                    {article.status === "DRAFT" && <button type="button" disabled={isPending} onClick={() => runAction(article.id, submitArticleForReview)} className="rounded-lg border px-4 py-2">إرسال للمراجعة</button>}
                    {article.status === "IN_REVIEW" && <button type="button" disabled={isPending} onClick={() => runAction(article.id, approveArticle)} className="rounded-lg border px-4 py-2">اعتماد الخبر بعد المراجعة</button>}
                    {article.status === "IN_REVIEW" && <button type="button" disabled={isPending || readOnly} onClick={() => { if (window.confirm("أؤكد أنني راجعت الوقائع ونسب المصدر وحقوق المحتوى. اعتماد الخبر ونشره الآن؟")) runAction(article.id, approveAndPublishArticle); }} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white disabled:opacity-50">اعتماد ونشر الآن</button>}
                    {["IN_REVIEW", "APPROVED"].includes(article.status) && <button type="button" disabled={isPending} onClick={() => runAction(article.id, returnArticleToDraft)} className="rounded-lg border px-4 py-2">إعادة إلى المسودة</button>}
                    {article.status === "APPROVED" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(article.id, publishArticle)
                        }
                        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {isPending && busyId === article.id
                          ? "جارٍ التنفيذ..."
                          : "نشر الآن"}
                      </button>
                    )}

                    {article.status === "PUBLISHED" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(article.id, unpublishArticle)
                        }
                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {isPending && busyId === article.id
                          ? "جارٍ التنفيذ..."
                          : "إلغاء النشر"}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isPending || readOnly}
                      onClick={() =>
                        handleDelete(article.id, article.title)
                      }
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                    >
                      {isPending && busyId === article.id ? "جارٍ الحذف..." : "حذف نهائي"}
                    </button>
                  </div>
                  {deleteFeedback?.id === article.id && !deleteFeedback.ok && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-red-700">{deleteFeedback.message}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-3 text-3xl font-bold">{value}</p>
    </div>
  );
}
