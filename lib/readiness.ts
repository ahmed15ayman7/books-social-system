import type { Post } from "@prisma/client";
import { REQUIRED_FILES, type FileEntry } from "./file-kinds";
import { KIND_LABEL } from "./plan";

export interface CheckItem {
  key: string;
  label: string;
  ok: boolean;
  hint?: string;
  group: "video" | "poster" | "design" | "caption" | "text";
}

/** الكتاب جاهز للنشر؟ كل ملف لازم موجود + كل منشور ليه نص وحالته جاهز */
export function readiness(posts: Post[], files: FileEntry[] | null) {
  const have = new Map((files ?? []).filter((f) => !f.dir).map((f) => [f.path, f]));
  const items: CheckItem[] = [];
  for (const r of REQUIRED_FILES) {
    const f = have.get(r.path);
    items.push({
      key: `file:${r.path}`,
      label: r.label,
      group: r.group,
      ok: !!f && f.size > 0,
      hint: files === null ? "مش متاح: الفولدر مش على الجهاز ده" : f ? undefined : r.path,
    });
  }
  for (const p of posts) {
    if (p.status === "SKIPPED") continue;
    const hasText = !!p.text?.trim();
    const done = p.status === "PUBLISHED";
    items.push({
      key: `text:${p.kind}`,
      label: `نص ${KIND_LABEL[p.kind]}`,
      group: "text",
      ok: done || (hasText && p.status !== "PENDING"),
      hint: done ? "نزل" : !hasText ? "النص لسه متكتبش" : p.status === "PENDING" ? "مكتوب بس محتاج تعتمده" : undefined,
    });
  }
  const done = items.filter((i) => i.ok).length;
  return { items, done, total: items.length, ready: done === items.length, pct: Math.round((done / Math.max(1, items.length)) * 100) };
}
