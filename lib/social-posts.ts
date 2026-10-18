import { articlePath, focusKeywords } from "./news-seo";
export type SocialArticle = { id:number;title:string;summary:string;category:string;sourceName?:string|null };
export function socialPosts(article: SocialArticle, origin: string) {
  let url = "";
  try { const base=new URL(origin);if(base.protocol==="https:"&&!base.username&&!base.password)url=base.origin+articlePath(article); } catch { /* Text remains usable without a configured public origin. */ }
  const tags=focusKeywords(article.title,article.category).map(word=>`#${word.replace(/[^\p{L}\p{N}]+/gu,"_").replace(/^_|_$/g,"")}`).filter(tag=>tag.length>2).slice(0,5).join(" ");
  const attribution=article.sourceName?`المصدر: ${article.sourceName}`:"";
  return { facebook:[article.title,article.summary,attribution,url].filter(Boolean).join("\n\n"),instagram:[article.title,article.summary,attribution,tags,url].filter(Boolean).join("\n\n"),hashtags:tags,url };
}
