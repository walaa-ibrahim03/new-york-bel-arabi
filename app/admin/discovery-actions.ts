"use server";
import { auth } from "../../auth";
import { requireDatabaseTarget } from "../../lib/database-guard";
import { fetchRSS } from "../../lib/rss";
import { sourceForDirectory, requireDiscoverySource } from "../../lib/news-sources";
import { sourceFromDirectory, directoryArticleUrl } from "../../lib/source-directory";
import { normalizeImportedUrl } from "../../lib/article-policy";

export async function discoverNewsHeadlines(sourceUrl: string) {
  try {
    const admin = process.env.ADMIN_EMAIL?.trim().toLowerCase(), session = await auth();
    if (!admin || session?.user?.email?.trim().toLowerCase() !== admin) return { ok: false as const, message: "سجّلي الدخول بحساب المدير." };
    requireDatabaseTarget();
    const directory = sourceFromDirectory(sourceUrl);
    const source = directory && sourceForDirectory(directory.url);
    if (!source) return { ok: false as const, message: "المتابعة الرسمية اليدوية متاحة؛ الجمع الآلي غير معتمد لهذا المصدر، ولا نستورد نصوصه." };
    requireDiscoverySource(source.feedUrl);
    const items = await fetchRSS(source.feedUrl, "headlines");
    const seen = new Set<string>();
    const headlines = items.flatMap(item => {
      const link = directoryArticleUrl(directory, item.link), title = item.title.replace(/<[^>]*>/g, "").trim();
      if (!link || !title || title.length > 180) return [];
      const url = normalizeImportedUrl(link);
      if (seen.has(url)) return [];
      seen.add(url);
      return [{ title, url }];
    }).slice(0, 10);
    return { ok: true as const, headlines, checkedAt: new Date().toISOString() };
  } catch { return { ok: false as const, message: "تعذر اكتشاف العناوين آليًا أو أن إذن الوصول غير معتمد. افتحي المتابعة الرسمية واستخدمي وقائع متاحة لك قانونيًا؛ لم يُحفظ أو يُنشر أي خبر." }; }
}
