
"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  createArticle,
  updateArticle,
  translateArticle,
} from "./editor-actions";

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

  const [title, setTitle] = useState(article?.title ?? "");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [content, setContent] = useState(article?.content ?? "");

  const [isTranslating, startTranslation] = useTransition();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function handleTranslate() {
    if (!article || isTranslating) return;

    const confirmed = window.confirm(
      "سيتم استبدال العنوان والملخص والمحتوى الموجودين في الحقول بمسودة عربية. هل تريدين المتابعة؟"
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    startTranslation(async () => {
      try {
        const result = await translateArticle(article.id);

        setTitle(result.title);
        setSummary(result.summary);
        setContent(result.content);

        setMessage(
          "تم إعداد المسودة العربية. راجعي المعلومات قبل الحفظ."
        );
      } catch (err) {
        console.error("Translation failed:", err);

        setError(
          "فشلت الترجمة. راجعي سجل Terminal لمعرفة السبب."
        );
      }
    });
  }

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

        {article && (
          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <h2 className="text-lg font-bold">
              إعداد مسودة عربية بالذكاء الاصطناعي
            </h2>

            <p className="mt-2 text-sm text-zinc-600">
              سيُنشئ الذكاء الاصطناعي مسودة عربية من معلومات
              الخبر المتاحة. يجب مراجعتها قبل الحفظ والنشر.
            </p>

            <button
              type="button"
              onClick={handleTranslate}
              disabled={isTranslating}
              className="mt-4 rounded-xl bg-amber-400 px-5 py-3 font-semibold text-black hover:bg-amber-300 disabled:opacity-50"
            >
              {isTranslating
                ? "جارٍ إعداد الترجمة..."
                : "ترجمة الخبر بالذكاء الاصطناعي"}
            </button>

            {message && (
              <p role="status" className="mt-3 text-sm text-green-800">
                {message}
              </p>
            )}

            {error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </section>
        )}

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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              dir="auto"
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
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              dir="auto"
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
              value={content}
              onChange={(e) => setContent(e.target.value)}
              dir="auto"
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
                <option value="الهجرة والإقامة">الهجرة والإقامة</option>
<option value="المساعدات الحكومية">المساعدات الحكومية</option>
                <option value="أخبار محلية">أخبار محلية</option>
                <option value="سكن واقتصاد">سكن واقتصاد</option>
                <option value="تعليم">تعليم</option>
                <option value="اقتصاد">اقتصاد</option>
                <option value="صحة">صحة</option>
                <option value="مجتمع">مجتمع</option>
                <option value="مواصلات">مواصلات</option>
                <option value="الجالية العربية والمسلمة">
                  الجالية العربية والمسلمة
                </option>
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
              dir="ltr"
              className="input-style"
              placeholder="https://example.com/news"
            />
          </Field>

          <Field label="رابط الصورة (اختياري)">
            <input
              name="imageUrl"
              type="url"
              maxLength={2000}
              defaultValue={article?.imageUrl ?? ""}
              dir="ltr"
              className="input-style"
              placeholder="https://example.com/image.jpg"
            />
          </Field>

          <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-6">
            <button
              type="submit"
              disabled={isTranslating}
              className="rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
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
