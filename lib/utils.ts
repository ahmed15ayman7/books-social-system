import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCairo(d: Date | null | undefined, withTime = true): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "Africa/Cairo",
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : { year: "numeric" }),
  }).format(d);
}

export function timeCairo(d: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { timeZone: "Africa/Cairo", hour: "numeric", minute: "2-digit" }).format(d);
}

/** "2026-11-20" → "الجمعة 20 نوفمبر" */
export function dayLabel(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat("ar-EG", { timeZone: "UTC", ...opts }).format(new Date(`${day}T00:00:00Z`));
}

export const n = (v: number) => v.toLocaleString("ar-EG");
