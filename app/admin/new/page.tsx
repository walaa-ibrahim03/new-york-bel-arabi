
import { auth } from "../../../auth";
import { redirect } from "next/navigation";
import ArticleForm from "../ArticleForm";
import { sourceFromDirectory, directoryArticleUrl } from "../../../lib/source-directory";

export const instant = false;

export default async function NewArticlePage({ searchParams }: { searchParams: Promise<{ source?: string; url?: string; headline?: string }> }) {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  if (
    !adminEmail ||
    session?.user?.email?.trim().toLowerCase() !== adminEmail
  ) {
    redirect("/");
  }

  const query = await searchParams;
  const source = sourceFromDirectory(query.source);
  const url = source ? directoryArticleUrl(source, query.url) : "";
  const title = url && typeof query.headline === "string" ? query.headline.slice(0, 180) : "";
  return <ArticleForm key={`${source?.url ?? "manual"}:${url}`} discoverySource={source ? { name: source.name, url, title } : undefined} />;
}
