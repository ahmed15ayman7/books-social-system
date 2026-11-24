"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { setSocialPriority } from "@/lib/source-db";
import { enqueueBooks } from "@/lib/queue";
import { runState, startRun, type RunState } from "@/lib/popularity";

export async function addToQueue(ids: string[], startDay?: string): Promise<{ added: number; skipped: number; error?: string }> {
  await requireAdmin();
  try {
    const r = await enqueueBooks(ids.slice(0, 200), startDay || undefined);
    revalidatePath("/books");
    revalidatePath("/queue");
    revalidatePath("/calendar");
    return r;
  } catch (e) {
    return { added: 0, skipped: 0, error: (e as Error).message };
  }
}

export async function savePriority(id: string, value: number): Promise<string | null> {
  await requireAdmin();
  try {
    await setSocialPriority(id, value);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

export async function startPopularity(): Promise<RunState> {
  await requireAdmin();
  const s = await getSettings();
  return startRun(600, s.minYear);
}

export async function popularityStatus(): Promise<RunState> {
  await requireAdmin();
  return runState();
}
