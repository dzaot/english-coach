import type { Metadata, Viewport } from "next";
import { Geist, Unbounded } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin", "latin-ext"] });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "Dilo · Practice your work English out loud",
  description: "Practice your job interview in English, out loud, for cents per practice. Instant feedback, a daily streak and phrases to review.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ff5a1f",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geist.variable} ${unbounded.variable} h-full antialiased`}>
      <body className="min-h-full text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-2.5 focus:font-semibold focus:text-night"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
