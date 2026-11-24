import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { db, getSettings } from "./db";
import { bookDetails } from "./source-db";
import { POST_KINDS, addDays, bookLink, cairoAt, cairoDay, dateOnly, dayOf, folderName, slotsFrom } from "./plan";

/** أول أيام فاضية من بكرة، على أساس booksPerDay */
async function freeDays(count: number, booksPerDay: number, from?: string): Promise<string[]> {
  const start = from ?? addDays(cairoDay(), 1);
  const taken = await db.contentBook.groupBy({
    by: ["publishDate"],
    where: { publishDate: { gte: dateOnly(start) } },
    _count: true,
  });
  const used = new Map(taken.map((t) => [dayOf(t.publishDate), t._count]));
  const out: string[] = [];
  let day = start;
  while (out.length < count) {
    const n = used.get(day) ?? 0;
    if (n < booksPerDay) {
      out.push(day);
      used.set(day, n + 1);
    } else day = addDays(day, 1);
  }
  return out;
}

/** بيعمل فولدر الكتاب جوه contentRoot لو السيرفر شغال على جهازك (محليًا) */
async function ensureFolder(root: string, folder: string, info: object) {
  if (!existsSync(root)) return false;
  const dir = join(root, folder);
  for (const sub of ["", "images", "clips", "audio", "designs", "work", "final"]) await mkdir(join(dir, sub), { recursive: true });
  const meta = join(dir, "book.json");
  if (!existsSync(meta)) await writeFile(meta, JSON.stringify(info, null, 2), "utf8");
  return true;
}

export async function enqueueBooks(productIds: string[], startDay?: string) {
  const settings = await getSettings();
  const existing = await db.contentBook.findMany({ where: { productId: { in: productIds } }, select: { productId: true } });
  const skip = new Set(existing.map((e) => e.productId));
  const ids = productIds.filter((id) => !skip.has(id));
  if (!ids.length) return { added: 0, skipped: skip.size };

  // نفس ترتيب الاختيار
  const details = new Map((await bookDetails(ids)).map((d) => [d.id, d]));
  const days = await freeDays(ids.length, Math.max(1, settings.booksPerDay), startDay);
  const slots = slotsFrom(settings.slotTimes);
  const usedFolders = new Set((await db.contentBook.findMany({ select: { folder: true } })).map((b) => b.folder));

  let added = 0;
  for (const [i, id] of ids.entries()) {
    const d = details.get(id);
    if (!d) continue;
    let folder = folderName(d.slug, d.titleEn);
    for (let n = 2; usedFolders.has(folder); n++) folder = `${folderName(d.slug, d.titleEn)}-${n}`;
    usedFolders.add(folder);
    const day = days[i];
    const author = d.authors.map((a) => a.nameAr || a.name).join("، ") || null;

    await db.contentBook.create({
      data: {
        productId: id,
        slug: d.slug,
        titleAr: d.titleAr || d.titleEn,
        titleEn: d.titleEn,
        author,
        publisher: d.publisher ? d.publisher.nameAr || d.publisher.name : null,
        coverUrl: d.imageUrl,
        year: d.year,
        folder,
        publishDate: dateOnly(day),
        posts: {
          create: POST_KINDS.map((k) => ({
            kind: k.kind,
            platform: k.platform,
            lang: k.lang,
            scheduledAt: cairoAt(day, slots[k.kind]),
            link: bookLink(settings.siteBaseUrl, d.slug, k.platform, k.lang, k.kind),
          })),
        },
      },
    });
    const created = await db.contentBook.findUniqueOrThrow({ where: { productId: id } });
    // الإنتاج بيبدأ من زرار "تجهيز الفيديو" في صفحة الكتاب (startProduction)
    try {
      await ensureFolder(settings.contentRoot, folder, {
        id: created.id,
        productId: id,
        slug: d.slug,
        titleEn: d.titleEn,
        titleAr: d.titleAr,
        author,
        year: d.year,
        publishDate: day,
        cover: d.imageUrl,
      });
    } catch {
      // على Coolify مفيش D:\ — Claude بيعمل الفولدر من جهازك
    }
    added++;
  }
  return { added, skipped: skip.size };
}

/** نقل كتاب ليوم تاني (المنشورات بتتنقل بنفس مواعيدها) */
export async function rescheduleBook(bookId: string, day: string) {
  const settings = await getSettings();
  const slots = slotsFrom(settings.slotTimes);
  const book = await db.contentBook.findUniqueOrThrow({ where: { id: bookId }, include: { posts: true } });
  await db.$transaction([
    db.contentBook.update({ where: { id: bookId }, data: { publishDate: dateOnly(day) } }),
    ...book.posts
      .filter((p) => p.status !== "PUBLISHED")
      .map((p) => db.post.update({ where: { id: p.id }, data: { scheduledAt: cairoAt(day, slots[p.kind]) } })),
  ]);
}

export async function removeBook(bookId: string) {
  const published = await db.post.count({ where: { bookId, status: "PUBLISHED" } });
  if (published) throw new Error("الكتاب ده نزل منه منشورات، مينفعش يتشال");
  await db.agentJob.updateMany({ where: { bookId, status: { in: ["PENDING", "RUNNING"] } }, data: { status: "CANCELLED" } });
  await db.contentBook.delete({ where: { id: bookId } });
}

/** زرار "بدء النشر": مهمة نشر لليوم ده يسحبها Claude من جهازك */
export async function startPublishing(day: string, bookId?: string) {
  const open = await db.agentJob.findFirst({
    where: { kind: "PUBLISH", day: dateOnly(day), bookId: bookId ?? null, status: { in: ["PENDING", "RUNNING"] } },
  });
  if (open) return open;
  return db.agentJob.create({ data: { kind: "PUBLISH", day: dateOnly(day), bookId: bookId ?? null } });
}

/** بعد أي تغيير في منشورات كتاب: حالة الكتاب تمشي معاها */
export async function syncBookStatus(bookId: string) {
  const posts = await db.post.findMany({ where: { bookId }, select: { status: true } });
  const book = await db.contentBook.findUnique({ where: { id: bookId } });
  if (!book) return;
  const live = posts.filter((p) => p.status !== "SKIPPED");
  let status = book.status;
  if (live.length && live.every((p) => p.status === "PUBLISHED")) status = "PUBLISHED";
  else if (live.some((p) => p.status === "PUBLISHING" || p.status === "PUBLISHED")) status = "PUBLISHING";
  else if (live.length && live.every((p) => p.status === "READY")) status = "READY";
  if (status !== book.status) await db.contentBook.update({ where: { id: bookId }, data: { status } });
}

/** زرار "تجهيز الفيديو": مهمة إنتاج (عربي + إنجليزي + التصاميم والنصوص) لو مفيش واحدة مفتوحة */
export async function startProduction(bookId: string) {
  const open = await db.agentJob.findFirst({ where: { bookId, kind: "PRODUCE", status: { in: ["PENDING", "RUNNING"] } } });
  if (open) return open;
  await db.contentBook.update({ where: { id: bookId }, data: { status: "QUEUED" } });
  return db.agentJob.create({ data: { kind: "PRODUCE", bookId } });
}
