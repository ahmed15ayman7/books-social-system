import type { Platform, PostKind } from "@prisma/client";

/**
 * كل كتاب = 7 منشورات في يومه (حسب خطة Books Platform):
 *  YouTube: Short عربي + Short إنجليزي (للأجانب)
 *  Facebook: Reel عربي + بوست ترشيح + بوست سؤال
 *  X: تغريدتين (اقتباس بتصميم + نقاش)
 */
export const POST_KINDS: {
  kind: PostKind;
  platform: Platform;
  lang: "ar" | "en";
  label: string;
  asset: string | null;
}[] = [
  { kind: "FB_BOOK", platform: "FACEBOOK", lang: "ar", label: "بوست ترشيح الكتاب", asset: "designs/fb_book.png" },
  { kind: "TWEET_1", platform: "X", lang: "ar", label: "تغريدة اقتباس", asset: "designs/quote.png" },
  { kind: "SHORT_AR", platform: "YOUTUBE", lang: "ar", label: "Short عربي", asset: "final/video_ar.mp4" },
  { kind: "FB_QUESTION", platform: "FACEBOOK", lang: "ar", label: "بوست سؤال ونقاش", asset: "designs/fb_question.png" },
  { kind: "REEL_AR", platform: "FACEBOOK", lang: "ar", label: "Reel عربي", asset: "final/video_ar.mp4" },
  { kind: "TWEET_2", platform: "X", lang: "ar", label: "تغريدة نقاش", asset: null },
  { kind: "SHORT_EN", platform: "YOUTUBE", lang: "en", label: "Short إنجليزي", asset: "final/video_en.mp4" },
];

export const KIND_LABEL = Object.fromEntries(POST_KINDS.map((k) => [k.kind, k.label])) as Record<PostKind, string>;

export const PLATFORM_LABEL: Record<Platform, string> = {
  YOUTUBE: "YouTube",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  X: "X",
};

export const PLATFORM_COLOR: Record<Platform, string> = {
  YOUTUBE: "#b11e2e",
  FACEBOOK: "#1d4ed8",
  INSTAGRAM: "#c026d3",
  X: "#0d9488",
};

export const DEFAULT_SLOTS: Record<PostKind, string> = {
  FB_BOOK: "10:00",
  TWEET_1: "11:00",
  SHORT_AR: "13:00",
  FB_QUESTION: "16:00",
  REEL_AR: "19:00",
  TWEET_2: "20:00",
  SHORT_EN: "23:00",
};

export const TZ = "Africa/Cairo";

/** فرق توقيت القاهرة عن UTC بالدقايق في لحظة معينة (بيحسب التوقيت الصيفي) */
function cairoOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** "2026-11-20" + "13:00" بتوقيت القاهرة → Date */
export function cairoAt(day: string, hhmm: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  const guess = new Date(Date.UTC(y, m - 1, d, h, mi));
  return new Date(guess.getTime() - cairoOffsetMinutes(guess) * 60000);
}

/** تاريخ القاهرة "YYYY-MM-DD" للحظة معينة */
export function cairoDay(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** عمود @db.Date بيرجع Date الساعة 00:00 UTC */
export function dateOnly(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}
export function dayOf(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function slotsFrom(json: unknown): Record<PostKind, string> {
  const out = { ...DEFAULT_SLOTS };
  if (json && typeof json === "object") {
    for (const [k, v] of Object.entries(json as Record<string, unknown>)) {
      if (k in out && typeof v === "string" && /^\d{1,2}:\d{2}$/.test(v)) out[k as PostKind] = v;
    }
  }
  return out;
}

const UTM_SOURCE: Record<Platform, string> = { YOUTUBE: "youtube", FACEBOOK: "facebook", INSTAGRAM: "instagram", X: "x" };

/** لينك الكتاب بعلامة UTM لكل منصة (عشان التقرير يعرف أنهي منصة جابت زيارات) */
export function bookLink(base: string, slug: string, platform: Platform, lang: "ar" | "en", kind: PostKind) {
  const u = new URL(`${base.replace(/\/$/, "")}/${lang}/books/${slug}`);
  u.searchParams.set("utm_source", UTM_SOURCE[platform]);
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", "book_content");
  u.searchParams.set("utm_content", kind.toLowerCase());
  return u.toString();
}

/** اسم فولدر آمن على ويندوز من الـslug */
export function folderName(slug: string, titleEn: string): string {
  const base = (slug || titleEn)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9؀-ۿ-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return base || "book";
}
