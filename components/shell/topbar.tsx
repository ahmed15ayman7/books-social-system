"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const labels: Record<string, string> = {
  books: "ترتيب الكتب",
  queue: "طابور الإنتاج",
  calendar: "التقويم",
  published: "اللي اتنشر",
  reports: "التقارير",
  settings: "الإعدادات",
  content: "محتوى الكتاب",
};

export function Topbar({ user, agent }: { user: string; agent: { pending: number; running: number } }) {
  const pathname = usePathname();
  const crumbs = pathname.split("/").filter(Boolean);
  const busy = agent.running > 0;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-surface)]/95 px-6 backdrop-blur-sm">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
        <Link href="/" className="flex shrink-0 items-center gap-1 text-[var(--admin-text-subtle)] transition-colors hover:text-[var(--admin-accent)]">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3 w-3 shrink-0 text-[var(--admin-border-strong)] rtl:rotate-180" />
        {crumbs.length === 0 ? (
          <span className="font-medium">لوحة التحكم</span>
        ) : (
          <>
            <Link href="/" className="text-[var(--admin-text-subtle)] hover:text-[var(--admin-accent)]">لوحة التحكم</Link>
            <ChevronRight className="h-3 w-3 shrink-0 text-[var(--admin-border-strong)] rtl:rotate-180" />
            <Link href={`/${crumbs[0]}`} className="truncate font-medium">{labels[crumbs[0]] ?? crumbs[0]}</Link>
            {crumbs[1] && (
              <>
                <ChevronRight className="h-3 w-3 shrink-0 text-[var(--admin-border-strong)] rtl:rotate-180" />
                <span className="ltr truncate font-medium">{decodeURIComponent(crumbs[1])}</span>
              </>
            )}
          </>
        )}
      </nav>

      <div className="flex items-center gap-3">
        <span
          title="مهام Claude على جهازك"
          className={
            busy
              ? "inline-flex items-center gap-1.5 rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--success)]"
              : "inline-flex items-center gap-1.5 rounded-full bg-[var(--admin-surface-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--admin-text-muted)]"
          }
        >
          <span className={busy ? "h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--success)]" : "h-1.5 w-1.5 rounded-full bg-[var(--admin-border-strong)]"} />
          {busy ? `Claude شغال · ${agent.running}` : `مهام مستنية Claude: ${agent.pending}`}
        </span>
        <div title={user} className="flex h-8 w-8 select-none items-center justify-center rounded-lg bg-[var(--brand-red)] text-xs font-bold uppercase text-white">
          {user.slice(0, 1) || "A"}
        </div>
      </div>
    </header>
  );
}
