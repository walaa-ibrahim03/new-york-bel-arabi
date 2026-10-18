import sharp from "sharp";

export const maxImageBytes = 2 * 1024 * 1024;
export const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"];

export async function prepareArticleImage(file: File): Promise<Buffer> {
  if (!imageMimeTypes.includes(file.type) || file.size < 1 || file.size > maxImageBytes) throw new Error("INVALID_IMAGE");
  const bytes = Buffer.from(await file.arrayBuffer());
  // Reject SVG/HTML before passing untrusted bytes to an image decoder.
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const webp = bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
  if (!(file.type === "image/jpeg" && jpeg || file.type === "image/png" && png || file.type === "image/webp" && webp)) throw new Error("INVALID_IMAGE");
  const image = sharp(bytes, { limitInputPixels: 16_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height || (metadata.pages ?? 1) > 1) throw new Error("INVALID_IMAGE");
  // Decode and re-encode: strip EXIF/GPS and never retain the uploaded filename.
  const output = await image.rotate().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  if (output.length > maxImageBytes) throw new Error("INVALID_IMAGE");
  return output;
}
