"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-600/25 hover:from-brand-400 hover:to-brand-500 hover:shadow-brand-500/40 active:scale-[.98] disabled:from-brand-600/50 disabled:to-brand-600/50 disabled:shadow-none",
  secondary:
    "bg-gray-200/80 text-gray-900 hover:bg-gray-200 dark:bg-white/[0.08] dark:text-gray-100 dark:hover:bg-white/[0.14] active:scale-[.98]",
  outline:
    "border border-gray-300 bg-transparent text-gray-800 hover:bg-gray-100 dark:border-white/15 dark:text-gray-100 dark:hover:bg-white/[0.06] active:scale-[.98]",
  ghost:
    "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.06] dark:hover:text-white",
  danger:
    "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-lg shadow-red-600/25 hover:from-red-400 hover:to-red-500 active:scale-[.98] disabled:opacity-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-2xl gap-2",
  icon: "size-10 rounded-xl",
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    variant = "primary",
    size = "md",
    loading,
    className,
    children,
    disabled,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-70 disabled:active:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});
