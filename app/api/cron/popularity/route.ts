import { isCronAuthorized } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { startRun } from "@/lib/popularity";

export const dynamic = "force-dynamic";

/** Coolify Scheduled Task (يوميًا): بيحدّث شهرة 400 كتاب أقدم تحديثًا في الخلفية */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const s = await getSettings();
  return Response.json(startRun(400, s.minYear));
}
