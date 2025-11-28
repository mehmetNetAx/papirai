import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "../globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Papirai - Akıllı Sözleşme Yönetim Platformu",
  description: "Organizasyonel hiyerarşileri, kullanıcı yönetimini, sözleşme editörünü, versiyonlamayı, uyum kontrollerini, onay süreçlerini ve harici sistem entegrasyonlarını destekleyen bir akıllı sözleşme platformudur.",
};

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <body className={`${manrope.variable} font-display antialiased`}>
        {children}
      </body>
    </html>
  );
}

