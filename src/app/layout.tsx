import type { Metadata, Viewport } from "next";
import { Geist, Unbounded } from "next/font/google";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin", "latin-ext"] });
const unbounded = Unbounded({ variable: "--font-unbounded", subsets: ["latin", "latin-ext"] });

const TITLE = "Dilo · Say it out loud before it matters";
const DESCRIPTION =
  "Practice your work English on a call with a native English speaker. Feedback on every phrase, for cents per practice.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Dilo",
  openGraph: { title: TITLE, description: DESCRIPTION, siteName: "Dilo", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
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
