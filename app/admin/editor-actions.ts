
"use server";

import { auth } from "../../auth";
import { prisma } from "../../lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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

  try {
    const url = new URL(value);

    if (!["https:", "http:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }
  } catch {
    throw new Error(`${field} must be a valid web URL.`);
  }
}

function readArticle(formData: FormData) {
  const title = readText(formData, "title", 180);
  const summary = readText(formData, "summary", 500);
  const content = readText(formData, "content", 20000);
  const category = readText(formData, "category", 70);
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

  await prisma.article.update({
    where: { id },
    data,
  });

  revalidatePath("/admin");
  revalidatePath("/");

  redirect("/admin");
}
