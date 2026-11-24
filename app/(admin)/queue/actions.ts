"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeBook, rescheduleBook, startProduction, startPublishing } from "@/lib/queue";

function refresh() {
  for (const p of ["/queue", "/calendar", "/books", "/"]) revalidatePath(p);
}

export async function moveBook(bookId: string, day: string): Promise<string | null> {
  await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "تاريخ غلط";
  await rescheduleBook(bookId, day);
  refresh();
  return null;
}

export async function deleteBook(bookId: string): Promise<string | null> {
  await requireAdmin();
  try {
    await removeBook(bookId);
    refresh();
    return null;
  } catch (e) {
    return (e as Error).message;
  }
}

export async function retryProduce(bookId: string) {
  await requireAdmin();
  await startProduction(bookId);
  refresh();
}

export async function cancelJob(jobId: string) {
  await requireAdmin();
  await db.agentJob.update({ where: { id: jobId }, data: { status: "CANCELLED", finishedAt: new Date() } });
  refresh();
}

export async function publishNow(day: string, bookId?: string) {
  await requireAdmin();
  await startPublishing(day, bookId);
  refresh();
  revalidatePath(`/calendar/${day}`);
}
