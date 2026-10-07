"use client";

import { useSyncExternalStore } from "react";
import { clsx } from "clsx";

export function LogoMark({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={clsx(
        "grid place-items-center bg-ink-900 text-paper-50 font-serif leading-none shrink-0",
        size === "sm" ? "h-8 w-8 text-[15px]" : "h-9 w-9 text-[17px]"
      )}
    >
      D
    </span>
  );
}

type Theme = "light" | "dark";

function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

export function useIsDark() {
  return useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.classList.contains("dark"),
    () => false
  );
}

export function ThemeToggle() {
  const theme = useSyncExternalStore<Theme | null>(
    subscribeTheme,
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
    () => null
  );

  function apply(next: Theme) {
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("dipl-theme", next);
    } catch {}
  }

  return (
    <div
      className="grid grid-cols-2 gap-0.5 bg-paper-100 border border-paper-200 p-0.5"
      role="group"
      aria-label="Colour theme"
    >
      {(["light", "dark"] as const).map((t) => {
        const on = t === "dark" ? theme === "dark" : theme !== "dark";
        return (
          <button
            key={t}
            type="button"
            onClick={() => apply(t)}
            aria-pressed={on}
            className={clsx(
              "px-2 py-1.5 text-[11.5px] font-medium capitalize transition-colors",
              on ? "bg-paper-50 text-ink-900 shadow-card" : "text-ink-400 hover:text-ink-800"
            )}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}
