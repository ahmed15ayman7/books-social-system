"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** بيحدّث الصفحة كل شوية طول ما Claude شغال، عشان كل بوست ينزل يتعلم عليه قدامك */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
