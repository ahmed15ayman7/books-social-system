"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { saveVoice } from "./voice-actions";

type Voice = { id: string; name: string; gender: "male" | "female"; country: string; file: string };

export function VoicePicker({
  initial,
}: {
  initial: { engine: string; voice: string; rate: string; pitch: string; eleven: string; en: string };
}) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [sample, setSample] = useState("");
  const [voice, setVoice] = useState(initial.voice);
  const [engine, setEngine] = useState(initial.engine);
  const [rate, setRate] = useState(Number(initial.rate.replace(/[%+]/g, "")) || 0);
  const [pitch, setPitch] = useState(Number(initial.pitch.replace(/[Hz+]/g, "")) || 0);
  const [eleven, setEleven] = useState(initial.eleven);
  const [playing, setPlaying] = useState<string | null>(null);
  const [gender, setGender] = useState<"all" | "male" | "female">("all");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetch("/voices/voices.json")
      .then((r) => r.json())
      .then((j: { text: string; voices: Voice[] }) => {
        setVoices(j.voices);
        setSample(j.text);
      })
      .catch(() => setVoices([]));
    return () => audio.current?.pause();
  }, []);

  const play = (v: Voice) => {
    if (playing === v.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const a = new Audio(v.file);
    a.playbackRate = 1 + rate / 100; // تقريب للسرعة اللي هتتسجل بيها
    a.onended = () => setPlaying(null);
    void a.play();
    audio.current = a;
    setPlaying(v.id);
  };

  const dirty =
    voice !== initial.voice || engine !== initial.engine || eleven !== initial.eleven ||
    `${rate >= 0 ? "+" : ""}${rate}%` !== initial.rate || `${pitch >= 0 ? "+" : ""}${pitch}Hz` !== initial.pitch;

  const save = () =>
    start(async () => {
      await saveVoice({ engine, voice, rate: `${rate >= 0 ? "+" : ""}${rate}%`, pitch: `${pitch >= 0 ? "+" : ""}${pitch}Hz`, eleven });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });

  const list = voices.filter((v) => gender === "all" || v.gender === gender);
  const current = voices.find((v) => v.id === voice);

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-[var(--admin-surface-muted)] p-3 text-sm leading-relaxed">
        <p className="mb-1 text-xs font-semibold text-[var(--admin-text-muted)]">النص اللي بتسمعه في كل صوت (فصحى مبسطة):</p>
        <p>{sample || "…"}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-lg border border-[var(--admin-border)] p-0.5 text-xs">
          {(["all", "male", "female"] as const).map((g) => (
            <button key={g} onClick={() => setGender(g)} className={cn("rounded-md px-3 py-1", gender === g ? "bg-[var(--brand-red)] text-white" : "hover:bg-[var(--admin-hover)]")}>
              {{ all: "الكل", male: "رجالي", female: "حريمي" }[g]}
            </button>
          ))}
        </div>
        <p className="text-sm">
          الصوت الثابت: <b>{current ? `${current.name} · ${current.country}` : voice}</b>
        </p>
      </div>

      <div className="grid max-h-80 gap-2 overflow-y-auto pe-1 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((v) => (
          <div
            key={v.id}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
              voice === v.id ? "border-[var(--brand-red)] bg-[var(--brand-red-soft)]" : "border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]",
            )}
          >
            <button onClick={() => play(v)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--brand-black)] text-white" title="اسمع">
              {playing === v.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 rtl:-scale-x-100" />}
            </button>
            <button onClick={() => setVoice(v.id)} className="min-w-0 flex-1 text-start">
              <p className="text-sm font-semibold">{v.name}</p>
              <p className="text-[11px] text-[var(--admin-text-muted)]">{v.gender === "male" ? "رجالي" : "حريمي"} · {v.country}</p>
            </button>
            {voice === v.id && <Check className="h-4 w-4 flex-shrink-0 text-[var(--brand-red)]" />}
          </div>
        ))}
        {!voices.length && <p className="text-sm text-[var(--admin-text-subtle)]">العيّنات مش موجودة. شغّل scripts\voice-samples.py</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label">السرعة: {rate > 0 ? `+${rate}` : rate}%</label>
          <input type="range" min={-20} max={25} step={1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-[var(--brand-red)]" />
          <p className="text-[11px] text-[var(--admin-text-subtle)]">العيّنة بتشتغل بالسرعة دي تقريبًا. للشورتس +5 لـ +10 بيبقى أحسن.</p>
        </div>
        <div>
          <label className="field-label">طبقة الصوت: {pitch > 0 ? `+${pitch}` : pitch} Hz</label>
          <input type="range" min={-30} max={30} step={2} value={pitch} onChange={(e) => setPitch(Number(e.target.value))} className="w-full accent-[var(--brand-red)]" />
          <p className="text-[11px] text-[var(--admin-text-subtle)]">بتتطبق وقت التسجيل (العيّنة مش بتتغير).</p>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--admin-border)] p-3">
        <p className="mb-2 text-sm font-semibold">محرك الصوت العربي</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="radio" checked={engine === "edge"} onChange={() => setEngine("edge")} /> Microsoft Edge TTS (مجاني، نفس الصوت دايمًا)</label>
          <label className="flex items-center gap-2"><input type="radio" checked={engine === "elevenlabs"} onChange={() => setEngine("elevenlabs")} /> ElevenLabs (مشاعر أكتر، رصيد محدود)</label>
        </div>
        {engine === "elevenlabs" && (
          <div className="mt-3">
            <label className="field-label">اسم الصوت في ElevenLabs (لازم ثابت لكل الكتب)</label>
            <input value={eleven} onChange={(e) => setEleven(e.target.value)} className="field ltr" placeholder="مثلًا: Haytham" />
            <p className="mt-1 text-[11px] text-[var(--admin-text-subtle)]">الخطة المجانية حوالي 10 آلاف حرف في الشهر (≈ 15 فيديو 45 ثانية). لما الرصيد يخلص Claude بيرجع لصوت Edge اللي فوق.</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || !dirty}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} ثبّت الصوت</Button>
        {saved && <span className="text-sm text-[var(--success)]">اتثبّت. كل الكتب الجاية هتتسجل بالصوت ده.</span>}
        <span className="ms-auto text-xs text-[var(--admin-text-subtle)]">الإنجليزي ثابت: OfflineTTS · {initial.en}</span>
      </div>
    </div>
  );
}
