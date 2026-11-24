import Link from "next/link";
import { BookOpen, CalendarCheck, CalendarDays, Clapperboard, ListOrdered } from "lucide-react";
import { db, getSettings } from "@/lib/db";
import { Card, LinkButton, PageHeader, StatCard } from "@/components/ui";
import { DailyChart, Pipeline, PlatformProgress } from "@/components/charts";
import { dailySeries, daySummaries, pipelineCounts, platformBreakdown } from "@/lib/stats";
import { PLATFORM_COLOR, PLATFORM_LABEL, addDays, cairoDay } from "@/lib/plan";
import { rankedBooks } from "@/lib/source-db";
import { BOOK_STATUS } from "@/components/ui";

/** هدف الخطة الشهري: 60 Short + 60 تغريدة + 120 فيسبوك */
const MONTH_TARGET = 240;

export default async function Dashboard() {
  const today = cairoDay();
  const monthStart = `${today.slice(0, 7)}-01`;
  const [y, m] = today.split("-").map(Number);
  const monthEnd = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const settings = await getSettings();

  const [series, todayMap, platforms, pipeline, queued, pendingJobs, top] = await Promise.all([
    dailySeries(addDays(today, -20), addDays(today, 9)),
    daySummaries(today, today),
    platformBreakdown(monthStart, monthEnd),
    pipelineCounts(),
    db.contentBook.count({ where: { status: { notIn: ["PUBLISHED"] } } }),
    db.agentJob.count({ where: { status: { in: ["PENDING", "RUNNING"] } } }),
    rankedBooks({ sort: "score", hideQueued: true, pageSize: 5, popularityWeight: settings.popularityWeight, minYear: settings.minYear }),
  ]);
  const t = todayMap.get(today);
  const monthPublished = platforms.reduce((a, p) => a + p.published, 0);
  const monthPlanned = platforms.reduce((a, p) => a + p.total, 0);
  const lastPlanned = await db.contentBook.findFirst({ orderBy: { publishDate: "desc" }, select: { publishDate: true } });
  const runway = lastPlanned ? Math.max(0, Math.round((lastPlanned.publishDate.getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="لوحة التحكم"
        subtitle="المحتوى من اختيار الكتاب لحد ما ينزل على المنصات"
        actions={
          <>
            <LinkButton href="/books" variant="secondary"><BookOpen className="h-4 w-4" /> اختار كتب</LinkButton>
            <LinkButton href={`/calendar/${today}`}><CalendarCheck className="h-4 w-4" /> منشورات النهارده</LinkButton>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CalendarCheck} label="نزل النهارده" value={t ? `${t.published} / ${t.total}` : "0"} tone={t && t.published === t.total ? "success" : "red"} href={`/calendar/${today}`} hint={t ? `${t.books.length} كتاب` : "مفيش حاجة متخططة"} />
        <StatCard icon={CalendarDays} label="نزل الشهر ده" value={monthPublished} tone="info" hint={`من ${monthPlanned.toLocaleString("ar-EG")} مخطط · هدف الخطة ${MONTH_TARGET}`} href="/calendar" />
        <StatCard icon={ListOrdered} label="كتب في الطابور" value={queued} tone="warning" hint={runway ? `مغطي ${runway.toLocaleString("ar-EG")} يوم قدام` : "الطابور فاضي"} alert={runway < 7} href="/queue" />
        <StatCard icon={Clapperboard} label="مهام مستنية Claude" value={pendingJobs} tone="muted" href="/queue" />
      </div>

      <Card title="آخر 3 أسابيع والأيام الجاية" actions={<span className="text-xs text-[var(--admin-text-subtle)]">منشورات كل يوم</span>}>
        <DailyChart data={series} today={today} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="المنصات الشهر ده">
          <PlatformProgress
            rows={(["YOUTUBE", "FACEBOOK", "X", "INSTAGRAM"] as const)
              .map((p) => {
                const found = platforms.find((x) => x.platform === p);
                return { platform: p, label: PLATFORM_LABEL[p], color: PLATFORM_COLOR[p], published: found?.published ?? 0, total: found?.total ?? 0 };
              })
              .filter((r) => r.total > 0 || r.platform !== "INSTAGRAM")}
          />
        </Card>
        <Card title="مراحل الكتب">
          <Pipeline rows={pipeline.map((p) => ({ label: BOOK_STATUS[p.status].label, count: p.count }))} />
        </Card>
      </div>

      <Card title="أنسب 5 كتب لسه متختارتش" actions={<Link href="/books" className="text-xs text-[var(--brand-red)]">كل الترتيب ←</Link>}>
        <ul className="grid gap-4 sm:grid-cols-5">
          {top.rows.map((b) => (
            <li key={b.id} className="min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {b.imageUrl ? <img src={b.imageUrl} alt="" className="mb-2 aspect-[2/3] w-full rounded-lg object-cover shadow-sm" /> : <div className="mb-2 aspect-[2/3] rounded-lg bg-[var(--admin-surface-muted)]" />}
              <p className="truncate text-sm font-semibold">{b.titleAr || b.titleEn}</p>
              <p className="truncate text-xs text-[var(--admin-text-muted)]">{b.author}</p>
              <p className="mt-1 text-xs"><b className="tabular-nums">{b.score}</b> <span className="text-[var(--admin-text-subtle)]">نقطة · {b.year ?? "—"}</span></p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
