"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Wand2,
  Wallet,
  Settings,
  LogOut,
  Sparkles,
  Sun,
  Moon,
  Menu,
  X,
  Coins,
} from "lucide-react";
import { cn, formatCredits } from "@/lib/utils";
import { useMe } from "@/features/profile/hooks";
import { useLogout } from "@/features/auth/hooks";
import {
  getStoredTheme,
  setStoredTheme,
  type Theme,
} from "@/lib/auth";
import { Badge } from "@/components/ui/Card";

const NAV = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/chat", label: "گفتگو", icon: MessageSquare },
  { href: "/studio", label: "استودیو", icon: Wand2 },
  { href: "/wallet", label: "کیف پول", icon: Wallet },
  { href: "/settings", label: "تنظیمات", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window === "undefined" ? "dark" : getStoredTheme()
  );

  const { data: me } = useMe();
  const logout = useLogout();

  function toggleTheme() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  async function doLogout() {
    await logout.mutateAsync().catch(() => {});
    router.replace("/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 px-4 py-5"
        onClick={() => setOpen(false)}
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-white">
          <Sparkles className="size-5" />
        </span>
        <span className="text-lg font-bold">هوشینو</span>
      </Link>

      <nav className="flex-1 space-y-1 px-2">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-gray-200 p-3 dark:border-white/10">
        <Link
          href="/wallet"
          onClick={() => setOpen(false)}
          className="flex items-center justify-between rounded-xl bg-gray-100 px-3 py-2.5 dark:bg-white/5"
        >
          <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Coins className="size-4 text-amber-500" />
            اعتبار
          </span>
          <span className="font-semibold tabular-nums">
            {formatCredits(me?.credits)}
          </span>
        </Link>

        <div className="flex items-center justify-between px-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {me?.name || "کاربر هوشینو"}
            </p>
            <p dir="ltr" className="truncate text-xs text-gray-500">
              {me?.phone}
            </p>
          </div>
          {me && me.plan.level > 0 && (
            <Badge color="brand">{me.plan.name}</Badge>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={toggleTheme}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>
          <button
            onClick={doLogout}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-500/10"
          >
            <LogOut className="size-4" />
            خروج
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-s border-gray-200 bg-white md:block dark:border-white/10 dark:bg-white/[0.02]">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 end-0 w-64 bg-white shadow-xl dark:bg-[#10101a]">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 md:hidden dark:border-white/10 dark:bg-white/[0.02]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Sparkles className="size-5 text-brand-500" />
            <span className="font-bold">هوشینو</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm">
              <Coins className="size-4 text-amber-500" />
              {formatCredits(me?.credits)}
            </span>
            <button onClick={() => setOpen(true)}>
              <Menu className="size-6" />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
