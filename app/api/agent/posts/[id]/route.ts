import { z } from "zod";
import { db } from "@/lib/db";
import { agentOk, deny } from "@/lib/agent-auth";
import { syncBookStatus } from "@/lib/queue";

const Patch = z.object({
  status: z.enum(["PENDING", "READY", "PUBLISHING", "PUBLISHED", "FAILED", "SKIPPED"]).optional(),
  title: z.string().max(300).optional(),
  text: z.string().max(10000).optional(),
  assetPath: z.string().max(500).optional(),
  url: z.string().url().max(1000).optional(),
  error: z.string().max(1000).optional(),
});

/** Claude بيكتب النص والأصول (READY)، وبعد النشر بيعلّم PUBLISHED باللينك */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!agentOk(req)) return deny();
  const { id } = await params;
  const body = Patch.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: body.error.message }, { status: 400 });
  const d = body.data;
  const post = await db.post.update({
    where: { id },
    data: { ...d, ...(d.status === "PUBLISHED" ? { publishedAt: new Date(), error: null } : {}) },
  });
  await syncBookStatus(post.bookId);
  return Response.json({ ok: true, status: post.status });
}
