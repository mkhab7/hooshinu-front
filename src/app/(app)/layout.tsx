"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/Toast";
import { Spinner } from "@/components/ui/Card";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { hydrated, isAuthed } = useAuthStore();

  useEffect(() => {
    if (hydrated && !isAuthed) router.replace("/login");
  }, [hydrated, isAuthed, router]);

  if (!hydrated || !isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="text-brand-500" />
      </div>
    );
  }

  return (
    <>
      <AppShell>{children}</AppShell>
      <Toaster />
    </>
  );
}
