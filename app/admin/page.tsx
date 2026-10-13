import { prisma } from "../../lib/prisma";
import { auth } from "../../auth";
import { redirect } from "next/navigation";
import ArticlesDashboard from "./ArticlesDashboard";

export const instant = false;

export default async function AdminPage() {
  const session = await auth();

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (
    !adminEmail ||
    session?.user?.email?.trim().toLowerCase() !== adminEmail
  ) {
    redirect("/");
  }

  const articles = await prisma.article.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      summary: true,
      category: true,
      borough: true,
      status: true,
      createdAt: true,
    },
  });

  const dashboardArticles = articles.map((article) => ({
    ...article,
    createdAt: article.createdAt.toISOString(),
  }));

  return <ArticlesDashboard articles={dashboardArticles} />;
}