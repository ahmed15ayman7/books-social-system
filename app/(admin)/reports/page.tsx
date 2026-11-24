import Link from "next/link";
import { Download, Printer } from "lucide-react";
import { Card, LinkButton, PageHeader, StatCard, Table, Td } from "@/components/ui";
import { DailyChart, PlatformProgress } from "@/components/charts";
import { reportData, resolveRange } from "@/lib/report";
import { dailySeries } from "@/lib/stats";
import { PLATFORM_COLOR, cairoDay } from "@/lib/plan";
import { CalendarCheck, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";
import { cn, dayLabel, n } from "@/lib/utils";
import type { Platform } from "@prisma/client";

const PRESETS = [
  { key: "week", label: "الأسبوع ده" },
  { key: "lastweek", label: "الأسبوع اللي فات" },
  { key: "month", label: "الشهر ده" },
  { key: "lastmonth", label: "الشهر اللي فات" },
];

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const range = resolveRange(sp);
  const active = sp.range ?? "month";
  const [r, series] = await Promise.all([reportData(range), dailySeries(range.from, range.to)]);
  const pct = r.planned ? Math.round((r.published / r.planned) * 100) : 0;
  const csv = `/api/reports/csv?from=${range.from}&to=${range.to}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="التقارير"
        subtitle={`${range.label} · ${dayLabel(range.from, { day: "numeric", month: "long" })} – ${dayLabel(range.to, { day: "numeric", month: "long", year: "numeric" })}`}
        actions={<LinkButton href={csv} variant="secondary"><Download className="h-4 w-4" /> CSV</LinkButton>}
      />

      <div className="flex flex-wrap items-end gap-2">
        {PRESETS.map((p) => (
          <Link
            key={p.key}
            href={`/reports?range=${p.key}`}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm",
              active === p.key ? "border-[var(--brand-red)] bg-[var(--brand-red)] text-white" : "border-[var(--admin-border)] bg-white hover:bg-[var(--admin-hover)]",
            )}
          >
            {p.label}
          </Link>
        ))}
        <form className="flex items-end gap-2" method="get">
          <input type="hidden" name="range" value="custom" />
          <div><label className="field-label">من</label><input type="date" name="from" defaultValue={range.from} className="field" /></div>
          <div><label className="field-label">لـ</label><input type="date" name="to" defaultValue={range.to} className="field" /></div>
          <button className={cn("rounded-lg border px-3 py-2 text-sm", active === "custom" ? "border-[var(--brand-red)] bg-[var(--brand-red)] text-white" : "border-[var(--admin-border)] bg-white")}>فترة مخصوصة</button>
        </form>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={CalendarCheck} label="منشورات مخططة" value={r.planned} tone="info" />
        <StatCard icon={CheckCircle2} label="نزلت" value={r.published} tone="success" hint={`${n(pct)}٪ من المخطط`} />
        <StatCard icon={AlertTriangle} label="فشلت" value={r.failed} tone="error" alert={r.failed > 0} />
        <StatCard icon={BookOpen} label="كتب" value={r.books} tone="red" hint={`${n(r.booksDone)} خلصت كل منشوراتها`} />
      </div>

      <Card title="كل يوم في الفترة">
        <DailyChart data={series} today={cairoDay()} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="المنصات">
          <PlatformProgress rows={r.byPlatform.map((p) => ({ platform: p.platform, label: p.label, color: PLATFORM_COLOR[p.platform as Platform], published: p.published, total: p.planned }))} />
        </Card>
        <Card title="أنواع المحتوى" padding="none">
          <Table head={["النوع", "مخطط", "نزل", "النسبة"]} empty={!r.byKind.length}>
            {r.byKind.map((k) => (
              <tr key={k.label}>
                <Td>{k.label}</Td>
                <Td className="tabular-nums">{n(k.planned)}</Td>
                <Td className="tabular-nums">{n(k.published)}</Td>
                <Td className="tabular-nums">{n(k.planned ? Math.round((k.published / k.planned) * 100) : 0)}٪</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <Card title="الكتب" padding="none" actions={<span className="inline-flex items-center gap-1 text-xs text-[var(--admin-text-subtle)]"><Printer className="h-3.5 w-3.5" /> Ctrl+P للطباعة</span>}>
        <Table head={["اليوم", "الكتاب", "نزل", "اللينكات"]} empty={!r.byBook.length}>
          {r.byBook.map((b) => (
            <tr key={b.title + b.day}>
              <Td className="whitespace-nowrap">{dayLabel(b.day, { day: "numeric", month: "short" })}</Td>
              <Td>
                <p className="font-medium">{b.title}</p>
                <p className="ltr text-xs text-[var(--admin-text-muted)]">{b.titleEn}</p>
              </Td>
              <Td className="tabular-nums">{b.published}/{b.planned}</Td>
              <Td>
                <div className="flex flex-wrap gap-2">
                  {b.links.map((l, i) => (
                    <a key={l} href={l} target="_blank" rel="noreferrer" className="text-xs text-[var(--info)] underline">{i + 1}</a>
                  ))}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
