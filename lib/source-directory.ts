// Monitoring links do not grant syndication, scraping or translation rights.
export const sourceDirectory = [
  { name: "CNN / CNN بالعربية", languages: "عربي / English", url: "https://arabic.cnn.com/", follow: "https://www.cnn.com/", method: "الموقع والتطبيق والتنبيهات؛ لا نعتمد روابط RSS القديمة غير المتحقق منها", terms: "https://arabic.cnn.com/terms", reuse: "متابعة يدوية؛ ترخيص CNN مطلوب لإعادة نشر النصوص والصور" },
  { name: "BBC / BBC عربي", languages: "عربي / English", url: "https://www.bbc.com/arabic", follow: "https://support.bbc.co.uk/platform/feeds/NewsFeeds.htm", method: "الموقع والتطبيق؛ دليل RSS الرسمي للإنجليزية", terms: "https://www.bbc.com/usingthebbc/terms/", reuse: "RSS للأعمال يحتاج إذنًا؛ لا ترجمة كاملة دون ترخيص" },
  { name: "الجزيرة / Al Jazeera", languages: "عربي / English", url: "https://www.aljazeera.net/", follow: "https://www.aljazeera.net/newsletters", method: "نشرات وتنبيهات رسمية؛ RSS الإنجليزي متاح عبر موقع الجزيرة الإنجليزية", terms: "https://terms.aljazeera.net/index-ar.html", reuse: "متابعة فقط؛ وجود RSS لا يمنح إذن إعادة الاستخدام" },
  { name: "Reuters", languages: "English", url: "https://www.reuters.com/", follow: "https://reutersagency.com/content-delivery-platforms/", method: "الموقع؛ Reuters API وتسليم محتوى بعقد", terms: "https://reutersagency.com/", reuse: "API وترجمة وإعادة نشر حسب العقد؛ السعر بعرض خاص" },
  { name: "Associated Press / AP", languages: "English / لغات عبر التعاقد", url: "https://apnews.com/", follow: "https://developer.ap.org/", method: "الموقع والتطبيق؛ AP Media API للمشتركين", terms: "https://www.ap.org/terms-and-conditions/", reuse: "استخدام المحتوى حسب الترخيص؛ لا نستخدم API دون عقد" },
  { name: "العربية / Al Arabiya", languages: "عربي / English", url: "https://www.alarabiya.net/", follow: "https://english.alarabiya.net/", method: "الموقع والتطبيق والتنبيهات؛ رابط RSS القديم غير معتمد للتشغيل", terms: "https://www.alarabiya.com/terms/", reuse: "متابعة؛ إعادة الاستخدام تحتاج إذنًا يغطي الغرض" },
  { name: "Gothamist / WNYC", languages: "English", url: "https://gothamist.com/", follow: "https://gothamist.com/feed", method: "الموقع وRSS", terms: "https://wnyc.org/terms/", reuse: "RSS شخصي غير تجاري؛ جلب الموقع وإعادة النشر معطلان" },
  { name: "THE CITY", languages: "English", url: "https://www.thecity.nyc/", follow: "https://www.thecity.nyc/republishing/", method: "RSS الرسمي في The City Reporter لاكتشاف العناوين؛ نفس الناشر City Report, Inc.", terms: "https://www.thecityreporter.nyc/republishing/", reuse: "اكتشاف العناوين متاح؛ مسودة مباشرة من الوقائع المتاحة في العنوان، دون استيراد المقالات أو ترجمتها؛ يراجعها المدير قبل النشر" },
  { name: "amNewYork", languages: "English", url: "https://www.amny.com/", follow: "https://www.amny.com/feed/", method: "الموقع وRSS", terms: "https://www.amny.com/terms-of-use/", reuse: "RSS شخصي؛ غير مفعّل لموقعنا دون إذن" },
  { name: "NYC — مكتب العمدة", languages: "English / عربي لبعض الخدمات", url: "https://www.nyc.gov/", follow: "https://www.nyc.gov/mayors-office/news", method: "بيانات رسمية أولية لأخبار نيويورك؛ متابعة يدوية", terms: "https://www.nyc.gov/home/terms-of-use.page", reuse: "إعداد موجز للوقائع مع نسبها؛ لا نفترض أن محتوى حكومة محلية ملك عام" },
  { name: "USCIS", languages: "English / ترجمات مختارة", url: "https://www.uscis.gov/", follow: "https://www.uscis.gov/newsroom", method: "الأخبار والتنبيهات الرسمية للهجرة؛ متابعة يدوية", terms: "https://www.uscis.gov/website-policies", reuse: "مصدر أولي للوقائع؛ مراجعة حقوق كل مادة وصورة" },
  { name: "NASA — البيانات الصحفية", languages: "English", url: "https://www.nasa.gov/", follow: "https://www.nasa.gov/rss-feeds/", method: "RSS رسمي للبيانات الصحفية؛ موصل تجريبي جاهز للجلب كمسودات", terms: "https://www.nasa.gov/nasa-brand-center/images-and-media/", reuse: "معلومات NASA مع نسبها، دون إيحاء تأييد أو جلب صور/مواد أطراف ثالثة" },
] as const;

export function discoveryEditorLink(sourceUrl: string, articleUrl?: string, headline?: string) {
  const params = new URLSearchParams({ source: sourceUrl });
  if (articleUrl) params.set("url", articleUrl);
  if (headline) params.set("headline", headline);
  return `/admin/new?${params}`;
}
export function sourceFromDirectory(value: unknown) {
  return typeof value === "string" ? sourceDirectory.find(source => source.url === value) : undefined;
}
export function directoryArticleUrl(source: { url: string }, value: unknown) {
  if (typeof value !== "string" || value.length > 2000) return "";
  try {
    const url = new URL(value), expected = new URL(source.url).hostname.replace(/^www\./, "");
    return url.protocol === "https:" && !url.username && !url.password && (url.hostname.replace(/^www\./, "") === expected || (expected === "thecity.nyc" && url.hostname.replace(/^www\./, "") === "thecityreporter.nyc")) ? url.href : "";
  } catch { return ""; }
}
