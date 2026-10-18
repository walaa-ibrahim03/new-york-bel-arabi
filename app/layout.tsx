
import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import { siteOrigin, searchIndexable } from "../lib/news-seo";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: siteOrigin() ? new URL(siteOrigin()!) : undefined,
  robots: { index: searchIndexable(), follow: searchIndexable() },
  verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  title: "نيويورك بالعربي | New York Bel Arabi",
  description:
    "أخبار نيويورك والخدمات والوظائف والفعاليات باللغة العربية",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.className} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
