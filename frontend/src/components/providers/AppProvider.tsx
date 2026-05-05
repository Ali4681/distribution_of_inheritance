"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { Dictionary, Locale, ThemeMode, dictionaries } from "@/lib/i18n";

type AppContextValue = {
  locale: Locale;
  theme: ThemeMode;
  dir: "ltr" | "rtl";
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  toggleLocale: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);
const APP_PREFERENCES_EVENT = "app-preferences-change";

function subscribeToPreferences(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === "app_locale" || event.key === "app_theme") callback();
  };
  const handlePreferencesChange = () => callback();

  window.addEventListener("storage", handleStorage);
  window.addEventListener(APP_PREFERENCES_EVENT, handlePreferencesChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(APP_PREFERENCES_EVENT, handlePreferencesChange);
  };
}

function emitPreferencesChange() {
  window.dispatchEvent(new Event(APP_PREFERENCES_EVENT));
}

function getLocaleSnapshot(): Locale {
  return localStorage.getItem("app_locale") === "ar" ? "ar" : "en";
}

function getLocaleServerSnapshot(): Locale {
  return "en";
}

function getThemeSnapshot(): ThemeMode {
  return localStorage.getItem("app_theme") === "dark" ? "dark" : "light";
}

function getThemeServerSnapshot(): ThemeMode {
  return "light";
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(
    subscribeToPreferences,
    getLocaleSnapshot,
    getLocaleServerSnapshot,
  );
  const theme = useSyncExternalStore(
    subscribeToPreferences,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );

  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = locale === "ar" ? "rtl" : "ltr";
    root.classList.toggle("dark", theme === "dark");

    const themeColor = theme === "dark" ? "#0b3935" : "#0f766e";
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", themeColor);
  }, [locale, theme]);

  const value = useMemo<AppContextValue>(() => {
    const setLocale = (nextLocale: Locale) => {
      localStorage.setItem("app_locale", nextLocale);
      emitPreferencesChange();
    };
    const setTheme = (nextTheme: ThemeMode) => {
      localStorage.setItem("app_theme", nextTheme);
      emitPreferencesChange();
    };

    return {
      locale,
      theme,
      dir: locale === "ar" ? "rtl" : "ltr",
      t: dictionaries[locale] as Dictionary,
      setLocale,
      setTheme,
      toggleTheme: () => setTheme(theme === "light" ? "dark" : "light"),
      toggleLocale: () => setLocale(locale === "en" ? "ar" : "en"),
    };
  }, [locale, theme]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used inside AppProvider");
  }
  return context;
}
