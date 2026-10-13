
import Link from "next/link";
import { latestNews } from "../data/news";
import { prisma } from "../lib/prisma";


const boroughs = [
  { name: "مانهاتن", english: "Manhattan" },
  { name: "بروكلين", english: "Brooklyn" },
  { name: "كوينز", english: "Queens" },
  { name: "برونكس", english: "Bronx" },
  { name: "ستاتن آيلاند", english: "Staten Island" },
];

const navigation = [
  { name: "الرئيسية", href: "#home" },
  { name: "آخر الأخبار", href: "#latest" },
  { name: "مناطق نيويورك", href: "#boroughs" },
  { name: "الاقتصاد", href: "#economy" },
  { name: "المجتمع العربي", href: "#community" },
];
  export const instant = false;
  export default async function Home() {
    const publishedArticles = await prisma.article.findMany({
  where: {
    status: "PUBLISHED",
  },
  orderBy: {
    publishedAt: "desc",
  },
});
const databaseNews = publishedArticles.map((article) => ({
  id: article.id,
  category: article.category,
  borough: article.borough,
  title: article.title,
  summary: article.summary,
  color: article.color,
  image: article.imageUrl,
}));

  return (
    <div
      id="home"
      dir="rtl"
      className="min-h-screen bg-[#fafafa] text-zinc-900"
    >
      {/* Top bar */}
      <div className="bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2.5 text-xs sm:px-8">
          <span>نيويورك بالعربي | أخبار مدينتنا... بلغتنا</span>
          <span className="hidden text-zinc-400 sm:inline">
            منصة إخبارية عربية مستقلة
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
          <Link
            href="/"
            className="flex w-fit items-center gap-3"
            aria-label="نيويورك بالعربي - الرئيسية"
          >
            <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-3xl font-black text-black shadow-sm">
              ن
            </div>

            <div>
              <div className="text-2xl font-black tracking-tight sm:text-3xl">
                نيويورك{" "}
                <span className="text-amber-500">بالعربي</span>
              </div>
              <p className="mt-0.5 text-xs text-zinc-500">
                أخبار مدينتنا... بلغتنا
              </p>
            </div>
          </Link>

          <nav
            aria-label="القائمة الرئيسية"
            className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold"
          >
            {navigation.map((item, index) => (
              <a
                key={item.name}
                href={item.href}
                className={`border-b-2 pb-1 transition-colors hover:text-amber-600 ${
                  index === 0
                    ? "border-amber-400 text-black"
                    : "border-transparent text-zinc-600"
                }`}
              >
                {item.name}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        {/* Notice */}
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
          هذه نسخة تجريبية لتصميم الموقع. العناوين أدناه أمثلة
          توضيحية وليست أخبارًا منشورة أو مؤكدة.
        </div>

        {/* Hero */}
        <section
          aria-labelledby="featured-heading"
          className="grid gap-5 py-8 lg:grid-cols-[minmax(0,1.8fr)_minmax(280px,1fr)]"
        >
<div
  className="relative flex min-h-[370px] flex-col justify-end overflow-hidden rounded-3xl bg-zinc-950 bg-cover bg-center p-7 text-white shadow-sm sm:p-10"
  style={{
    backgroundImage:
      "linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.15)), url('/brooklyn-bridge.jpg')",
  }}
>            <div
              aria-hidden="true"
              className="absolute -left-16 -top-16 h-64 w-64 rounded-full bg-amber-400/15 blur-3xl"
            />

            <div className="relative z-10">
              <span className="inline-flex rounded-full bg-amber-400 px-4 py-1.5 text-xs font-bold text-black">
                أبرز الأخبار
              </span>

              <h1
                id="featured-heading"
                className="mt-5 max-w-2xl text-3xl font-black leading-[1.5] sm:text-4xl"
              >
                نيويورك بالعربي
                <span className="mt-1 block text-amber-400">
                  نافذتك على أخبار المدينة
                </span>
              </h1>

              <p className="mt-5 max-w-xl text-sm leading-8 text-zinc-300 sm:text-base">
                الأخبار المحلية، المواصلات، الاقتصاد، المجتمع العربي
                والخدمات التي تهم سكان نيويورك، في مكان واحد
                وباللغة العربية.
              </p>

              <a
                href="#latest"
                className="mt-7 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-400 px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-amber-300"
              >
                تصفح آخر الأخبار ←
              </a>
            </div>
          </div>

          {/* Side panel */}
          <aside className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">على رادار نيويورك</h2>
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            </div>

            <p className="mt-2 text-sm text-zinc-500">
              الموضوعات التي نتابعها
            </p>

            <div className="mt-6 divide-y divide-zinc-100">
              {latestNews.slice(0, 4).map((news, index) => (
                <div key={news.id} className="flex gap-4 py-4">
                  <span className="text-2xl font-black text-amber-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <div>
                    <p className="text-xs font-semibold text-zinc-500">
                      {news.category}
                    </p>
                    <h3 className="mt-1 text-sm font-bold leading-7">
                      {news.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>

        {/* Latest news */}
        <section id="latest" className="scroll-mt-8 py-8">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <div className="mb-2 h-1 w-12 rounded-full bg-amber-400" />
              <h2 className="text-2xl font-black sm:text-3xl">
                آخر الأخبار
              </h2>
            </div>
            <span className="text-xs text-zinc-500">
              محتوى تجريبي
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {databaseNews.map((news) => (
              <article
                key={news.id}
                className="group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className={`relative h-48 overflow-hidden ${news.color}`}>
  {"image" in news && news.image ? (
    <img
      src={news.image}
      alt={news.title}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full items-center justify-center text-sm text-zinc-500">
      صورة توضيحية للخبر
    </div>
  )}
</div>

                <div className="p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                      {news.category}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {news.borough}
                    </span>
                  </div>

                  <h3 className="text-lg font-black leading-8 transition-colors group-hover:text-amber-700">
                    {news.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-zinc-600">
                    {news.summary}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Boroughs */}
        <section id="boroughs" className="scroll-mt-8 py-10">
          <div className="mb-7">
            <div className="mb-2 h-1 w-12 rounded-full bg-amber-400" />
            <h2 className="text-2xl font-black sm:text-3xl">
              أخبار مناطق نيويورك
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              اكتشف أخبار المناطق الخمس في مدينة نيويورك.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {boroughs.map((borough) => (
              <div
                key={borough.english}
                className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl text-amber-700">
                  ◈
                </div>
                <h3 className="text-lg font-black">
                  {borough.name}
                </h3>
                <p className="mt-1 text-sm text-zinc-500" dir="ltr">
                  {borough.english}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Topic sections */}
        <section className="grid gap-6 py-8 md:grid-cols-2">
          <div
            id="economy"
            className="scroll-mt-8 rounded-3xl border border-zinc-200 bg-white p-8"
          >
            <span className="text-sm font-bold text-amber-700">
              اقتصاد وأعمال
            </span>
            <h2 className="mt-3 text-2xl font-black">
              الاقتصاد والوظائف
            </h2>
            <p className="mt-4 text-sm leading-8 text-zinc-600">
              أخبار سوق العمل والأعمال والعقارات والتطورات
              الاقتصادية التي تؤثر على سكان نيويورك.
            </p>
          </div>

          <div
            id="community"
            className="scroll-mt-8 rounded-3xl border border-zinc-200 bg-white p-8"
          >
            <span className="text-sm font-bold text-amber-700">
              مجتمعنا
            </span>
            <h2 className="mt-3 text-2xl font-black">
              المجتمع العربي
            </h2>
            <p className="mt-4 text-sm leading-8 text-zinc-600">
              أخبار الجالية العربية والفعاليات المحلية والمبادرات
              والخدمات التي تهم المجتمع العربي في نيويورك.
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 px-5 py-9 sm:px-8 md:flex-row md:items-center">
          <div>
            <p className="text-lg font-black">
              نيويورك <span className="text-amber-400">بالعربي</span>
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              أخبار مدينتنا... بلغتنا
            </p>
          </div>

          <p className="text-xs text-zinc-400">
            © 2026 نيويورك بالعربي.
            جميع الحقوق محفوظة.
          </p>
        </div>
      </footer>
    </div>
  );
}
