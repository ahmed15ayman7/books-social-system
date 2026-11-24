"use client";

import { useActionState } from "react";
import { Clapperboard } from "lucide-react";
import { Button } from "@/components/ui";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--admin-bg)] p-6">
      <form action={action} className="w-full max-w-sm rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6">
        <div className="mb-6 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--brand-red)] shadow-[0_0_16px_rgba(177,30,46,0.4)]">
            <Clapperboard className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="font-bold">Books Platform</p>
            <p className="text-xs text-[var(--admin-text-subtle)]">إدارة السوشيال ميديا</p>
          </div>
        </div>
        <label className="field-label" htmlFor="email">الإيميل</label>
        <input id="email" name="email" type="email" required className="field ltr mb-4" autoComplete="username" />
        <label className="field-label" htmlFor="password">كلمة السر</label>
        <input id="password" name="password" type="password" required className="field ltr mb-4" autoComplete="current-password" />
        {error && <p className="mb-3 text-sm text-[var(--error)]">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "جاري الدخول..." : "دخول"}
        </Button>
      </form>
    </div>
  );
}
