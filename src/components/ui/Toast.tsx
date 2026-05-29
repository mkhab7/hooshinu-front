"use client";

import { create } from "zustand";
import { useEffect } from "react";
import { CheckCircle2, AlertCircle, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; message: string };

type ToastStore = {
  items: ToastItem[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
};

let counter = 0;

const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (kind, message) => {
    const id = ++counter;
    set((s) => ({ items: [...s.items, { id, kind, message }] }));
    setTimeout(() => {
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    }, 5000);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export function useToast() {
  const push = useToastStore((s) => s.push);
  return {
    success: (m: string) => push("success", m),
    error: (m: string) => push("error", m),
    info: (m: string) => push("info", m),
  };
}

const icons = {
  success: <CheckCircle2 className="size-5 text-green-500" />,
  error: <AlertCircle className="size-5 text-red-500" />,
  info: <Info className="size-5 text-brand-400" />,
};

export function Toaster() {
  const items = useToastStore((s) => s.items);
  const dismiss = useToastStore((s) => s.dismiss);

  // Avoid SSR mismatch: render only after mount.
  useEffect(() => {}, []);

  return (
    <div className="pointer-events-none fixed bottom-4 start-4 z-[100] flex flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg dark:bg-[#15151c]",
            t.kind === "error"
              ? "border-red-200 dark:border-red-500/30"
              : t.kind === "success"
                ? "border-green-200 dark:border-green-500/30"
                : "border-gray-200 dark:border-white/10"
          )}
        >
          {icons[t.kind]}
          <p className="flex-1 text-sm text-gray-800 dark:text-gray-200">
            {t.message}
          </p>
          <button
            onClick={() => dismiss(t.id)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
