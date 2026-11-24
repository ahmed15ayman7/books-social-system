import { db } from "./db";
import { booksNeedingStats } from "./source-db";

/**
 * شهرة الكتاب عالميًا من مصادر مجانية:
 *  - Open Library: عدد اللي عايزين يقروه / بيقروه / قروه + التقييمات + عدد الطبعات
 *  - Google Books (لو GOOGLE_BOOKS_API_KEY موجود): عدد التقييمات
 * الرقم النهائي log-scale عشان كتاب عليه مليون قارئ ميدفنش الباقي.
 */

const UA = "BooksSocialSystem/1.0 (+https://booksplatform.net)";

type OLDoc = {
  ratings_count?: number;
  ratings_average?: number;
  want_to_read_count?: number;
  currently_reading_count?: number;
  already_read_count?: number;
  edition_count?: number;
};

const OL_FIELDS = "ratings_count,ratings_average,want_to_read_count,currently_reading_count,already_read_count,edition_count";

async function getJson(url: string): Promise<unknown | null> {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
  if (res.status === 429) throw new Error("rate-limited");
  if (!res.ok) return null;
  return res.json();
}

function cleanIsbn(isbn: string | null): string | null {
  const d = (isbn ?? "").replace(/[^0-9Xx]/g, "");
  return d.length === 10 || d.length === 13 ? d : null;
}

function cleanTitle(t: string) {
  return t.replace(/\(.*?\)|\[.*?\]/g, "").split(/[:|–—]/)[0].trim();
}

async function openLibrary(isbn: string | null, title: string, author: string | null) {
  if (isbn) {
    const j = (await getJson(`https://openlibrary.org/search.json?isbn=${isbn}&fields=${OL_FIELDS}&limit=1`)) as { docs?: OLDoc[] } | null;
    if (j?.docs?.[0]) return { doc: j.docs[0], by: "isbn" };
  }
  const q = new URLSearchParams({ title: cleanTitle(title), fields: OL_FIELDS, limit: "1" });
  if (author) q.set("author", author.split(/[،,]/)[0].trim());
  const j = (await getJson(`https://openlibrary.org/search.json?${q}`)) as { docs?: OLDoc[] } | null;
  if (j?.docs?.[0]) return { doc: j.docs[0], by: "title" };
  return null;
}

type AuthorSignal = { name: string; readers: number; works: number } | null;
const authorCache = new Map<string, AuthorSignal>();

/** أول مؤلف بس، ومن غير الكلام الزيادة اللي بعد الفاصلة */
function mainAuthor(author: string | null): string | null {
  const a = (author ?? "").split(/[،,;&]| and /)[0].trim();
  return a.length >= 3 ? a : null;
}

async function openLibraryAuthor(author: string | null): Promise<AuthorSignal> {
  const name = mainAuthor(author);
  if (!name || /[؀-ۿ]/.test(name)) return null;
  const key = name.toLowerCase();
  if (authorCache.has(key)) return authorCache.get(key)!;
  const j = (await getJson(`https://openlibrary.org/search/authors.json?q=${encodeURIComponent(name)}&limit=1`)) as {
    docs?: { name?: string; readinglog_count?: number; ratings_count?: number; work_count?: number }[];
  } | null;
  const d = j?.docs?.[0];
  const sig = d ? { name: d.name ?? name, readers: (d.readinglog_count ?? 0) + 3 * (d.ratings_count ?? 0), works: d.work_count ?? 0 } : null;
  authorCache.set(key, sig);
  return sig;
}

async function googleBooks(isbn: string | null, title: string) {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  if (!key) return null;
  const q = isbn ? `isbn:${isbn}` : `intitle:${cleanTitle(title)}`;
  const j = (await getJson(
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=1&fields=items(volumeInfo(ratingsCount,averageRating))&key=${key}`,
  )) as { items?: { volumeInfo?: { ratingsCount?: number; averageRating?: number } }[] } | null;
  return j?.items?.[0]?.volumeInfo ?? null;
}

export async function fetchOne(b: { id: string; isbn: string | null; name_en: string; author: string | null }) {
  const isbn = cleanIsbn(b.isbn);
  try {
    const ol = await openLibrary(isbn, b.name_en, b.author);
    let gb: Awaited<ReturnType<typeof googleBooks>> = null;
    try {
      gb = await googleBooks(isbn, b.name_en);
    } catch {
      gb = null;
    }
    let au: AuthorSignal = null;
    try {
      au = await openLibraryAuthor(b.author);
    } catch (e) {
      if ((e as Error).message === "rate-limited") throw e;
    }
    const d = ol?.doc ?? {};
    const readers = (d.want_to_read_count ?? 0) + (d.currently_reading_count ?? 0) + (d.already_read_count ?? 0);
    const ratings = (d.ratings_count ?? 0) + (gb?.ratingsCount ?? 0);
    const editions = d.edition_count ?? 0;
    const bookRaw = Math.log10(1 + readers + 3 * ratings + 10 * Math.max(0, editions - 1));
    // المؤلف المشهور = طلب متوقع عالي على كتابه الجديد، بس بوزن أقل من قرّاء الكتاب نفسه
    const authorRaw = au ? 0.8 * Math.log10(1 + au.readers) : 0;
    const raw = Math.max(bookRaw, authorRaw) + 0.15 * Math.min(bookRaw, authorRaw);
    const data = {
      isbn,
      matchedBy: ol?.by ?? null,
      olRatings: d.ratings_count ?? 0,
      olRatingAvg: d.ratings_average ?? null,
      olWantToRead: d.want_to_read_count ?? 0,
      olReading: d.currently_reading_count ?? 0,
      olAlreadyRead: d.already_read_count ?? 0,
      olEditions: editions,
      gbRatings: gb?.ratingsCount ?? 0,
      gbRatingAvg: gb?.averageRating ?? null,
      authorName: au?.name ?? null,
      authorReaders: au?.readers ?? 0,
      authorWorks: au?.works ?? 0,
      popularityRaw: raw,
      fetchedAt: new Date(),
      error: null,
    };
    await db.bookStat.upsert({ where: { productId: b.id }, update: data, create: { productId: b.id, ...data } });
    return raw > 0;
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "rate-limited") throw e;
    await db.bookStat.upsert({
      where: { productId: b.id },
      update: { error: msg.slice(0, 300), fetchedAt: new Date() },
      create: { productId: b.id, error: msg.slice(0, 300), fetchedAt: new Date() },
    });
    return false;
  }
}

// ─── تشغيل في الخلفية جوه السيرفر (زرار "تحديث الترتيب") ─────────────────
export interface RunState {
  running: boolean;
  done: number;
  found: number;
  total: number;
  startedAt: string | null;
  error: string | null;
}

const g = globalThis as unknown as { popRun?: RunState };
export function runState(): RunState {
  return g.popRun ?? { running: false, done: 0, found: 0, total: 0, startedAt: null, error: null };
}

/** بيحدّث لحد max كتاب (الأقدم تحديثًا الأول) — 3 طلبات في نفس الوقت مع فاصل مهذب */
export function startRun(max = 600, minYear = 2018) {
  if (runState().running) return runState();
  const st: RunState = { running: true, done: 0, found: 0, total: 0, startedAt: new Date().toISOString(), error: null };
  g.popRun = st;
  void (async () => {
    try {
      const list = await booksNeedingStats(max, 30, minYear);
      st.total = list.length;
      let i = 0;
      const worker = async () => {
        while (i < list.length) {
          const b = list[i++];
          if (await fetchOne(b)) st.found++;
          st.done++;
          await new Promise((r) => setTimeout(r, 350));
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    } catch (e) {
      st.error = (e as Error).message === "rate-limited" ? "Open Library طلب نهدّي — كمّل بعد شوية" : (e as Error).message;
    } finally {
      st.running = false;
    }
  })();
  return st;
}
