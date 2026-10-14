
import Link from "next/link";
import { createArticle, updateArticle } from "./editor-actions";

type ArticleData = {
  id: number;
  title: string;
  summary: string;
  content: string;
  category: string;
  borough: string;
  sourceUrl: string;
  imageUrl: string | null;
};

export default function ArticleForm({
  article,
}: {
  article?: ArticleData;
}) {
  const isEditing = Boolean(article);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-900"
    >
      <div className="mx-auto max-w-3xl">
        <Link
          href="/admin"
          className="text-sm font-medium text-amber-700 hover:underline"
        >
          ← العودة إلى لوحة الإدارة
        </Link>

        <h1 className="mt-6 text-3xl font-bold">
          {isEditing ? "تعديل الخبر" : "إضافة خبر جديد"}
        </h1>

        <p className="mt-2 text-zinc-500">
          {isEditing
            ? "عدّلي المعلومات ثم احفظي التغييرات."
            : "أدخلي معلومات الخبر. سيتم حفظه كمسودة."}
        </p>

        <form
          action={isEditing ? updateArticle : createArticle}
          className="mt-8 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          {article && (
            <input type="hidden" name="id" value={article.id} />
          )}

          <Field label="عنوان الخبر">
            <input
              name="title"
              type="text"
              required
              maxLength={180}
              defaultValue={article?.title ?? ""}
              className="input-style"
              placeholder="اكتبي عنوانًا واضحًا للخبر"
            />
          </Field>

          <Field label="ملخص الخبر">
            <textarea
              name="summary"
              required
              maxLength={500}
              rows={3}
              defaultValue={article?.summary ?? ""}
              className="input-style"
              placeholder="ملخص قصير يشرح أهم المعلومات"
            />
          </Field>

          <Field label="المحتوى الكامل">
            <textarea
              name="content"
              required
              maxLength={20000}
              rows={12}
              defaultValue={article?.content ?? ""}
              className="input-style"
              placeholder="اكتبي تفاصيل الخبر هنا..."
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="التصنيف">
              <select
                name="category"
                required
                defaultValue={article?.category ?? "عام"}
                className="input-style"
              >
                <option value="عام">عام</option>
                <option value="أخبار محلية">أخبار محلية</option>
                <option value="تعليم">تعليم</option>
                <option value="اقتصاد">اقتصاد</option>
                <option value="صحة">صحة</option>
                <option value="مجتمع">مجتمع</option>
                <option value="مواصلات">مواصلات</option>
              </select>
            </Field>

            <Field label="المنطقة">
              <select
                name="borough"
                required
                defaultValue={article?.borough ?? "نيويورك"}
                className="input-style"
              >
                <option value="نيويورك">نيويورك</option>
                <option value="مانهاتن">مانهاتن</option>
                <option value="بروكلين">بروكلين</option>
                <option value="كوينز">كوينز</option>
                <option value="برونكس">برونكس</option>
                <option value="ستاتن آيلاند">ستاتن آيلاند</option>
              </select>
            </Field>
          </div>

          <Field label="رابط المصدر الأصلي">
            <input
              name="sourceUrl"
              type="url"
              required
              maxLength={2000}
              defaultValue={article?.sourceUrl ?? ""}
              className="input-style"
              placeholder="https://example.com/news"
              dir="ltr"
            />
          </Field>

          <Field label="رابط الصورة (اختياري)">
            <input
              name="imageUrl"
              type="url"
              maxLength={2000}
              defaultValue={article?.imageUrl ?? ""}
              className="input-style"
              placeholder="https://example.com/image.jpg"
              dir="ltr"
            />
          </Field>

          <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-6">
            <button
              type="submit"
              className="rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-700"
            >
              {isEditing ? "حفظ التعديلات" : "حفظ كمسودة"}
            </button>

            <Link
              href="/admin"
              className="rounded-xl border border-zinc-200 px-6 py-3 text-zinc-600 hover:bg-zinc-50"
            >
              إلغاء
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}
