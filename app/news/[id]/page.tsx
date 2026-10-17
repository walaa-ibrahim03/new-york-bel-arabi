
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "../../../lib/prisma";
import type { Metadata } from "next";
import { articleId as parseArticleId, articlePath, newsMetadata, newsSchema, safeJsonLd } from "../../../lib/news-seo";
export const instant = false;
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const articleId = parseArticleId(id);

  if (!articleId) {
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
      id: true, title: true, summary: true, category: true, imageUrl: true, publishedAt: true,
    },
  });

  if (!article) {
    return {
      title: "الخبر غير موجود | نيويورك بالعربي",
      robots: { index: false, follow: false },
    };
  }

  return newsMetadata(article);
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ArticlePage({ params }: PageProps) {
  await connection();

  const { id } = await params;
  const articleId = parseArticleId(id);

  if (
    !articleId
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

  if (`/news/${id}` !== articlePath(article)) permanentRedirect(articlePath(article));
  const related = await prisma.article.findMany({ where: { status: "PUBLISHED", id: { not: article.id }, category: article.category }, orderBy: { publishedAt: "desc" }, take: 4, select: { id: true, title: true } });

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

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(newsSchema(article)) }} />
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
                width={1200} height={675} decoding="async"
                className="aspect-video max-h-[480px] w-full object-cover"
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
        {related.length > 0 && <nav aria-label="أخبار ذات صلة" className="mt-8 rounded-2xl bg-white p-6"><h2 className="font-bold">أخبار ذات صلة</h2><ul>{related.map(item => <li key={item.id} className="mt-3"><Link className="text-amber-800 underline" href={articlePath(item)}>{item.title}</Link></li>)}</ul></nav>}

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
