import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Repra",
  description: "Workout, cardio, and progress tracker",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    apple: "/brand/repra-icon-192.png",
  },
};

// Runs before hydration so an explicit theme choice applies before first paint —
// otherwise a saved "light" preference would flash dark for a frame on every load.
const themeInitScript = `
(function () {
  try {
    var theme = localStorage.getItem("theme");
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full bg-[var(--bg)] text-[var(--chalk)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
