
export type NewsSource = {
  id: string;
  name: string;
  feedUrl: string;
  category: string;
};

export const newsSources: NewsSource[] = [
  {
    id: "gothamist",
    name: "Gothamist",
    feedUrl: "https://gothamist.com/feed",
    category: "أخبار محلية",
  },
  {
    id: "the-city",
    name: "THE CITY",
    feedUrl: "https://www.thecity.nyc/rss/index.xml",
    category: "سكن واقتصاد",
  },
  {
    id: "amny",
    name: "amNewYork",
    feedUrl: "https://www.amny.com/feed/",
    category: "أخبار محلية",
  },
];
