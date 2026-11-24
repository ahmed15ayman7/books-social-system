import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import type { FileEntry } from "./file-kinds";
export * from "./file-kinds";

/** المسار الكامل لملف جوه فولدر الكتاب، أو null لو حاول يطلع برّه الفولدر */
export function safePath(root: string, folder: string, rel = ""): string | null {
  const base = resolve(root, folder);
  const full = resolve(base, rel);
  if (full !== base && !full.startsWith(base + sep)) return null;
  return full;
}

/** فولدر الكتاب موجود على الجهاز اللي السيرفر شغال عليه؟ */
export function folderAvailable(root: string, folder: string) {
  const p = safePath(root, folder);
  return !!p && existsSync(p);
}

export async function listTree(root: string, folder: string, max = 800): Promise<FileEntry[]> {
  const base = safePath(root, folder);
  if (!base || !existsSync(base)) return [];
  const out: FileEntry[] = [];
  const walk = async (dir: string, depth: number) => {
    if (depth > 4 || out.length >= max) return;
    const items = await readdir(dir, { withFileTypes: true });
    items.sort((a, b) => (a.isDirectory() === b.isDirectory() ? a.name.localeCompare(b.name) : a.isDirectory() ? -1 : 1));
    for (const it of items) {
      if (it.name.startsWith(".")) continue;
      const full = join(dir, it.name);
      const s = await stat(full);
      out.push({ path: relative(base, full).split(sep).join("/"), name: it.name, dir: it.isDirectory(), size: s.size, mtime: s.mtime.toISOString() });
      if (it.isDirectory()) await walk(full, depth + 1);
    }
  };
  await walk(base, 0);
  return out;
}

