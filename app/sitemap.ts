import type { MetadataRoute } from "next";
import { prisma } from "../lib/prisma";
import { connection } from "next/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

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
    ...articles.map((article) => ({
      url: `${baseUrl}/news/${article.id}`,
      lastModified: article.publishedAt ?? article.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}