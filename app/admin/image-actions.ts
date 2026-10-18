"use server";

import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import { auth } from "../../auth";
import { isNewsReadOnly, requireDatabaseTarget } from "../../lib/database-guard";
import { prepareArticleImage, imageMimeTypes, maxImageBytes } from "../../lib/article-image";

export async function uploadArticleImage(formData: FormData) {
  if (isNewsReadOnly()) return { ok: false as const, message: "رفع الصور متوقف في وضع القراءة فقط." };
  const session = await auth();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || session?.user?.email?.trim().toLowerCase() !== email) return { ok: false as const, message: "سجّلي الدخول بحساب المدير لرفع الصورة." };
  // Local isolated previews must never consume a production storage token.
  if (process.env.NYBA_DATABASE_PROFILE === "isolated-test" || process.env.NYBA_IMAGE_UPLOADS_ENABLED !== "true" || !process.env.BLOB_READ_WRITE_TOKEN || !/^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/.test(process.env.NYBA_PUBLIC_BLOB_HOST ?? "")) {
    return { ok: false as const, message: "رفع الصور غير مفعّل لهذه النسخة. يمكنك استخدام رابط صورة تملكين حق استخدامها." };
  }
  if (formData.get("imageRightsConfirmed") !== "yes") return { ok: false as const, message: "أكدي أنك تملكين حق استخدام الصورة قبل رفعها." };
  const file = formData.get("image");
  if (!(file instanceof File)) return { ok: false as const, message: "اختاري صورة JPEG أو PNG أو WebP حتى 2 ميغابايت." };
  if (!imageMimeTypes.includes(file.type)) return { ok: false as const, message: "نوع الصورة غير مدعوم على الخادم؛ حوّليها إلى JPEG أو PNG أو WebP قبل الرفع." };
  if (file.size < 1) return { ok: false as const, message: "ملف الصورة فارغ؛ اختاري صورة أخرى." };
  if (file.size > maxImageBytes) return { ok: false as const, message: "حجم الصورة بعد التحويل يتجاوز 2 ميغابايت؛ اختاري نسخة أصغر." };
  try {
    requireDatabaseTarget(); // Match before any external storage operation; no DB connection.
    let image: Buffer;
    try { image = await prepareArticleImage(file); }
    catch { return { ok: false as const, message: "فشل فحص محتوى الصورة: الملف تالف أو لا يطابق نوعه، أو أبعاده غير آمنة، أو يحتوي عدة إطارات. صدّري صورة JPEG ثابتة وأعيدي المحاولة." }; }
    const result = await put(`news/${randomUUID()}.webp`, image, {
      access: "public", contentType: "image/webp", addRandomSuffix: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const url = new URL(result.url);
    if (url.protocol !== "https:" || url.hostname !== process.env.NYBA_PUBLIC_BLOB_HOST || url.username || url.password) throw new Error("INVALID_STORAGE_RESPONSE");
    return { ok: true as const, url: url.href, message: "رُفعت الصورة. لن تُربط بالخبر حتى تحفظي المسودة." };
  } catch {
    return { ok: false as const, message: "تعذّر رفع الصورة إلى التخزين أو التحقق من الاتصال الآمن. حاولي مجددًا؛ لم تُربط الصورة بالخبر." };
  }
}
