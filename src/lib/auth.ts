// Auth/token store. All token access goes through this module so the storage
// mechanism (currently localStorage) can be swapped for a cookie later without
// touching call sites.
"use client";

import { create } from "zustand";
import type { Locale } from "./types";

const TOKEN_KEY = "hooshinu.token";
const LOCALE_KEY = "hooshinu.locale";
const THEME_KEY = "hooshinu.theme";

export type Theme = "dark" | "light";

function readStorage(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

// --- Token (read synchronously by the api wrapper) ---
export function getToken(): string | null {
  return readStorage(TOKEN_KEY);
}

export function setToken(token: string | null) {
  writeStorage(TOKEN_KEY, token);
}

// --- Locale ---
export function getLocale(): Locale {
  const v = readStorage(LOCALE_KEY);
  return v === "en" ? "en" : "fa";
}

export function setLocaleStorage(locale: Locale) {
  writeStorage(LOCALE_KEY, locale);
}

// --- Theme ---
export function getStoredTheme(): Theme {
  const v = readStorage(THEME_KEY);
  return v === "light" ? "light" : "dark";
}

export function setStoredTheme(theme: Theme) {
  writeStorage(THEME_KEY, theme);
}

// --- Auth store (reactive UI state) ---
type AuthState = {
  token: string | null;
  hydrated: boolean;
  isAuthed: boolean;
  hydrate: () => void;
  login: (token: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  hydrated: false,
  isAuthed: false,
  hydrate: () => {
    const token = getToken();
    set({ token, isAuthed: !!token, hydrated: true });
  },
  login: (token: string) => {
    setToken(token);
    set({ token, isAuthed: true });
  },
  logout: () => {
    setToken(null);
    set({ token: null, isAuthed: false });
  },
}));
