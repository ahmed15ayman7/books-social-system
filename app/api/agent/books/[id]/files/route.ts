import { z } from "zod";
import { db } from "@/lib/db";
import { agentOk, deny } from "@/lib/agent-auth";

const Entry = z.object({ path: z.string().max(400), name: z.string().max(200), dir: z.boolean(), size: z.number(), mtime: z.string() });
const Body = z.object({ files: z.array(Entry).max(2000) });

/** قايمة ملفات فولدر الكتاب من جهازك (للسيستم اللي على Coolify ومش شايف D:\) */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!agentOk(req)) return deny();
  const { id } = await params;
  const b = Body.safeParse(await req.json().catch(() => ({})));
  if (!b.success) return Response.json({ error: b.error.message }, { status: 400 });
  await db.contentBook.update({ where: { id }, data: { files: b.data.files, filesSyncedAt: new Date() } });
  return Response.json({ ok: true, count: b.data.files.length });
}
