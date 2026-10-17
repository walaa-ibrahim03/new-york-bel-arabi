import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "../../../auth";
import { sourceDirectory, discoveryEditorLink } from "../../../lib/source-directory";
import { sourceForDirectory } from "../../../lib/news-sources";
import { prisma } from "../../../lib/prisma";
export const metadata = { title: "مصادر الأخبار والمتابعة", robots: { index: false, follow: false } };
export const instant = false;
export default async function Sources() {
  await connection();
  const session = await auth(), admin = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!admin || session?.user?.email?.trim().toLowerCase() !== admin) redirect("/");
  const latest = await prisma.article.findFirst({ where: { originalTitle: { not: null } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  return <main dir="rtl" className="mx-auto max-w-5xl space-y-6 px-4 py-10"><Link href="/admin">← لوحة الإدارة</Link><h1 className="text-3xl font-bold">مصادر الأخبار والمتابعة</h1><p>مصدر موثوق واحد يكفي مع نسب الوقائع بوضوح. هذه روابط متابعة وليست أذونات لنسخ المحتوى. للمواد غير المرخصة اكتبي الوقائع المؤكدة بأسلوبك في نموذج الخبر، ثم اطلبي إعداد موجز عربي.</p><p className="rounded-xl bg-amber-50 p-4">الجدولة {process.env.NYBA_AUTOMATION_ENABLED === "true" ? "مفعلة لهذه النسخة" : "غير مفعلة"}. Hobby يسمح بجدولة Vercel يومية؛ يُقترح كل 30 دقيقة على Pro أو مجدول خارجي مصرح به. آخر خبر مستورد محفوظ: {latest ? latest.createdAt.toLocaleString("ar", { timeZone: "America/New_York" }) : "لا يوجد"}. هذا وقت حفظ خبر، وليس ادعاء فحص جميع المصادر الآن.</p><div className="grid gap-4 sm:grid-cols-2">{sourceDirectory.map(source => <article key={source.name} className="space-y-3 rounded-2xl border bg-white p-5"><h2 className="text-xl font-bold"><a href={source.url} target="_blank" rel="noopener noreferrer" className="text-amber-800 underline">{source.name} ↗</a></h2><p>{source.languages} — {source.method}</p><Link href={discoveryEditorLink(source.url)} className="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-white">إعداد خبر من الوقائع</Link><p className="text-xs leading-6">{sourceForDirectory(source.url)?.discoveryStatus || (sourceForDirectory(source.url)?.discovery?.automatic ? "اكتشاف العناوين متاح داخل لوحة الإدارة؛ إذن النص مستقل ولا نشر تلقائي." : "متابعة يدوية؛ لم يُوثّق إذن اكتشاف آلي مناسب لهذا الموقع.")}</p><p className="text-sm leading-7">{source.reuse}</p><p className="flex gap-5 text-sm text-amber-800 underline"><a href={source.follow} target="_blank" rel="noopener noreferrer">المتابعة الرسمية</a><a href={source.terms} target="_blank" rel="noopener noreferrer">الشروط / الترخيص</a></p></article>)}</div></main>;
}
