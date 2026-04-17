import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { Providers } from "./providers";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/common/ErrorBoundary";

export const metadata: Metadata = {
  title: "ORBITA",
  description: "ORBITA · Red federal de streamers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-slate-50 overflow-x-hidden bg-transparent">
        <div aria-hidden className="fixed inset-0 pointer-events-none cosmic-bg">
          <div className="cosmic-nebula" />
          <div className="cosmic-stars cosmic-stars-far" />
          <div className="cosmic-stars cosmic-stars-dense" />
          <div className="cosmic-stars cosmic-stars-near" />
          <div className="cosmic-stars cosmic-stars-sparkle" />
          <div className="cosmic-grid" />
          <div className="cosmic-signal cosmic-signal-a" />
          <div className="cosmic-signal cosmic-signal-b" />
          <div className="cosmic-signal cosmic-signal-c" />
          <div className="cosmic-orbit cosmic-orbit-a" />
          <div className="cosmic-orbit cosmic-orbit-b" />
          <div className="cosmic-vignette" />
        </div>
        <Providers>
          <ErrorBoundary>
            <div className="relative z-10 min-h-full flex flex-1 flex-col">
              {children}
            </div>
          </ErrorBoundary>
        </Providers>
        <Toaster position="top-right" theme="dark" richColors closeButton />
      </body>
    </html>
  );
}
