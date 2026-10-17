
"use server";

import { normalizeCategory, isKnownCategory } from "../../lib/categories";
import { validateWebUrl, validateEditorialArticle } from "../../lib/article-policy";
import { assertNewsOperationAllowed, isNewsReadOnly } from "../../lib/database-guard";
import { auth } from "../../auth";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { translateNewsToArabic } from "../../lib/translate-news";
import { requireFullTranslationPermission } from "../../lib/news-sources";
import { readPendingOriginal } from "../../lib/editor-assistant";
async function requireAdmin() {
  assertNewsOperationAllowed();
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (
    !adminEmail ||
    session?.user?.email?.trim().toLowerCase() !== adminEmail
  ) {
    throw new Error("Access denied.");
  }
  return adminEmail;
}

function readText(
  formData: FormData,
  field: string,
  maxLength: number,
  required = true
) {
  const value = formData.get(field);

  if (typeof value !== "string") {
    throw new Error(`Invalid field: ${field}`);
  }

  const text = value.trim();

  if (required && !text) {
    throw new Error(`${field} is required.`);
  }

  if (text.length > maxLength) {
    throw new Error(`${field} is too long.`);
  }

  return text;
}

function validateUrl(value: string, field: string) {
  if (!value) return;

  try { validateWebUrl(value); } catch { throw new Error(`${field} must be a valid public web URL.`); }
}

function readArticle(formData: FormData) {
  const title = readText(formData, "title", 180);
  const summary = readText(formData, "summary", 2000);
  const content = formData.get("format") === "minute" ? summary : readText(formData, "content", 20000);
  const rawCategory = readText(formData, "category", 70);
  const category = normalizeCategory(rawCategory);
  const borough = readText(formData, "borough", 70);
  const sourceUrl = readText(formData, "sourceUrl", 2000);
  const imageUrl = readText(formData, "imageUrl", 2000, false);
  const sourceName = formData.has("sourceName") ? readText(formData, "sourceName", 120, false) || null : undefined;

  validateUrl(sourceUrl, "Source URL");
  validateUrl(imageUrl, "Image URL");

  return {
    title,
    summary,
    content,
    category,
    borough,
    sourceUrl,
    sourceName,
    imageUrl: imageUrl || null,
  };
}

function saveState(formData: FormData, data: ReturnType<typeof readArticle>, admin: string) {
  const intent = formData.get("intent") ?? "draft";
  if (!["draft", "review", "publish"].includes(String(intent))) throw new Error("Invalid editorial intent");
  if (intent !== "draft") validateEditorialArticle(data);
  if (intent === "publish") {
    if (formData.get("publicationConfirmed") !== "yes") throw new Error("أكدي مراجعة النص والحقائق وحقوق النشر قبل النشر.");
    if (!/[\u0621-\u064A]/.test(data.title) || !/[\u0621-\u064A]/.test(data.summary)) throw new Error("يجب إعداد عنوان وملخص عربيين قبل النشر.");
    const now = new Date();
    return { status: "PUBLISHED", reviewedAt: now, reviewedBy: admin, approvedAt: now, approvedBy: admin, publishedAt: now };
  }
  return { status: intent === "review" ? "IN_REVIEW" : "DRAFT", reviewedAt: null, reviewedBy: null, approvedAt: null, approvedBy: null, publishedAt: null };
}

export async function createArticle(formData: FormData) {
  const admin = await requireAdmin();

  const data = readArticle(formData);
  if (!data.sourceName) throw new Error("Source name is required");
  if (!isKnownCategory(data.category)) throw new Error("Invalid category");

  await prisma.article.create({
    data: {
      ...data,
      ...readPendingOriginal(formData.get("pendingOriginal"), data.sourceUrl),
      ...saveState(formData, data, admin),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  revalidatePath("/news-sitemap.xml");

  redirect("/admin");
}

export async function updateArticle(formData: FormData, stayOnPage = false) {
  const admin = await requireAdmin();

  const id = Number(formData.get("id"));

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid article ID.");
  }

  const data = readArticle(formData);

  const revisionValue = formData.get("revision");
  if (typeof revisionValue !== "string" || !revisionValue.trim()) throw new Error("Missing revision");
  const revision = Number(revisionValue);
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Invalid revision");
  const existing = await prisma.article.findUnique({ where: { id } });
  if (!existing) throw new Error("Article not found");
  if ((existing.originalTitle || existing.originalSummary || existing.originalContent) && data.sourceUrl !== existing.sourceUrl) throw new Error("لا يمكن تغيير رابط المصدر المرتبط بالأصل المحفوظ. أنشئي مسودة مستقلة للمصدر الجديد.");
  if (!isKnownCategory(data.category) && data.category !== normalizeCategory(existing.category)) throw new Error("Invalid category");
  const result = await prisma.article.updateMany({
    where: { id, revision },
    data: {
      ...data,
      ...(!existing.originalTitle && !existing.originalSummary && !existing.originalContent ? readPendingOriginal(formData.get("pendingOriginal"), data.sourceUrl) : {}),
      ...(formData.get("format") === "minute" ? { content: existing.content } : {}),
      ...saveState(formData, data, admin),
      revision: { increment: 1 },
    },
  });
  if (result.count !== 1) throw new Error("تغيّر الخبر. أعيدي تحميل الصفحة قبل الحفظ.");
  revalidatePath(`/news/${id}`);
  revalidatePath(`/admin/edit/${id}`);
  revalidatePath("/sitemap.xml");
  revalidatePath("/news-sitemap.xml");

  revalidatePath("/admin");
  revalidatePath("/");

  if (!stayOnPage) redirect("/admin");
}

export async function saveArticle(_previous: { error: string }, formData: FormData): Promise<{ error: string }> {
  try {
    if (formData.has("id")) await updateArticle(formData);
    else await createArticle(formData);
    return { error: "" };
  } catch (error) {
    unstable_rethrow(error);
    if (isNewsReadOnly()) return { error: "هذه النسخة تعمل بوضع القراءة فقط؛ لم يُحفظ الخبر." };
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return { error: "رابط المصدر موجود لخبر آخر. راجعي الأخبار قبل الإضافة." };
    return { error: "تعذّر الحفظ. تحققي من جلسة المدير والحقول ورابط المصدر، ثم أعيدي تحميل الصفحة إذا تغيّر الخبر." };
  }
}


export async function translateArticle(articleId: number) {
  // السماح للمدير فقط
  await requireAdmin();

  if (!Number.isSafeInteger(articleId) || articleId <= 0) {
    throw new Error("Invalid article ID.");
  }

  // قراءة الخبر من قاعدة البيانات
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      status: true,
      originalTitle: true,
      originalSummary: true,
      originalContent: true,
      sourceUrl: true,
    },
  });

  if (!article) {
    throw new Error("Article not found.");
  }

  // لا نسمح بترجمة الأخبار المنشورة بهذه الوظيفة
  if (article.status !== "DRAFT") {
    throw new Error("Only draft articles can be translated.");
  }

  if (!article.originalTitle) throw new Error("لا يتوفر أصل محفوظ لهذا الخبر القديم. راجعي المصدر يدويًا.");
  requireFullTranslationPermission(article.sourceUrl);

  // إرسال الأصل المحفوظ فقط إلى OpenAI
  const translation = await translateNewsToArabic(
    article.originalTitle,
    article.originalSummary ?? "",
    article.originalContent ?? ""
  );

  // إرجاع الترجمة للمراجعة فقط، بدون حفظها
  return translation;
}
