"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  ListOrdered,
  CalendarDays,
  CheckCircle2,
  FileBarChart,
  Settings,
  Clapperboard,
  LogOut,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navGroups = [
  { label: "الرئيسية", items: [{ icon: LayoutDashboard, label: "لوحة التحكم", href: "/" }] },
  {
    label: "المحتوى",
    items: [
      { icon: BookOpen, label: "ترتيب الكتب", href: "/books" },
      { icon: ListOrdered, label: "طابور الإنتاج", href: "/queue" },
      { icon: CalendarDays, label: "التقويم", href: "/calendar" },
      { icon: CheckCircle2, label: "اللي اتنشر", href: "/published" },
    ],
  },
  {
    label: "المتابعة",
    items: [
      { icon: FileBarChart, label: "التقارير", href: "/reports" },
      { icon: Settings, label: "الإعدادات", href: "/settings" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-shrink-0 flex-col border-e border-[var(--admin-border)] bg-[var(--admin-surface)]">
      <div className="border-b border-[var(--admin-border)] p-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand-red)] shadow-[0_0_16px_rgba(177,30,46,0.4)]">
            <Clapperboard className="h-4 w-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-[var(--admin-text)]">Books Platform</p>
            <p className="text-[10px] text-[var(--admin-text-subtle)]">إدارة السوشيال ميديا</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3" aria-label="القائمة">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--admin-text-subtle)]">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-[var(--brand-red)] text-white"
                        : "text-[var(--admin-text-muted)] hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]",
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--admin-border)] p-2">
        <a
          href="https://booksplatform.net"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]"
        >
          <Globe className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <span>عرض المنصة</span>
        </a>
        <form action="/api/auth/logout" method="post">
          <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-hover)] hover:text-[var(--admin-text)]">
            <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            <span>تسجيل الخروج</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
