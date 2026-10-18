// Browser-only conversion. No file leaves the device until the existing upload action.
const maxOutputBytes=2*1024*1024;
export class BrowserImageError extends Error {}
export async function prepareBrowserArticleImage(file:File):Promise<File> {
  const heif=/^image\/(heic|heif)(-sequence)?$/i.test(file.type)||/\.(heic|heif)$/i.test(file.name);
  const supported=["image/jpeg","image/png","image/webp"].includes(file.type)||(!file.type&&/\.(jpe?g|png|webp)$/i.test(file.name));
  if(!heif&&!supported)throw new BrowserImageError("نوع الصورة غير مدعوم. اختاري JPEG أو PNG أو WebP، أو صورة HEIC/HEIF قابلة للتحويل في متصفحك.");
  if(!file.size)throw new BrowserImageError("ملف الصورة فارغ؛ اختاري صورة أخرى.");
  if(file.size>50*1024*1024)throw new BrowserImageError("حجم الصورة يتجاوز 50 ميغابايت؛ صدّري نسخة أصغر من تطبيق الصور لتجنب استهلاك ذاكرة الجهاز.");
  let drawable:ImageBitmap|HTMLImageElement|undefined;
  let objectUrl="";
  try {
    if(typeof createImageBitmap==="function"){
      try{drawable=await createImageBitmap(file,{imageOrientation:"from-image"});}catch{/* Safari may support HEIC via an image element instead. */}
    }
    if(!drawable){
      objectUrl=URL.createObjectURL(file);
      drawable=await new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("DECODE"));image.src=objectUrl;});
    }
    const width=drawable.width,height=drawable.height;
    if(!width||!height)throw new Error("DECODE");
    const scale=Math.min(1,1600/width,1600/height);
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));
    const context=canvas.getContext("2d");if(!context)throw new BrowserImageError("تعذر تجهيز الصورة في هذا المتصفح. احفظيها بصيغة JPEG أصغر من 2 ميغابايت وحاولي بمتصفح محدّث.");
    for(let attempt=0;attempt<3;attempt++){
      context.fillStyle="#ffffff";context.fillRect(0,0,canvas.width,canvas.height);
      context.drawImage(drawable,0,0,canvas.width,canvas.height);
      for(const quality of [0.86,0.72,0.58,0.44]){
        const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
        if(!blob||blob.type!=="image/jpeg"||!blob.size)throw new BrowserImageError("فشل تحويل الصورة إلى JPEG. صدّري نسخة JPEG أو WebP من تطبيق الصور وحاولي مجددًا.");
        if(blob.size<=maxOutputBytes)return new File([blob],"news-image.jpg",{type:"image/jpeg"});
      }
      canvas.width=Math.max(1,Math.round(canvas.width*0.75));canvas.height=Math.max(1,Math.round(canvas.height*0.75));
    }
    throw new BrowserImageError("بقي حجم الصورة أكبر من 2 ميغابايت بعد الضغط. قصّي الصورة أو صدّري نسخة أصغر ثم أعيدي المحاولة.");
  }catch(error){
    if(error instanceof BrowserImageError)throw error;
    throw new BrowserImageError(heif?"تعذر تحويل صورة HEIC/HEIF في هذا المتصفح. افتحيها في تطبيق الصور وصدّريها كـJPEG، أو جرّبي Safari محدّثًا، ثم اختاري النسخة الجديدة.":"تعذر قراءة الصورة أو تحويلها؛ قد يكون الملف تالفًا. افتحيه في تطبيق الصور وصدّري نسخة JPEG أو WebP ثم حاولي مجددًا.");
  }finally{
    if(drawable&&"close" in drawable)drawable.close();
    if(objectUrl)URL.revokeObjectURL(objectUrl);
  }
}
