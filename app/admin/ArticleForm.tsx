
"use client";

import { categories, normalizeCategory } from "../../lib/categories";
import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import {
  saveArticle,
  translateArticle,
} from "./editor-actions";
import { uploadArticleImage } from "./image-actions";
import ArticlePreview, { type PreviewArticle } from "./ArticlePreview";

type ArticleData = {
  id: number;
  revision: number;
  originalTitle: string | null;
  originalSummary: string | null;
  originalContent: string | null;
  title: string;
  summary: string;
  content: string;
  category: string;
  borough: string;
  sourceUrl: string;
  imageUrl: string | null;
  sourceName?: string | null;
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
  const [sourceName, setSourceName] = useState(article?.sourceName ?? "");
  const [sourceUrl, setSourceUrl] = useState(article?.sourceUrl ?? "");
  const [category, setCategory] = useState(normalizeCategory(article?.category ?? "عام"));
  const [borough, setBorough] = useState(article?.borough ?? "نيويورك");
  const [imageUrl, setImageUrl] = useState(article?.imageUrl ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, startUpload] = useTransition();
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [preview, setPreview] = useState<PreviewArticle | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [saveState, saveAction, isSaving] = useActionState(saveArticle, { error: "" });

  function showPreview() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    const read = (field: string) => String(data.get(field) ?? "");
    setPreview({ title: read("title"), summary: read("summary"), content: read("content"), category: read("category"), sourceName: read("sourceName"), sourceUrl: read("sourceUrl"), imageUrl: read("imageUrl") });
  }

  function handleUpload() {
    if (!imageFile || isUploading || isSaving) return;
    setUploadMessage(""); setUploadError("");
    const form = new FormData(); form.set("image", imageFile);
    startUpload(async () => {
      try {
        const result = await uploadArticleImage(form);
        if (result.ok) { setImageUrl(result.url); setUploadMessage(result.message); setPreview(null); }
        else setUploadError(result.message);
      } catch { setUploadError("تعذّر الاتصال بخدمة رفع الصور. حاولي لاحقًا."); }
    });
  }

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
        void err;

        setError(
          "تعذّر إعداد الترجمة. تأكدي من وجود الأصل وأن الخبر مسودة."
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
          {isEditing ? "تعديل الخبر" : "إضافة خبر يدويًا"}
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
              disabled={isTranslating || isSaving || isUploading || !article.originalTitle}
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
          ref={formRef}
          action={saveAction}
          onChange={() => setPreview(null)}
          className="mt-8 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          {article && <>
            <input type="hidden" name="id" value={article.id} />
            <input type="hidden" name="revision" value={article.revision} />
            <section className="rounded-xl bg-zinc-50 p-4">
              <h2 className="font-bold">النص الأصلي المحفوظ</h2>
              {article.originalTitle ? <div dir="auto" className="whitespace-pre-wrap">
                <h3>{article.originalTitle}</h3><p>{article.originalSummary}</p><p>{article.originalContent}</p>
              </div> : <p>لا يوجد أصل محفوظ لهذا الخبر القديم؛ راجعي رابط المصدر. لن نعتبر النص الحالي أصلًا إنجليزيًا.</p>}
              <p>حفظ التعديلات يعيد الخبر إلى المسودة ويلغي الاعتماد السابق.</p>
            </section>
          </>}

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
            <Field label="القسم">
              <select
                name="category"
                required
                value={category} onChange={event => setCategory(event.target.value)}
                className="input-style"
              >
                {[...new Set([...categories, ...(article ? [normalizeCategory(article.category)] : [])])].map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </Field>

            <Field label="المنطقة">
              <select
                name="borough"
                required
                value={borough} onChange={event => setBorough(event.target.value)}
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

          <Field label="اسم المصدر">
            <input name="sourceName" type="text" maxLength={120} required={!isEditing} value={sourceName} onChange={event => setSourceName(event.target.value)} className="input-style" placeholder="اسم الجهة أو الموقع الناشر" />
          </Field>

          <Field label="رابط المصدر الأصلي">
            <input
              name="sourceUrl"
              type="url"
              required
              maxLength={2000}
              value={sourceUrl} onChange={event => setSourceUrl(event.target.value)}
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
              value={imageUrl}
              onChange={(event) => { setImageUrl(event.target.value); setPreview(null); }}
              dir="ltr"
              className="input-style"
              placeholder="https://example.com/image.jpg"
            />
          </Field>

          <section className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4" aria-label="رفع الصورة الرئيسية">
            <Field label="رفع صورة رئيسية (اختياري)">
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={isUploading || isSaving} onChange={event => {
                const file = event.target.files?.[0] ?? null;
                setUploadError(""); setUploadMessage("");
                if (file && (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024)) { setImageFile(null); setUploadError("اختاري صورة JPEG أو PNG أو WebP حتى 2 ميغابايت."); }
                else setImageFile(file);
              }} className="block w-full text-sm" />
            </Field>
            <p className="text-sm leading-7 text-zinc-600">ارفعي صورة تملكينها أو تملكين إذن استخدامها. تُفحص على الخادم وتُزال بياناتها الوصفية. الصورة المرفوعة تصبح متاحة لمن يملك رابطها؛ لا ترفعي صورًا خاصة.</p>
            <button type="button" onClick={handleUpload} disabled={!imageFile || isUploading || isSaving} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 disabled:opacity-50">{isUploading ? "جارٍ رفع الصورة..." : "رفع الصورة"}</button>
            {uploadMessage && <p role="status" className="text-sm text-green-800">{uploadMessage}</p>}
            {uploadError && <p role="alert" className="text-sm text-red-700">{uploadError}</p>}
          </section>

          <p className="text-sm leading-7 text-zinc-600">حفظ الخبر لا ينشره. الإرسال للمراجعة يحتاج اعتماد المدير قبل أن يصبح النشر متاحًا.</p>
          {saveState.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{saveState.error}</p>}

          <div className="flex flex-wrap gap-3 border-t border-zinc-100 pt-6">
            <button
              type="submit"
              name="intent" value="draft"
              disabled={isTranslating || isUploading || isSaving}
              className="rounded-xl bg-zinc-900 px-6 py-3 font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {isSaving ? "جارٍ الحفظ..." : isEditing ? "حفظ التعديلات كمسودة" : "حفظ كمسودة"}
            </button>
            <button type="submit" name="intent" value="review" disabled={isTranslating || isUploading || isSaving} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-black disabled:opacity-50">حفظ وإرسال للمراجعة</button>
            <button type="button" onClick={showPreview} className="rounded-xl border border-zinc-300 px-5 py-3">معاينة قبل النشر</button>

            <Link
              href="/admin"
              className="rounded-xl border border-zinc-200 px-6 py-3 text-zinc-600 hover:bg-zinc-50"
            >
              إلغاء
            </Link>
          </div>
        </form>
        {preview && <ArticlePreview article={preview} />}
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
