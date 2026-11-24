import { PageHeader, LinkButton } from "@/components/ui";
import { daySummaries } from "@/lib/stats";
import { addDays, cairoDay } from "@/lib/plan";
import { getSettings } from "@/lib/db";
import { MonthGrid } from "./month-grid";
import { ChevronLeft, ChevronRight } from "lucide-react";

function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  return { first, last, prev, next };
}

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const sp = await searchParams;
  const today = cairoDay();
  const month = /^\d{4}-\d{2}$/.test(sp.month ?? "") ? sp.month! : today.slice(0, 7);
  const { first, last, prev, next } = monthBounds(month);
  const settings = await getSettings();

  // الأسبوع بيبدأ السبت
  const firstDow = new Date(`${first}T00:00:00Z`).getUTCDay(); // 0 = الأحد
  const lead = (firstDow + 1) % 7;
  const gridStart = addDays(first, -lead);
  const cells: string[] = [];
  for (let d = gridStart; cells.length < 42; d = addDays(d, 1)) cells.push(d);
  while (cells.length > 35 && cells.slice(-7).every((d) => d > last)) cells.splice(-7);

  const summaries = await daySummaries(cells[0], cells.at(-1)!);
  const monthTitle = new Intl.DateTimeFormat("ar-EG", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${first}T00:00:00Z`));
  let planned = 0, published = 0;
  for (const [d, s] of summaries) if (d >= first && d <= last) { planned += s.total; published += s.published; }

  return (
    <div>
      <PageHeader
        title="التقويم"
        subtitle={`${monthTitle} · ${planned.toLocaleString("ar-EG")} منشور مخطط، نزل منهم ${published.toLocaleString("ar-EG")} · ${settings.booksPerDay} كتاب في اليوم`}
        actions={
          <div className="flex items-center gap-1">
            <LinkButton href={`/calendar?month=${prev}`} variant="secondary" size="sm"><ChevronRight className="h-4 w-4" /> الشهر اللي فات</LinkButton>
            <LinkButton href="/calendar" variant="ghost" size="sm">النهارده</LinkButton>
            <LinkButton href={`/calendar?month=${next}`} variant="secondary" size="sm">الشهر الجاي <ChevronLeft className="h-4 w-4" /></LinkButton>
          </div>
        }
      />
      <MonthGrid cells={cells} month={month} today={today} summaries={Object.fromEntries(summaries)} />
    </div>
  );
}
