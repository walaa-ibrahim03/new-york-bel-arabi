
"use client";

import { categories, normalizeCategory } from "../../lib/categories";
import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import {
  saveArticle,
} from "./editor-actions";
import { prepareEditorText } from "./assistant-actions";
import { detectNewsLanguage, type EditorText, type EditorOperation } from "../../lib/editor-assistant";
import { prepareFactualBrief } from "./brief-actions";
import { newsMetadata, articlePath, focusKeywords } from "../../lib/news-seo";
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
  const hasOriginal = Boolean(article?.originalTitle || article?.originalSummary || article?.originalContent);

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

  const [facts, setFacts] = useState("");
  const [factsConfirmed, setFactsConfirmed] = useState(false);
  const seo = newsMetadata({ id: article?.id ?? 1, title, summary, category, imageUrl, publishedAt: null });
  function handleBrief() {
    if (assistantBusy.current || isTranslating || isSaving || isUploading) return;
    const key = JSON.stringify({ facts, sourceName, sourceUrl, confirmed: factsConfirmed });
    const original = { title: facts.split("\n")[0].slice(0, 180), summary: "", content: facts };
    setError(""); setMessage(""); setPreview(null);
    if (lastAssistant.current?.key === key) {
      setAssistantPreview({ ...lastAssistant.current.draft }); setPreviewOriginal(original);
      setMessage("أُعيدت المعاينة السابقة دون استدعاء مدفوع جديد."); return;
    }
    assistantBusy.current = true;
    startTranslation(async () => {
      try {
        const result = await prepareFactualBrief({ facts, sourceName, sourceUrl, confirmed: factsConfirmed });
        if (!result.ok) { setError(result.message); return; }
        lastAssistant.current = { key, draft: result.draft };
        setAssistantPreview({ ...result.draft }); setPreviewOriginal(original);
      } catch { setError("تعذر إعداد الموجز؛ لم يتم الحفظ أو النشر."); }
      finally { assistantBusy.current = false; }
    });
  }

  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [assistantPreview, setAssistantPreview] = useState<EditorText | null>(null);
  const [pendingOriginal, setPendingOriginal] = useState("");
  const [previewOriginal, setPreviewOriginal] = useState<EditorText | null>(null);
  const assistantBusy = useRef(false);
  const lastAssistant = useRef<{ key: string; draft: EditorText } | null>(null);
  const language = detectNewsLanguage(`${title} ${summary} ${content}`);
  const [seoPreview, setSeoPreview] = useState<{ title: string; description: string; keywords: string[] } | null>(null);
  function handleAssistant(operation: EditorOperation) {
    if (assistantBusy.current || isTranslating || isSaving || isUploading) return;
    const text = { title, summary, content };
    const key = JSON.stringify({ text, operation, sourceUrl, rightsConfirmed, id: article?.id, revision: article?.revision });
    setMessage(""); setError(""); setPreview(null);
    if (lastAssistant.current?.key === key) {
      setAssistantPreview({ ...lastAssistant.current.draft }); setPreviewOriginal(text);
      setMessage("أُعيدت المعاينة السابقة دون استدعاء مدفوع جديد."); return;
    }
    assistantBusy.current = true;
    startTranslation(async () => {
      try {
        const result = await prepareEditorText({ text, operation, sourceUrl, rightsConfirmed, id: article?.id, revision: article?.revision });
        if (!result.ok) { setError(result.message); return; }
        lastAssistant.current = { key, draft: result.draft };
        setAssistantPreview({ ...result.draft }); setPreviewOriginal(text);
      } catch { setError("تعذر إعداد المعاينة. لم يتغير النص أو يُحفظ شيء."); }
      finally { assistantBusy.current = false; }
    });
  }
  function acceptAssistant() {
    if (!assistantPreview || !previewOriginal) return;
    if (!hasOriginal && !pendingOriginal) setPendingOriginal(JSON.stringify({ ...previewOriginal, sourceUrl: sourceUrl.trim() }));
    setTitle(assistantPreview.title); setSummary(assistantPreview.summary); setContent(assistantPreview.content);
    setAssistantPreview(null); setPreview(null); setMessage("نُقلت النتيجة إلى الحقول القابلة للتعديل. الأصل محفوظ في هذه الجلسة وسيُحفظ منفصلًا عند الحفظ الصريح فقط.");
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

        <section className="mt-6 space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-label="مساعد تحرير الأخبار">
          <h2 className="text-lg font-bold">مساعد تحرير الأخبار</h2>
          <p className="text-sm">{language === "en" ? "النص يبدو إنجليزيًا؛ نقترح الترجمة إلى العربية." : language === "ar" ? "النص يبدو عربيًا؛ نقترح التلخيص والتبسيط." : "النص مختلط أو غير كافٍ؛ اختاري العملية يدويًا."} الاقتراح لا يشغّل الذكاء الاصطناعي تلقائيًا.</p>
          <label className="flex items-start gap-2 text-sm leading-7"><input type="checkbox" disabled={isTranslating} checked={rightsConfirmed} onChange={e => setRightsConfirmed(e.target.checked)} />النص من كتابتي أو لدي إذن يسمح بترجمته أو تلخيصه. للنصوص المحمية استخدمي موجز الوقائع أدناه.</label>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => handleAssistant("translate")} disabled={!rightsConfirmed || isTranslating || isSaving || isUploading} className="rounded-xl bg-amber-400 px-4 py-3 font-bold disabled:opacity-50">ترجمة إلى العربية</button>
            <button type="button" onClick={() => handleAssistant("simplify")} disabled={!rightsConfirmed || isTranslating || isSaving || isUploading} className="rounded-xl bg-zinc-900 px-4 py-3 font-bold text-white disabled:opacity-50">تلخيص وتبسيط بالذكاء الاصطناعي</button>
            <button type="button" disabled={!title.trim() || !summary.trim() || isTranslating || isSaving} onClick={() => setSeoPreview({ title: title.trim().replace(/\s+/g, " ").slice(0, 75), description: summary.trim().replace(/\s+/g, " ").slice(0, 160), keywords: focusKeywords(title, category) })} className="rounded-xl border border-zinc-400 px-4 py-3 font-bold disabled:opacity-50">تحسين SEO</button>
          </div>
          <p className="text-xs leading-6">النص حتى 8000 حرف. الترجمة أو التبسيط: استدعاء واحد عند الضغط، مثال تقديري 0.0115 دولار للعملية عند 2000 رمز إدخال و900 إخراج بتعرفة gpt-5.1؛ يتغير حسب النموذج والحجم. تحسين SEO محلي بلا تكلفة API. لا حفظ أو نشر تلقائي.</p>
          {isTranslating && <p role="status">جارٍ إعداد المعاينة...</p>}
          {assistantPreview && <section className="space-y-3 rounded-xl border bg-white p-4" aria-label="معاينة الذكاء الاصطناعي القابلة للتعديل">
            <h3 className="font-bold">راجعي النتيجة وعدّليها قبل استخدامها</h3>
            <input aria-label="عنوان المعاينة" value={assistantPreview.title} maxLength={180} className="input-style" onChange={e => setAssistantPreview({ ...assistantPreview, title: e.target.value })} />
            <textarea aria-label="ملخص المعاينة" value={assistantPreview.summary} maxLength={500} className="input-style" onChange={e => setAssistantPreview({ ...assistantPreview, summary: e.target.value })} />
            <textarea aria-label="محتوى المعاينة" value={assistantPreview.content} maxLength={20000} rows={7} className="input-style" onChange={e => setAssistantPreview({ ...assistantPreview, content: e.target.value })} />
            <div className="flex flex-wrap gap-3"><button type="button" onClick={acceptAssistant} disabled={isTranslating || isSaving || isUploading} className="rounded-lg bg-green-800 px-4 py-2 text-white">استخدام النتيجة في الحقول</button><button type="button" onClick={() => setAssistantPreview(null)} className="rounded-lg border px-4 py-2">تجاهل النتيجة</button></div>
          </section>}
          {seoPreview && <section className="space-y-3 rounded-xl border bg-white p-4" aria-label="اقتراح SEO">
            <label className="block">عنوان SEO<input className="input-style" maxLength={75} value={seoPreview.title} onChange={e => setSeoPreview({ ...seoPreview, title: e.target.value })} /></label>
            <label className="block">وصف Meta<textarea className="input-style" maxLength={160} value={seoPreview.description} onChange={e => setSeoPreview({ ...seoPreview, description: e.target.value })} /></label>
            <p>كلمات محورية: {focusKeywords(seoPreview.title, category).join("، ")}</p><p className="text-xs">تطبيق الاقتراح يعدّل عنوان الخبر وملخصه؛ بيانات SEO مشتقة منهما والكلمات من العنوان والقسم، وليست حقولًا مستقلة. راجعي عدم حذف اسم أو تاريخ مهم عند الاختصار.</p>
            <button type="button" disabled={isTranslating || isSaving || isUploading} onClick={() => { setTitle(seoPreview.title); setSummary(seoPreview.description); setSeoPreview(null); setPreview(null); }} className="rounded-lg border px-4 py-2">استخدام اقتراح SEO</button>
          </section>}
          {message && <p role="status" className="text-green-800">{message}</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
        </section>

        <section className="mt-6 space-y-3 rounded-2xl border bg-white p-5" aria-label="إعداد موجز من الوقائع">
          <h2 className="font-bold">موجز عربي سريع من مصدر واحد</h2>
          <p className="text-sm leading-7">املئي اسم المصدر ورابطه أدناه، ثم اكتبي الوقائع المؤكدة كنقاط بأسلوبك، دون لصق مقال محمي. يُنسب الموجز إلى المصدر ولا يُنشر تلقائيًا.</p>
          <textarea aria-label="الوقائع المؤكدة" maxLength={2500} rows={4} value={facts} onChange={e => { setFacts(e.target.value); setFactsConfirmed(false); }} className="input-style" />
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={factsConfirmed} onChange={e => setFactsConfirmed(e.target.checked)} />راجعت هذه الوقائع في المصدر؛ لا أقدم شائعة كحقيقة أو نصًا محميًا لإعادة صياغته.</label>
          <button type="button" disabled={!factsConfirmed || isTranslating || isSaving || isUploading} onClick={handleBrief} className="rounded-xl bg-amber-400 px-5 py-3 font-bold disabled:opacity-50">{isTranslating ? "جارٍ إعداد المسودة..." : "إعداد الموجز وSEO"}</button>
          {message && <p role="status" className="text-green-800">{message}</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
        </section>

        <form
          ref={formRef}
          action={saveAction}
          onChange={() => setPreview(null)}
          className="mt-8 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="pendingOriginal" value={pendingOriginal} />
          {article && <>
            <input type="hidden" name="id" value={article.id} />
            <input type="hidden" name="revision" value={article.revision} />
            <section className="rounded-xl bg-zinc-50 p-4">
              <h2 className="font-bold">النص الأصلي المحفوظ</h2>
              {hasOriginal ? <div dir="auto" className="whitespace-pre-wrap">
                <h3>{article.originalTitle}</h3><p>{article.originalSummary}</p><p>{article.originalContent}</p>
              </div> : <p>لا يوجد أصل محفوظ لهذا الخبر القديم؛ راجعي رابط المصدر. لن نعتبر النص الحالي أصلًا إنجليزيًا.</p>}
              <p>حفظ التعديلات يعيد الخبر إلى المسودة ويلغي الاعتماد السابق.</p>
            </section>
          </>}

          {pendingOriginal && <details className="rounded-xl bg-zinc-50 p-4"><summary>النص قبل أول معالجة — سيُحفظ منفصلًا</summary><p className="whitespace-pre-wrap" dir="auto">{(() => { const original = JSON.parse(pendingOriginal) as EditorText; return `${original.title}\n${original.summary}\n${original.content}`; })()}</p></details>}
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
                <option value="أمريكا">أمريكا</option>
                <option value="العالم">العالم</option>
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

          <section className="space-y-2 rounded-xl bg-slate-50 p-4" aria-label="معاينة SEO">
            <h2 className="font-bold">SEO تلقائي</h2><p>العنوان: {String(seo.title ?? "")}</p><p>الوصف: {String(seo.description ?? "")}</p><p>الكلمات المحورية: {focusKeywords(title, category).join("، ")}</p><p dir="ltr" className="break-all">{articlePath({ id: article?.id ?? 1, title })}</p><p className="text-xs">{!article && "رقم الرابط توضيحي؛ يُستبدل برقم الخبر بعد الحفظ. "}تُولّد روابط Canonical وOpen Graph والبيانات المنظمة عند العرض. الكلمات المحورية تساعد التحرير ولا تضمن الترتيب.</p>
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
