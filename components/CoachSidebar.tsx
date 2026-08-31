"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
import SignOutButton from "@/components/SignOutButton";

type ClientNav = { username: string | null; name: string; avatarUrl: string | null };

function DashboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </svg>
  );
}

export default function CoachSidebar({ clients }: { clients: ClientNav[] }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-[var(--coach-blue-dim)] h-screen sticky top-0">
      <div className="px-5 pt-6 pb-4 border-b border-[var(--coach-blue-dim)]">
        <BrandLogo className="h-6 w-auto" />
        <span className="mt-2 inline-block font-label text-[10px] uppercase tracking-wide text-[var(--coach-blue)] border border-[var(--coach-blue-dim)] rounded px-1.5 py-0.5">
          Coaching
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <Link
          href="/coaching"
          className={`flex items-center gap-2.5 rounded px-3 py-2 mb-4 font-label text-[12px] uppercase tracking-wide transition-colors ${
            pathname === "/coaching" ? "bg-[var(--coach-blue)] text-white" : "text-[var(--chalk-dim)] hover:bg-[var(--surface2)]"
          }`}
        >
          <DashboardIcon className="h-4 w-4 shrink-0" />
          Dashboard
        </Link>

        <div className="font-label text-[10px] uppercase tracking-wide text-[var(--muted)] px-3 mb-2">Clients</div>
        {clients.length === 0 && <p className="font-label text-[11px] text-[var(--muted)] px-3">No active clients yet.</p>}
        {clients.map((c) => {
          const active = pathname === `/coaching/${c.username}`;
          return (
            <Link
              key={c.username}
              href={`/coaching/${c.username}`}
              className={`flex items-center gap-2.5 rounded px-3 py-2 font-label text-[12px] transition-colors ${
                active ? "bg-[var(--coach-blue)] text-white" : "text-[var(--chalk-dim)] hover:bg-[var(--surface2)]"
              }`}
            >
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-center">
                {c.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt={c.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-[10px] text-[var(--muted)]">{c.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <span className="truncate">{c.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-[var(--coach-blue-dim)] flex items-center justify-between gap-2">
        <Link href="/" className="font-label text-[11px] text-[var(--muted)] hover:text-[var(--chalk)] whitespace-nowrap">
          Personal App →
        </Link>
        <SignOutButton />
      </div>
    </aside>
  );
}
