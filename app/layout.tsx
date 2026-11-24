import type { Metadata } from "next";
import { alarabiya } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "السوشيال ميديا — Books Platform",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={alarabiya.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
