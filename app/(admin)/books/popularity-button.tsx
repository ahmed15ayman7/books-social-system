"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";
import { popularityStatus, startPopularity } from "./actions";
import type { RunState } from "@/lib/popularity";

export function PopularityButton({ coverage }: { coverage: { total: number; fetched: number; found: number } }) {
  const [st, setSt] = useState<RunState | null>(null);
  const [, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    popularityStatus().then(setSt);
  }, []);

  useEffect(() => {
    if (!st?.running) return;
    const t = setInterval(async () => {
      const s = await popularityStatus();
      setSt(s);
      if (!s.running) router.refresh();
    }, 3000);
    return () => clearInterval(t);
  }, [st?.running, router]);

  const running = st?.running;
  return (
    <div className="flex items-center gap-3">
      <div className="text-end text-xs text-[var(--admin-text-muted)]">
        {running ? (
          <>
            بيدوّر في Open Library: {st.done} / {st.total}
            <div className="mt-1 h-1 w-40 overflow-hidden rounded-full bg-[var(--admin-surface-muted)]">
              <div className="h-full bg-[var(--brand-red)] transition-all" style={{ width: `${st.total ? (st.done / st.total) * 100 : 0}%` }} />
            </div>
          </>
        ) : (
          <>
            الشهرة متجابة لـ {coverage.fetched.toLocaleString("ar-EG")} / {coverage.total.toLocaleString("ar-EG")}
            {st?.error && <p className="text-[var(--error)]">{st.error}</p>}
          </>
        )}
      </div>
      <Button variant="secondary" disabled={!!running} onClick={() => start(async () => setSt(await startPopularity()))}>
        <RefreshCw className={running ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        تحديث الترتيب
      </Button>
    </div>
  );
}
