import { PublicationValidationError } from "./publication-policy";
// Only new uploaded attachments need acknowledgement; existing images remain unchanged.
export function validateUploadedImageAttachment(url: string, confirmed: boolean): void {
  if (!confirmed) throw new PublicationValidationError("أكدي أنك تملكين حق استخدام الصورة قبل حفظها.");
  let image: URL;
  try { image = new URL(url); } catch { throw new PublicationValidationError("رابط الصورة المرفوعة غير صالح."); }
  const host=process.env.NYBA_PUBLIC_BLOB_HOST;
  if (!host || !/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(host) || image.protocol!=="https:" || image.hostname!==host || image.port || image.username || image.password || image.search || image.hash || !/^\/news\/[a-zA-Z0-9-]+\.webp$/.test(image.pathname)) throw new PublicationValidationError("اختاري صورة رُفعت إلى مخزن صور الموقع.");
}
