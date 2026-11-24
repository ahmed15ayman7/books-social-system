import { notFound } from "next/navigation";
import { db, getSettings } from "@/lib/db";
import { folderAvailable, listTree, type FileEntry } from "@/lib/files";
import { readiness } from "@/lib/readiness";
import { KIND_LABEL, PLATFORM_LABEL, dayOf } from "@/lib/plan";
import { Workspace } from "./workspace";

export const dynamic = "force-dynamic";

export default async function ContentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await db.contentBook.findUnique({
    where: { id },
    include: { posts: { orderBy: { scheduledAt: "asc" } }, messages: { orderBy: { createdAt: "asc" }, take: 200 } },
  });
  if (!book) notFound();
  const settings = await getSettings();

  // الملفات: من الجهاز لو السيرفر شغال عليه، وإلا من آخر قايمة بعتها Claude
  const local = folderAvailable(settings.contentRoot, book.folder);
  const files: FileEntry[] | null = local ? await listTree(settings.contentRoot, book.folder) : ((book.files as FileEntry[] | null) ?? null);
  const check = readiness(book.posts, files);

  const jobs = await db.agentJob.findMany({ where: { bookId: id }, orderBy: { createdAt: "desc" }, take: 30 });
  const openJobs = jobs.filter((j) => j.status === "PENDING" || j.status === "RUNNING");
  const produce = jobs.find((j) => j.kind === "PRODUCE");
  const hasVideo = (files ?? []).some((f) => f.path === "final/video_ar.mp4" || f.path === "final/video_en.mp4");
  const production = produce?.status === "PENDING" || produce?.status === "RUNNING" ? produce.status : hasVideo || produce?.status === "DONE" ? "DONE" : produce?.status === "FAILED" ? "FAILED" : "NONE";

  return (
    <Workspace
      book={{
        id: book.id,
        titleAr: book.titleAr,
        titleEn: book.titleEn,
        author: book.author,
        publisher: book.publisher,
        coverUrl: book.coverUrl,
        status: book.status,
        publishDate: dayOf(book.publishDate),
        folderPath: `${settings.contentRoot}\\${book.folder}`,
      }}
      local={local}
      syncedAt={book.filesSyncedAt?.toISOString() ?? null}
      files={files}
      check={check}
      posts={book.posts.map((p) => ({
        id: p.id,
        kind: p.kind,
        label: KIND_LABEL[p.kind],
        platform: PLATFORM_LABEL[p.platform],
        lang: p.lang,
        status: p.status,
        title: p.title ?? "",
        text: p.text ?? "",
        assetPath: p.assetPath,
        link: p.link,
        url: p.url,
        scheduledAt: p.scheduledAt.toISOString(),
      }))}
      messages={book.messages.map((m) => ({ id: m.id, role: m.role, body: m.body, target: m.target, jobId: m.jobId, createdAt: m.createdAt.toISOString() }))}
      jobs={jobs.map((j) => ({ id: j.id, kind: j.kind, status: j.status, target: j.target, log: j.log, createdAt: j.createdAt.toISOString() }))}
      busy={openJobs.length > 0}
      production={production}
      voiceLabel={`${settings.arVoice.split("-")[2]?.replace("Neural", "") ?? settings.arVoice}${settings.arVoiceEngine === "elevenlabs" && settings.arElevenVoice ? ` / ElevenLabs ${settings.arElevenVoice}` : ""}`}
    />
  );
}
