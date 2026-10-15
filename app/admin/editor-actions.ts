
"use server";

import { normalizeCategory, isKnownCategory } from "../../lib/categories";
import { validateWebUrl } from "../../lib/article-policy";
import { auth } from "../../auth";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { translateNewsToArabic } from "../../lib/translate-news";
async function requireAdmin() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (
    !adminEmail ||
    session?.user?.email?.trim().toLowerCase() !== adminEmail
  ) {
    throw new Error("Access denied.");
  }
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
  const summary = readText(formData, "summary", 500);
  const content = readText(formData, "content", 20000);
  const rawCategory = readText(formData, "category", 70);
  const category = normalizeCategory(rawCategory);
  const borough = readText(formData, "borough", 70);
  const sourceUrl = readText(formData, "sourceUrl", 2000);
  const imageUrl = readText(formData, "imageUrl", 2000, false);

  validateUrl(sourceUrl, "Source URL");
  validateUrl(imageUrl, "Image URL");

  return {
    title,
    summary,
    content,
    category,
    borough,
    sourceUrl,
    imageUrl: imageUrl || null,
  };
}

export async function createArticle(formData: FormData) {
  await requireAdmin();

  const data = readArticle(formData);
  if (!isKnownCategory(data.category)) throw new Error("Invalid category");

  await prisma.article.create({
    data: {
      ...data,
      status: "DRAFT",
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");

  redirect("/admin");
}

export async function updateArticle(formData: FormData) {
  await requireAdmin();

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
  if (existing.originalTitle && data.sourceUrl !== existing.sourceUrl) throw new Error("لا يمكن تغيير رابط المصدر المرتبط بالأصل المحفوظ. أنشئي مسودة مستقلة للمصدر الجديد.");
  if (!isKnownCategory(data.category) && data.category !== normalizeCategory(existing.category)) throw new Error("Invalid category");
  const result = await prisma.article.updateMany({
    where: { id, revision },
    data: {
      ...data,
      status: "DRAFT", publishedAt: null,
      reviewedAt: null, reviewedBy: null, approvedAt: null, approvedBy: null,
      revision: { increment: 1 },
    },
  });
  if (result.count !== 1) throw new Error("تغيّر الخبر. أعيدي تحميل الصفحة قبل الحفظ.");
  revalidatePath(`/news/${id}`);
  revalidatePath(`/admin/edit/${id}`);
  revalidatePath("/sitemap.xml");

  revalidatePath("/admin");
  revalidatePath("/");

  redirect("/admin");
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

  // إرسال الأصل المحفوظ فقط إلى OpenAI
  const translation = await translateNewsToArabic(
    article.originalTitle,
    article.originalSummary ?? "",
    article.originalContent ?? ""
  );

  // إرجاع الترجمة للمراجعة فقط، بدون حفظها
  return translation;
}
