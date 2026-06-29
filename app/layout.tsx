import type { Metadata, Viewport } from "next";
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

const BASE_URL = "https://collab-doc-editor-rho.vercel.app";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)",  color: "#1d4ed8" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  title: {
    default: "CollabDocs — Local-First Collaborative Editor",
    template: "%s | CollabDocs",
  },
  description:
    "A local-first, real-time collaborative document editor with offline sync, Y.js CRDT conflict resolution, version history, and AI writing assistance.",
  keywords: [
    "collaborative editor",
    "document editor",
    "offline-first",
    "local-first",
    "real-time collaboration",
    "CRDT",
    "Y.js",
    "yjs",
    "WebSocket",
    "version history",
  ],
  authors: [{ name: "Shivanand Vishwakarma", url: "https://github.com/Shiva7781" }],
  creator: "Shivanand Vishwakarma",
  publisher: "CollabDocs",
  applicationName: "CollabDocs",
  generator: "Next.js",
  referrer: "strict-origin-when-cross-origin",

  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "CollabDocs",
    title: "CollabDocs — Local-First Collaborative Editor",
    description:
      "Edit together, even offline. Y.js CRDTs resolve conflicts deterministically — every collaborator sees the same result, always.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "CollabDocs — Local-First Collaborative Editor",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "CollabDocs — Local-First Collaborative Editor",
    description:
      "Edit together, even offline. Y.js CRDTs resolve conflicts deterministically.",
    images: ["/opengraph-image"],
    creator: "@Shiva7781",
  },

  icons: {
    icon: [{ url: "/icon", type: "image/png" }],
    apple: [{ url: "/apple-icon", type: "image/png" }],
    shortcut: "/icon",
  },

  manifest: "/manifest.webmanifest",

  category: "productivity",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <SessionProvider>{children}</SessionProvider>
        <Toaster
          position="bottom-right"
          richColors
          closeButton
          expand={false}
          visibleToasts={4}
          duration={4000}
          gap={8}
          offset={20}
          toastOptions={{
            classNames: {
              toast: "!rounded-xl !shadow-lg !text-sm",
              title: "!font-semibold",
              description: "!text-xs !opacity-85",
              closeButton: "!rounded-full",
            },
          }}
        />
      </body>
    </html>
  );
}
