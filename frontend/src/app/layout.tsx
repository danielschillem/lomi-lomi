import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { WSProvider } from "@/lib/ws-context";
import Navbar from "@/components/Navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://lomilomi.app",
  ),
  title: {
    default: "Lomi Lomi — Rencontres discrètes & affinités authentiques",
    template: "%s | Lomi Lomi",
  },
  description:
    "Plateforme de rencontres pour adultes. Matching par affinités, messagerie chiffrée, profils vérifiés. 100% anonyme et sécurisé.",
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
    siteName: "Lomi Lomi",
    title: "Lomi Lomi — Rencontres discrètes & affinités authentiques",
    description:
      "Plateforme de rencontres anonymes et sécurisées. Matching par affinités, messagerie chiffrée, profils vérifiés.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Lomi Lomi — Rencontres discrètes",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lomi Lomi — Rencontres discrètes",
    description:
      "Matching par affinités, messagerie chiffrée, profils vérifiés.",
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
      <body className="min-h-full flex flex-col bg-zinc-950 text-white font-sans">
        <AuthProvider>
          <WSProvider>
            {children}
            <Navbar />
          </WSProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
