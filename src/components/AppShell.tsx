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
  Languages,
} from "lucide-react";
import { cn, formatCredits } from "@/lib/utils";
import { useMe } from "@/features/profile/hooks";
import { useLogout } from "@/features/auth/hooks";
import { getStoredTheme, setStoredTheme, type Theme } from "@/lib/auth";
import { useT, useI18nStore, type TranslationKey } from "@/lib/i18n";
import { Badge } from "@/components/ui/Card";

const NAV: { href: string; key: TranslationKey; icon: typeof LayoutDashboard }[] =
  [
    { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
    { href: "/chat", key: "nav.chat", icon: MessageSquare },
    { href: "/studio", key: "nav.studio", icon: Wand2 },
    { href: "/wallet", key: "nav.wallet", icon: Wallet },
    { href: "/settings", key: "nav.settings", icon: Settings },
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
  const { t, locale } = useT();
  const setLocale = useI18nStore((s) => s.setLocale);

  function toggleLocale() {
    setLocale(locale === "fa" ? "en" : "fa");
  }

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
        className="flex items-center gap-2.5 px-5 py-6"
        onClick={() => setOpen(false)}
      >
        <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-lg shadow-brand-600/30">
          <Sparkles className="size-5" />
        </span>
        <span className="bg-gradient-to-l from-brand-500 to-violet-500 bg-clip-text text-lg font-extrabold text-transparent">
          {t("common.appName")}
        </span>
      </Link>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, key, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gradient-to-l from-brand-500/15 to-transparent text-brand-600 dark:text-brand-300"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.04] dark:hover:text-white"
              )}
            >
              {active && (
                <span className="absolute end-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-brand-500" />
              )}
              <Icon
                className={cn(
                  "size-5 transition-transform group-hover:scale-110",
                  active && "text-brand-500"
                )}
              />
              {t(key)}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 p-3">
        <Link
          href="/wallet"
          onClick={() => setOpen(false)}
          className="group flex items-center justify-between rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 px-3.5 py-3 transition-colors hover:border-brand-300 dark:border-white/[0.06] dark:from-white/[0.04] dark:to-transparent dark:hover:border-brand-500/30"
        >
          <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Coins className="size-4 text-amber-500" />
            {t("common.credits")}
          </span>
          <span className="font-bold tabular-nums text-gray-900 dark:text-white">
            {formatCredits(me?.credits)}
          </span>
        </Link>

        <div className="flex items-center gap-2.5 rounded-2xl border border-gray-200 px-3 py-2.5 dark:border-white/[0.06]">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
            {(me?.name || t("nav.defaultUser")).charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {me?.name || t("nav.defaultUser")}
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
            onClick={toggleLocale}
            aria-label={t("settings.language")}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 dark:border-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.06]"
          >
            <Languages className="size-4" />
            {locale === "fa" ? "EN" : "فا"}
          </button>
          <button
            onClick={toggleTheme}
            aria-label={t("nav.toggleTheme")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:border-white/[0.06] dark:text-gray-300 dark:hover:bg-white/[0.06]"
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </button>
          <button
            onClick={doLogout}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-white/[0.06] dark:hover:bg-red-500/10"
          >
            <LogOut className="size-4" />
            {t("nav.logout")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-s border-gray-200 bg-white/60 backdrop-blur-xl md:block dark:border-white/[0.06] dark:bg-white/[0.015]">
        <div className="sticky top-0 h-screen">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="animate-scale-in absolute inset-y-0 end-0 w-72 origin-top-left border-s border-gray-200 bg-white shadow-2xl dark:border-white/[0.06] dark:bg-surface-2">
            {sidebar}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/70 px-4 py-3 backdrop-blur-xl md:hidden dark:border-white/[0.06] dark:bg-surface-1/70">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Sparkles className="size-5 text-brand-500" />
            <span className="font-bold">{t("common.appName")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sm font-medium">
              <Coins className="size-4 text-amber-500" />
              {formatCredits(me?.credits)}
            </span>
            <button
              onClick={() => setOpen(true)}
              aria-label={t("nav.menu")}
              className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <Menu className="size-6" />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
