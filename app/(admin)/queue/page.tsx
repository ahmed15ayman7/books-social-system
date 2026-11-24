import Link from "next/link";
import { db, getSettings } from "@/lib/db";
import { BookRowActions } from "@/components/book-row-actions";
import { Badge, BOOK_STATUS, Card, EmptyState, JOB_STATUS, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { dayOf } from "@/lib/plan";
import { dayLabel, formatCairo, n } from "@/lib/utils";
import { BookOpen, FolderOpen } from "lucide-react";
import { CancelJob } from "./cancel-job";

export default async function QueuePage() {
  const settings = await getSettings();
  const [books, jobs] = await Promise.all([
    db.contentBook.findMany({
      where: { status: { not: "PUBLISHED" } },
      orderBy: [{ publishDate: "asc" }, { position: "asc" }],
      include: { posts: { select: { status: true } } },
    }),
    db.agentJob.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const titles = new Map(
    (await db.contentBook.findMany({ where: { id: { in: jobs.map((j) => j.bookId!).filter(Boolean) } }, select: { id: true, titleAr: true } })).map((b) => [
      b.id,
      b.titleAr,
    ]),
  );
  const produceJob = new Map<string, (typeof jobs)[number]>();
  for (const j of [...jobs].reverse()) if (j.kind === "PRODUCE" && j.bookId) produceJob.set(j.bookId, j);

  return (
    <div className="space-y-6">
      <PageHeader
        title="طابور الإنتاج"
        subtitle={`${n(books.length)} كتاب مستني يتنشر · كل كتاب: Short عربي + Short إنجليزي + Reel + تغريدتين + بوستين فيسبوك`}
        actions={<LinkButton href="/books" variant="secondary"><BookOpen className="h-4 w-4" /> اختار كتب</LinkButton>}
      />

      <Card padding="none" title="الكتب بالترتيب">
        {books.length === 0 ? (
          <EmptyState text="الطابور فاضي. اختار كتب من صفحة ترتيب الكتب." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-muted)]/60 text-xs text-[var(--admin-text-muted)]">
                  <th className="px-4 py-2.5 text-start">يوم النشر</th>
                  <th className="px-4 py-2.5 text-start">الكتاب</th>
                  <th className="px-4 py-2.5 text-start">الإنتاج</th>
                  <th className="px-4 py-2.5 text-start">المنشورات الجاهزة</th>
                  <th className="px-4 py-2.5 text-start">الفولدر</th>
                  <th className="px-4 py-2.5 text-start"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--admin-border)]">
                {books.map((b) => {
                  const day = dayOf(b.publishDate);
                  const ready = b.posts.filter((p) => ["READY", "PUBLISHED", "PUBLISHING"].includes(p.status)).length;
                  const job = produceJob.get(b.id);
                  return (
                    <tr key={b.id} className="hover:bg-[var(--admin-hover)]/50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link href={`/calendar/${day}`} className="font-medium hover:text-[var(--brand-red)]">{dayLabel(day)}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {b.coverUrl && <img src={b.coverUrl} alt="" className="h-12 w-9 rounded object-cover" />}
                          <div className="min-w-0">
                            <Link href={`/content/${b.id}`} className="font-semibold hover:text-[var(--brand-red)]">{b.titleAr}</Link>
                            <p className="ltr truncate text-xs text-[var(--admin-text-muted)]">{b.titleEn}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge status={b.status} map={BOOK_STATUS} />
                          {job && job.status !== "DONE" && <span className="text-[11px] text-[var(--admin-text-subtle)]">مهمة: {JOB_STATUS[job.status].label}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--admin-surface-muted)]">
                            <div className="h-full rounded-full bg-[var(--success)]" style={{ width: `${(ready / Math.max(1, b.posts.length)) * 100}%` }} />
                          </div>
                          <span className="text-xs tabular-nums">{ready}/{b.posts.length}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="ltr inline-flex items-center gap-1 text-xs text-[var(--admin-text-muted)]" title={`${settings.contentRoot}\\${b.folder}`}>
                          <FolderOpen className="h-3.5 w-3.5" />
                          {b.folder}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <BookRowActions bookId={b.id} day={day} canRetry={b.status === "FAILED" || (job?.status === "FAILED")} canDelete={!b.posts.some((p) => p.status === "PUBLISHED")} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card padding="none" title="مهام Claude (آخر 30)">
        {jobs.length === 0 ? (
          <EmptyState text="مفيش مهام لسه" />
        ) : (
          <ul className="divide-y divide-[var(--admin-border)]">
            {jobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <Badge tone={j.kind === "PRODUCE" ? "info" : j.kind === "REVISE" ? "warning" : "red"}>{{ PRODUCE: "إنتاج", REVISE: "تعديل", PUBLISH: "نشر" }[j.kind]}</Badge>
                  <span className="truncate font-medium">
                    {j.bookId ? titles.get(j.bookId) ?? "كتاب اتشال" : `كل كتب يوم ${j.day ? dayLabel(dayOf(j.day)) : ""}`}
                  </span>
                  {j.log && <span className="hidden max-w-md truncate text-xs text-[var(--admin-text-subtle)] md:inline" title={j.log}>{j.log.split("\n").filter(Boolean).at(-1)}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--admin-text-subtle)]">{formatCairo(j.createdAt)}</span>
                  <StatusBadge status={j.status} map={JOB_STATUS} />
                  {(j.status === "PENDING" || j.status === "RUNNING") && <CancelJob id={j.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
