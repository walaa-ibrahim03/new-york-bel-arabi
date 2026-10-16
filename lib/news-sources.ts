import { categories } from "./categories";


export type NewsSource = {
  id: string;
  name: string;
  feedUrl: string;
  category: (typeof categories)[number];
  termsUrl: string;
  permission: { automaticImport: boolean; translation: boolean; reference: string };
};

export const newsSources: NewsSource[] = [
  {
    id: "gothamist",
    name: "Gothamist",
    feedUrl: "https://gothamist.com/feed",
    category: "أخبار محلية",
    termsUrl: "https://wnyc.org/terms/",
    permission: { automaticImport: false, translation: false, reference: "" },
  },
  {
    id: "the-city",
    name: "THE CITY",
    feedUrl: "https://www.thecity.nyc/rss/index.xml",
    category: "سكن واقتصاد",
    termsUrl: "https://www.thecity.nyc/republishing/",
    permission: { automaticImport: false, translation: false, reference: "" },
  },
  {
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
