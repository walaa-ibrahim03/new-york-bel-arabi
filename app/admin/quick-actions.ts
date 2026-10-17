"use server";
import { auth } from "../../auth";
import { assertNewsOperationAllowed, requireDatabaseTarget } from "../../lib/database-guard";
import { prisma } from "../../lib/prisma";
import { fetchRSS } from "../../lib/rss";
import { newsSources, requireApprovedSource, requireDiscoverySource } from "../../lib/news-sources";
import { sourceFromDirectory } from "../../lib/source-directory";
import { quickCandidates, quickSections, signQuickCandidate, readQuickCandidate } from "../../lib/quick-news";
import { translateNewsToArabic } from "../../lib/translate-news";
import { validateBriefNumbers } from "../../lib/factual-brief";
import { normalizeImportedUrl, validateEditorialArticle } from "../../lib/article-policy";
import { aiFailureMessage } from "../../lib/ai-errors";
import { updateArticle } from "./editor-actions";
import { revalidatePath } from "next/cache";

async function admin() {
  assertNewsOperationAllowed();
  const expected = process.env.ADMIN_EMAIL?.trim().toLowerCase(), session = await auth();
  if (!expected || session?.user?.email?.trim().toLowerCase() !== expected) throw new Error("Unauthorized");
  requireDatabaseTarget();
}
export async function searchQuickNews(sourceUrl: string, section: string) {
  try {
    await admin();
    if (!quickSections.some(item => item.id === section)) throw new Error("Invalid section");
    if (section === "trend") return { ok: false as const, message: "لا يتوفر مؤشر اهتمام حقيقي موثق للترند حاليًا؛ اختاري قسمًا آخر. لا نسمّي الأحدث ترندًا." };
    const directory = sourceFromDirectory(sourceUrl);
    const source = directory && newsSources.find(item => new URL(item.feedUrl).hostname.replace(/^www\./, "") === new URL(directory.url).hostname.replace(/^www\./, ""));
    if (!source) return { ok: false as const, message: "لا يوجد RSS/API مصرح به لهذا المصدر لدينا. المتابعة اليدوية متاحة وفق شروطه؛ لا نتجاوز قيود الوصول." };
    requireDiscoverySource(source.feedUrl); requireApprovedSource(source.feedUrl);
    const items = await fetchRSS(source.feedUrl);
    const existing = await prisma.article.findMany({ select: { sourceUrl: true } });
    const candidates = quickCandidates(items, source, section, existing.map(item => item.sourceUrl));
    return { ok: true as const, checkedAt: new Date().toISOString(), items: candidates.map(item => ({ title:item.title,source:item.sourceName,date:item.date,url:item.url,token:signQuickCandidate(item) })) };
  } catch { return { ok: false as const, message: "تعذر الجلب أو لم يُعتمد إذن المصدر. يمكنك استخدام المتابعة اليدوية. لم تُحفظ أخبار البحث." }; }
}
// One selected item per call keeps timeouts bounded; the client processes up to five sequentially.
export async function prepareQuickDraft(token: string) {
  let claimed: {id:number} | undefined;
  try {
    await admin();
    const item = readQuickCandidate(token), source = newsSources.find(source => source.id === item.sourceId);
    if (!source) throw new Error("Invalid source");
    requireDiscoverySource(source.feedUrl); requireApprovedSource(source.feedUrl);
    if (new URL(item.url).hostname.replace(/^www\./, "") !== new URL(source.feedUrl).hostname.replace(/^www\./, "") || normalizeImportedUrl(item.url) !== item.url || !quickSections.some(section => section.category === item.category && section.id !== "trend")) throw new Error("Invalid selection");
    const existing = await prisma.article.findMany({ select: { sourceUrl: true } });
    if (existing.some(row => { try { return normalizeImportedUrl(row.sourceUrl) === item.url; } catch { return false; } })) return { ok: false as const, message:"هذا الخبر محفوظ بالفعل؛ لم يُستدعَ الذكاء الاصطناعي مجددًا." };
    // Claim the unique source URL before the paid call. Concurrent/repeated selections cannot pay twice.
    claimed = await prisma.article.create({ data: { title:item.title,summary:item.summary.slice(0,2000),content:item.summary,originalTitle:item.title,originalSummary:item.summary,originalContent:item.summary,sourceUrl:item.url,sourceName:source.name,category:item.category,borough:item.borough,status:"DRAFT" }, select:{id:true} });
    const draft = await translateNewsToArabic(item.title,item.summary,item.summary,"licensed",60);
    validateBriefNumbers(`${item.title} ${item.summary}`,draft,false);
    validateEditorialArticle({...draft,category:item.category,sourceUrl:item.url});
    if (draft.summary.split(/\s+/).filter(Boolean).length > 80) throw new Error("Summary too long");
    if (!/[\u0621-\u064A]/.test(draft.title) || !/[\u0621-\u064A]/.test(draft.summary)) throw new Error("Arabic draft required");
    const saved = await prisma.article.updateMany({ where:{id:claimed.id,revision:0,status:"DRAFT"},data:{title:draft.title,summary:draft.summary,content:draft.summary,revision:{increment:1}} });
    if (saved.count !== 1) throw new Error("Revision changed");
    revalidatePath("/admin");
    return { ok:true as const, draft:{id:claimed.id,revision:1,title:draft.title,summary:draft.summary,category:item.category,sourceName:source.name} };
  } catch (error) {
    if (claimed) { revalidatePath("/admin"); return {ok:false as const,id:claimed.id,stop:Boolean(aiFailureMessage(error)),message:(aiFailureMessage(error)?.replace("لم يُحفظ أو يُنشر شيء.","لم يُنشر الخبر.") ?? "تعذر إعداد النص العربي أو تغيّرت المسودة.")+" الأصل محفوظ كمسودة فقط؛ افتحي المحرر للمراجعة. لا تعيدي تجهيز الخبر من البحث."}; }
    return {ok:false as const,message:"تعذر تجهيز الاختيار أو أنه مكرر/منتهي الصلاحية. أعيدي الجلب؛ لم يُنشر شيء."};
  }
}
export async function saveQuickArticle(input: {id:number;revision:number;title:string;summary:string;publish:boolean;confirmed:boolean}) {
  try {
    await admin();
    if (!Number.isSafeInteger(input.id) || input.id<=0 || !Number.isSafeInteger(input.revision) || input.revision<0 || typeof input.publish!=="boolean" || (input.publish && input.confirmed!==true)) throw new Error("Invalid save");
    const existing = await prisma.article.findUnique({where:{id:input.id}});
    if (!existing || existing.status!=="DRAFT") throw new Error("Draft required");
    const data = new FormData();
    for (const [key,value] of Object.entries({id:String(input.id),revision:String(input.revision),title:input.title,summary:input.summary,format:"minute",category:existing.category,borough:existing.borough,sourceName:existing.sourceName??"",sourceUrl:existing.sourceUrl,imageUrl:existing.imageUrl??"",intent:input.publish?"publish":"draft",publicationConfirmed:input.confirmed?"yes":""})) data.set(key,value);
    await updateArticle(data,true);
    return {ok:true as const,revision:input.revision+1,published:input.publish};
  } catch { return {ok:false as const,message:"تعذر الحفظ أو النشر. تحققي من جلسة المدير والتأكيد والحقول؛ ربما تغيّرت المسودة، فافتحي محررها."}; }
}
