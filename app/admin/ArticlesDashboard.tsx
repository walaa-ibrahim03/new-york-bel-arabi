
"use client";

import { statusLabels } from "../../lib/article-policy";
import Link from "next/link";
import SourceDiscovery from "./SourceDiscovery";
import { useMemo, useState, useTransition } from "react";

import {
  unpublishArticle,
  deleteArticle,
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
  siteOrigin = "",
}: {
  articles: Article[];
  readOnly?: boolean;
  siteOrigin?: string;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [deletedIds, setDeletedIds] = useState<number[]>([]);
  const [deleteFeedback, setDeleteFeedback] = useState<{ id: number; ok: boolean; message: string } | null>(null);
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

        <Link href="/admin/quick" className="mb-5 inline-block rounded-xl bg-amber-600 px-6 py-3 text-lg font-bold text-white">إضافة خبر سريع</Link>
        <section aria-label="إضافة الأخبار" className="mb-6 grid gap-4 sm:grid-cols-2">
          <Link href="/admin/new" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-amber-400">
            <h2 className="text-xl font-bold">إضافة خبر يدويًا</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">اكتبي الخبر وأضيفي المصدر والصورة، ثم عاينيه واحفظيه كمسودة أو انشريه بعد التأكيد.</p>
          </Link>
          <a href="#news-discovery" className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm transition hover:border-amber-400">
            <h2 className="text-xl font-bold">النشر السريع للأخبار</h2>
            <p className="mt-2 text-sm leading-7 text-zinc-600">اختاري المصدر والقسم ثم العناوين المطلوبة لتجهيز مسودات عربية ومراجعتها ونشرها.</p>
          </a>
        </section>
        <SourceDiscovery readOnly={readOnly} origin={siteOrigin} />

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

                    {article.status !== "PUBLISHED" && !readOnly && <Link href={`/admin/edit/${article.id}`} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white">مراجعة ونشر الآن</Link>}

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
