"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Today" },
  { href: "/schedule", label: "Schedule" },
  { href: "/progress", label: "Progress" },
  { href: "/profile", label: "Profile" },
];

export default function NavBar() {
  const pathname = usePathname();
  return (
    <nav className="flex border-b border-[var(--line)] overflow-x-auto">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 text-center font-mono text-[11px] tracking-[0.1em] uppercase py-3 px-2 border-b-2 whitespace-nowrap transition-colors ${
              active
                ? "text-[var(--chalk)] border-[var(--red)]"
                : "text-[var(--muted)] border-transparent hover:text-[var(--chalk)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
