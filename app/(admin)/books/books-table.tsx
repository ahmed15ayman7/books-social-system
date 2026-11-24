"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ListPlus, Minus, Plus, X } from "lucide-react";
import type { RankedBook } from "@/lib/source-db";
import { BOOK_STATUS, Badge, Button, EmptyState } from "@/components/ui";
import { addToQueue, savePriority } from "./actions";
import { cn } from "@/lib/utils";

const KEY = "books-social:selected";

function loadSel(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}
function saveSel(v: Record<string, string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {}
}

function Bar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--admin-surface-muted)]">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, value)}%`, background: tone }} />
      </div>
      <span className="w-7 text-xs tabular-nums text-[var(--admin-text-muted)]">{value}</span>
    </div>
  );
}

function Priority({ id, initial, enabled }: { id: string; initial: number; enabled: boolean }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const change = (next: number) => {
    setV(next);
    start(async () => {
      const e = await savePriority(id, next);
      setErr(e);
      if (!e) router.refresh();
    });
  };
  return (
    <div className="flex items-center gap-1" title={err ?? "الأولوية بتتضاف على النتيجة"}>
      <button disabled={!enabled || pending} onClick={() => change(v - 10)} className="rounded p-1 hover:bg-[var(--admin-hover)] disabled:opacity-30">
        <Minus className="h-3 w-3" />
      </button>
      <span className={cn("w-8 text-center text-xs font-bold tabular-nums", v > 0 && "text-[var(--brand-red)]", err && "text-[var(--error)]")}>
        {v > 0 ? `+${v}` : v}
      </span>
      <button disabled={!enabled || pending} onClick={() => change(v + 10)} className="rounded p-1 hover:bg-[var(--admin-hover)] disabled:opacity-30">
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

export function BooksTable({ rows, hasPriority, offset }: { rows: RankedBook[]; hasPriority: boolean; offset: number }) {
  const [sel, setSel] = useState<Record<string, string>>({});
  const [startDay, setStartDay] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setSel(loadSel());
  }, []);
  const update = (v: Record<string, string>) => {
    setSel(v);
    saveSel(v);
  };
  const toggle = (b: RankedBook) => {
    if (b.queuedStatus) return;
    const next = { ...sel };
    if (next[b.id]) delete next[b.id];
    else next[b.id] = b.titleAr || b.titleEn;
    update(next);
  };
  const selectable = rows.filter((r) => !r.queuedStatus);
  const allOnPage = selectable.length > 0 && selectable.every((r) => sel[r.id]);
  const togglePage = () => {
    const next = { ...sel };
    for (const r of selectable) {
      if (allOnPage) delete next[r.id];
      else next[r.id] = r.titleAr || r.titleEn;
    }
    update(next);
  };
  const count = Object.keys(sel).length;

  const submit = () =>
    start(async () => {
      const r = await addToQueue(Object.keys(sel), startDay);
      if (r.error) setMsg(r.error);
      else {
        setMsg(`اتضاف ${r.added} كتاب للطابور${r.skipped ? ` (${r.skipped} كانوا موجودين)` : ""}. افتح كل كتاب ودوس «تجهيز الفيديو» لما تحب تبدأ.`);
        update({});
        router.refresh();
      }
    });

  if (!rows.length) return <EmptyState text="مفيش كتب بالفلتر ده" />;

  return (
    <>
      {msg && (
        <div className="mb-3 flex items-center justify-between rounded-lg bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">
          {msg}
          <button onClick={() => setMsg(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-muted)]/60 text-xs text-[var(--admin-text-muted)]">
              <th className="w-10 px-3 py-2.5">
                <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="اختار الصفحة" />
              </th>
              <th className="px-2 py-2.5 text-start">#</th>
              <th className="px-3 py-2.5 text-start">الكتاب</th>
              <th className="px-3 py-2.5 text-start">السنة</th>
              <th className="px-3 py-2.5 text-start">الشهرة</th>
              <th className="px-3 py-2.5 text-start">الحداثة</th>
              <th className="px-3 py-2.5 text-start">القرّاء</th>
              <th className="px-3 py-2.5 text-start">الأولوية</th>
              <th className="px-3 py-2.5 text-start">النتيجة</th>
              <th className="px-3 py-2.5 text-start">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--admin-border)]">
            {rows.map((b, i) => {
              const checked = !!sel[b.id];
              const st = b.queuedStatus ? BOOK_STATUS[b.queuedStatus] : null;
              return (
                <tr
                  key={b.id}
                  onClick={() => toggle(b)}
                  className={cn("cursor-pointer transition-colors", checked ? "bg-[var(--brand-red-soft)]/60" : "hover:bg-[var(--admin-hover)]", b.queuedStatus && "cursor-default opacity-70")}
                >
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={checked} disabled={!!b.queuedStatus} onChange={() => toggle(b)} />
                  </td>
                  <td className="px-2 py-2 text-xs tabular-nums text-[var(--admin-text-subtle)]">{offset + i + 1}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      {b.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={b.imageUrl} alt="" loading="lazy" className="h-14 w-10 flex-shrink-0 rounded object-cover shadow-sm" />
                      ) : (
                        <div className="h-14 w-10 flex-shrink-0 rounded bg-[var(--admin-surface-muted)]" />
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold" title={b.titleAr ?? ""}>{b.titleAr || b.titleEn}</p>
                        <p className="ltr truncate text-xs text-[var(--admin-text-muted)]" title={b.titleEn}>{b.titleEn}</p>
                        <p className="truncate text-[11px] text-[var(--admin-text-subtle)]">
                          {[b.author, b.publisher, b.category].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 tabular-nums">{b.year ?? "—"}</td>
                  <td className="px-3 py-2">{b.fetched ? <Bar value={b.popularity} tone="var(--brand-red)" /> : <span className="text-xs text-[var(--admin-text-subtle)]">لسه</span>}</td>
                  <td className="px-3 py-2"><Bar value={b.recency} tone="var(--info)" /></td>
                  <td className="px-3 py-2 text-xs tabular-nums">{b.readers ? b.readers.toLocaleString("ar-EG") : "—"}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <Priority id={b.id} initial={b.priority} enabled={hasPriority} />
                  </td>
                  <td className="px-3 py-2 text-base font-black tabular-nums">{b.score}</td>
                  <td className="px-3 py-2">
                    {st ? <Badge tone={st.tone}>{st.label}{b.queuedDate ? ` · ${b.queuedDate.slice(5)}` : ""}</Badge> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {count > 0 && (
        <div className="sticky bottom-4 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--brand-red)]/30 bg-white p-3 shadow-lg">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-[var(--brand-red)]" />
            <span className="font-bold">{count} كتاب مختار</span>
            <span className="truncate text-xs text-[var(--admin-text-muted)]">{Object.values(sel).slice(0, 3).join("، ")}{count > 3 ? "…" : ""}</span>
            <button onClick={() => update({})} className="text-xs text-[var(--admin-text-subtle)] underline">مسح</button>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-[var(--admin-text-muted)]">يبدأ من</label>
            <input type="date" value={startDay} onChange={(e) => setStartDay(e.target.value)} className="field w-40" />
            <Button onClick={submit} disabled={pending}>
              <ListPlus className="h-4 w-4" />
              {pending ? "بيتضاف..." : "أضف للطابور"}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
