
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "../../../lib/prisma";
import type { Metadata } from "next";
export const instant = false;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const articleId = Number(id);

  if (!Number.isSafeInteger(articleId) || articleId <= 0) {
    return {
      title: "الخبر غير موجود | نيويورك بالعربي",
      robots: { index: false, follow: false },
    };
  }

  const article = await prisma.article.findFirst({
    where: {
      id: articleId,
      status: "PUBLISHED",
    },
    select: {
      title: true,
      summary: true,
    },
  });

  if (!article) {
    return {
      title: "الخبر غير موجود | نيويورك بالعربي",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: `${article.title} | نيويورك بالعربي`,
    description: article.summary,
    openGraph: {
      title: article.title,
      description: article.summary,
      type: "article",
    },
  };
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ArticlePage({ params }: PageProps) {
  await connection();

  const { id } = await params;
  const articleId = Number(id);

  if (
    !Number.isSafeInteger(articleId) ||
    articleId <= 0
  ) {
    notFound();
  }

  const article = await prisma.article.findFirst({
    where: {
      id: articleId,
      status: "PUBLISHED",
    },
  });

  if (!article) {
    notFound();
  }

  const paragraphs = article.content
    .split(/\n\s*\n/)
    .filter((paragraph) => paragraph.trim());

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-zinc-50 text-zinc-900"
    >
      <div className="mx-auto max-w-4xl px-5 py-10">
        <Link
          href="/"
          className="text-sm font-semibold text-amber-700 hover:underline"
        >
          ← العودة إلى الرئيسية
        </Link>

        <article className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="p-6 sm:p-10">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                {article.category}
              </span>

              <span className="text-sm text-zinc-500">
                {article.borough}
              </span>
            </div>

            <h1 className="text-3xl font-black leading-relaxed sm:text-4xl">
              {article.title}
            </h1>

            <p className="mt-5 text-lg leading-9 text-zinc-600">
              {article.summary}
            </p>

            {article.publishedAt && (
              <p className="mt-5 text-sm text-zinc-400">
                تاريخ النشر:{" "}
                {article.publishedAt.toLocaleDateString(
                  "ar",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: "America/New_York",
                  }
                )}
              </p>
            )}
          </div>

          {article.imageUrl && (
            <div className="bg-zinc-100">
              {/* External image supplied by the editor */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={article.imageUrl}
                alt={article.title}
                className="max-h-[480px] w-full object-cover"
              />
            </div>
          )}

          <div className="px-6 py-10 sm:px-10">
            <div className="space-y-6 text-lg leading-10 text-zinc-800">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph.trim()}
                </p>
              ))}
            </div>

            <div className="mt-12 border-t border-zinc-200 pt-6">
              <h2 className="font-bold">
                المصدر الأصلي
              </h2>

              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block break-all text-sm text-amber-700 underline"
              >
                {article.sourceName || "زيارة المصدر الأصلي"} ↗
              </a>
            </div>
          </div>
        </article>

        <div className="mt-8">
          <Link
            href="/#latest"
            className="inline-flex rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            تصفح المزيد من الأخبار
          </Link>
        </div>
      </div>
    </main>
  );
}
