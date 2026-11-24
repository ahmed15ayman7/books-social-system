/** على إيه طلب التعديل (بيتبعت لـ Claude مع المهمة) */
export const TARGETS: Record<string, string> = {
  video: "الفيديو النهائي",
  clips: "الكليبات (بحث تاني)",
  images: "الصور",
  poster: "البوستر",
  designs: "تصاميم البوستات",
  voice: "الصوت",
  script: "السكريبت",
  text: "المحتوى المكتوب",
  other: "أي حاجة في الكتاب",
};

export function targetLabel(t: string | null | undefined): string {
  if (!t) return TARGETS.other;
  if (TARGETS[t]) return TARGETS[t];
  const [kind, rest] = [t.slice(0, t.indexOf(":")), t.slice(t.indexOf(":") + 1)];
  if (kind === "file") return `الملف ${rest}`;
  if (kind === "text") return `نص ${rest}`;
  return t;
}
