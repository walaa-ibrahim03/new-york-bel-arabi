// Discovery permissions are distinct from technical RSS availability and republication.
// No automatic access is enabled without documented permission for our use.
export const localNewsSources = [
  { id: "abc7ny", name: "ABC7NY", url: "https://abc7ny.com/", status: "RSS يعمل تقنيًا؛ الجلب داخل اللوحة ينتظر تصريح الاستخدام." },
  { id: "nbc", name: "NBC New York", url: "https://www.nbcnewyork.com/news/local/", status: "RSS يعمل تقنيًا؛ الجلب داخل اللوحة ينتظر تصريح الاستخدام." },
  { id: "post", name: "New York Post", url: "https://nypost.com/metro/", status: "RSS يعمل تقنيًا؛ الجمع الآلي واستخدام AI يحتاجان تصريحًا." },
  { id: "silive", name: "SILive", url: "https://www.silive.com/", status: "RSS يعمل تقنيًا؛ الجلب واستخدام AI ينتظران تصريح الاستخدام." },
] as const;
export function selectedLocalSource(id: unknown) {
  return typeof id === "string" ? localNewsSources.find(source => source.id === id) : undefined;
}
