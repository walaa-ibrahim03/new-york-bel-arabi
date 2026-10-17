
"use client";

import { categories, normalizeCategory } from "../../lib/categories";
import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import {
  saveArticle,
} from "./editor-actions";
import { prepareEditorText } from "./assistant-actions";
import { detectNewsLanguage, type EditorText, type EditorOperation } from "../../lib/editor-assistant";
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
  discoverySource,
}: {
  article?: ArticleData;
  discoverySource?: { name: string; url: string; title: string };
}) {
  const isEditing = Boolean(article);
  const hasOriginal = Boolean(article?.originalTitle || article?.originalSummary || article?.originalContent);

  const [title, setTitle] = useState(article?.title ?? discoverySource?.title ?? "");
  const [summary, setSummary] = useState(article?.summary ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [sourceName, setSourceName] = useState(article?.sourceName ?? discoverySource?.name ?? "");
  const [sourceUrl, setSourceUrl] = useState(article?.sourceUrl ?? discoverySource?.url ?? "");
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

  const seo = newsMetadata({ id: article?.id ?? 1, title, summary, category, imageUrl, publishedAt: null });
  const [targetWords, setTargetWords] = useState(60);
  const [factsOnly, setFactsOnly] = useState(Boolean(discoverySource));
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
    const text = { title, summary: summary.slice(0, 8000), content: content || summary };
    const key = JSON.stringify({ text, operation, targetWords, factsOnly, sourceUrl, rightsConfirmed, id: article?.id, revision: article?.revision });
    setMessage(""); setError(""); setPreview(null);
    if (lastAssistant.current?.key === key) {
      setAssistantPreview({ ...lastAssistant.current.draft }); setPreviewOriginal(text);
      setMessage("أُعيدت المعاينة السابقة دون استدعاء مدفوع جديد."); return;
    }
    assistantBusy.current = true;
    startTranslation(async () => {
      try {
        const result = await prepareEditorText({ text, operation, targetWords, factsOnly, sourceUrl, rightsConfirmed, id: article?.id, revision: article?.revision });
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
    setTitle(assistantPreview.title); setSummary(assistantPreview.summary); setContent(assistantPreview.summary);
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

        {discoverySource && <p className="mt-5 rounded-xl bg-sky-50 p-4 text-sm leading-7" role="status">إعداد خبر من الوقائع: المصدر محدد مسبقًا. أدخلي رابط الخبر المحدد، واكتبي عنوانًا ونقاط الوقائع بأسلوبك في الملخص، دون لصق المقال. أكدي مراجعتها ثم اختاري التلخيص لإعداد معاينة عربية 40–80 كلمة. هذا لا يجلب نصًا من الرابط ولا يحفظ أو ينشر تلقائيًا.</p>}
        <section className="mt-6 space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-label="مساعد تحرير الأخبار">
          <h2 className="text-lg font-bold">مساعد تحرير الأخبار</h2>
          <p className="text-sm">{language === "en" ? "النص يبدو إنجليزيًا؛ نقترح الترجمة إلى العربية." : language === "ar" ? "النص يبدو عربيًا؛ نقترح التلخيص والتبسيط." : "النص مختلط أو غير كافٍ؛ اختاري العملية يدويًا."} الاقتراح لا يشغّل الذكاء الاصطناعي تلقائيًا.</p>
          <label className="flex items-start gap-2 text-sm leading-7"><input type="checkbox" disabled={isTranslating} checked={rightsConfirmed} onChange={e => setRightsConfirmed(e.target.checked)} />{factsOnly ? "راجعت الوقائع المتاحة لي قانونيًا وكتبتها بأسلوبي؛ لم ألصق مقالًا محميًا أو شائعة." : "النص من كتابتي أو لدي إذن يسمح بترجمته أو تلخيصه. للنصوص المحمية اكتبي الوقائع فقط بأسلوبك واختاري تغطية الوقائع."}</label>
          <div className="flex flex-wrap gap-4 text-sm">
            <label>الطول المستهدف بالكلمات<input type="number" min={30} max={160} value={targetWords} onChange={e => setTargetWords(Number(e.target.value))} className="input-style" /></label>
            <label>نوع المادة<select value={factsOnly ? "facts" : "licensed"} onChange={e => setFactsOnly(e.target.value === "facts")} className="input-style"><option value="licensed">نصي أو نص مرخّص</option><option value="facts">وقائع مؤكدة كتبتها بأسلوبي</option></select></label>
          </div>
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
            <textarea aria-label="ملخص المعاينة" value={assistantPreview.summary} maxLength={2000} className="input-style" onChange={e => setAssistantPreview({ ...assistantPreview, summary: e.target.value })} />

            <div className="flex flex-wrap gap-3"><button type="button" onClick={acceptAssistant} disabled={isTranslating || isSaving || isUploading} className="rounded-lg bg-green-800 px-4 py-2 text-white">استخدام النتيجة في الحقول</button><button type="button" onClick={() => setAssistantPreview(null)} className="rounded-lg border px-4 py-2">تجاهل النتيجة</button></div>
          </section>}
          {seoPreview && <section className="space-y-3 rounded-xl border bg-white p-4" aria-label="اقتراح SEO">
            <label className="block">عنوان SEO<input className="input-style" maxLength={75} value={seoPreview.title} onChange={e => setSeoPreview({ ...seoPreview, title: e.target.value })} /></label>
            <label className="block">وصف Meta<textarea className="input-style" maxLength={160} value={seoPreview.description} onChange={e => setSeoPreview({ ...seoPreview, description: e.target.value })} /></label>
            <p>كلمات محورية: {focusKeywords(seoPreview.title, category).join("، ")}</p><p className="text-xs">تطبيق الاقتراح يحسّن العنوان فقط ويحافظ على الملخص؛ وصف Meta يُشتق تلقائيًا من بدايته.  بيانات SEO مشتقة منهما والكلمات من العنوان والقسم، وليست حقولًا مستقلة. راجعي عدم حذف اسم أو تاريخ مهم عند الاختصار.</p>
            <button type="button" disabled={isTranslating || isSaving || isUploading} onClick={() => { setTitle(seoPreview.title); setSeoPreview(null); setPreview(null); }} className="rounded-lg border px-4 py-2">استخدام اقتراح SEO</button>
          </section>}
          {message && <p role="status" className="text-green-800">{message}</p>}{error && <p role="alert" className="text-red-700">{error}</p>}
        </section>

        <form
          ref={formRef}
          action={saveAction}
          onChange={() => setPreview(null)}
          onSubmit={event => {
            const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
            if (submitter?.value === "publish") {
              const confirmed = window.confirm("أؤكد مراجعة النص العربي والأسماء والأرقام وحقوق الاستخدام ونسب المصدر. اعتماد هذا النص ونشره الآن؟");
              if (!confirmed) { event.preventDefault(); return; }
              const field = formRef.current?.elements.namedItem("publicationConfirmed") as HTMLInputElement | null;
              if (field) field.value = "yes";
            }
          }}
          className="mt-8 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="format" value="minute" />
          <input type="hidden" name="publicationConfirmed" defaultValue="" />
          <input type="hidden" name="pendingOriginal" value={pendingOriginal} />
          {article && <>
            <input type="hidden" name="id" value={article.id} />
            <input type="hidden" name="revision" value={article.revision} />
            <details className="rounded-xl bg-zinc-50 p-4">
              <summary className="cursor-pointer font-bold">الأصل والتوثيق المحفوظ</summary>
              {hasOriginal ? <div dir="auto" className="whitespace-pre-wrap">
                <h3>{article.originalTitle}</h3><p>{article.originalSummary}</p><p>{article.originalContent}</p>
              </div> : <p>لا يوجد أصل محفوظ لهذا الخبر القديم؛ راجعي رابط المصدر. لن نعتبر النص الحالي أصلًا إنجليزيًا.</p>}
              {article.content && <p className="mt-4 whitespace-pre-wrap" dir="auto">{article.content}</p>}
              <p>حفظ المسودة يلغي الاعتماد السابق. النشر يحتاج تأكيد مراجعة جديدًا.</p>
            </details>
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
              maxLength={8000}
              rows={7}
              value={summary}
              onChange={(e) => { setSummary(e.target.value); setContent(e.target.value); }}
              dir="auto"
              className="input-style"
              placeholder="الخبر في دقيقة: 40–80 كلمة عربية واضحة. يمكنك لصق النص هنا لإعداد معاينة مختصرة قبل الحفظ."
            />
          </Field>

          <p className="text-sm text-zinc-600">{summary.trim().split(/\s+/).filter(Boolean).length} كلمة — المقترح 40–80 كلمة، ويمكن تعديله. الحد عند الحفظ 2000 حرف.</p>
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
              readOnly={hasOriginal || Boolean(pendingOriginal) || Boolean(assistantPreview) || isTranslating}
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
          <p className="text-sm leading-7 text-zinc-600">حفظ المسودة لا ينشرها. «نشر الآن» يسجل مراجعتك واعتمادك ثم ينشر النص بعد التأكيد.</p>
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
            <button type="submit" name="intent" value="publish" disabled={isTranslating || isUploading || isSaving} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-black disabled:opacity-50">نشر الآن</button>
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
