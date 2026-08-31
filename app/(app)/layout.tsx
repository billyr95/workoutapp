import { redirect } from "next/navigation";
import { auth } from "@/auth";
import NavBar from "@/components/NavBar";
import SignOutButton from "@/components/SignOutButton";
import BrandLogo from "@/components/BrandLogo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/auth/sign-in");

  return (
    <div className="max-w-xl mx-auto min-h-screen flex flex-col">
      <header className="px-5 pt-6 pb-4 border-b border-[var(--line)] flex items-center justify-between gap-3">
        <BrandLogo className="h-6 w-auto" />
        <SignOutButton />
      </header>
      <main className="flex-1 px-5 py-5 pb-24">{children}</main>
      <NavBar />
    </div>
  );
}
