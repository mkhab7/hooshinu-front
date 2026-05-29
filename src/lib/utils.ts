import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

const faNum = new Intl.NumberFormat("fa-IR");

/** Format a number with Persian grouping (e.g. credits, toman). */
export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "—";
  return faNum.format(n);
}

/** Format toman amounts. */
export function formatToman(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${faNum.format(n)} تومان`;
}

/** Format credits, trimming trailing zeros. */
export function formatCredits(n: number | null | undefined): string {
  if (n == null) return "—";
  const rounded = Math.round(n * 1000) / 1000;
  return faNum.format(rounded);
}

const dtf = new Intl.DateTimeFormat("fa-IR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return dtf.format(d);
}

export function relativeFromNow(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "—";
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "همین حالا";
  if (min < 60) return `${faNum.format(min)} دقیقه پیش`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${faNum.format(hr)} ساعت پیش`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${faNum.format(day)} روز پیش`;
  return formatDateTime(iso);
}
