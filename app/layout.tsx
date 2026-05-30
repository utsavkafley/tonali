import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tonali",
  description: "A practice metronome built for musicians.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <nav className="flex items-center justify-center gap-6 border-b border-foreground/10 px-6 py-3 text-sm">
          <span className="font-semibold tracking-tight">Tonali</span>
          <Link href="/" className="text-foreground/60 transition-colors hover:text-foreground">
            Metronome
          </Link>
          <Link
            href="/fretboard"
            className="text-foreground/60 transition-colors hover:text-foreground"
          >
            Fretboard
          </Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
