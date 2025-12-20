import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Delicious Route – Food Truck Finder",
  description:
    "Discover nearby food trucks in real time, browse vendors, reels, and events, and get instant directions to their live GPS location.",
  icons: {
    icon: "/icon_01.png",
    shortcut: "/icon_01.png",
    apple: "/icon_01.png",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--dr-neutral)] text-[var(--dr-text)]`}
      >
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
