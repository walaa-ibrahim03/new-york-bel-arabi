// Discovery permissions are distinct from technical RSS availability and republication.
// No automatic access is enabled without documented permission for our use.
export const localNewsSources = [
  { id: "abc7ny", name: "ABC7NY", url: "https://abc7ny.com/", status: "RSS يعمل تقنيًا؛ الجلب داخل اللوحة ينتظر تصريح الاستخدام." },
  { id: "nbc", name: "NBC New York", url: "https://www.nbcnewyork.com/news/local/", status: "RSS يعمل تقنيًا؛ الجلب داخل اللوحة ينتظر تصريح الاستخدام." },
  { id: "news12", name: "News 12 Brooklyn", url: "https://brooklyn.news12.com/", status: "متابعة مباشرة؛ لم يتأكد RSS رسمي مناسب، والأتمتة تحتاج إذنًا." },
  { id: "post", name: "New York Post", url: "https://nypost.com/metro/", status: "RSS يعمل تقنيًا؛ الجمع الآلي واستخدام AI يحتاجان تصريحًا." },
  { id: "eagle", name: "Brooklyn Eagle", url: "https://brooklyneagle.com/", status: "متابعة مباشرة؛ رابط RSS رفض الوصول (403)، ولا نتجاوز الحجب." },
  { id: "silive", name: "SILive", url: "https://www.silive.com/", status: "RSS يعمل تقنيًا؛ الجلب واستخدام AI ينتظران تصريح الاستخدام." },
] as const;
export function selectedLocalSource(id: unknown) {
  return typeof id === "string" ? localNewsSources.find(source => source.id === id) : undefined;
}
