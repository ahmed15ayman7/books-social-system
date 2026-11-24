"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle, Bot, Check, CheckCircle2, ChevronDown, Circle, Clapperboard, Download, File, FileAudio, FileImage,
  FileText, FileVideo, Folder, FolderOpen, Image as ImageIcon, Loader2, PenLine, RefreshCw, Search, Send, Sparkles, Wand2, X,
} from "lucide-react";
import { BOOK_STATUS, Button, Card, JOB_STATUS, POST_STATUS, StatusBadge } from "@/components/ui";
import { cn, dayLabel } from "@/lib/utils";
import { kindOf, fmtSize, type FileEntry } from "@/lib/file-kinds";
import type { CheckItem } from "@/lib/readiness";
import { TARGETS, targetLabel } from "@/lib/targets";
import { cancelRevision, produceBook, requestRevision, savePostText } from "./actions";

type Post = {
  id: string; kind: string; label: string; platform: string; lang: string; status: string;
  title: string; text: string; assetPath: string | null; link: string | null; url: string | null; scheduledAt: string;
};
type Msg = { id: string; role: "USER" | "CLAUDE"; body: string; target: string | null; jobId: string | null; createdAt: string };
type Job = { id: string; kind: string; status: string; target: string | null; log: string; createdAt: string };

export interface WorkspaceProps {
  book: { id: string; titleAr: string; titleEn: string; author: string | null; publisher: string | null; coverUrl: string | null; status: string; publishDate: string; folderPath: string };
  local: boolean;
  syncedAt: string | null;
  files: FileEntry[] | null;
  check: { items: CheckItem[]; done: number; total: number; ready: boolean; pct: number };
  posts: Post[];
  messages: Msg[];
  jobs: Job[];
  busy: boolean;
  /** حالة تجهيز الفيديو: NONE = لسه متعملش حاجة */
  production: "NONE" | "PENDING" | "RUNNING" | "DONE" | "FAILED";
  voiceLabel: string;
}

const fileUrl = (bookId: string, f: { path: string; mtime?: string }, download = false) =>
  `/api/files?book=${bookId}&path=${encodeURIComponent(f.path)}${f.mtime ? `&v=${encodeURIComponent(f.mtime)}` : ""}${download ? "&download=1" : ""}`;

export function Workspace(p: WorkspaceProps) {
  const router = useRouter();
  const [target, setTarget] = useState("video");
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // طول ما فيه مهمة شغالة، الصفحة بتتحدث لوحدها عشان رد Claude والملفات الجديدة تبان
  useEffect(() => {
    if (!p.busy) return;
    const t = setInterval(() => router.refresh(), 8000);
    return () => clearInterval(t);
  }, [p.busy, router]);

  const ask = (t: string, hint = "") => {
    setTarget(t);
    if (hint) setDraft(hint);
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const fileMap = useMemo(() => new Map((p.files ?? []).map((f) => [f.path, f])), [p.files]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-6">
        <ProduceBar bookId={p.book.id} production={p.production} voiceLabel={p.voiceLabel} />
        <Header {...p} />
        <Readiness items={p.check.items} />
        <FinalVideos bookId={p.book.id} fileMap={fileMap} local={p.local} ask={ask} />
        <WrittenContent posts={p.posts} ask={ask} />
        <Files bookId={p.book.id} files={p.files} local={p.local} syncedAt={p.syncedAt} folderPath={p.book.folderPath} ask={ask} />
      </div>
      <Chat
        bookId={p.book.id}
        messages={p.messages}
        jobs={p.jobs}
        target={target}
        setTarget={setTarget}
        draft={draft}
        setDraft={setDraft}
        inputRef={inputRef}
      />
    </div>
  );
}

// ─── الهيدر ───────────────────────────────────────────────────────
function ProduceBar({ bookId, production, voiceLabel }: { bookId: string; production: WorkspaceProps["production"]; voiceLabel: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  if (production === "DONE") return null;
  const waiting = production === "PENDING" || production === "RUNNING";
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[var(--brand-red)]/30 bg-gradient-to-l from-[var(--brand-red-soft)] to-white p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand-red)] text-white shadow-[0_0_16px_rgba(177,30,46,0.35)]">
          {production === "RUNNING" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Clapperboard className="h-5 w-5" />}
        </div>
        <div>
          <p className="font-bold">
            {production === "RUNNING" ? "Claude بيجهّز الفيديو دلوقتي" : production === "PENDING" ? "التجهيز في الطابور، مستني Claude" : production === "FAILED" ? "التجهيز فشل، جرّب تاني" : "الكتاب ده لسه متعملهوش محتوى"}
          </p>
          <p className="text-xs text-[var(--admin-text-muted)]">
            فيديوهين 45 ثانية: عربي بالفصحى المبسطة (صوت {voiceLabel}) وإنجليزي (OfflineTTS Heart)، والبوسترات وتصاميم البوستات والنصوص.
          </p>
        </div>
      </div>
      <Button
        disabled={pending || waiting}
        onClick={() =>
          start(async () => {
            await produceBook(bookId);
            router.refresh();
          })
        }
        className="px-6 py-2.5 text-base"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {waiting ? "اتبعت لـ Claude" : "تجهيز الفيديو"}
      </Button>
    </div>
  );
}

function Header({ book, check }: WorkspaceProps) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-wrap items-center gap-5 rounded-xl border border-[var(--admin-border)] bg-white p-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {book.coverUrl ? <img src={book.coverUrl} alt="" className="h-28 w-20 rounded-md object-cover shadow" /> : <div className="h-28 w-20 rounded-md bg-[var(--admin-surface-muted)]" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold">{book.titleAr}</h1>
          <StatusBadge status={book.status} map={BOOK_STATUS} />
        </div>
        <p className="ltr mt-0.5 text-sm text-[var(--admin-text-muted)]">{book.titleEn}</p>
        <p className="mt-1 text-xs text-[var(--admin-text-subtle)]">{[book.author, book.publisher].filter(Boolean).join(" · ")}</p>
        <p className="mt-2 text-sm">
          يوم النشر: <Link href={`/calendar/${book.publishDate}`} className="font-semibold text-[var(--brand-red)] hover:underline">{dayLabel(book.publishDate)}</Link>
        </p>
      </div>
      <div className="flex items-center gap-3">
        <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90" aria-hidden>
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--admin-surface-muted)" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={check.ready ? "var(--success)" : "var(--brand-red)"} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(check.pct / 100) * c} ${c}`} />
        </svg>
        <div>
          <p className={cn("text-lg font-black", check.ready ? "text-[var(--success)]" : "text-[var(--admin-text)]")}>
            {check.ready ? "جاهز للنشر" : `${check.pct}٪ جاهز`}
          </p>
          <p className="text-xs text-[var(--admin-text-muted)]">{check.done} من {check.total} خانة</p>
        </div>
      </div>
    </div>
  );
}

// ─── الجاهزية ────────────────────────────────────────────────────
const GROUPS: { key: CheckItem["group"]; label: string }[] = [
  { key: "video", label: "الفيديو" },
  { key: "poster", label: "البوسترات" },
  { key: "design", label: "تصاميم البوستات" },
  { key: "caption", label: "الترجمة" },
  { key: "text", label: "المحتوى المكتوب" },
];

function Readiness({ items }: { items: CheckItem[] }) {
  const missing = items.filter((i) => !i.ok).length;
  const [open, setOpen] = useState(missing > 0);
  return (
    <Card
      title={missing ? `جاهزية النشر · ناقص ${missing}` : "جاهزية النشر · كله تمام"}
      actions={<button onClick={() => setOpen(!open)} className="text-xs text-[var(--admin-text-muted)]"><ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} /></button>}
    >
      {open ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((g) => {
            const list = items.filter((i) => i.group === g.key);
            if (!list.length) return null;
            return (
              <div key={g.key}>
                <p className="mb-1.5 text-xs font-semibold text-[var(--admin-text-muted)]">{g.label}</p>
                <ul className="space-y-1">
                  {list.map((i) => (
                    <li key={i.key} className="flex items-start gap-1.5 text-sm" title={i.hint}>
                      {i.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--success)]" /> : <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--admin-border-strong)]" />}
                      <span className={cn(!i.ok && "text-[var(--admin-text-muted)]")}>
                        {i.label}
                        {!i.ok && i.hint && <span className="ltr block text-[11px] text-[var(--admin-text-subtle)]">{i.hint}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-[var(--admin-text-muted)]">كل الملفات والنصوص موجودة.</p>
      )}
    </Card>
  );
}

// ─── الفيديو النهائي والبوسترات ──────────────────────────────────
function FinalVideos({ bookId, fileMap, local, ask }: { bookId: string; fileMap: Map<string, FileEntry>; local: boolean; ask: (t: string, h?: string) => void }) {
  const slots = [
    { lang: "ar", label: "عربي · Short + Reel", video: "final/video_ar.mp4", poster: "final/cover_ar.jpg" },
    { lang: "en", label: "English · YouTube Short", video: "final/video_en.mp4", poster: "final/cover_en.jpg" },
  ];
  return (
    <Card
      title="الفيديو والبوستر"
      actions={
        <>
          <Button size="sm" variant="secondary" onClick={() => ask("poster", "اعمل بوستر جديد: ")}><ImageIcon className="h-3.5 w-3.5" /> بوستر جديد</Button>
          <Button size="sm" onClick={() => ask("video", "عدّل الفيديو: ")}><Wand2 className="h-3.5 w-3.5" /> عدّل الفيديو</Button>
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {slots.map((s) => {
          const v = fileMap.get(s.video);
          const po = fileMap.get(s.poster);
          return (
            <div key={s.lang} className="space-y-2">
              <p className="text-sm font-semibold">{s.label}</p>
              <div className="flex gap-3">
                <div className="aspect-[9/16] w-[58%] overflow-hidden rounded-lg bg-[var(--brand-black)]">
                  {v && local ? (
                    <video src={fileUrl(bookId, v)} poster={po && local ? fileUrl(bookId, po) : undefined} controls preload="metadata" className="h-full w-full object-contain" />
                  ) : (
                    <Empty icon={Clapperboard} text={v ? "موجود على جهازك" : "الفيديو لسه متعملش"} />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="aspect-[9/16] overflow-hidden rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-muted)]">
                    {po && local ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fileUrl(bookId, po)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Empty icon={ImageIcon} text={po ? "موجود" : "مفيش بوستر"} small />
                    )}
                  </div>
                  <p className="text-center text-[11px] text-[var(--admin-text-muted)]">البوستر</p>
                </div>
              </div>
              {v && <p className="ltr text-[11px] text-[var(--admin-text-subtle)]">{s.video} · {fmtSize(v.size)}</p>}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Empty({ icon: Icon, text, small }: { icon: React.ElementType; text: string; small?: boolean }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center text-[var(--admin-text-subtle)]">
      <Icon className={small ? "h-5 w-5" : "h-8 w-8"} />
      <span className="text-[11px]">{text}</span>
    </div>
  );
}

// ─── المحتوى المكتوب ─────────────────────────────────────────────
const LIMITS: Record<string, number> = { TWEET_1: 280, TWEET_2: 280 };

function WrittenContent({ posts, ask }: { posts: Post[]; ask: (t: string, h?: string) => void }) {
  const [open, setOpen] = useState<string | null>(posts.find((x) => !x.text)?.id ?? posts[0]?.id ?? null);
  return (
    <Card
      title="المحتوى المكتوب"
      padding="none"
      actions={<Button size="sm" variant="secondary" onClick={() => ask("text", "اكتب كل النصوص تاني: ")}><Sparkles className="h-3.5 w-3.5" /> اكتب الكل تاني</Button>}
    >
      <ul className="divide-y divide-[var(--admin-border)]">
        {posts.map((post) => (
          <PostEditor key={post.id} post={post} open={open === post.id} toggle={() => setOpen(open === post.id ? null : post.id)} ask={ask} />
        ))}
      </ul>
    </Card>
  );
}

function PostEditor({ post, open, toggle, ask }: { post: Post; open: boolean; toggle: () => void; ask: (t: string, h?: string) => void }) {
  const [title, setTitle] = useState(post.title);
  const [text, setText] = useState(post.text);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  useEffect(() => {
    setTitle(post.title);
    setText(post.text);
  }, [post.title, post.text]);
  const dirty = title !== post.title || text !== post.text;
  const hasTitle = post.kind.startsWith("SHORT");
  const limit = LIMITS[post.kind];
  const save = (approve: boolean) =>
    start(async () => {
      await savePostText(post.id, title, text, approve);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    });

  return (
    <li>
      <button onClick={toggle} className="flex w-full items-center justify-between gap-3 px-5 py-3 text-start hover:bg-[var(--admin-hover)]/60">
        <div className="flex min-w-0 items-center gap-3">
          <span className="w-20 flex-shrink-0 text-xs font-semibold text-[var(--admin-text-muted)]">{post.platform}</span>
          <span className="flex-shrink-0 text-sm font-medium">{post.label}</span>
          <span className="truncate text-xs text-[var(--admin-text-subtle)]" dir="auto">{post.text ? post.text.split("\n")[0] : "لسه متكتبش"}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={post.status} map={POST_STATUS} />
          <ChevronDown className={cn("h-4 w-4 text-[var(--admin-text-subtle)] transition", open && "rotate-180")} />
        </div>
      </button>
      {open && (
        <div className="space-y-3 bg-[var(--admin-surface-muted)]/40 px-5 pb-4 pt-1">
          {hasTitle && (
            <div>
              <label className="field-label">العنوان</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="field" dir={post.lang === "en" ? "ltr" : "rtl"} maxLength={100} />
              <p className="mt-1 text-[11px] text-[var(--admin-text-subtle)]">{title.length} / 100 (الأفضل أقل من 60)</p>
            </div>
          )}
          <div>
            <label className="field-label">{hasTitle ? "الوصف" : "النص"}</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={post.kind.startsWith("TWEET") ? 4 : 7} className="field leading-relaxed" dir={post.lang === "en" ? "ltr" : "rtl"} />
            <div className="mt-1 flex justify-between text-[11px] text-[var(--admin-text-subtle)]">
              <span>{post.assetPath ? <span className="ltr">{post.assetPath}</span> : post.kind === "TWEET_2" ? "من غير صورة" : ""}</span>
              <span className={cn(limit && text.length > limit && "font-bold text-[var(--error)]")}>{text.length}{limit ? ` / ${limit}` : ""} حرف</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={pending || !dirty} onClick={() => save(false)}>{pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} حفظ</Button>
            {post.status === "PENDING" && (
              <Button size="sm" variant="secondary" disabled={pending || !text.trim()} onClick={() => save(true)}>
                <CheckCircle2 className="h-3.5 w-3.5" /> حفظ واعتماد
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => ask(`text:${post.kind}`, `اكتب ${post.label} تاني: `)}><RefreshCw className="h-3.5 w-3.5" /> اكتبه تاني</Button>
            {saved && <span className="text-xs text-[var(--success)]">اتحفظ</span>}
            {post.url && <a href={post.url} target="_blank" rel="noreferrer" className="text-xs text-[var(--info)] underline">المنشور</a>}
          </div>
        </div>
      )}
    </li>
  );
}

// ─── ملفات الكتاب ────────────────────────────────────────────────
const FOLDER_ACTIONS: Record<string, { target: string; label: string; hint: string; icon: React.ElementType }> = {
  clips: { target: "clips", label: "دوّر على كليبات تانية", hint: "دوّر على كليبات تانية: ", icon: Search },
  images: { target: "images", label: "صمّم الصور تاني", hint: "صمّم الصور تاني: ", icon: Wand2 },
  designs: { target: "designs", label: "صمّم تاني", hint: "صمّم تصاميم البوستات تاني: ", icon: Wand2 },
  audio: { target: "voice", label: "الصوت تاني", hint: "اعمل الصوت تاني: ", icon: RefreshCw },
  final: { target: "video", label: "عدّل الفيديو", hint: "عدّل الفيديو: ", icon: Wand2 },
};

const ICON: Record<string, React.ElementType> = { video: FileVideo, audio: FileAudio, image: FileImage, text: FileText, other: File };

function Files({ bookId, files, local, syncedAt, folderPath, ask }: { bookId: string; files: FileEntry[] | null; local: boolean; syncedAt: string | null; folderPath: string; ask: (t: string, h?: string) => void }) {
  const firstFile = files?.find((f) => !f.dir && kindOf(f.path) !== "other") ?? null;
  const [sel, setSel] = useState<FileEntry | null>(firstFile);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["work"]));
  const visible = (files ?? []).filter((f) => !arr0(f, collapsed));
  const count = (files ?? []).filter((f) => !f.dir).length;

  return (
    <Card title={`ملفات الكتاب · ${count}`} padding="none" actions={<span className="ltr text-[11px] text-[var(--admin-text-subtle)]">{folderPath}</span>}>
      {files === null ? (
        <p className="p-6 text-center text-sm text-[var(--admin-text-subtle)]">الفولدر مش على الجهاز اللي السيستم شغال عليه، ومفيش قايمة ملفات متبعتة. Claude بيبعتها بـ <code className="ltr">npm run agent -- sync</code>.</p>
      ) : (
        <>
          {!local && <p className="border-b border-[var(--admin-border)] bg-[var(--warning-soft)] px-5 py-2 text-xs text-[var(--warning)]">دي قايمة الملفات من جهازك{syncedAt ? ` (آخر مزامنة ${new Date(syncedAt).toLocaleString("ar-EG")})` : ""}. العرض والتشغيل بيشتغلوا لما تفتح السيستم من جهازك.</p>}
          <div className="grid min-h-96 md:grid-cols-[280px_minmax(0,1fr)]">
            <ul className="max-h-[560px] overflow-y-auto border-e border-[var(--admin-border)] py-2 text-sm">
              {visible.map((f) => {
                const depth = f.path.split("/").length - 1;
                const Icon = f.dir ? (collapsed.has(f.path) ? Folder : FolderOpen) : ICON[kindOf(f.path)];
                const action = f.dir && depth === 0 ? FOLDER_ACTIONS[f.name] : null;
                return (
                  <li key={f.path} className={cn("group flex items-center gap-1.5 pe-2", sel?.path === f.path && "bg-[var(--brand-red-soft)]")} style={{ paddingInlineStart: 12 + depth * 14 }}>
                    <button
                      className="flex min-w-0 flex-1 items-center gap-1.5 py-1 text-start"
                      onClick={() => {
                        if (f.dir) {
                          const n = new Set(collapsed);
                          n.has(f.path) ? n.delete(f.path) : n.add(f.path);
                          setCollapsed(n);
                        } else setSel(f);
                      }}
                    >
                      <Icon className={cn("h-4 w-4 flex-shrink-0", f.dir ? "text-[var(--warning)]" : "text-[var(--admin-text-muted)]")} />
                      <span className="ltr truncate">{f.name}</span>
                      {!f.dir && <span className="ms-auto flex-shrink-0 text-[10px] text-[var(--admin-text-subtle)]">{fmtSize(f.size)}</span>}
                    </button>
                    {action && (
                      <button title={action.label} onClick={() => ask(action.target, action.hint)} className="rounded p-1 text-[var(--admin-text-subtle)] opacity-0 hover:bg-white hover:text-[var(--brand-red)] group-hover:opacity-100">
                        <action.icon className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                );
              })}
              {!visible.length && <li className="px-4 py-6 text-center text-xs text-[var(--admin-text-subtle)]">الفولدر فاضي</li>}
            </ul>
            <Preview bookId={bookId} file={sel} local={local} ask={ask} />
          </div>
        </>
      )}
    </Card>
  );
}

/** ملف جوه فولدر مقفول؟ */
function arr0(f: FileEntry, collapsed: Set<string>) {
  const parts = f.path.split("/");
  for (let i = 1; i < parts.length; i++) if (collapsed.has(parts.slice(0, i).join("/"))) return true;
  return false;
}

function Preview({ bookId, file, local, ask }: { bookId: string; file: FileEntry | null; local: boolean; ask: (t: string, h?: string) => void }) {
  const [text, setText] = useState<string | null>(null);
  const kind = file ? kindOf(file.path) : "other";
  useEffect(() => {
    setText(null);
    if (!file || kind !== "text" || !local) return;
    fetch(fileUrl(bookId, file)).then((r) => r.text()).then((t) => setText(t.slice(0, 20000))).catch(() => setText("مقدرتش أقرا الملف"));
  }, [bookId, file, kind, local]);

  if (!file) return <div className="flex items-center justify-center p-6 text-sm text-[var(--admin-text-subtle)]">اختار ملف عشان تشوفه</div>;
  const url = fileUrl(bookId, file);
  const top = file.path.split("/")[0];
  const redo =
    kind === "image" ? { label: "صمّم الصورة دي تاني", hint: `صمّم ${file.path} تاني: ` } :
    kind === "video" && top === "clips" ? { label: "بدّل الكليب ده", hint: `بدّل الكليب ${file.path} بكليب تاني: ` } :
    kind === "video" ? { label: "عدّل الفيديو ده", hint: `عدّل ${file.path}: ` } :
    kind === "audio" ? { label: "سجّل الصوت ده تاني", hint: `اعمل ${file.path} تاني: ` } :
    kind === "text" ? { label: "عدّل الملف ده", hint: `عدّل ${file.path}: ` } : null;

  return (
    <div className="flex min-w-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)] px-4 py-2">
        <span className="ltr truncate text-xs font-medium">{file.path}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[var(--admin-text-subtle)]">{fmtSize(file.size)} · {new Date(file.mtime).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}</span>
          {redo && <Button size="sm" variant="secondary" onClick={() => ask(`file:${file.path}`, redo.hint)}><Wand2 className="h-3.5 w-3.5" /> {redo.label}</Button>}
          {local && <a href={fileUrl(bookId, file, true)} className="rounded p-1.5 text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)]" title="تنزيل"><Download className="h-4 w-4" /></a>}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-[var(--admin-surface-muted)]/50 p-4">
        {!local ? (
          <p className="text-sm text-[var(--admin-text-subtle)]">العرض متاح لما تفتح السيستم من جهازك</p>
        ) : kind === "video" ? (
          <video key={url} src={url} controls preload="metadata" className="max-h-[520px] max-w-full rounded-lg bg-black" />
        ) : kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt={file.name} className="max-h-[520px] max-w-full rounded-lg object-contain shadow" />
        ) : kind === "audio" ? (
          <audio key={url} src={url} controls className="w-full max-w-md" />
        ) : kind === "text" ? (
          <pre className="max-h-[520px] w-full overflow-auto whitespace-pre-wrap rounded-lg bg-white p-4 text-xs leading-relaxed" dir="auto">{text ?? "..."}</pre>
        ) : (
          <p className="text-sm text-[var(--admin-text-subtle)]">مفيش عرض للنوع ده</p>
        )}
      </div>
    </div>
  );
}

// ─── شات الكتاب ──────────────────────────────────────────────────
function Chat({
  bookId, messages, jobs, target, setTarget, draft, setDraft, inputRef,
}: {
  bookId: string; messages: Msg[]; jobs: Job[]; target: string; setTarget: (t: string) => void;
  draft: string; setDraft: (s: string) => void; inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const endRef = useRef<HTMLDivElement>(null);
  const jobById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = () =>
    start(async () => {
      const r = await requestRevision(bookId, target, draft);
      if (r?.error) setErr(r.error);
      else {
        setErr(null);
        setDraft("");
        router.refresh();
      }
    });

  const targetOptions = Object.entries(TARGETS);
  const custom = !TARGETS[target];

  return (
    <aside className="flex h-[calc(100vh-7rem)] flex-col rounded-xl border border-[var(--admin-border)] bg-white xl:sticky xl:top-20 xl:self-start">
      <div className="flex items-center gap-2 border-b border-[var(--admin-border)] px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-red)]"><Bot className="h-4 w-4 text-white" /></div>
        <div>
          <p className="text-sm font-bold">تعديلات الكتاب</p>
          <p className="text-[11px] text-[var(--admin-text-subtle)]">طلبك بيروح مهمة لـ Claude على جهازك، والرد بيظهر هنا</p>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="rounded-lg bg-[var(--admin-surface-muted)] p-4 text-xs leading-relaxed text-[var(--admin-text-muted)]">
            اكتب أي تعديل على محتوى الكتاب. أمثلة:
            <ul className="mt-2 list-disc space-y-1 ps-4">
              <li>الخطّاف بطيء، خلي أول 3 ثواني على الغلاف بزووم سريع</li>
              <li>الترجمة كبيرة وبتغطي الغلاف، صغّرها وانزلها لتحت</li>
              <li>دوّر على كليبات مكتبة أدفى بدل كليب المدينة</li>
              <li>البوستر محتاج العنوان أكبر وخلفية أغمق</li>
            </ul>
          </div>
        )}
        {messages.map((m) => {
          const job = m.jobId ? jobById.get(m.jobId) : undefined;
          const mine = m.role === "USER";
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
              <div className={cn("max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm", mine ? "rounded-ss-sm bg-[var(--brand-red)] text-white" : "rounded-se-sm bg-[var(--admin-surface-muted)]")}>
                {m.target && mine && <p className="mb-1 text-[10px] opacity-80">{targetLabel(m.target)}</p>}
                <p className="whitespace-pre-wrap leading-relaxed" dir="auto">{m.body}</p>
                <div className={cn("mt-1 flex items-center gap-2 text-[10px]", mine ? "text-white/70" : "text-[var(--admin-text-subtle)]")}>
                  <span>{new Date(m.createdAt).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" })}</span>
                  {mine && job && (
                    <>
                      <span className="inline-flex items-center gap-1">
                        {job.status === "RUNNING" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {JOB_STATUS[job.status]?.label}
                      </span>
                      {job.status === "PENDING" && (
                        <button onClick={() => start(async () => { await cancelRevision(job.id); router.refresh(); })} className="underline">إلغاء</button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {jobs.some((j) => j.kind === "REVISE" && j.status === "RUNNING") && (
          <div className="flex justify-end">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-[var(--admin-surface-muted)] px-3 py-2 text-xs text-[var(--admin-text-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Claude شغال على التعديل…
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="space-y-2 border-t border-[var(--admin-border)] p-3">
        <div className="flex items-center gap-2">
          <PenLine className="h-3.5 w-3.5 text-[var(--admin-text-subtle)]" />
          <select value={custom ? "__custom" : target} onChange={(e) => setTarget(e.target.value)} className="field py-1 text-xs">
            {custom && <option value="__custom">{targetLabel(target)}</option>}
            {targetOptions.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {custom && <button onClick={() => setTarget("other")} className="text-[var(--admin-text-subtle)]"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && draft.trim()) send();
            }}
            rows={3}
            placeholder="اكتب التعديل اللي عايزه… (Ctrl+Enter للإرسال)"
            className="field resize-none"
          />
          <Button onClick={send} disabled={pending || !draft.trim()} className="h-10 w-10 flex-shrink-0 p-0" title="ابعت">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 rtl:-scale-x-100" />}
          </Button>
        </div>
        {err && <p className="flex items-center gap-1 text-xs text-[var(--error)]"><AlertCircle className="h-3.5 w-3.5" />{err}</p>}
      </div>
    </aside>
  );
}

