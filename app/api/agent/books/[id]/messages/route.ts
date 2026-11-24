import { z } from "zod";
import { db } from "@/lib/db";
import { agentOk, deny } from "@/lib/agent-auth";

const Body = z.object({ body: z.string().min(1).max(6000), jobId: z.string().optional() });

/** رد Claude في شات الكتاب */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!agentOk(req)) return deny();
  const { id } = await params;
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return Response.json({ error: b.error.message }, { status: 400 });
  const msg = await db.bookMessage.create({ data: { bookId: id, role: "CLAUDE", body: b.data.body, jobId: b.data.jobId } });
  return Response.json({ ok: true, id: msg.id });
}
