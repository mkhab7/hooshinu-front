"use client";

import { cn } from "@/lib/utils";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors",
        "border-gray-300 bg-white hover:border-gray-400 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-white/20",
        disabled && "cursor-not-allowed opacity-60"
      )}
    >
      {label && <span className="text-gray-700 dark:text-gray-200">{label}</span>}
      <span
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-gray-300 dark:bg-white/15"
        )}
      >
        <span
          className={cn(
            "absolute inline-block size-5 rounded-full bg-white shadow transition-transform",
            // RTL: "on" slides to the left.
            checked ? "translate-x-0.5" : "translate-x-[1.375rem]"
          )}
        />
      </span>
    </button>
  );
}
