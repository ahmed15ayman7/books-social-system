import { db } from "@/lib/db";
import { agentOk, deny } from "@/lib/agent-auth";
import { dayOf } from "@/lib/plan";

export const dynamic = "force-dynamic";

/** المهام المفتوحة: النشر الأول (مواعيده ثابتة) وبعدين الإنتاج بأقرب يوم نشر */
export async function GET(req: Request) {
  if (!agentOk(req)) return deny();
  const jobs = await db.agentJob.findMany({ where: { status: { in: ["PENDING", "RUNNING"] } }, orderBy: { createdAt: "asc" } });
  const ids = jobs.map((j) => j.bookId).filter((x): x is string => !!x);
  const books = new Map((await db.contentBook.findMany({ where: { id: { in: ids } } })).map((b) => [b.id, b]));
  const out = jobs.map((j) => {
    const b = j.bookId ? books.get(j.bookId) : null;
    return {
      id: j.id,
      kind: j.kind,
      status: j.status,
      day: j.day ? dayOf(j.day) : null,
      target: j.target,
      instruction: j.instruction,
      book: b ? { id: b.id, titleAr: b.titleAr, titleEn: b.titleEn, folder: b.folder, publishDate: dayOf(b.publishDate), status: b.status } : null,
      createdAt: j.createdAt,
    };
  });
  const key = (x: (typeof out)[number]) => x.day ?? x.book?.publishDate ?? "";
  // النشر الأول (مواعيده ثابتة)، بعدين التعديلات (المستخدم مستني)، بعدين الإنتاج
  const rank = { PUBLISH: 0, REVISE: 1, PRODUCE: 2 } as const;
  out.sort((a, b) => rank[a.kind] - rank[b.kind] || key(a).localeCompare(key(b)));
  return Response.json({ jobs: out });
}
