import { getSettings } from "@/lib/db";
import { categories, hasPriorityColumn, rankedBooks, statsCoverage, type RankSort } from "@/lib/source-db";
import { Notice, PageHeader } from "@/components/ui";
import { BooksTable } from "./books-table";
import { PopularityButton } from "./popularity-button";
import { n } from "@/lib/utils";

const PAGE = 50;

export default async function BooksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = (["score", "popular", "newest", "priority"].includes(sp.sort ?? "") ? sp.sort : "score") as RankSort;
  const [{ rows, total }, cats, coverage, hasPrio] = await Promise.all([
    rankedBooks({
      q: sp.q?.trim() || undefined,
      lang: sp.lang || undefined,
      category: sp.category || undefined,
      sort,
      hideQueued: sp.all !== "1",
      page,
      pageSize: PAGE,
      popularityWeight: settings.popularityWeight,
      minYear: settings.minYear,
    }),
    categories(),
    statsCoverage(settings.minYear),
    hasPriorityColumn(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) u.set(k, v);
    return `?${u}`;
  };

  return (
    <div>
      <PageHeader
        title="ترتيب الكتب"
        subtitle={`الأشهر عالميًا والأحدث في نفس الوقت · الوزن: ${settings.popularityWeight}% شهرة و${100 - settings.popularityWeight}% حداثة + الأولوية`}
        actions={<PopularityButton coverage={coverage} />}
      />

      {!hasPrio && (
        <Notice tone="warning">
          عمود الأولوية (products.social_priority) لسه مش موجود في قاعدة المنصة. الترتيب شغال، بس تعديل الأولوية هيشتغل بعد ما migration المنصة تتعمل.
        </Notice>
      )}
      {coverage.fetched < coverage.total && (
        <Notice tone="info">
          اتجابت بيانات الشهرة لـ {n(coverage.fetched)} من {n(coverage.total)} كتاب. اللي لسه متجابش بيترتب بالحداثة والأولوية بس، فدوس «تحديث الترتيب» لحد ما يكمل.
        </Notice>
      )}

      <form className="mb-4 flex flex-wrap items-end gap-2" method="get">
        <div className="min-w-56 flex-1">
          <label className="field-label">بحث</label>
          <input name="q" defaultValue={sp.q} placeholder="اسم الكتاب، المؤلف، ISBN" className="field" />
        </div>
        <div>
          <label className="field-label">الترتيب</label>
          <select name="sort" defaultValue={sort} className="field">
            <option value="score">الأنسب (شهرة + حداثة)</option>
            <option value="popular">الأشهر</option>
            <option value="newest">الأحدث</option>
            <option value="priority">الأولوية</option>
          </select>
        </div>
        <div>
          <label className="field-label">اللغة</label>
          <select name="lang" defaultValue={sp.lang ?? ""} className="field">
            <option value="">الكل</option>
            <option value="en">إنجليزي</option>
            <option value="ar">عربي</option>
            <option value="fr">فرنساوي</option>
            <option value="de">ألماني</option>
            <option value="it">إيطالي</option>
            <option value="es">إسباني</option>
          </select>
        </div>
        <div>
          <label className="field-label">القسم</label>
          <select name="category" defaultValue={sp.category ?? ""} className="field max-w-52">
            <option value="">كل الأقسام</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({n(c.count)})
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" name="all" value="1" defaultChecked={sp.all === "1"} /> اعرض اللي في الطابور
        </label>
        <button className="field w-auto cursor-pointer bg-[var(--admin-surface-muted)] font-medium">تطبيق</button>
      </form>

      <BooksTable rows={rows} hasPriority={hasPrio} offset={(page - 1) * PAGE} />

      <div className="mt-4 flex items-center justify-between text-sm text-[var(--admin-text-muted)]">
        <span>{n(total)} كتاب</span>
        <div className="flex items-center gap-2">
          {page > 1 && <a className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5" href={qs({ page: String(page - 1) })}>السابق</a>}
          <span>
            صفحة {n(page)} من {n(pages)}
          </span>
          {page < pages && <a className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-1.5" href={qs({ page: String(page + 1) })}>التالي</a>}
        </div>
      </div>
    </div>
  );
}
