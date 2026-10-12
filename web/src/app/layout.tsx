import type { Metadata } from "next";
import { Noto_Sans_Devanagari, Noto_Sans } from "next/font/google";
import "./globals.css";

const notoSans = Noto_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
});

export const metadata: Metadata = {
  title: "Corporator Portal",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={`${notoSans.variable} ${notoDevanagari.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
