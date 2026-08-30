"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import type { SVGProps } from "react";

function IconProps(props: SVGProps<SVGSVGElement>) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

function TodayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...IconProps(props)}>
      <polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2" />
    </svg>
  );
}

function ScheduleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...IconProps(props)}>
      <rect x="3" y="4.5" width="18" height="16" rx="2" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <line x1="8" y1="2.5" x2="8" y2="6.5" />
      <line x1="16" y1="2.5" x2="16" y2="6.5" />
    </svg>
  );
}

function ProgressIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...IconProps(props)}>
      <polyline points="3 17 9 11 13 15 21 6" />
      <polyline points="14 6 21 6 21 13" />
    </svg>
  );
}

function FeedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...IconProps(props)}>
      <polyline points="2.5 13 7.5 13 9.5 7 13.5 19 16.5 13 21.5 13" />
    </svg>
  );
}

function SearchIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...IconProps(props)}>
      <circle cx="10.5" cy="10.5" r="7" />
      <line x1="21" y1="21" x2="15.5" y2="15.5" />
    </svg>
  );
}

function ProfileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...IconProps(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
    </svg>
  );
}

function CoachingIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...IconProps(props)}>
      <rect x="5" y="4" width="14" height="18" rx="2" />
      <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" fill="currentColor" stroke="none" />
      <polyline points="9 13 11 15 15 11" />
    </svg>
  );
}

const TABS = [
  { href: "/", label: "Today", Icon: TodayIcon, activeColor: "var(--red)" },
  { href: "/schedule", label: "Schedule", Icon: ScheduleIcon, activeColor: "var(--red)" },
  { href: "/progress", label: "Progress", Icon: ProgressIcon, activeColor: "var(--red)" },
  { href: "/feed", label: "Feed", Icon: FeedIcon, activeColor: "var(--red)" },
  { href: "/search", label: "Search", Icon: SearchIcon, activeColor: "var(--red)" },
  { href: "/profile", label: "Profile", Icon: ProfileIcon, activeColor: "var(--red)" },
];

const COACHING_TAB = { href: "/coaching", label: "Coaching", Icon: CoachingIcon, activeColor: "var(--coach-blue)" };

export default function NavBar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const tabs = session?.user?.isCoach ? [...TABS.slice(0, 3), COACHING_TAB, ...TABS.slice(3)] : TABS;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--line)] bg-[var(--bg)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-xl mx-auto flex overflow-x-auto">
        {tabs.map(({ href, label, Icon, activeColor }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={active ? { color: "var(--chalk)", borderTopColor: activeColor } : undefined}
              className={`flex-1 flex flex-col items-center gap-1 text-center font-label text-[11px] tracking-[0.1em] uppercase py-2.5 px-2 border-t-2 whitespace-nowrap transition-colors ${
                active ? "" : "text-[var(--muted)] border-transparent hover:text-[var(--chalk)]"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2 : 1.8} style={active ? { color: activeColor } : undefined} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
