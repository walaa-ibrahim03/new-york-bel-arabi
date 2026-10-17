import type { MetadataRoute } from "next";
import { prisma } from "../lib/prisma";
import { articlePath, siteOrigin } from "../lib/news-seo";
import { connection } from "next/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const siteUrl = siteOrigin();

  if (!siteUrl) {
    return [];
  }

  const baseUrl = siteUrl.replace(/\/$/, "");

  const articles = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
    },
    select: {
      id: true,
      title: true,
      publishedAt: true,
      createdAt: true,
    },
  });

  return [
    {
      url: baseUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.4 },
    ...articles.map((article) => ({
      url: `${baseUrl}${articlePath(article)}`,
      lastModified: article.publishedAt ?? article.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}