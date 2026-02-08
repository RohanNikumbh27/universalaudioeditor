import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#06060e",
};

export const metadata: Metadata = {
  title: "Universal Audio Editor",
  description:
    "Download, convert, and trim audio and video files right in your browser. Fast, free, and private.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Audio Editor",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="gradient-bg" />
        <Navbar />
        <main className="pt-24 pb-16 min-h-screen">{children}</main>
      </body>
    </html>
  );
}
