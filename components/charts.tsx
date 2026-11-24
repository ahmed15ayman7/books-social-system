"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const INK = "#6b6b6b";
const GRID = "#eeeeee";
const GOOD = "#15803d";
const LEFT = "#d4d4d4";
const MISSED = "#dc2626";

const fmtDay = (d: string) => `${Number(d.slice(8))}/${Number(d.slice(5, 7))}`;
const ar = (v: number) => v.toLocaleString("ar-EG");

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-4 text-xs text-[var(--admin-text-muted)]">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function Tip({ active, payload, label, labels }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[]; label?: string; labels: Record<string, string> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label && /^\d{4}-/.test(label) ? fmtDay(label) : label}</p>
      {payload.filter((p) => p.value).map((p) => (
        <p key={p.dataKey} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          {labels[p.dataKey] ?? p.dataKey}: <b className="tabular-nums">{ar(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

/** كل يوم: اللي نزل / اللي لسه / اللي فات ميعاده */
export function DailyChart({ data, today }: { data: { day: string; published: number; remaining: number; missed: number }[]; today: string }) {
  const labels = { published: "نزل", remaining: "لسه", missed: "فات ميعاده" };
  return (
    <div>
      <Legend items={[{ color: GOOD, label: "نزل" }, { color: LEFT, label: "لسه" }, { color: MISSED, label: "فات ميعاده ومنزلش" }]} />
      <div className="h-64" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }} barCategoryGap={3}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 10, fill: INK }} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={18} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: INK }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} content={<Tip labels={labels} />} />
            <Bar dataKey="published" stackId="a" fill={GOOD} stroke="#fff" strokeWidth={1}>
              {data.map((d) => <Cell key={d.day} fillOpacity={d.day === today ? 1 : 0.85} />)}
            </Bar>
            <Bar dataKey="missed" stackId="a" fill={MISSED} stroke="#fff" strokeWidth={1} />
            <Bar dataKey="remaining" stackId="a" fill={LEFT} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** كل منصة: نزل منها كام من المخطط */
export function PlatformProgress({ rows }: { rows: { platform: string; label: string; color: string; published: number; total: number }[] }) {
  if (!rows.length) return <p className="py-10 text-center text-sm text-[var(--admin-text-subtle)]">مفيش منشورات في الفترة دي</p>;
  return (
    <ul className="space-y-4">
      {rows.map((r) => {
        const pct = r.total ? Math.round((r.published / r.total) * 100) : 0;
        return (
          <li key={r.platform} title={`${r.label}: ${r.published} من ${r.total}`}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="inline-flex items-center gap-2 font-semibold">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
                {r.label}
              </span>
              <span className="tabular-nums text-[var(--admin-text-muted)]">
                <b className="text-[var(--admin-text)]">{ar(r.published)}</b> / {ar(r.total)} · {ar(pct)}٪
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-[var(--admin-surface-muted)]">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: r.color }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** مراحل الكتب من الاختيار لحد النشر */
export function Pipeline({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="text-[var(--admin-text-muted)]">{r.label}</span>
          <div className="h-6 overflow-hidden rounded-md bg-[var(--admin-surface-muted)]">
            <div
              className="h-full rounded-md"
              style={{ width: `${Math.max(r.count ? 4 : 0, (r.count / max) * 100)}%`, background: "#b11e2e", opacity: 0.35 + (i / (rows.length - 1)) * 0.65 }}
            />
          </div>
          <span className="text-end font-bold tabular-nums">{ar(r.count)}</span>
        </li>
      ))}
    </ul>
  );
}
