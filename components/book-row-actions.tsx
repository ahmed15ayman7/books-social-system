"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Trash2 } from "lucide-react";
import { deleteBook, moveBook, retryProduce } from "@/app/(admin)/queue/actions";

export function BookRowActions({ bookId, day, canRetry, canDelete }: { bookId: string; day: string; canRetry?: boolean; canDelete?: boolean }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const run = (fn: () => Promise<string | null | void>) =>
    start(async () => {
      const e = await fn();
      setErr(e || null);
      router.refresh();
    });

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="date"
        defaultValue={day}
        disabled={pending}
        onChange={(e) => e.target.value && run(() => moveBook(bookId, e.target.value))}
        className="field w-36 py-1 text-xs"
        title="نقل ليوم تاني"
      />
      {canRetry && (
        <button title="إعادة الإنتاج" disabled={pending} onClick={() => run(() => retryProduce(bookId))} className="rounded-lg p-1.5 text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)]">
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
      {canDelete && (
        <button
          title="شيله من الطابور"
          disabled={pending}
          onClick={() => confirm("تشيل الكتاب ده من الطابور؟ منشوراته اللي لسه منزلتش هتتشال.") && run(() => deleteBook(bookId))}
          className="rounded-lg p-1.5 text-[var(--error)] hover:bg-[var(--error-soft)]"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      {err && <span className="text-xs text-[var(--error)]">{err}</span>}
    </div>
  );
}
