import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Billy's Training Log",
  description: "Workout, cardio, and progress tracker",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-[var(--bg)] text-[var(--chalk)]">
        <div className="max-w-xl mx-auto min-h-screen flex flex-col">
          <header className="px-5 pt-6 pb-4 border-b border-[var(--line)]">
            <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-[var(--red)]">
              Training Log — Est. 2026
            </div>
            <h1 className="font-display text-4xl leading-none mt-1">
              Billy&apos;s Log
            </h1>
          </header>
          <NavBar />
          <main className="flex-1 px-5 py-5">{children}</main>
        </div>
      </body>
    </html>
  );
}
