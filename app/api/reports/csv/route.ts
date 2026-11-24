import { getSession } from "@/lib/auth";
import { reportData, resolveRange } from "@/lib/report";
import { KIND_LABEL, PLATFORM_LABEL, cairoDay } from "@/lib/plan";
import { timeCairo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export async function GET(req: Request) {
  if (!(await getSession())) return new Response("unauthorized", { status: 401 });
  const u = new URL(req.url);
  const range = resolveRange({ range: "custom", from: u.searchParams.get("from") ?? undefined, to: u.searchParams.get("to") ?? undefined });
  const r = await reportData(range);
  const lines = [
    ["اليوم", "الساعة", "الكتاب", "Book", "المنصة", "النوع", "اللغة", "الحالة", "لينك المنشور", "لينك الكتاب (UTM)"].map(esc).join(","),
    ...r.posts.map((p) =>
      [cairoDay(p.scheduledAt), timeCairo(p.scheduledAt), p.book.titleAr, p.book.titleEn, PLATFORM_LABEL[p.platform], KIND_LABEL[p.kind], p.lang, p.status, p.url, p.link]
        .map(esc)
        .join(","),
    ),
  ];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="social-report-${range.from}_${range.to}.csv"`,
    },
  });
}
