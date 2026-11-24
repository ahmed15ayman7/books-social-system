import { extname } from "./path-ext";

/** ملف أو فولدر جوه فولدر الكتاب (المسار بـ / دايمًا) */
export interface FileEntry {
  path: string; // نسبي: "final/video_ar.mp4"
  name: string;
  dir: boolean;
  size: number;
  mtime: string;
}

export type FileKind = "video" | "audio" | "image" | "text" | "other";

const KINDS: Record<string, FileKind> = {
  ".mp4": "video", ".mov": "video", ".webm": "video", ".m4v": "video",
  ".mp3": "audio", ".wav": "audio", ".m4a": "audio", ".ogg": "audio",
  ".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image", ".gif": "image",
  ".txt": "text", ".md": "text", ".json": "text", ".srt": "text", ".ass": "text", ".csv": "text",
};

export const MIME: Record<string, string> = {
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm", ".m4v": "video/mp4",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif",
  ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".srt": "text/plain; charset=utf-8", ".ass": "text/plain; charset=utf-8", ".csv": "text/csv; charset=utf-8",
};

export function kindOf(path: string): FileKind {
  return KINDS[extname(path).toLowerCase()] ?? "other";
}

/** الملفات اللازمة عشان الكتاب يبقى جاهز للنشر */
export const REQUIRED_FILES: { path: string; label: string; group: "video" | "poster" | "design" | "caption" }[] = [
  { path: "final/video_ar.mp4", label: "الفيديو العربي", group: "video" },
  { path: "final/video_en.mp4", label: "الفيديو الإنجليزي", group: "video" },
  { path: "final/cover_ar.jpg", label: "بوستر الفيديو العربي", group: "poster" },
  { path: "final/cover_en.jpg", label: "بوستر الفيديو الإنجليزي", group: "poster" },
  { path: "designs/quote.png", label: "تصميم الاقتباس (X)", group: "design" },
  { path: "designs/fb_book.png", label: "تصميم ترشيح الكتاب (فيسبوك)", group: "design" },
  { path: "designs/fb_question.png", label: "تصميم السؤال (فيسبوك)", group: "design" },
  { path: "final/video_ar.srt", label: "ترجمة الفيديو العربي", group: "caption" },
  { path: "final/video_en.srt", label: "ترجمة الفيديو الإنجليزي", group: "caption" },
];

export function fmtSize(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}
