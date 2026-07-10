import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Training Log",
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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
