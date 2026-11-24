import { readFile } from "node:fs/promises";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Health check لـCoolify: بيرجع 200 طول ما السيرفر شغال، عشان الكونتينر ميتمسحش،
 * وبيعرض أي مشكلة في التجهيز أو الاتصال بالقاعدة عشان تعرف تصلّحها.
 * (مفيش أسرار هنا: رسايل أخطاء بس، من غير قيم المتغيرات)
 */
export async function GET() {
  const problems: string[] = [];
  try {
    const startup = (await readFile("/tmp/startup-status.txt", "utf8")).trim();
    if (startup) problems.push(...startup.split("\n"));
  } catch {
    // مش جوه Docker
  }
  let database = "ok";
  try {
    await db.$queryRaw`SELECT 1`;
  } catch (e) {
    const err = e as Error & { code?: string; cause?: { kind?: string; message?: string } };
    const lines = (err.message ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
    database = [err.code, err.cause?.kind, lines.slice(-2).join(" ")].filter(Boolean).join(" · ").slice(0, 300) || "unreachable";
    problems.push(`قاعدة السيستم: ${database}`);
  }
  return Response.json({ ok: problems.length === 0, database, problems });
}
