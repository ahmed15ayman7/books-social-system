import { db } from "./db";
import { addDays, cairoAt, cairoDay } from "./plan";

export interface DaySummary {
  day: string;
  total: number;
  published: number;
  failed: number;
  ready: number;
  books: { id: string; titleAr: string; titleEn: string; coverUrl: string | null; status: string; total: number; published: number }[];
}

/** ملخص كل يوم في فترة (بتوقيت القاهرة) */
export async function daySummaries(from: string, to: string): Promise<Map<string, DaySummary>> {
  const posts = await db.post.findMany({
    where: { scheduledAt: { gte: cairoAt(from, "00:00"), lt: cairoAt(addDays(to, 1), "00:00") }, status: { not: "SKIPPED" } },
    select: { status: true, scheduledAt: true, book: { select: { id: true, titleAr: true, titleEn: true, coverUrl: true, status: true } } },
  });
  const out = new Map<string, DaySummary>();
  for (const p of posts) {
    const day = cairoDay(p.scheduledAt);
    let s = out.get(day);
    if (!s) out.set(day, (s = { day, total: 0, published: 0, failed: 0, ready: 0, books: [] }));
    s.total++;
    if (p.status === "PUBLISHED") s.published++;
    if (p.status === "FAILED") s.failed++;
    if (p.status === "READY") s.ready++;
    let b = s.books.find((x) => x.id === p.book.id);
    if (!b) s.books.push((b = { ...p.book, total: 0, published: 0 }));
    b.total++;
    if (p.status === "PUBLISHED") b.published++;
  }
  return out;
}

/** منشورات اتنشرت مقابل المخطط لكل يوم (للـchart) */
export async function dailySeries(from: string, to: string) {
  const map = await daySummaries(from, to);
  const today = cairoDay();
  const rows: { day: string; published: number; remaining: number; missed: number }[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const s = map.get(d);
    const pub = s?.published ?? 0;
    const rest = (s?.total ?? 0) - pub;
    rows.push({ day: d, published: pub, remaining: d >= today ? rest : 0, missed: d < today ? rest : 0 });
  }
  return rows;
}

export async function platformBreakdown(from: string, to: string) {
  const rows = await db.post.groupBy({
    by: ["platform", "status"],
    where: { scheduledAt: { gte: cairoAt(from, "00:00"), lt: cairoAt(addDays(to, 1), "00:00") } },
    _count: true,
  });
  const out: Record<string, { platform: string; published: number; total: number }> = {};
  for (const r of rows) {
    if (r.status === "SKIPPED") continue;
    const o = (out[r.platform] ??= { platform: r.platform, published: 0, total: 0 });
    o.total += r._count;
    if (r.status === "PUBLISHED") o.published += r._count;
  }
  return Object.values(out);
}

export async function pipelineCounts() {
  const rows = await db.contentBook.groupBy({ by: ["status"], _count: true });
  const m = Object.fromEntries(rows.map((r) => [r.status, r._count])) as Record<string, number>;
  return ["QUEUED", "PRODUCING", "READY", "PUBLISHING", "PUBLISHED", "FAILED"].map((s) => ({ status: s, count: m[s] ?? 0 }));
}
