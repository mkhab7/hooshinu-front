"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { Spinner } from "@/components/ui/Card";

export default function Home() {
  const router = useRouter();
  const { hydrated, isAuthed } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    router.replace(isAuthed ? "/dashboard" : "/login");
  }, [hydrated, isAuthed, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner className="text-brand-500" />
    </div>
  );
}
