import Link from "next/link";
import { db } from "@/lib/db";
import { Card, EmptyState, PageHeader, StatusBadge, BOOK_STATUS } from "@/components/ui";
import { KIND_LABEL, PLATFORM_COLOR, dayOf } from "@/lib/plan";
import { dayLabel, n } from "@/lib/utils";

/** قايمة الكتب اللي اتعمل لها محتوى، بتاريخ نشرها حسب الخطة */
export default async function PublishedPage({ searchParams }: { searchParams: Promise<{ q?: string; show?: string }> }) {
  const sp = await searchParams;
  const all = sp.show === "all";
  const books = await db.contentBook.findMany({
    where: {
      ...(all ? {} : { posts: { some: { status: "PUBLISHED" } } }),
      ...(sp.q ? { OR: [{ titleAr: { contains: sp.q, mode: "insensitive" } }, { titleEn: { contains: sp.q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { publishDate: "desc" },
    include: { posts: { orderBy: { scheduledAt: "asc" } } },
    take: 300,
  });

  return (
    <div className="space-y-5">
      <PageHeader title="اللي اتنشر" subtitle={`${n(books.length)} كتاب ${all ? "في الخطة" : "نزل منهم محتوى"} · مرتبين بتاريخ النشر`} />
      <form className="flex flex-wrap items-center gap-2" method="get">
        <input name="q" defaultValue={sp.q} placeholder="دوّر باسم الكتاب" className="field max-w-xs" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="show" value="all" defaultChecked={all} /> كل الكتب المخططة</label>
        <button className="field w-auto cursor-pointer bg-[var(--admin-surface-muted)]">تطبيق</button>
      </form>

      <Card padding="none">
        {books.length === 0 ? (
          <EmptyState text="لسه مفيش حاجة نزلت" />
        ) : (
          <ul className="divide-y divide-[var(--admin-border)]">
            {books.map((b) => {
              const day = dayOf(b.publishDate);
              const live = b.posts.filter((p) => p.status !== "SKIPPED");
              const done = live.filter((p) => p.status === "PUBLISHED").length;
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-4 px-5 py-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {b.coverUrl ? <img src={b.coverUrl} alt="" className="h-14 w-10 rounded object-cover" /> : <div className="h-14 w-10 rounded bg-[var(--admin-surface-muted)]" />}
                  <div className="min-w-48 flex-1">
                    <Link href={`/content/${b.id}`} className="font-semibold hover:text-[var(--brand-red)]">{b.titleAr}</Link>
                    <p className="ltr text-xs text-[var(--admin-text-muted)]">{b.titleEn}</p>
                  </div>
                  <Link href={`/calendar/${day}`} className="w-36 text-sm hover:text-[var(--brand-red)]">{dayLabel(day, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</Link>
                  <div className="flex items-center gap-1" title="المنشورات">
                    {b.posts.map((p) => (
                      <a
                        key={p.id}
                        href={p.url ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        title={`${KIND_LABEL[p.kind]}${p.status === "PUBLISHED" ? " · نزل" : ""}`}
                        className="h-3 w-3 rounded-full border-2"
                        style={{ borderColor: PLATFORM_COLOR[p.platform], background: p.status === "PUBLISHED" ? PLATFORM_COLOR[p.platform] : "transparent" }}
                      />
                    ))}
                  </div>
                  <span className="w-12 text-sm tabular-nums">{done}/{live.length}</span>
                  <StatusBadge status={b.status} map={BOOK_STATUS} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
