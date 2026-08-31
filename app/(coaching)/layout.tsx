import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import BrandLogo from "@/components/BrandLogo";
import CoachSidebar from "@/components/CoachSidebar";
import { getActiveCoachClients } from "@/lib/data";

export default async function CoachingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");
  if (!session.user.isCoach) redirect("/");

  const clients = await getActiveCoachClients(Number(session.user.id));

  return (
    <div className="lg:flex min-h-screen">
      <CoachSidebar clients={clients} />
      <div className="max-w-xl mx-auto lg:max-w-none lg:mx-0 lg:flex-1 min-h-screen flex flex-col">
        <header className="lg:hidden px-5 pt-6 pb-4 border-b border-[var(--coach-blue-dim)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-6 w-auto" />
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
        <main className="flex-1 px-5 py-5 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
