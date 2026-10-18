/* eslint-disable @next/next/no-img-element -- Local object URLs and validated public Blob previews do not need the image optimizer. */
"use client";
import { useEffect, useRef, useState } from "react";
import { prepareBrowserArticleImage, BrowserImageError } from "../../lib/browser-article-image";
import { uploadArticleImage } from "./image-actions";

export default function ArticleImageUpload({imageUrl,confirmed,disabled,onChange,onConfirmed,onBusyChange}:{imageUrl:string;confirmed:boolean;disabled:boolean;onChange:(url:string)=>void;onConfirmed:(value:boolean)=>void;onBusyChange:(value:boolean)=>void}) {
  const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(""),[uploading,setUploading]=useState(false),[message,setMessage]=useState("");
  const lock=useRef(false),alive=useRef(true);
  const [converting,setConverting]=useState(false),[error,setError]=useState(false);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  async function upload(){
    if(!file||!confirmed||disabled||lock.current)return;
    lock.current=true;setUploading(true);setError(false);setMessage("جارٍ رفع الصورة…");
    const data=new FormData();data.set("image",file);data.set("imageRightsConfirmed","yes");
    try{const result=await uploadArticleImage(data);if(!result.ok){setError(true);setMessage(result.message);return;}onChange(result.url);setFile(null);setPreview("");onBusyChange(false);setMessage(result.message);}
    catch{setError(true);setMessage("تعذّر الاتصال بخدمة رفع الصور. لم تُربط الصورة بالخبر.");}
    finally{lock.current=false;setUploading(false);}
  }
  return <section className="space-y-3 rounded-xl border bg-zinc-50 p-4" aria-label="رفع صورة من الجهاز">
    <label className="block">رفع صورة من الجهاز (اختياري)<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" disabled={disabled||uploading||converting} onChange={async e=>{
      const input=e.target;
      const selected=input.files?.[0]??null;
      if(lock.current)return;
      setMessage("");setError(false);setFile(null);setPreview("");onConfirmed(false);
      if(!selected){onBusyChange(false);return;}
      lock.current=true;setConverting(true);onBusyChange(true);setMessage("جارٍ تصغير الصورة وضغطها على جهازك…");
      try{const prepared=await prepareBrowserArticleImage(selected);if(!alive.current)return;setFile(prepared);setPreview(URL.createObjectURL(prepared));setMessage("الصورة جاهزة للمعاينة بحجم أقل من 2 ميغابايت. أكدي حق استخدامها ثم اضغطي رفع الصورة.");}
      catch(cause){if(!alive.current)return;setError(true);setMessage(cause instanceof BrowserImageError?cause.message:"فشل تجهيز الصورة. صدّري نسخة JPEG أصغر ثم حاولي مجددًا.");onBusyChange(false);}
      finally{lock.current=false;input.value="";if(alive.current)setConverting(false);}
    }} className="mt-2 block w-full text-sm"/></label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={disabled||uploading||converting} onChange={e=>onConfirmed(e.target.checked)}/>أؤكد أنني أملك حق استخدام هذه الصورة</label>
    {(preview||imageUrl)&&<img src={preview||imageUrl} alt="معاينة الصورة قبل حفظ الخبر" className="max-h-64 w-full rounded-lg object-contain"/>}
    <p className="text-xs">تُصغّر الصور تلقائيًا إلى 1600 بكسل كحد أقصى وتُضغط إلى JPEG لا يتجاوز 2 ميغابايت، مع محاولة تحويل HEIC/HEIF محليًا. تُفحص الصورة وتُزال بياناتها الوصفية على الخادم. الصورة المرفوعة عامة، ولا تُربط بالخبر حتى الحفظ. بدون صورة يبقى الغلاف التحريري.</p>
    {file&&<div className="flex gap-3"><button type="button" disabled={disabled||uploading||!confirmed} onClick={upload} className="rounded-lg border px-4 py-2 disabled:opacity-50">{uploading?"جارٍ الرفع…":"رفع الصورة"}</button><button type="button" disabled={disabled||uploading||converting} onClick={()=>{setFile(null);setPreview("");onBusyChange(false);setMessage("");}} className="rounded-lg border px-4 py-2">إلغاء اختيار الصورة</button></div>}
    {message&&<p role={error?"alert":"status"} aria-live="polite" className="rounded-lg bg-white p-3 text-sm">{message}</p>}
  </section>;
}
