import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { getCurrentUser } from "@/lib/auth";
import { sql } from "@vercel/postgres";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Delicious Route – Food Trucks, Street Eats & More",
  description:
    "Discover nearby food trucks, street eats, and more in real time. Browse vendors, reels, and events, and get instant directions to their live GPS locations.",
  icons: {
    icon: "/icon_01.png",
    shortcut: "/icon_01.png",
    apple: "/icon_01.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  let ctaHref = "/login";
  let ctaLabel = "Sign in";

  if (currentUser?.id) {
    const rolesResult = await sql`
      SELECT r.name
      FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ${currentUser.id}
    `;

    const roleNames = rolesResult.rows.map((row) =>
      (row.name as string).toLowerCase()
    );

    const isVendor = roleNames.includes("vendor_admin");

    ctaHref = isVendor ? "/vendor/profile" : "/customer/profile";
    ctaLabel = "View your profile";
  }
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--dr-neutral)] text-[var(--dr-text)] pt-16`}
      >
        <SiteHeader ctaHref={ctaHref} ctaLabel={ctaLabel} />
        {children}
      </body>
    </html>
  );
}
