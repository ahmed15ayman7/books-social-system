import { z } from "zod";
import { db, getSettings } from "@/lib/db";
import { agentOk, deny } from "@/lib/agent-auth";
import { bookDetails } from "@/lib/source-db";
import { KIND_LABEL, POST_KINDS, dayOf } from "@/lib/plan";

export const dynamic = "force-dynamic";

/** كل اللي Claude محتاجه عشان يكتب ويصمم: بيانات الكتاب من المنصة + المنشورات المطلوبة */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!agentOk(req)) return deny();
  const { id } = await params;
  const book = await db.contentBook.findUnique({
    where: { id },
    include: { posts: { orderBy: { scheduledAt: "asc" } }, messages: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!book) return Response.json({ error: "not found" }, { status: 404 });
  const [details] = await bookDetails([book.productId]);
  const settings = await getSettings();
  return Response.json({
    id: book.id,
    status: book.status,
    folder: `${settings.contentRoot}\\${book.folder}`,
    publishDate: dayOf(book.publishDate),
    book: details ?? null,
    /** الأصوات الثابتة لكل الكتب (من الإعدادات) — ماتغيرهاش من غير ما المستخدم يغيرها من اللوحة */
    voice: {
      ar: { engine: settings.arVoiceEngine, edgeVoice: settings.arVoice, rate: settings.arRate, pitch: settings.arPitch, elevenVoice: settings.arElevenVoice },
      en: { engine: "offlinetts", voice: settings.enVoice },
      arabicStyle: "فصحى مبسطة لكل الوطن العربي (مش لهجة)",
    },
    /** آخر 20 رسالة في شات الكتاب (الأحدث الأول) — تعليقات المستخدم السابقة مهمة لأي تعديل */
    messages: book.messages.map((m) => ({ role: m.role, body: m.body, target: m.target, at: m.createdAt })),
    posts: book.posts.map((p) => ({
      id: p.id,
      kind: p.kind,
      label: KIND_LABEL[p.kind],
      platform: p.platform,
      lang: p.lang,
      scheduledAt: p.scheduledAt,
      status: p.status,
      title: p.title,
      text: p.text,
      assetPath: p.assetPath,
      expectedAsset: POST_KINDS.find((k) => k.kind === p.kind)?.asset ?? null,
      link: p.link,
      url: p.url,
    })),
  });
}

const Patch = z.object({
  status: z.enum(["QUEUED", "PRODUCING", "READY", "PUBLISHING", "PUBLISHED", "FAILED"]).optional(),
  notes: z.string().max(4000).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!agentOk(req)) return deny();
  const { id } = await params;
  const body = Patch.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return Response.json({ error: body.error.message }, { status: 400 });
  await db.contentBook.update({ where: { id }, data: body.data });
  return Response.json({ ok: true });
}
