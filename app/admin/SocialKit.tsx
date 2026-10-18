"use client";
import { useState } from "react";
import { socialPosts, type SocialArticle } from "../../lib/social-posts";
import { createSocialArtwork } from "../../lib/social-artwork";

export function EditorialCover({ title, category }: { title:string;category:string }) {
  return <div role="img" aria-label={`غلاف تحريري أصلي: ${title}`} className="rounded-2xl border-t-8 border-amber-400 bg-slate-950 p-6 text-white"><p dir="ltr" className="font-black text-amber-300">NY bel Arabi</p><p className="mt-4 text-xs text-amber-200">{category} · غلاف تحريري</p><p className="mt-3 text-xl font-bold leading-9">{title}</p><p className="mt-4 text-xs text-slate-300">الخبر في دقيقة — تصميم أصلي، ليس صورة للحدث</p></div>;
}
export default function SocialKit({article,origin,published}:{article:SocialArticle;origin:string;published:boolean}) {
  const posts=socialPosts(article,origin),[message,setMessage]=useState(""),[image,setImage]=useState("");
  if(!published)return null;
  async function copy(text:string){try{await navigator.clipboard.writeText(text);setMessage("نُسخ النص. راجعيه قبل نشره في حسابك.");}catch{setMessage("تعذر النسخ التلقائي؛ يمكنك تحديد النص ونسخه يدويًا.");}}
  async function artwork(){try{setImage(await createSocialArtwork(article.title,article.category));setMessage("الغلاف جاهز للتنزيل؛ لم تُستخدم صورة مصدر أو خدمة تخزين.");}catch{setMessage("تعذر تجهيز الصورة في المتصفح. النصوص جاهزة؛ جرّبي متصفحًا يدعم Canvas.");}}
  return <details className="mt-5 space-y-4 rounded-xl border bg-white p-4" aria-label="محتوى السوشيال"><summary className="cursor-pointer font-bold">تجهيز فيسبوك وإنستغرام والغلاف</summary><p className="text-sm leading-7">محتوى مقترح قابل للتعديل والنسخ فقط؛ لا اتصال بحسابات السوشيال ولا نشر تلقائي.</p>{([['فيسبوك',posts.facebook],['إنستغرام',posts.instagram],['هاشتاغات',posts.hashtags]] as const).map(([label,text])=><SocialText key={label} label={label} text={text} copy={copy}/>)}<EditorialCover title={article.title} category={article.category}/><button type="button" onClick={artwork} className="rounded-lg bg-amber-400 px-4 py-3 font-bold">إنشاء غلاف PNG أصلي</button>{image&&<div className="space-y-3">{/* eslint-disable-next-line @next/next/no-img-element */}
<img src={image} width={1080} height={1080} alt={`غلاف تحريري أصلي للخبر: ${article.title}`} className="h-auto w-full max-w-sm rounded-xl"/><a href={image} download={`ny-bel-arabi-${article.id}.png`} className="inline-block rounded-lg border px-4 py-3">تنزيل الغلاف</a></div>}{message&&<p role="status" className="text-sm">{message}</p>}</details>;
}
function SocialText({label,text,copy}:{label:string;text:string;copy:(text:string)=>Promise<void>}){const[value,setValue]=useState(text);return <div className="space-y-2"><label className="block">{label}<textarea rows={5} value={value} onChange={e=>setValue(e.target.value)} className="input-style"/></label><button type="button" onClick={()=>void copy(value)} className="rounded-lg border px-3 py-2">نسخ نص {label}</button></div>;}
