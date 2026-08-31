import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

export default async function CoachingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");
  if (!session.user.isCoach) redirect("/");

  return (
    <div className="max-w-xl mx-auto min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-4 border-b border-[var(--coach-blue-dim)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/repra-full-logo.svg" alt="Repra" className="h-6 w-auto" />
          <span className="font-label text-[10px] uppercase tracking-wide text-[var(--coach-blue)] border border-[var(--coach-blue-dim)] rounded px-1.5 py-0.5">
            Coaching
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="font-label text-[11px] text-[var(--muted)] hover:text-[var(--chalk)] whitespace-nowrap">
            Personal App →
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1 px-5 py-5">{children}</main>
    </div>
  );
}
