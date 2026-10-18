import { categories } from "./categories";


export type NewsSource = {
  id: string;
  name: string;
  feedUrl: string;
  directoryUrl?: string;
  officialNY?: boolean;
  rssFacts?: { allowed: boolean; reference: string };
  articlePrefix?: string;
  maxAgeHours?: number;
  discoveryStatus?: string;
  category: (typeof categories)[number];
  termsUrl: string;
  permission: { automaticImport: boolean; translation: boolean; reference: string };
  discovery?: { automatic: boolean; reference?: string };
  headlineAccess?: "allowed" | "restricted";
  coverage?: "US" | "WORLD" | "NY";
};

export const newsSources: NewsSource[] = [
  {
    headlineAccess: "allowed",
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
    headlineAccess: "allowed",
    discovery: { automatic: true, reference: "Publisher-offered RSS linked on the official homepage; thecity.nyc redirects to thecityreporter.nyc, same City Report, Inc. Private headline/link/date discovery only; no article snippets, images or translation rights. Reviewed 2026-10-17; see docs/news-discovery-ar.md." },
    discoveryStatus: "THE CITY / The City Reporter: اكتشاف العناوين والروابط والتواريخ متاح. نجهز موجزًا أصليًا من الوقائع الصريحة في العنوان؛ قد يكون قصيرًا. لا نجلب نص المقال أو نترجمه، والتفاصيل الإضافية عند الحاجة فقط.",
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
  {
    id: "nyc-notify", name: "Notify NYC", feedUrl: "https://feeds.everbridge.net/feeds/453003085617722/rss/rss.xml",
    directoryUrl: "https://a858-nycnotify.nyc.gov/notifynyc/", officialNY: true, coverage: "NY", category: "أخبار محلية", maxAgeHours: 6,
    articlePrefix: "https://feeds.everbridge.net/feeds/453003085617722/cap/",
    termsUrl: "https://a858-nycnotify.nyc.gov/notifynyc/home/faq",
    headlineAccess: "allowed",
    discovery: { automatic: true, reference: "Notify NYC official FAQ links this exact public Everbridge RSS for delivering City alerts. Verified 2026-10-17." },
    rssFacts: { allowed: true, reference: "Official public warning RSS facts for original attributed editorial briefs; no article/image reuse or endorsement. NYC terms reserve content rights. See docs/official-ny-news-ar.md." },
    permission: { automaticImport: false, translation: false, reference: "" },
  },
  {
    id: "nys-dot", name: "NYSDOT", feedUrl: "https://www.dot.ny.gov/rss/press-releases.xml",
    directoryUrl: "https://www.dot.ny.gov/", officialNY: true, coverage: "NY", category: "مواصلات", maxAgeHours: 336,
    termsUrl: "https://www.dot.ny.gov/rss/RSSFeeds",
    headlineAccess: "allowed",
    discovery: { automatic: true, reference: "Official NYSDOT RSS guide explicitly offers press-release headlines, summaries and links to feed readers. Verified 2026-10-17." },
    rssFacts: { allowed: true, reference: "RSS summary facts for original attributed briefs only; not full article translation or image republication. See docs/official-ny-news-ar.md." },
    permission: { automaticImport: false, translation: false, reference: "" },
  },
  {
    id: "uscis-ny", name: "USCIS", feedUrl: "https://www.uscis.gov/news/rss-feed/23269",
    directoryUrl: "https://www.uscis.gov/", officialNY: true, coverage: "US", category: "الهجرة والإقامة", maxAgeHours: 336,
    termsUrl: "https://www.uscis.gov/website-policies",
    headlineAccess: "allowed",
    discovery: { automatic: true, reference: "USCIS website policies offers official RSS; feed verified live 2026-10-17. Filter NY-related items and general application/policy notices, not unrelated local cases." },
    rssFacts: { allowed: true, reference: "First-party federal RSS facts only for original attributed briefs; no third-party images or wholesale article import. See docs/official-ny-news-ar.md." },
    permission: { automaticImport: false, translation: false, reference: "" },
  },
  { id: "abc7ny", name: "ABC7NY", feedUrl: "https://abc7ny.com/feed/", directoryUrl: "https://abc7ny.com/",
    category: "أخبار محلية", coverage: "NY", termsUrl: "https://disneytermsofuse.com/english/",
    discovery: { automatic: true, reference: "Official RSS endpoint; documentation only, not a runtime activation key." },
    headlineAccess: "restricted", discoveryStatus: "الجلب الآلي مقيد بشروط المصدر؛ إضافة رابط ووقائع متاحة دون جلب المقال.",
    permission: { automaticImport: false, translation: false, reference: "" },
  },
  { id: "nbc", name: "NBC New York", feedUrl: "https://www.nbcnewyork.com/news/local/feed/", directoryUrl: "https://www.nbcnewyork.com/news/local/",
    category: "أخبار محلية", coverage: "NY", termsUrl: "https://www.nbcnewyork.com/terms-of-service/",
    discovery: { automatic: true, reference: "Official RSS endpoint; documentation only, not a runtime activation key." },
    headlineAccess: "restricted", discoveryStatus: "الجلب الآلي مقيد بشروط المصدر؛ إضافة رابط ووقائع متاحة دون جلب المقال.",
    permission: { automaticImport: false, translation: false, reference: "" },
  },
  { id: "post", name: "New York Post", feedUrl: "https://nypost.com/metro/feed/", directoryUrl: "https://nypost.com/metro/",
    category: "أخبار محلية", coverage: "NY", termsUrl: "https://nypost.com/terms/",
    discovery: { automatic: true, reference: "Official RSS endpoint; documentation only, not a runtime activation key." },
    headlineAccess: "restricted", discoveryStatus: "الجلب الآلي مقيد بشروط المصدر؛ إضافة رابط ووقائع متاحة دون جلب المقال.",
    permission: { automaticImport: false, translation: false, reference: "" },
  },
  { id: "silive", name: "SILive", feedUrl: "https://www.silive.com/arc/outboundfeeds/rss-latest/?outputType=xml", directoryUrl: "https://www.silive.com/",
    category: "أخبار محلية", coverage: "NY", termsUrl: "https://www.advancelocal.com/advancelocalUserAgreement/user-agreement.html",
    discovery: { automatic: true, reference: "Official RSS endpoint; documentation only, not a runtime activation key." },
    headlineAccess: "restricted", discoveryStatus: "الجلب الآلي مقيد بشروط المصدر؛ إضافة رابط ووقائع متاحة دون جلب المقال.",
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
  if (!source?.discovery?.automatic) throw new Error("موصل RSS غير مفعّل تقنيًا.");
  // headlineAccess is a review flag for metadata discovery, not a runtime gate.
  // This does not grant article/snippet/image reuse permission.
  return source;
}

export function sourceForDirectory(directoryUrl: string) {
  return newsSources.find(source => source.directoryUrl === directoryUrl || new URL(source.feedUrl).hostname.replace(/^www\./, "") === new URL(directoryUrl).hostname.replace(/^www\./, ""));
}

export function requireRssFactsSource(feedUrl: string) {
  const source = requireDiscoverySource(feedUrl);
  if (source.headlineAccess !== "allowed" || !source.rssFacts?.allowed || !source.rssFacts.reference.trim()) throw new Error("RSS facts not approved");
  return source;
}
export function isSourceArticleUrl(source: { feedUrl: string; articlePrefix?: string }, value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      url.hostname.replace(/^www\./, "") === new URL(source.feedUrl).hostname.replace(/^www\./, "") &&
      (!source.articlePrefix || url.href.startsWith(source.articlePrefix));
  } catch { return false; }
}

// Technical readiness only. Access review remains visible as source metadata.
export function canDiscoverHeadlines(source: NewsSource | undefined): boolean {
  return Boolean(source?.discovery?.automatic);
}
