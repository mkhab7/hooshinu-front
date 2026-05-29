import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      aria-label="در حال بارگذاری"
    />
  );
}

export function Badge({
  children,
  color = "gray",
  className,
}: {
  children: React.ReactNode;
  color?: "gray" | "green" | "yellow" | "red" | "brand";
  className?: string;
}) {
  const colors = {
    gray: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
    green:
      "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300",
    yellow:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300",
    red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    brand: "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colors[color],
        className
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      {icon && <div className="text-gray-400 dark:text-gray-600">{icon}</div>}
      <p className="font-medium text-gray-700 dark:text-gray-300">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-gray-500">{description}</p>
      )}
    </div>
  );
}
