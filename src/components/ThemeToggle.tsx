"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "ui-theme";

type Theme = "light" | "dark";

type ThemeToggleProps = {
  className?: string;
};

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const rootTheme = document.documentElement.dataset.theme;
    if (rootTheme === "light" || rootTheme === "dark") {
      setTheme(rootTheme);
    } else {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
      } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme, mounted]);

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`flex w-full items-center justify-between rounded-lg border border-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-900 ${
        className ?? ""
      }`}
      aria-label="Toggle color theme"
    >
      <span>Theme</span>
      <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
        {mounted ? (theme === "dark" ? "Dark" : "Light") : ""}
      </span>
    </button>
  );
}
