import { db } from "./db";
import { addDays, cairoAt, cairoDay, KIND_LABEL, PLATFORM_LABEL } from "./plan";

export type Range = { from: string; to: string; label: string };

export function resolveRange(sp: { range?: string; from?: string; to?: string }): Range {
  const today = cairoDay();
  const ok = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
  if (sp.range === "custom" && ok(sp.from) && ok(sp.to)) {
    const [from, to] = sp.from! <= sp.to! ? [sp.from!, sp.to!] : [sp.to!, sp.from!];
    return { from, to, label: `من ${from} لـ ${to}` };
  }
  if (sp.range === "week") {
    // الأسبوع من السبت
    const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 1) % 7;
    const from = addDays(today, -dow);
    return { from, to: addDays(from, 6), label: "الأسبوع ده" };
  }
  if (sp.range === "lastweek") {
    const dow = (new Date(`${today}T00:00:00Z`).getUTCDay() + 1) % 7;
    const from = addDays(today, -dow - 7);
    return { from, to: addDays(from, 6), label: "الأسبوع اللي فات" };
  }
  const [y, m] = today.split("-").map(Number);
  if (sp.range === "lastmonth") {
    const from = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 10);
    const to = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
    return { from, to, label: "الشهر اللي فات" };
  }
  return { from: `${today.slice(0, 7)}-01`, to: new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10), label: "الشهر ده" };
}

export async function reportData(r: Range) {
  const posts = await db.post.findMany({
    where: { scheduledAt: { gte: cairoAt(r.from, "00:00"), lt: cairoAt(addDays(r.to, 1), "00:00") }, status: { not: "SKIPPED" } },
    include: { book: { select: { id: true, titleAr: true, titleEn: true, folder: true } } },
    orderBy: { scheduledAt: "asc" },
  });
  const today = cairoDay();
  const byPlatform = new Map<string, { label: string; planned: number; published: number; failed: number; late: number }>();
  const byKind = new Map<string, { label: string; planned: number; published: number }>();
  const byBook = new Map<string, { title: string; titleEn: string; day: string; planned: number; published: number; links: string[] }>();
  for (const p of posts) {
    const pf = byPlatform.get(p.platform) ?? { label: PLATFORM_LABEL[p.platform], planned: 0, published: 0, failed: 0, late: 0 };
    pf.planned++;
    if (p.status === "PUBLISHED") pf.published++;
    else if (p.status === "FAILED") pf.failed++;
    else if (cairoDay(p.scheduledAt) < today) pf.late++;
    byPlatform.set(p.platform, pf);
    const k = byKind.get(p.kind) ?? { label: KIND_LABEL[p.kind], planned: 0, published: 0 };
    k.planned++;
    if (p.status === "PUBLISHED") k.published++;
    byKind.set(p.kind, k);
    const b = byBook.get(p.bookId) ?? { title: p.book.titleAr, titleEn: p.book.titleEn, day: cairoDay(p.scheduledAt), planned: 0, published: 0, links: [] };
    b.planned++;
    if (p.status === "PUBLISHED") {
      b.published++;
      if (p.url) b.links.push(p.url);
    }
    byBook.set(p.bookId, b);
  }
  const planned = posts.length;
  const published = posts.filter((p) => p.status === "PUBLISHED").length;
  return {
    posts,
    planned,
    published,
    failed: posts.filter((p) => p.status === "FAILED").length,
    books: byBook.size,
    booksDone: [...byBook.values()].filter((b) => b.published === b.planned).length,
    byPlatform: [...byPlatform.entries()].map(([k, v]) => ({ platform: k, ...v })),
    byKind: [...byKind.values()],
    byBook: [...byBook.values()],
  };
}
