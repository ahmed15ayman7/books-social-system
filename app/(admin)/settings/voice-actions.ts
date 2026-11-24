"use server";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

function knownVoices(): Set<string> {
  try {
    const j = JSON.parse(readFileSync(join(process.cwd(), "public", "voices", "voices.json"), "utf8")) as { voices: { id: string }[] };
    return new Set(j.voices.map((v) => v.id));
  } catch {
    return new Set();
  }
}

export async function saveVoice(v: { engine: string; voice: string; rate: string; pitch: string; eleven: string }) {
  await requireAdmin();
  const known = knownVoices();
  if (known.size && !known.has(v.voice)) throw new Error("صوت مش معروف");
  await db.setting.update({
    where: { id: 1 },
    data: {
      arVoiceEngine: v.engine === "elevenlabs" ? "elevenlabs" : "edge",
      arVoice: v.voice,
      arRate: /^[+-]\d{1,2}%$/.test(v.rate) ? v.rate : "+0%",
      arPitch: /^[+-]\d{1,2}Hz$/.test(v.pitch) ? v.pitch : "+0Hz",
      arElevenVoice: v.eleven.trim() || null,
    },
  });
  revalidatePath("/settings");
}
