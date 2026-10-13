
"use client";

import { useMemo, useState, useTransition } from "react";
import {
  publishArticle,
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

type Props = {
  articles: Article[];
};

type Filter = "ALL" | "DRAFT" | "PUBLISHED";

export default function ArticlesDashboard({ articles }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const total = articles.length;

  const published = articles.filter(
    (article) => article.status === "PUBLISHED"
  ).length;

  const drafts = articles.filter(
    (article) => article.status === "DRAFT"
  ).length;

  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesSearch = article.title
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const matchesStatus =
        filter === "ALL" || article.status === filter;

      return matchesSearch && matchesStatus;
    });
  }, [articles, search, filter]);

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
        setError("تعذر تنفيذ العملية. يرجى المحاولة مرة أخرى.");
      } finally {
        setBusyId(null);
      }
    });
  }

  function handleDelete(id: number, title: string) {
    if (isPending) return;

    const confirmed = window.confirm(
      `هل أنتِ متأكدة من حذف الخبر نهائيًا؟\n\n${title}\n\nلا يمكن التراجع عن الحذف.`
    );

    if (!confirmed) return;

    runAction(id, deleteArticle);
  }

  const filters: { label: string; value: Filter }[] = [
    { label: "جميع الأخبار", value: "ALL" },
    { label: "المسودات", value: "DRAFT" },
    { label: "المنشورة", value: "PUBLISHED" },
  ];

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900 sm:px-8"
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <p className="mb-2 text-sm font-semibold text-amber-600">
            NEW YORK BEL ARABI
          </p>

          <h1 className="text-3xl font-bold">
            لوحة إدارة الأخبار
          </h1>

          <p className="mt-2 text-zinc-500">
            مراجعة ونشر وإدارة أخبار نيويورك بالعربي
          </p>
        </header>

        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="إجمالي الأخبار"
            value={total}
            color="text-zinc-900"
          />

          <StatCard
            label="الأخبار المنشورة"
            value={published}
            color="text-green-700"
          />

          <StatCard
            label="المسودات"
            value={drafts}
            color="text-amber-600"
          />
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-bold">
              إدارة الأخبار
            </h2>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ابحثي عن عنوان خبر..."
              aria-label="البحث عن الأخبار"
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-amber-500 lg:max-w-sm"
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilter(item.value)}
                aria-pressed={filter === item.value}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  filter === item.value
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {error && (
            <p
              role="alert"
              className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <p className="mb-4 text-sm text-zinc-500">
            عدد النتائج: {filteredArticles.length}
          </p>

          {filteredArticles.length === 0 ? (
            <div className="rounded-xl bg-zinc-50 p-10 text-center text-zinc-500">
              لا توجد أخبار مطابقة للبحث.
            </div>
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
                          : article.status === "DRAFT"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {article.status === "PUBLISHED"
                        ? "منشور"
                        : article.status === "DRAFT"
                          ? "مسودة"
                          : article.status}
                    </span>

                    <span className="text-xs text-zinc-500">
                      {article.category}
                    </span>

                    <span className="text-xs text-zinc-400">
                      {article.borough}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold">
                    {article.title}
                  </h3>

                  <p className="mt-2 text-sm leading-7 text-zinc-600">
                    {article.summary || "لا يوجد ملخص لهذا الخبر."}
                  </p>

                  <div className="mt-4 text-xs text-zinc-400">
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
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3 border-t border-zinc-100 pt-4">
                    {article.status === "DRAFT" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(article.id, publishArticle)
                        }
                        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
                      >
                        {isPending && busyId === article.id
                          ? "جارٍ التنفيذ..."
                          : "نشر الخبر"}
                      </button>
                    )}

                    {article.status === "PUBLISHED" && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(article.id, unpublishArticle)
                        }
                        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                      >
                        {isPending && busyId === article.id
                          ? "جارٍ التنفيذ..."
                          : "إلغاء النشر"}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        handleDelete(article.id, article.title)
                      }
                      className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      حذف نهائي
                    </button>
                  </div>
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
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>

      <p className={`mt-3 text-3xl font-bold ${color}`}>
        {value}
      </p>
    </div>
  );
}
