import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CollabDocs — Local-First Collaborative Editor",
    template: "%s | CollabDocs",
  },
  description:
    "A local-first, real-time collaborative document editor with offline sync, CRDT conflict resolution, and version history.",
  keywords: ["collaborative", "document", "editor", "offline", "real-time", "CRDT"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <SessionProvider>{children}</SessionProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
