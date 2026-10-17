
import Link from "next/link";
import { connection } from "next/server";
import { articlePath } from "../lib/news-seo";
import { trendingNews } from "../lib/news-trends";
import { normalizeCategory } from "../lib/categories";
import { prisma } from "../lib/prisma";

export const instant = false;

const sections = [
  {
    id: "immigration",
    title: "الهجرة والإقامة",
    description: "الجنسية، الإقامة، التأشيرات، اللجوء ولمّ الشمل",
    categories: ["الهجرة", "الهجرة والإقامة"],
    symbol: "◈",
  },
  {
    id: "benefits",
    title: "المساعدات الحكومية",
    description: "SNAP، Medicaid، دعم السكن والمساعدات المالية",
    categories: ["المساعدات الحكومية", "السكن", "سكن واقتصاد"],
    symbol: "✦",
  },
  {
    id: "community",
    title: "الجالية العربية والمسلمة",
    description: "أخبار الجالية، المؤسسات، الفعاليات والمبادرات",
    categories: ["الجالية", "الجالية العربية والمسلمة"],
    symbol: "◆",
  },
  {
    id: "family",
    title: "المدارس والعائلة",
    description: "أخبار المدارس، برامج الأطفال والخدمات العائلية",
    categories: ["تعليم", "المدارس والعائلة"],
    symbol: "✳",
  },
  { id: "us", title: "أخبار أمريكا", description: "الأحداث والسياسات والخدمات في الولايات المتحدة", categories: ["أخبار أمريكا"], symbol: "◉" },
  { id: "world", title: "أخبار العالم", description: "تغطية عربية موجزة للأحداث العالمية", categories: ["أخبار العالم"], symbol: "◎" },
  { id: "trending", title: "ترند", description: "موضوعات الساعة التي يختارها المحرر", categories: ["ترند"], symbol: "↗" },
];

type NewsItem = {
  id: number;
  title: string;
  summary: string;
  category: string;
  borough: string;
  imageUrl: string | null;
  publishedAt: Date | null;
};

function ArticleCard({ article }: { article: NewsItem }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white transition-shadow hover:shadow-md">
      {article.imageUrl ? (
        <div className="h-44 overflow-hidden bg-zinc-100">
          {/* صورة تستخدم فقط إذا أضيف رابطها بعد مراجعة حقوق الاستخدام */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.imageUrl}
            alt={article.title}
            className="h-full w-full object-cover"
            loading="lazy" width={640} height={360} decoding="async"
          />
        </div>
      ) : (
        <div className="flex h-32 items-center justify-center bg-slate-100">
          <span className="text-2xl font-black text-slate-400">
            نيويورك بالعربي
          </span>
        </div>
      )}

      <div className="p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-900">
            {article.category}
          </span>
          <span className="text-zinc-500">{article.borough}</span>
        </div>

        <h3 className="text-lg font-bold leading-8 transition-colors group-hover:text-amber-700">
          <Link href={articlePath(article)} dir="auto">
            {article.title}
          </Link>
        </h3>

        {article.summary && (
          <p
            dir="auto"
            className="mt-3 line-clamp-3 text-sm leading-7 text-zinc-600"
          >
            {article.summary}
          </p>
        )}

        <Link
          href={articlePath(article)}
          className="mt-5 inline-block text-sm font-bold text-amber-700 hover:underline"
        >
          اقرأ الخبر ←
        </Link>
      </div>
    </article>
  );
}

export default async function Home() {
  await connection();
  const articles: NewsItem[] = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
    },
    take: 200,
    orderBy: [
      { publishedAt: "desc" },
      { createdAt: "desc" },
    ],
    select: {
      id: true,
      title: true,
      summary: true,
      category: true,
      borough: true,
      imageUrl: true,
      publishedAt: true,
    },
  });

  const trendItems = trendingNews(articles);
  const latestPublished = articles.find(a => a.publishedAt)?.publishedAt;
  const priorityCategories = sections.filter(section => !["us", "world", "trending"].includes(section.id)).flatMap(
    (section) => section.categories
  );

  const featured =
    articles.find(article => article.borough === "نيويورك") ?? articles.find((article) =>
      priorityCategories.includes(normalizeCategory(article.category))
    ) ?? articles[0];

  const latestArticles = articles
    .filter((article) => article.id !== featured?.id)
    .slice(0, 6);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f8fafc] text-slate-900"
    >
      {/* Top bar */}
      <div className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-xs sm:px-8">
          <span>نيويورك بالعربي</span>
          <span className="text-slate-300">
            أخبار مدينتك، خدمات تهمك، وقصص من جاليتنا
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-black tracking-tight">
              نيويورك{" "}
              <span className="text-amber-500">بالعربي</span>
            </span>
            <span className="mt-2 block text-sm text-slate-500">
              منصتك العربية لأخبار نيويورك
            </span>
          </Link>
        </div>

        <nav
          aria-label="القائمة الرئيسية"
          className="border-t border-slate-100"
        >
          <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-3 px-5 py-4 text-sm font-semibold sm:px-8">
            <a href="#home" className="hover:text-amber-700">
              الرئيسية
            </a>
            <a href="#immigration" className="hover:text-amber-700">
              الهجرة
            </a>
            <a href="#benefits" className="hover:text-amber-700">
              المساعدات
            </a>
            <a href="#community" className="hover:text-amber-700">
              الجالية
            </a>
            <a href="#family" className="hover:text-amber-700">
              المدارس والعائلة
            </a>
            <a href="#latest" className="hover:text-amber-700">
              آخر الأخبار
            </a>
          </div>
        </nav>
      </header>

      <main
        id="home"
        className="mx-auto max-w-7xl px-5 pb-20 sm:px-8"
      >
        {/* Featured */}
        <section className="grid gap-6 py-10 lg:grid-cols-[1.65fr_1fr]">
          <div className="flex min-h-[350px] flex-col justify-end rounded-3xl bg-slate-950 p-7 text-white sm:p-10">
            <span className="mb-5 w-fit rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-slate-950">
              {featured ? "أبرز الأخبار" : "مرحبًا بكم"}
            </span>

            {featured ? (
              <>
                <h1
                  dir="auto"
                  className="text-2xl font-black leading-relaxed sm:text-4xl"
                >
                  {featured.title}
                </h1>

                <p
                  dir="auto"
                  className="mt-4 line-clamp-3 text-sm leading-8 text-slate-300"
                >
                  {featured.summary}
                </p>

                <Link
                  href={articlePath(featured)}
                  className="mt-7 w-fit rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-black hover:bg-amber-300"
                >
                  اقرأ التفاصيل ←
                </Link>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-black leading-relaxed sm:text-4xl">
                  أخبار نيويورك التي تهمك، بالعربي
                </h1>

                <p className="mt-5 max-w-xl text-sm leading-8 text-slate-300">
                  نتابع أخبار الهجرة والمساعدات الحكومية والجالية
                  العربية والمسلمة، إلى جانب المدارس والخدمات
                  والأحداث المهمة في نيويورك.
                </p>

                <p className="mt-5 text-sm text-amber-300">
                  لا توجد أخبار منشورة بعد.
                </p>
              </>
            )}
          </div>

          {/* Focus areas */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="mb-6">
              <h2 className="text-xl font-black">
                المواضيع التي تهمنا
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                تابع الأخبار حسب اهتماماتك.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-4 py-4 hover:text-amber-700"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl text-amber-800">
                    {section.symbol}
                  </span>
                  <span>
                    <span className="block font-bold">
                      {section.title}
                    </span>
                    <span className="mt-1 block text-xs leading-6 text-slate-500">
                      {section.description}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </aside>
        </section>

        <section aria-label="الأكثر تداولًا الآن" className="my-8 rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-2xl font-black">الأكثر تداولًا الآن</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">ترتيب محلي بحسب تكرار الموضوعات في أخبارنا المنشورة خلال 24 ساعة، مع اختيارات المحرر في قسم ترند؛ ليس قياسًا لتداول الشبكات العالمية.</p>
          {latestPublished && <p className="mt-2 text-xs text-slate-500">آخر تحديث للأخبار: <time dateTime={latestPublished.toISOString()}>{latestPublished.toLocaleString("ar", { timeZone: "America/New_York" })}</time></p>}
          {trendItems.length ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">{trendItems.map(({ article, mentions }) => <li key={article.id}><Link className="font-bold text-amber-800 underline" href={articlePath(article)}>{article.title}</Link><p className="text-xs text-slate-500">{mentions > 1 ? `${mentions} تغطيات لدينا` : "اختيار المحرر"}</p></li>)}</ul> : <p className="mt-4 text-sm">لا توجد إشارات تداول كافية حاليًا. تابعي أحدث الأخبار أدناه.</p>}
        </section>
        {/* Quick topic tiles */}
        <section
          aria-label="أقسام الموقع"
          className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
            >
              <span className="text-3xl text-amber-600">
                {section.symbol}
              </span>
              <h2 className="mt-4 text-lg font-black">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                {section.description}
              </p>
              <span className="mt-4 block text-sm font-semibold text-amber-700">
                تصفح القسم ←
              </span>
            </a>
          ))}
        </section>

        {/* Sections - published articles only */}
        {sections.map((section) => {
          const sectionArticles = articles
            .filter((article) =>
              section.categories.includes(normalizeCategory(article.category))
            )
            .slice(0, 3);

          return (
            <section
              id={section.id}
              key={section.id}
              className="scroll-mt-8 py-10"
            >
              <div className="mb-6 border-b border-slate-200 pb-5">
                <div className="mb-3 h-1 w-12 rounded-full bg-amber-400" />
                <h2 className="text-2xl font-black sm:text-3xl">
                  {section.title}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {section.description}
                </p>
              </div>

              {sectionArticles.length ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {sectionArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-9 text-center text-sm text-slate-500">
                  لا توجد أخبار منشورة في هذا القسم حاليًا.
                </div>
              )}
            </section>
          );
        })}

        {/* Latest */}
        <section id="latest" className="scroll-mt-8 py-10">
          <div className="mb-6 border-b border-slate-200 pb-5">
            <div className="mb-3 h-1 w-12 rounded-full bg-amber-400" />
            <h2 className="text-2xl font-black sm:text-3xl">
              آخر أخبار نيويورك
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              أحدث الأخبار المنشورة من مختلف الأقسام.
            </p>
          </div>

          {latestArticles.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-9 text-center text-sm text-slate-500">
              لا توجد أخبار إضافية منشورة حاليًا.
            </div>
          )}
        </section>

        {/* Editorial note */}
        <section className="rounded-2xl bg-amber-50 p-6 text-sm leading-8 text-amber-950">
          <h2 className="font-black">عن نيويورك بالعربي</h2>
          <p className="mt-2">
            منصة إخبارية عربية تهتم بأخبار الهجرة والمساعدات
            والجالية العربية والمسلمة والخدمات التي تهم سكان
            نيويورك. نعمل على تقديم المعلومات باللغة العربية،
            مع الإشارة إلى المصادر الأصلية للأخبار.
          </p>
        </section>
      </main>

      <footer className="bg-slate-950 text-white"><div className="mx-auto max-w-7xl px-5 pt-6"><Link className="underline" href="/about">عن الموقع والسياسة التحريرية</Link></div>
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-9 sm:px-8">
          <div>
            <p className="text-xl font-black">
              نيويورك{" "}
              <span className="text-amber-400">بالعربي</span>
            </p>
            <p className="mt-2 text-sm text-slate-400">
              أخبار مدينتك، خدمات تهمك، وقصص من جاليتنا
            </p>
          </div>
          <p className="text-xs text-slate-400">
            © 2026 نيويورك بالعربي. جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
