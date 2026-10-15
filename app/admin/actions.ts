
"use server";

import { auth } from "../../auth";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { importRSS } from "../../lib/import-rss";
import { newsSources } from "../../lib/news-sources";

async function requireAdmin() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (
    !adminEmail ||
    session?.user?.email?.trim().toLowerCase() !== adminEmail
  ) {
    throw new Error("غير مصرح لك بتنفيذ هذه العملية.");
  }
}

export async function publishArticle(id: number) {
  await requireAdmin();

  await prisma.article.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: new Date(),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function unpublishArticle(id: number) {
  await requireAdmin();

  await prisma.article.update({
    where: { id },
    data: {
      status: "DRAFT",
      publishedAt: null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function deleteArticle(id: number) {
  await requireAdmin();

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
