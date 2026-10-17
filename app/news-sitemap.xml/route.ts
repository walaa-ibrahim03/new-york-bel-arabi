import { prisma } from "../../lib/prisma";
import { newsSitemap } from "../../lib/news-seo";
import { connection } from "next/server";

export async function GET() {
  await connection();
  const now = new Date();
  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED", publishedAt: { gte: new Date(now.getTime() - 48 * 3600000), lte: now } },
    orderBy: { publishedAt: "desc" }, take: 1000,
    select: { id: true, title: true, summary: true, category: true, imageUrl: true, publishedAt: true },
  });
  return new Response(newsSitemap(articles, now), { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "no-store" } });
}
