"use client";

import { useState } from "react";

type Theme = "system" | "light" | "dark";

// Lazy initializer reads localStorage synchronously on mount — avoids an effect+setState
// round trip, at the cost of a (harmless, cosmetic-only) hydration mismatch on first paint
// if the stored preference differs from the server-rendered "system" default.
function initialTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem("theme");
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  function applyTheme(next: Theme) {
    setTheme(next);
    try {
      if (next === "system") {
        localStorage.removeItem("theme");
        document.documentElement.removeAttribute("data-theme");
      } else {
        localStorage.setItem("theme", next);
        document.documentElement.setAttribute("data-theme", next);
      }
    } catch {}
  }

  return (
    <div className="flex gap-2">
      {(["system", "light", "dark"] as Theme[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => applyTheme(t)}
          suppressHydrationWarning
          className={`btn-ghost !py-1.5 !px-3 !text-[11px] rounded flex-1 capitalize ${
            theme === t ? "!border-[var(--red)] !text-[var(--chalk)]" : ""
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}
