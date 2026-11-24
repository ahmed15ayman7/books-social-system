"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui";
import { publishNow } from "../../queue/actions";

export function PublishButton({ day, running }: { day: string; running: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      disabled={pending || running}
      onClick={() =>
        start(async () => {
          await publishNow(day);
          router.refresh();
        })
      }
    >
      {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
      {running ? "Claude بينشر..." : "بدء النشر"}
    </Button>
  );
}
