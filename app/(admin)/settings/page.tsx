import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db, getSettings } from "@/lib/db";
import { Button, Card, Notice, PageHeader } from "@/components/ui";
import { POST_KINDS, PLATFORM_LABEL, slotsFrom } from "@/lib/plan";
import { VoicePicker } from "./voice-picker";

async function save(form: FormData) {
  "use server";
  await requireAdmin();
  const slots: Record<string, string> = {};
  for (const k of POST_KINDS) {
    const v = String(form.get(`slot_${k.kind}`) ?? "");
    if (/^\d{1,2}:\d{2}$/.test(v)) slots[k.kind] = v;
  }
  const int = (k: string, min: number, max: number, d: number) => Math.min(max, Math.max(min, Number(form.get(k)) || d));
  await db.setting.update({
    where: { id: 1 },
    data: {
      booksPerDay: int("booksPerDay", 1, 10, 1),
      popularityWeight: int("popularityWeight", 0, 100, 60),
      minYear: int("minYear", 1900, 2100, 2018),
      contentRoot: String(form.get("contentRoot") || "D:\\booksplatformContent").trim(),
      siteBaseUrl: String(form.get("siteBaseUrl") || "https://booksplatform.net").trim(),
      slotTimes: slots,
    },
  });
  revalidatePath("/", "layout");
}

export default async function SettingsPage() {
  const s = await getSettings();
  const slots = slotsFrom(s.slotTimes);
  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="الإعدادات" />
      <Card title="الصوت العربي الثابت (فصحى مبسطة لكل الوطن العربي)">
        <VoicePicker
          initial={{ engine: s.arVoiceEngine, voice: s.arVoice, rate: s.arRate, pitch: s.arPitch, eleven: s.arElevenVoice ?? "", en: s.enVoice }}
        />
      </Card>
      <form action={save} className="space-y-6">
        <Card title="الخطة">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">كتب في اليوم</label>
              <input name="booksPerDay" type="number" min={1} max={10} defaultValue={s.booksPerDay} className="field" />
              <p className="mt-1 text-xs text-[var(--admin-text-subtle)]">كل كتاب = 7 منشورات. كتاب واحد في اليوم ≈ 2 Shorts + 2 تغريدة + 3 فيسبوك زي الخطة.</p>
            </div>
            <div>
              <label className="field-label">فولدر المحتوى على جهازك</label>
              <input name="contentRoot" defaultValue={s.contentRoot} className="field ltr" />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label">لينك الموقع (للـUTM)</label>
              <input name="siteBaseUrl" defaultValue={s.siteBaseUrl} className="field ltr" />
            </div>
          </div>
        </Card>

        <Card title="مواعيد النشر (توقيت القاهرة)">
          <div className="grid gap-3 sm:grid-cols-2">
            {POST_KINDS.map((k) => (
              <div key={k.kind} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--admin-border)] px-3 py-2">
                <span className="text-sm">
                  {k.label} <span className="text-xs text-[var(--admin-text-subtle)]">· {PLATFORM_LABEL[k.platform]}</span>
                </span>
                <input type="time" name={`slot_${k.kind}`} defaultValue={slots[k.kind]} className="field w-28" />
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--admin-text-subtle)]">التغيير بيسري على الكتب اللي هتتضاف بعد كده، أو لما تنقل كتاب ليوم تاني.</p>
        </Card>

        <Card title="ترتيب الكتب">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">وزن الشهرة (والباقي للحداثة) ٪</label>
              <input name="popularityWeight" type="number" min={0} max={100} defaultValue={s.popularityWeight} className="field" />
            </div>
            <div>
              <label className="field-label">أقدم سنة نشر</label>
              <input name="minYear" type="number" defaultValue={s.minYear} className="field" />
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--admin-text-subtle)]">
            النتيجة = الشهرة × الوزن + الحداثة × (100 − الوزن) + الأولوية اليدوية. الشهرة من Open Library: قرّاء الكتاب (عايز يقراه/بيقراه/قراه) والتقييمات والطبعات، وللكتب الجديدة شهرة المؤلف.
          </p>
        </Card>

        <Button type="submit">حفظ</Button>
      </form>

      <Notice tone="info">
        Claude بيكلم السيستم من جهازك بـ <code className="ltr">AGENT_TOKEN</code> اللي في ملف .env. لو السيستم على Coolify حط نفس التوكن هناك وفي <code className="ltr">.env</code> على جهازك.
      </Notice>
    </div>
  );
}
