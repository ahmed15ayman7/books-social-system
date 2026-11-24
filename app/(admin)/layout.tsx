import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  const [pending, running] = await Promise.all([
    db.agentJob.count({ where: { status: "PENDING" } }),
    db.agentJob.count({ where: { status: "RUNNING" } }),
  ]);
  return (
    <div className="flex min-h-screen bg-[var(--admin-bg)] text-[var(--admin-text)]">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={session.name || session.email} agent={{ pending, running }} />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
