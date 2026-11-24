"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ExternalLink, Play, X } from "lucide-react";
import type { DaySummary } from "@/lib/stats";
import { Badge, Button, BOOK_STATUS, LinkButton } from "@/components/ui";
import { publishNow } from "../queue/actions";
import { cn } from "@/lib/utils";

const WEEK = ["السبت", "الأحد", "الاتنين", "التلات", "الأربع", "الخميس", "الجمعة"];

export function MonthGrid({
  cells,
  month,
  today,
  summaries,
}: {
  cells: string[];
  month: string;
  today: string;
  summaries: Record<string, DaySummary>;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const sel = open ? summaries[open] : null;

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
        <div className="grid grid-cols-7 border-b border-[var(--admin-border)] bg-[var(--admin-surface-muted)]/60">
          {WEEK.map((w) => (
            <div key={w} className="px-2 py-2 text-center text-xs font-semibold text-[var(--admin-text-muted)]">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d) => {
            const s = summaries[d];
            const inMonth = d.startsWith(month);
            const isToday = d === today;
            const past = d < today;
            const total = s?.total ?? 0;
            const pub = s?.published ?? 0;
            const left = total - pub;
            const done = total > 0 && left === 0;
            return (
              <button
                key={d}
                onClick={() => setOpen(d)}
                className={cn(
                  "group relative flex min-h-28 flex-col border-b border-e border-[var(--admin-border)] p-2 text-start transition-colors hover:bg-[var(--admin-hover)]",
                  !inMonth && "bg-[var(--admin-surface-muted)]/40 text-[var(--admin-text-subtle)]",
                  open === d && "ring-2 ring-inset ring-[var(--brand-red)]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                      isToday && "bg-[var(--brand-red)] text-white",
                    )}
                  >
                    {Number(d.slice(8))}
                  </span>
                  {total > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                        done ? "bg-[var(--success-soft)] text-[var(--success)]" : past ? "bg-[var(--error-soft)] text-[var(--error)]" : "bg-[var(--admin-surface-muted)] text-[var(--admin-text-muted)]",
                      )}
                    >
                      {pub}/{total}
                    </span>
                  )}
                </div>

                {total > 0 && (
                  <div className="mt-auto space-y-1.5">
                    <div className="flex -space-x-2 space-x-reverse">
                      {s!.books.slice(0, 4).map((b) =>
                        b.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={b.id} src={b.coverUrl} alt="" className="h-9 w-6 rounded-sm border border-white object-cover shadow-sm" />
                        ) : (
                          <div key={b.id} className="h-9 w-6 rounded-sm border border-white bg-[var(--admin-border)]" />
                        ),
                      )}
                    </div>
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--admin-surface-muted)]">
                      <div className="bg-[var(--success)]" style={{ width: `${(pub / total) * 100}%` }} />
                      {past && <div className="bg-[var(--error)]/70" style={{ width: `${(left / total) * 100}%` }} />}
                    </div>
                    <p className="text-[10px] text-[var(--admin-text-muted)]">
                      {done ? "كله نزل" : `${left} لسه`}
                    </p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {open && <DayPanel day={open} s={sel} today={today} onClose={() => setOpen(null)} />}
    </div>
  );
}

function DayPanel({ day, s, today, onClose }: { day: string; s: DaySummary | null; today: string; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [started, setStarted] = useState(false);
  const router = useRouter();
  const label = new Intl.DateTimeFormat("ar-EG", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`));
  const books = s?.books ?? [];
  const pending_ = books.filter((b) => b.published < b.total);
  const doneBooks = books.filter((b) => b.total > 0 && b.published === b.total);

  return (
    <aside className="sticky top-20 h-fit w-80 flex-shrink-0 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-4 py-3">
        <div>
          <p className="font-bold">{label}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">
            {s ? `${s.total} منشور · نزل ${s.published} · لسه ${s.total - s.published}` : "مفيش حاجة متخططة"}
          </p>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-[var(--admin-hover)]"><X className="h-4 w-4" /></button>
      </div>

      <div className="max-h-[60vh] space-y-4 overflow-y-auto p-4">
        <Section title="لسه متنشرتش" icon={<Circle className="h-3.5 w-3.5 text-[var(--warning)]" />} books={pending_} />
        <Section title="اتنشرت" icon={<CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" />} books={doneBooks} />
        {!books.length && <p className="py-6 text-center text-sm text-[var(--admin-text-subtle)]">اختار كتب من «ترتيب الكتب» وهتتوزع على الأيام الفاضية.</p>}
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--admin-border)] p-4">
        {pending_.length > 0 && (
          <Button
            disabled={pending || started}
            onClick={() =>
              start(async () => {
                await publishNow(day);
                setStarted(true);
                router.refresh();
              })
            }
          >
            <Play className="h-4 w-4" />
            {started ? "اتبعتت لـ Claude" : day > today ? "بدء النشر (جدولة)" : "بدء النشر"}
          </Button>
        )}
        <LinkButton href={`/calendar/${day}`} variant="secondary">
          <ExternalLink className="h-4 w-4" /> افتح اليوم كامل
        </LinkButton>
      </div>
    </aside>
  );
}

function Section({ title, icon, books }: { title: string; icon: React.ReactNode; books: DaySummary["books"] }) {
  if (!books.length) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--admin-text-muted)]">{icon}{title} ({books.length})</p>
      <ul className="space-y-2">
        {books.map((b) => (
          <li key={b.id} className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {b.coverUrl ? <img src={b.coverUrl} alt="" className="h-11 w-8 rounded object-cover" /> : <div className="h-11 w-8 rounded bg-[var(--admin-surface-muted)]" />}
            <div className="min-w-0 flex-1">
              <a href={`/content/${b.id}`} className="block truncate text-sm font-medium hover:text-[var(--brand-red)]">{b.titleAr}</a>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge tone={BOOK_STATUS[b.status]?.tone ?? "muted"}>{BOOK_STATUS[b.status]?.label ?? b.status}</Badge>
                <span className="text-[11px] tabular-nums text-[var(--admin-text-subtle)]">{b.published}/{b.total}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

