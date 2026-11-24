"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { cancelJob } from "./actions";

export function CancelJob({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button title="إلغاء المهمة" disabled={pending} onClick={() => start(() => cancelJob(id))} className="rounded p-1 text-[var(--admin-text-subtle)] hover:bg-[var(--error-soft)] hover:text-[var(--error)]">
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
