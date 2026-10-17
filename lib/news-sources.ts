import { categories } from "./categories";


export type NewsSource = {
  id: string;
  name: string;
  feedUrl: string;
  directoryUrl?: string;
  discoveryStatus?: string;
  category: (typeof categories)[number];
  termsUrl: string;
  permission: { automaticImport: boolean; translation: boolean; reference: string };
  discovery?: { automatic: boolean; reference: string };
  coverage?: "US" | "WORLD" | "NY";
};

export const newsSources: NewsSource[] = [
  {
    discovery: { automatic: true, reference: "Official NASA RSS news releases; titles and links for informational discovery. Reviewed 2026-10-17." },
    id: "nasa-releases", name: "NASA", feedUrl: "https://www.nasa.gov/news-release/feed/",
    category: "أخبار أمريكا", coverage: "US",
    termsUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
    permission: { automaticImport: true, translation: true, reference: "NASA official news releases: factual informational use with attribution; no imagery or third-party media. Reviewed 2026-10-17." },
  },
  {
    discoveryStatus: "Gothamist: الوصول إلى RSS محجوب (403)، وشروطه للاستخدام الشخصي غير التجاري؛ لا نتجاوز الحجب ولا نفعّله دون إذن مناسب.",
    id: "gothamist",
    name: "Gothamist",
    feedUrl: "https://gothamist.com/feed",
    category: "أخبار محلية",
    termsUrl: "https://wnyc.org/terms/",
    permission: { automaticImport: false, translation: false, reference: "" },
  },
  {
    discovery: { automatic: true, reference: "Publisher-offered RSS linked on the official homepage; thecity.nyc redirects to thecityreporter.nyc, same City Report, Inc. Private headline/link/date discovery only; no article snippets, images or translation rights. Reviewed 2026-10-17; see docs/news-discovery-ar.md." },
    discoveryStatus: "THE CITY / The City Reporter: اكتشاف العناوين والروابط والتواريخ متاح. لا نستورد مقتطف المقال أو نترجمه؛ أضيفي وقائع قصيرة للخبر المختار لتجهيز مسودته.",
    directoryUrl: "https://www.thecity.nyc/",
    coverage: "NY",
    id: "the-city",
    name: "THE CITY",
    feedUrl: "https://www.thecityreporter.nyc/feed/",
    category: "سكن واقتصاد",
    termsUrl: "https://www.thecityreporter.nyc/republishing/",
    permission: { automaticImport: false, translation: false, reference: "" },
  },
  {
    discoveryStatus: "amNewYork: RSS متاح تقنيًا، لكن شروطه تقصره على الاستخدام الشخصي وتحتاج موافقة مكتوبة للاستخدام التجاري؛ المتابعة اليدوية متاحة.",
    id: "amny",
    name: "amNewYork",
    feedUrl: "https://www.amny.com/feed/",
    category: "أخبار محلية",
    termsUrl: "https://www.amny.com/terms-of-use/",
    permission: { automaticImport: false, translation: false, reference: "" },
  },
];

// Enable only after recording permission covering this site's automated storage
// and Arabic translation. RSS availability alone does not grant these rights.
export function isSourceApproved(source: NewsSource) {
  return source.permission.automaticImport && source.permission.translation && Boolean(source.permission.reference.trim());
}

export function requireApprovedSource(feedUrl: string) {
  const source = newsSources.find(item => item.feedUrl === feedUrl);
  if (!source || !isSourceApproved(source)) throw new Error("لم يُعتمد إذن استخدام هذا المصدر للاستيراد والترجمة بعد.");
  return source;
}

export function requireFullTranslationPermission(sourceUrl: string) {
  const host = new URL(sourceUrl).hostname.replace(/^www\./, "");
  const source = newsSources.find(item => [item.feedUrl, item.directoryUrl].some(value => value && new URL(value).hostname.replace(/^www\./, "") === host));
  if (source) { requireApprovedSource(source.feedUrl); return; }
  const publishers = ["cnn.com", "bbc.com", "bbc.co.uk", "aljazeera.net", "aljazeera.com", "reuters.com", "apnews.com", "ap.org", "alarabiya.net", "alarabiya.com"];
  if (publishers.some(domain => host === domain || host.endsWith(`.${domain}`))) throw new Error("الترجمة الكاملة لهذا المصدر تحتاج إذنًا. استخدمي موجز الوقائع المؤكدة بدلًا منها.");
}

// Discovery is independent of permission to translate/store/re-publish articles.
export function requireDiscoverySource(feedUrl: string) {
  const source = newsSources.find(item => item.feedUrl === feedUrl);
  if (!source?.discovery?.automatic || !source.discovery.reference.trim()) throw new Error("الاكتشاف الآلي غير معتمد لهذا المصدر؛ استخدمي المتابعة الرسمية وفق شروطها.");
  return source;
}

export function sourceForDirectory(directoryUrl: string) {
  return newsSources.find(source => source.directoryUrl === directoryUrl || new URL(source.feedUrl).hostname.replace(/^www\./, "") === new URL(directoryUrl).hostname.replace(/^www\./, ""));
}
