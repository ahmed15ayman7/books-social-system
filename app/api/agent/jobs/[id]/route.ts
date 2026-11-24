import { z } from "zod";
import { db } from "@/lib/db";
import { agentOk, deny } from "@/lib/agent-auth";

const Body = z.object({ action: z.enum(["start", "log", "done", "fail"]), message: z.string().max(4000).optional() });

function stamp() {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", hour: "2-digit", minute: "2-digit" }).format(new Date());
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!agentOk(req)) return deny();
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: body.error.message }, { status: 400 });
  const { action, message } = body.data;
  const job = await db.agentJob.findUnique({ where: { id } });
  if (!job) return Response.json({ error: "not found" }, { status: 404 });
  if (job.status === "CANCELLED") return Response.json({ error: "cancelled from dashboard" }, { status: 409 });

  const log = message ? `${job.log}${job.log ? "\n" : ""}[${stamp()}] ${message}`.slice(-8000) : job.log;
  const status = { start: "RUNNING", done: "DONE", fail: "FAILED", log: job.status }[action] as typeof job.status;
  const updated = await db.agentJob.update({
    where: { id },
    data: {
      log,
      status,
      ...(action === "start" ? { startedAt: new Date() } : {}),
      ...(action === "done" || action === "fail" ? { finishedAt: new Date() } : {}),
    },
  });

  if (job.kind === "PRODUCE" && job.bookId) {
    const bs = { start: "PRODUCING", fail: "FAILED", done: "READY", log: null }[action] as "PRODUCING" | "FAILED" | "READY" | null;
    if (bs) await db.contentBook.update({ where: { id: job.bookId }, data: { status: bs } });
  }
  return Response.json({ ok: true, status: updated.status });
}
