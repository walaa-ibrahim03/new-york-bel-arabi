/* eslint-disable @next/next/no-img-element -- Local object URLs and validated public Blob previews do not need the image optimizer. */
"use client";
import { useEffect, useRef, useState } from "react";
import { uploadArticleImage } from "./image-actions";

export default function ArticleImageUpload({imageUrl,confirmed,disabled,onChange,onConfirmed,onBusyChange}:{imageUrl:string;confirmed:boolean;disabled:boolean;onChange:(url:string)=>void;onConfirmed:(value:boolean)=>void;onBusyChange:(value:boolean)=>void}) {
  const [file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(""),[uploading,setUploading]=useState(false),[message,setMessage]=useState("");
  const lock=useRef(false);
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
  async function upload(){
    if(!file||!confirmed||disabled||lock.current)return;
    lock.current=true;setUploading(true);setMessage("جارٍ رفع الصورة…");
    const data=new FormData();data.set("image",file);data.set("imageRightsConfirmed","yes");
    try{const result=await uploadArticleImage(data);if(!result.ok){setMessage(result.message);return;}onChange(result.url);setFile(null);setPreview("");onBusyChange(false);setMessage(result.message);}
    catch{setMessage("تعذّر الاتصال بخدمة رفع الصور. لم تُربط الصورة بالخبر.");}
    finally{lock.current=false;setUploading(false);}
  }
  return <section className="space-y-3 rounded-xl border bg-zinc-50 p-4" aria-label="رفع صورة من الجهاز">
    <label className="block">رفع صورة من الجهاز (اختياري)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||uploading} onChange={e=>{
      const selected=e.target.files?.[0]??null;setMessage("");
      if(selected&&(!["image/jpeg","image/png","image/webp"].includes(selected.type)||selected.size<1||selected.size>2*1024*1024)){setMessage("اختاري صورة JPEG أو PNG أو WebP حتى 2 ميغابايت.");setFile(null);setPreview("");onBusyChange(false);onConfirmed(false);e.target.value="";return;}
      setFile(selected);setPreview(selected?URL.createObjectURL(selected):"");onConfirmed(false);onBusyChange(Boolean(selected));
    }} className="mt-2 block w-full text-sm"/></label>
    <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={disabled||uploading} onChange={e=>onConfirmed(e.target.checked)}/>أؤكد أنني أملك حق استخدام هذه الصورة</label>
    {(preview||imageUrl)&&<img src={preview||imageUrl} alt="معاينة الصورة قبل حفظ الخبر" className="max-h-64 w-full rounded-lg object-contain"/>}
    <p className="text-xs">JPEG أو PNG أو WebP حتى 2 ميغابايت. تُفحص الصورة وتُزال بياناتها الوصفية على الخادم. الصورة المرفوعة عامة، ولا تُربط بالخبر حتى الحفظ. بدون صورة يبقى الغلاف التحريري.</p>
    {file&&<div className="flex gap-3"><button type="button" disabled={disabled||uploading||!confirmed} onClick={upload} className="rounded-lg border px-4 py-2 disabled:opacity-50">{uploading?"جارٍ الرفع…":"رفع الصورة"}</button><button type="button" disabled={disabled||uploading} onClick={()=>{setFile(null);setPreview("");onBusyChange(false);setMessage("");}} className="rounded-lg border px-4 py-2">إلغاء اختيار الصورة</button></div>}
    {message&&<p role="status" aria-live="polite" className="rounded-lg bg-white p-3 text-sm">{message}</p>}
  </section>;
}
