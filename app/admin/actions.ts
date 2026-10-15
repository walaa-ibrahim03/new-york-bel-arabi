
"use server";

import { canPublish, validateArticleId, validateEditorialArticle } from "../../lib/article-policy";
import { assertNewsOperationAllowed } from "../../lib/database-guard";
import { auth } from "../../auth";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { importRSS } from "../../lib/import-rss";
import { newsSources } from "../../lib/news-sources";

async function requireAdmin() {
  assertNewsOperationAllowed();
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (
    !adminEmail ||
    session?.user?.email?.trim().toLowerCase() !== adminEmail
  ) {
    throw new Error("غير مصرح لك بتنفيذ هذه العملية.");
  }
  return adminEmail;
}

function refreshArticle(id: number) {
  revalidatePath("/admin");
  revalidatePath(`/admin/edit/${id}`);
  revalidatePath(`/news/${id}`);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

async function transitionArticle(id: number, from: string, to: string) {
  const email = await requireAdmin();
  validateArticleId(id);
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article || article.status !== from) throw new Error("مرحلة الخبر لا تسمح بهذه العملية.");
  if (to !== "DRAFT") validateEditorialArticle(article);
  if (to === "PUBLISHED" && !canPublish(article)) throw new Error("يجب اعتماد الخبر قبل النشر.");
  const result = await prisma.article.updateMany({
    where: { id, status: from, revision: article.revision },
    data: {
      status: to,
      revision: { increment: 1 },
      publishedAt: to === "PUBLISHED" ? new Date() : null,
      ...(to === "IN_REVIEW" ? { reviewedAt: null, reviewedBy: null, approvedAt: null, approvedBy: null } : {}),
      ...(to === "APPROVED" ? { reviewedAt: new Date(), reviewedBy: email, approvedAt: new Date(), approvedBy: email } : {}),
      ...(to === "DRAFT" ? { reviewedAt: null, reviewedBy: null, approvedAt: null, approvedBy: null } : {}),
    },
  });
  if (result.count !== 1) throw new Error("تغيّر الخبر. أعيدي تحميل الصفحة للمراجعة.");
  refreshArticle(id);
}

export async function submitArticleForReview(id: number) {
  await transitionArticle(id, "DRAFT", "IN_REVIEW");
}
export async function approveArticle(id: number) {
  await transitionArticle(id, "IN_REVIEW", "APPROVED");
}
export async function publishArticle(id: number) {
  await transitionArticle(id, "APPROVED", "PUBLISHED");
}
export async function unpublishArticle(id: number) {
  await transitionArticle(id, "PUBLISHED", "DRAFT");
}
export async function returnArticleToDraft(id: number) {
  await requireAdmin();
  validateArticleId(id);
  const result = await prisma.article.updateMany({
    where: { id, status: { in: ["IN_REVIEW", "APPROVED"] } },
    data: { status: "DRAFT", revision: { increment: 1 }, reviewedAt: null, reviewedBy: null, approvedAt: null, approvedBy: null, publishedAt: null },
  });
  if (result.count !== 1) throw new Error("تعذر إعادة الخبر إلى المسودة.");
  refreshArticle(id);
}

export async function deleteArticle(id: number) {
  await requireAdmin();

  validateArticleId(id);
  await prisma.article.delete({
    where: { id },
  });

  revalidatePath("/admin");
  revalidatePath("/");
}



export async function importNewsFromRSS(sourceId: string = "gothamist") {
  await requireAdmin();

  const source = newsSources.find((item) => item.id === sourceId);

  if (!source) {
    throw new Error("مصدر الأخبار غير موجود");
  }

  const result = await importRSS({
    feedUrl: source.feedUrl,
    sourceName: source.name,
    category: source.category,
    limit: 5,
  });

  revalidatePath("/admin");

  return result;
}
