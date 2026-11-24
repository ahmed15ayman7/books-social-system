"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, SkipForward } from "lucide-react";
import { POST_STATUS, StatusBadge } from "@/components/ui";
import { setPostStatus } from "./actions";

export function PostControls({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const go = (s: "PUBLISHED" | "READY" | "SKIPPED", url?: string) =>
    start(async () => {
      await setPostStatus(id, s, url);
      router.refresh();
    });

  return (
    <div className="flex items-center gap-1">
      <StatusBadge status={status} map={POST_STATUS} />
      {status !== "PUBLISHED" && (
        <button
          title="علّم إنه نزل (يدوي)"
          disabled={pending}
          onClick={() => {
            const url = prompt("لينك المنشور (اختياري):") ?? undefined;
            go("PUBLISHED", url);
          }}
          className="rounded p-1 text-[var(--success)] hover:bg-[var(--success-soft)]"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
      {(status === "FAILED" || status === "PUBLISHED" || status === "SKIPPED") && (
        <button title="رجّعه جاهز" disabled={pending} onClick={() => go("READY")} className="rounded p-1 text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)]">
          <RotateCcw className="h-4 w-4" />
        </button>
      )}
      {status !== "PUBLISHED" && status !== "SKIPPED" && (
        <button title="تخطي" disabled={pending} onClick={() => go("SKIPPED")} className="rounded p-1 text-[var(--admin-text-subtle)] hover:bg-[var(--admin-hover)]">
          <SkipForward className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export { POST_STATUS };
