import Link from "next/link";
import { notFound } from "next/navigation";
import { db, getSettings } from "@/lib/db";
import { Badge, Card, EmptyState, JOB_STATUS, LinkButton, PageHeader, StatusBadge, BOOK_STATUS } from "@/components/ui";
import { KIND_LABEL, PLATFORM_LABEL, PLATFORM_COLOR, addDays, cairoAt, dayOf } from "@/lib/plan";
import { dayLabel, timeCairo } from "@/lib/utils";
import { ChevronLeft, ChevronRight, FolderOpen } from "lucide-react";
import { PublishButton } from "./publish-button";
import { PostControls } from "./post-controls";
import { AutoRefresh } from "./auto-refresh";
import { BookRowActions } from "@/components/book-row-actions";

export default async function DayPage({ params }: { params: Promise<{ day: string }> }) {
  const { day } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) notFound();
  const settings = await getSettings();

  const posts = await db.post.findMany({
    where: { scheduledAt: { gte: cairoAt(day, "00:00"), lt: cairoAt(addDays(day, 1), "00:00") } },
    orderBy: { scheduledAt: "asc" },
    include: { book: true },
  });
  const jobs = await db.agentJob.findMany({ where: { kind: "PUBLISH", day: new Date(`${day}T00:00:00Z`) }, orderBy: { createdAt: "desc" }, take: 3 });
  const books = [...new Map(posts.map((p) => [p.bookId, p.book])).values()];
  const live = posts.filter((p) => p.status !== "SKIPPED");
  const published = live.filter((p) => p.status === "PUBLISHED").length;
  const running = jobs.some((j) => j.status === "RUNNING" || j.status === "PENDING");

  return (
    <div className="space-y-5">
      {running && <AutoRefresh seconds={8} />}
      <PageHeader
        title={dayLabel(day, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        subtitle={`${books.length} كتاب · ${live.length} منشور · نزل ${published} · لسه ${live.length - published}`}
        actions={
          <>
            <LinkButton href={`/calendar/${addDays(day, -1)}`} variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /> اليوم اللي قبله</LinkButton>
            <LinkButton href={`/calendar/${addDays(day, 1)}`} variant="ghost" size="sm">اليوم اللي بعده <ChevronLeft className="h-4 w-4" /></LinkButton>
            {live.length - published > 0 && <PublishButton day={day} running={running} />}
          </>
        }
      />

      {jobs[0] && (
        <Card padding="sm">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold">آخر مهمة نشر</span>
            <StatusBadge status={jobs[0].status} map={JOB_STATUS} />
          </div>
          {jobs[0].log && <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-[var(--admin-surface-muted)] p-3 text-xs leading-relaxed">{jobs[0].log}</pre>}
          {jobs[0].status === "PENDING" && (
            <p className="mt-2 text-xs text-[var(--admin-text-muted)]">مستنية Claude يسحبها من جهازك. لو مش شغال، قوله: «نفّذ مهام السوشيال».</p>
          )}
        </Card>
      )}

      {books.length === 0 && <Card><EmptyState text="مفيش كتب متخططة اليوم ده" /></Card>}

      {books.map((b) => {
        const bp = posts.filter((p) => p.bookId === b.id);
        return (
          <Card key={b.id} padding="none">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--admin-border)] p-4">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.coverUrl && <img src={b.coverUrl} alt="" className="h-16 w-11 rounded object-cover shadow" />}
                <div>
                  <Link href={`/content/${b.id}`} className="font-bold hover:text-[var(--brand-red)]">{b.titleAr}</Link>
                  <p className="ltr text-xs text-[var(--admin-text-muted)]">{b.titleEn}{b.author ? ` · ${b.author}` : ""}</p>
                  <p className="ltr mt-1 inline-flex items-center gap-1 text-[11px] text-[var(--admin-text-subtle)]">
                    <FolderOpen className="h-3 w-3" /> {settings.contentRoot}\{b.folder}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={b.status} map={BOOK_STATUS} />
                <BookRowActions bookId={b.id} day={dayOf(b.publishDate)} canDelete={!bp.some((p) => p.status === "PUBLISHED")} />
              </div>
            </div>
            <ul className="divide-y divide-[var(--admin-border)]">
              {bp.map((p) => (
                <li key={p.id} className="grid grid-cols-[4.5rem_8rem_1fr_auto] items-start gap-3 px-4 py-3 text-sm">
                  <span className="pt-0.5 font-bold tabular-nums">{timeCairo(p.scheduledAt)}</span>
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: PLATFORM_COLOR[p.platform] }}>
                      <span className="h-2 w-2 rounded-full" style={{ background: PLATFORM_COLOR[p.platform] }} />
                      {PLATFORM_LABEL[p.platform]}
                    </span>
                    <p className="text-xs text-[var(--admin-text-muted)]">{KIND_LABEL[p.kind]}</p>
                    {p.lang === "en" && <Badge tone="info">English</Badge>}
                  </div>
                  <div className="min-w-0">
                    {p.title && <p className="font-medium">{p.title}</p>}
                    {p.text ? (
                      <p className="line-clamp-3 whitespace-pre-line text-xs text-[var(--admin-text-muted)]" dir="auto">{p.text}</p>
                    ) : (
                      <p className="text-xs text-[var(--admin-text-subtle)]">النص لسه متكتبش</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-3 text-[11px]">
                      {p.assetPath && <span className="ltr text-[var(--admin-text-subtle)]">{p.assetPath}</span>}
                      {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-[var(--info)] underline">المنشور</a>}
                      {p.error && <span className="text-[var(--error)]">{p.error}</span>}
                    </div>
                  </div>
                  <PostControls id={p.id} status={p.status} />
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
