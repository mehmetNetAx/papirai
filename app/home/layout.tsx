import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "../globals.css";
import Script from "next/script";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Papirai - Akıllı Sözleşme Yönetim Platformu",
  description: "Organizasyonel hiyerarşileri, kullanıcı yönetimini, sözleşme editörünü, versiyonlamayı, uyum kontrollerini, onay süreçlerini ve harici sistem entegrasyonlarını destekleyen bir akıllı sözleşme platformudur.",
};

export default function HomeLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            .material-symbols-outlined {
              font-variation-settings:
                'FILL' 0,
                'wght' 400,
                'GRAD' 0,
                'opsz' 24;
            }
          `
        }} />
      </head>
      <body className={`${manrope.variable} font-display antialiased`}>
        {children}
      </body>
    </html>
  );
}

