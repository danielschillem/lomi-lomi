import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { WSProvider } from "@/lib/ws-context";
import { PushNotificationsBridge } from "@/lib/push-notifications";
import Navbar from "@/components/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://134.209.229.141",
  ),
  title: {
    default: "Texto - Messagerie ouverte & interactive",
    template: "%s | Texto",
  },
  description:
    "Plateforme de messagerie ouverte tout public, avec chat interactif et espace premium TexMe.",
  keywords: [
    "rencontres",
    "discrétion",
    "anonyme",
    "affinités",
    "matching",
    "messagerie",
  ],
  authors: [{ name: "Daniel Schillem" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Texto",
    title: "Texto - Messagerie ouverte & interactive",
    description:
      "Messagerie ouverte tout public, chat interactif et expérience premium TexMe.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Texto - Messagerie ouverte",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Texto - Messagerie ouverte",
    description:
      "Chat interactif pour tous, avec TexMe pour l'expérience premium.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-foreground font-sans">
        <AuthProvider>
          <WSProvider>
            {children}
            <PushNotificationsBridge />
            <Navbar />
          </WSProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
