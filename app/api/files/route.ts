import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { extname } from "node:path";
import { getSession } from "@/lib/auth";
import { db, getSettings } from "@/lib/db";
import { MIME, safePath } from "@/lib/files";

export const dynamic = "force-dynamic";

/**
 * عرض ملف من فولدر الكتاب: /api/files?book=<id>&path=final/video_ar.mp4
 * بيدعم Range عشان الفيديو يتقدّم ويرجع. شغال بس لو السيرفر على نفس الجهاز اللي عليه الفولدر.
 */
export async function GET(req: Request) {
  if (!(await getSession())) return new Response("unauthorized", { status: 401 });
  const u = new URL(req.url);
  const book = await db.contentBook.findUnique({ where: { id: u.searchParams.get("book") ?? "" }, select: { folder: true } });
  if (!book) return new Response("not found", { status: 404 });
  const settings = await getSettings();
  const full = safePath(settings.contentRoot, book.folder, u.searchParams.get("path") ?? "");
  if (!full) return new Response("bad path", { status: 400 });

  let size: number;
  try {
    const s = await stat(full);
    if (!s.isFile()) return new Response("not a file", { status: 400 });
    size = s.size;
  } catch {
    return new Response("الملف مش موجود على الجهاز ده", { status: 404 });
  }

  const type = MIME[extname(full).toLowerCase()] ?? "application/octet-stream";
  const headers: Record<string, string> = { "Content-Type": type, "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
  if (u.searchParams.get("download")) headers["Content-Disposition"] = `attachment; filename="${encodeURIComponent(full.split(/[\\/]/).pop()!)}"`;

  const range = req.headers.get("range");
  const m = range?.match(/bytes=(\d*)-(\d*)/);
  if (m) {
    const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
    const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    const stream = Readable.toWeb(createReadStream(full, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }
  const stream = Readable.toWeb(createReadStream(full)) as ReadableStream;
  return new Response(stream, { headers: { ...headers, "Content-Length": String(size) } });
}
