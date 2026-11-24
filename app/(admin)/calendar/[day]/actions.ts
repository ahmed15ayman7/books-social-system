"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { syncBookStatus } from "@/lib/queue";
import type { PostStatus } from "@prisma/client";

export async function setPostStatus(postId: string, status: PostStatus, url?: string) {
  await requireAdmin();
  const p = await db.post.update({
    where: { id: postId },
    data: {
      status,
      url: url?.trim() || undefined,
      publishedAt: status === "PUBLISHED" ? new Date() : null,
      error: status === "FAILED" ? undefined : null,
    },
  });
  await syncBookStatus(p.bookId);
  revalidatePath("/calendar", "layout");
}
