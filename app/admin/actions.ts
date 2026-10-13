
"use server";

import { auth } from "../../auth";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";

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
