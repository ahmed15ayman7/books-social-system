import { db, getSettings } from "@/lib/db";
import { agentOk, deny } from "@/lib/agent-auth";
import { KIND_LABEL, addDays, cairoAt } from "@/lib/plan";

export const dynamic = "force-dynamic";

/** منشورات يوم معين اللي لسه منزلتش، بالترتيب (?book= لكتاب واحد) */
export async function GET(req: Request, { params }: { params: Promise<{ day: string }> }) {
  if (!agentOk(req)) return deny();
  const { day } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return Response.json({ error: "bad day" }, { status: 400 });
  const bookId = new URL(req.url).searchParams.get("book");
  const settings = await getSettings();
  const posts = await db.post.findMany({
    where: {
      scheduledAt: { gte: cairoAt(day, "00:00"), lt: cairoAt(addDays(day, 1), "00:00") },
      status: { notIn: ["PUBLISHED", "SKIPPED"] },
      ...(bookId ? { bookId } : {}),
    },
    orderBy: { scheduledAt: "asc" },
    include: { book: { select: { id: true, titleAr: true, titleEn: true, folder: true, status: true } } },
  });
  return Response.json({
    day,
    posts: posts.map((p) => ({
      id: p.id,
      kind: p.kind,
      label: KIND_LABEL[p.kind],
      platform: p.platform,
      lang: p.lang,
      scheduledAt: p.scheduledAt,
      status: p.status,
      title: p.title,
      text: p.text,
      asset: p.assetPath ? `${settings.contentRoot}\\${p.book.folder}\\${p.assetPath}` : null,
      link: p.link,
      book: p.book,
    })),
  });
}
