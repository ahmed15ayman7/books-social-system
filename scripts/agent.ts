/**
 * الأداة اللي Claude بيستخدمها من جهازك عشان يكلم السيستم (محلي أو Coolify).
 * بتقرا AGENT_URL (أو APP_URL) و AGENT_TOKEN من .env
 *
 *   npm run agent -- jobs                         المهام المفتوحة
 *   npm run agent -- book <bookId>                كل بيانات الكتاب ومنشوراته
 *   npm run agent -- day <YYYY-MM-DD> [bookId]    منشورات يوم لسه منزلتش
 *   npm run agent -- job <jobId> start|log|done|fail ["رسالة"]
 *   npm run agent -- post <postId> key=value ...  (status=READY text=@file.txt assetPath=final/video_ar.mp4 url=https://...)
 *   npm run agent -- book-status <bookId> <STATUS>
 *   npm run agent -- folders                      يعمل فولدر لكل كتاب في الطابور جوه contentRoot
 *   npm run agent -- reply <bookId> "الرد" [jobId] رد في شات الكتاب (أو reply <bookId> @file.txt)
 *   npm run agent -- sync <bookId>                يبعت قايمة ملفات فولدر الكتاب للوحة (لازم لو اللوحة على Coolify)
 */
import "dotenv/config";
import { readFileSync, mkdirSync, existsSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const BASE = (process.env.AGENT_URL || process.env.APP_URL || "http://localhost:3200").replace(/\/$/, "");
const TOKEN = process.env.AGENT_TOKEN;

async function call(method: string, path: string, body?: unknown) {
  if (!TOKEN) throw new Error("AGENT_TOKEN مش موجود في .env");
  const res = await fetch(`${BASE}/api/agent${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text}`);
  return JSON.parse(text);
}

function kv(args: string[]) {
  const out: Record<string, string> = {};
  for (const a of args) {
    const i = a.indexOf("=");
    if (i < 1) continue;
    const k = a.slice(0, i);
    let v = a.slice(i + 1);
    if (v.startsWith("@")) v = readFileSync(v.slice(1), "utf8").trim();
    out[k] = v;
  }
  return out;
}

/** نفس شكل lib/files.listTree بس من غير قاعدة بيانات */
function walk(base: string) {
  const out: { path: string; name: string; dir: boolean; size: number; mtime: string }[] = [];
  const go = (dir: string, depth: number) => {
    if (depth > 4 || !existsSync(dir)) return;
    for (const it of readdirSync(dir, { withFileTypes: true }).sort((x, y) => Number(y.isDirectory()) - Number(x.isDirectory()) || x.name.localeCompare(y.name))) {
      if (it.name.startsWith(".")) continue;
      const full = join(dir, it.name);
      const s = statSync(full);
      out.push({ path: relative(base, full).split(sep).join("/"), name: it.name, dir: it.isDirectory(), size: s.size, mtime: s.mtime.toISOString() });
      if (it.isDirectory()) go(full, depth + 1);
    }
  };
  go(base, 0);
  return out;
}

async function main() {
  const [cmd, ...a] = process.argv.slice(2);
  let r: unknown;
  switch (cmd) {
    case "jobs":
      r = await call("GET", "/jobs");
      break;
    case "book":
      r = await call("GET", `/books/${a[0]}`);
      break;
    case "day":
      r = await call("GET", `/day/${a[0]}${a[1] ? `?book=${a[1]}` : ""}`);
      break;
    case "job":
      r = await call("POST", `/jobs/${a[0]}`, { action: a[1], message: a.slice(2).join(" ") || undefined });
      break;
    case "post":
      r = await call("PATCH", `/posts/${a[0]}`, kv(a.slice(1)));
      break;
    case "book-status":
      r = await call("PATCH", `/books/${a[0]}`, { status: a[1] });
      break;
    case "folders": {
      const { jobs } = (await call("GET", "/jobs")) as { jobs: { book: { id: string } | null }[] };
      const made: string[] = [];
      for (const j of jobs) {
        if (!j.book) continue;
        const b = (await call("GET", `/books/${j.book.id}`)) as { folder: string; book: Record<string, unknown> | null; publishDate: string };
        for (const sub of ["", "images", "clips", "audio", "designs", "work", "final"]) mkdirSync(join(b.folder, sub), { recursive: true });
        const meta = join(b.folder, "book.json");
        if (!existsSync(meta)) writeFileSync(meta, JSON.stringify({ ...b.book, publishDate: b.publishDate }, null, 2), "utf8");
        made.push(b.folder);
      }
      r = { folders: [...new Set(made)] };
      break;
    }
    case "reply": {
      const body = a[1]?.startsWith("@") ? readFileSync(a[1].slice(1), "utf8").trim() : a[1];
      r = await call("POST", `/books/${a[0]}/messages`, { body, jobId: a[2] });
      break;
    }
    case "sync": {
      const b = (await call("GET", `/books/${a[0]}`)) as { folder: string };
      r = await call("PUT", `/books/${a[0]}/files`, { files: walk(b.folder) });
      break;
    }
    default:
      console.log(readFileSync(__filename, "utf8").split("*/")[0]);
      return;
  }
  console.log(JSON.stringify(r, null, 2));
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
