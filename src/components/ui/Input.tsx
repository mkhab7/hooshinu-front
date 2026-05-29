"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:opacity-60 border-gray-300 text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:placeholder:text-gray-500";

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cn(base, className)} {...rest} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(base, "resize-none leading-relaxed", className)}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cn(base, "cursor-pointer", className)} {...rest}>
      {children}
    </select>
  );
});

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
      {children}
      {error ? (
        <span className="block text-xs text-red-500">{error}</span>
      ) : hint ? (
        <span className="block text-xs text-gray-500">{hint}</span>
      ) : null}
    </label>
  );
}
