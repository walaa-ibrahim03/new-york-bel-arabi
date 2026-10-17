 
import { auth } from "../../../../auth";
import { prisma } from "../../../../lib/prisma";
import { notFound, redirect } from "next/navigation";
import ArticleForm from "../../ArticleForm";
import { siteOrigin } from "../../../../lib/news-seo";
import { connection } from "next/server";
export const instant = false;

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
    await connection();

  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (
    !adminEmail ||
    session?.user?.email?.trim().toLowerCase() !== adminEmail
  ) {
    redirect("/");
  }

  const { id } = await params;
  const articleId = Number(id);

  if (!Number.isSafeInteger(articleId) || articleId <= 0) {
    notFound();
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    notFound();
  }

  return <ArticleForm article={article} siteOrigin={siteOrigin() ?? ""} />;
}

