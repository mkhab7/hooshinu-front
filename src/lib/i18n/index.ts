"use client";

import { create } from "zustand";
import { fa } from "./fa";
import { en } from "./en";
import type { Locale } from "@/lib/types";
import { getLocale, setLocaleStorage } from "@/lib/auth";

// The `fa` dictionary defines the canonical key set; every other locale's
// dictionary must provide exactly these keys.
export type TranslationKey = keyof typeof fa;
export type Dict = Record<TranslationKey, string>;

const dictionaries: Record<Locale, Dict> = { fa, en };

export const RTL_LOCALES: Locale[] = ["fa"];
export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

/** Replace {placeholder} tokens with provided values. */
function interpolate(
  template: string,
  vars?: Record<string, string | number>
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`
  );
}

/** Pure translator — handy for tests and non-React callers. */
export function translate(
  locale: Locale,
  key: TranslationKey,
  vars?: Record<string, string | number>
): string {
  const dict = dictionaries[locale] ?? dictionaries.fa;
  const template = dict[key] ?? dictionaries.fa[key] ?? key;
  return interpolate(template, vars);
}

// ---- Reactive locale store ----
type I18nState = {
  locale: Locale;
  hydrated: boolean;
  hydrate: () => void;
  setLocale: (locale: Locale) => void;
};

/** Apply <html lang/dir> to match the active locale. */
function applyDocumentLocale(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale;
  document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
}

export const useI18nStore = create<I18nState>((set) => ({
  locale: "fa",
  hydrated: false,
  hydrate: () => {
    const locale = getLocale();
    applyDocumentLocale(locale);
    set({ locale, hydrated: true });
  },
  setLocale: (locale: Locale) => {
    setLocaleStorage(locale);
    applyDocumentLocale(locale);
    set({ locale });
  },
}));

export type TFunction = (
  key: TranslationKey,
  vars?: Record<string, string | number>
) => string;

/** Hook returning the translator bound to the active locale. */
export function useT(): { t: TFunction; locale: Locale } {
  const locale = useI18nStore((s) => s.locale);
  const t: TFunction = (key, vars) => translate(locale, key, vars);
  return { t, locale };
}
