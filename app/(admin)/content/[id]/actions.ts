"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { startProduction, syncBookStatus } from "@/lib/queue";

function refresh(bookId: string) {
  revalidatePath(`/content/${bookId}`);
  revalidatePath("/queue");
}

/** تعديل النص بإيدك (العنوان + النص) */
export async function savePostText(postId: string, title: string, text: string, approve: boolean) {
  await requireAdmin();
  const post = await db.post.findUniqueOrThrow({ where: { id: postId } });
  await db.post.update({
    where: { id: postId },
    data: {
      title: title.trim() || null,
      text: text.trim() || null,
      ...(approve && text.trim() && post.status === "PENDING" ? { status: "READY" } : {}),
    },
  });
  await syncBookStatus(post.bookId);
  refresh(post.bookId);
}


/** طلب تعديل: رسالة في الشات + مهمة REVISE يسحبها Claude من جهازك */
export async function requestRevision(bookId: string, target: string, instruction: string) {
  await requireAdmin();
  const body = instruction.trim();
  if (!body) return { error: "اكتب المطلوب" };
  const t = target.trim() || "other";
  const job = await db.agentJob.create({ data: { kind: "REVISE", bookId, target: t, instruction: body } });
  await db.bookMessage.create({ data: { bookId, role: "USER", body, target: t, jobId: job.id } });
  refresh(bookId);
  return { ok: true };
}

export async function cancelRevision(jobId: string) {
  await requireAdmin();
  const job = await db.agentJob.update({ where: { id: jobId }, data: { status: "CANCELLED", finishedAt: new Date() } });
  if (job.bookId) {
    await db.bookMessage.create({ data: { bookId: job.bookId, role: "CLAUDE", body: "الطلب اتلغى من اللوحة.", jobId } });
    refresh(job.bookId);
  }
}

export async function produceBook(bookId: string) {
  await requireAdmin();
  await startProduction(bookId);
  await db.bookMessage.create({ data: { bookId, role: "USER", body: "تجهيز الفيديو: نسخة عربي (فصحى مبسطة) ونسخة إنجليزي، والبوسترات والتصاميم والنصوص.", target: "video" } });
  refresh(bookId);
}
