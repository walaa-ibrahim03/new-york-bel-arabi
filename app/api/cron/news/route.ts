import { timingSafeEqual } from "node:crypto";
import { collectScheduledNews } from "../../../../lib/scheduled-news";
export const maxDuration = 120;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  if (!secret || secret.length < 32 || Buffer.byteLength(supplied) !== Buffer.byteLength(`Bearer ${secret}`) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(`Bearer ${secret}`))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.VERCEL_ENV !== "production" || process.env.NYBA_DATABASE_PROFILE !== "production" || process.env.NYBA_AUTOMATION_ENABLED !== "true") return Response.json({ disabled: true }, { status: 503 });
  try { return Response.json(await collectScheduledNews(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Collection unavailable; no automatic publication." }, { status: 503 }); }
}
