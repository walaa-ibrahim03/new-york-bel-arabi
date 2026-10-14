
import Link from "next/link";

export default function NotFound() {
  return (
    <main
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 text-zinc-900"
    >
      <div className="max-w-lg text-center">
        <p className="text-7xl font-black text-amber-500">
          404
        </p>

        <h1 className="mt-6 text-3xl font-black">
          الصفحة غير موجودة
        </h1>

        <p className="mt-4 leading-8 text-zinc-600">
          عذرًا، الصفحة التي تبحث عنها غير متاحة.
          ربما تم حذف الخبر أو إلغاء نشره.
        </p>

        <Link
          href="/"
          className="mt-8 inline-flex rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-500 hover:text-black"
        >
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    </main>
  );
}

