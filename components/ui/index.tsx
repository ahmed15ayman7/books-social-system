import { type ReactNode, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Tone = "red" | "info" | "success" | "warning" | "error" | "muted";
const TONES: Record<Tone, { bg: string; text: string }> = {
  red: { bg: "bg-[var(--brand-red-soft)]", text: "text-[var(--brand-red)]" },
  info: { bg: "bg-[var(--info-soft)]", text: "text-[var(--info)]" },
  success: { bg: "bg-[var(--success-soft)]", text: "text-[var(--success)]" },
  warning: { bg: "bg-[var(--warning-soft)]", text: "text-[var(--warning)]" },
  error: { bg: "bg-[var(--error-soft)]", text: "text-[var(--error)]" },
  muted: { bg: "bg-[var(--admin-surface-muted)]", text: "text-[var(--admin-text-muted)]" },
};

// ─── Card (نفس AdminCard) ────────────────────────────────────────
export function Card({
  children,
  className,
  title,
  actions,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  actions?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const pad = { none: "", sm: "p-4", md: "p-5", lg: "p-6" }[padding];
  return (
    <div className={cn("rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)]", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-border)] px-5 py-3">
          {title && <h2 className="text-sm font-semibold text-[var(--admin-text)]">{title}</h2>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={pad}>{children}</div>
    </div>
  );
}

// ─── Stat card (نفس AdminStatCard) ───────────────────────────────
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "red",
  alert,
  hint,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  tone?: Tone;
  alert?: boolean;
  hint?: string;
  href?: string;
}) {
  const t = TONES[tone];
  const body = (
    <div
      className={cn(
        "relative h-full rounded-xl border bg-[var(--admin-surface)] p-5 transition-colors",
        alert ? "border-[var(--brand-red)]/40" : "border-[var(--admin-border)] hover:border-[var(--admin-border-strong)]",
      )}
    >
      {alert && <span className="absolute end-3 top-3 h-2 w-2 animate-pulse rounded-full bg-[var(--brand-red)]" />}
      <div className={cn("mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg", t.bg)}>
        <Icon className={cn("h-5 w-5", t.text)} aria-hidden="true" />
      </div>
      <p className="text-2xl font-black text-[var(--admin-text)]">
        {typeof value === "number" ? value.toLocaleString("ar-EG") : value}
      </p>
      <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{label}</p>
      {hint && <p className="mt-2 text-[11px] text-[var(--admin-text-subtle)]">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

// ─── Page header (نفس AdminPageHeader) ───────────────────────────
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[var(--admin-text)]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-[var(--admin-text-muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────
const BTN = {
  primary: "bg-[var(--brand-red)] text-white hover:bg-[var(--brand-red-hover)] shadow-[0_4px_14px_0_rgb(177_30_46/0.25)]",
  secondary:
    "border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text)] hover:border-[var(--admin-border-strong)] hover:bg-[var(--admin-hover)]",
  ghost: "text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]",
  danger: "bg-[var(--error-soft)] text-[var(--error)] hover:bg-[var(--error)] hover:text-white",
};
export type BtnVariant = keyof typeof BTN;

export function btnClass(variant: BtnVariant = "primary", size: "sm" | "md" = "md") {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
    BTN[variant],
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return <button {...props} className={cn(btnClass(variant, size), className)} />;
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  children,
  className,
  target,
}: {
  href: string;
  variant?: BtnVariant;
  size?: "sm" | "md";
  children: ReactNode;
  className?: string;
  target?: string;
}) {
  return (
    <Link href={href} target={target} className={cn(btnClass(variant, size), className)}>
      {children}
    </Link>
  );
}

// ─── Badge ───────────────────────────────────────────────────────
export function Badge({ tone = "muted", children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", t.bg, t.text)}>
      {children}
    </span>
  );
}

export const BOOK_STATUS: Record<string, { label: string; tone: Tone }> = {
  QUEUED: { label: "في الطابور", tone: "muted" },
  PRODUCING: { label: "بيتعمل", tone: "warning" },
  READY: { label: "جاهز", tone: "info" },
  PUBLISHING: { label: "بينزل", tone: "warning" },
  PUBLISHED: { label: "اتنشر", tone: "success" },
  FAILED: { label: "فشل", tone: "error" },
};

export const POST_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "لسه", tone: "muted" },
  READY: { label: "جاهز", tone: "info" },
  PUBLISHING: { label: "بينزل", tone: "warning" },
  PUBLISHED: { label: "نزل", tone: "success" },
  FAILED: { label: "فشل", tone: "error" },
  SKIPPED: { label: "اتلغى", tone: "muted" },
};

export const JOB_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "مستني Claude", tone: "info" },
  RUNNING: { label: "شغال", tone: "warning" },
  DONE: { label: "خلص", tone: "success" },
  FAILED: { label: "فشل", tone: "error" },
  CANCELLED: { label: "اتلغى", tone: "muted" },
};

export function StatusBadge({
  status,
  map = BOOK_STATUS,
}: {
  status: string;
  map?: Record<string, { label: string; tone: Tone }>;
}) {
  const s = map[status] ?? { label: status, tone: "muted" as Tone };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

// ─── Table ───────────────────────────────────────────────────────
export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--admin-border)] bg-[var(--admin-surface-muted)]/60">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-4 py-2.5 text-start text-xs font-semibold text-[var(--admin-text-muted)]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--admin-border)]">{children}</tbody>
      </table>
      {empty && <EmptyState text="مفيش بيانات" />}
    </div>
  );
}

export function Td({ children, className, ltr }: { children?: ReactNode; className?: string; ltr?: boolean }) {
  return <td className={cn("px-4 py-3 align-top text-[var(--admin-text)]", ltr && "ltr", className)}>{children}</td>;
}

export function EmptyState({ text }: { text: string }) {
  return <p className="py-10 text-center text-sm text-[var(--admin-text-subtle)]">{text}</p>;
}

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  const t = TONES[tone];
  return <div className={cn("mb-4 rounded-lg px-4 py-3 text-sm", t.bg, t.text)}>{children}</div>;
}
