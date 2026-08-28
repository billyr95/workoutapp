import { redirect } from "next/navigation";
import { auth } from "@/auth";
import NavBar from "@/components/NavBar";
import SignOutButton from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");

  return (
    <div className="max-w-xl mx-auto min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-4 border-b border-[var(--line)] flex items-start justify-between gap-3">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/repra-wordmark-white.svg" alt="Repra" className="h-5 w-auto" />
          <h1 className="font-display text-4xl leading-none mt-2">
            {session.user.name}&apos;s Log
          </h1>
        </div>
        <SignOutButton />
      </header>
      <NavBar />
      <main className="flex-1 px-5 py-5">{children}</main>
    </div>
  );
}
