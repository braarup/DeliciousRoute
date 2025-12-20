"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

type SiteHeaderProps = {
  ctaHref: string;
  ctaLabel: string;
};

export function SiteHeader({ ctaHref, ctaLabel }: SiteHeaderProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = pathname === "/";
  const showCta = isHome;

  return (
    <>
      <header className="flex items-center justify-between gap-6 border-b border-[#e0e0e0] bg-white/90 px-4 py-3 shadow-sm backdrop-blur md:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative h-8 w-8 overflow-hidden rounded-full border border-[var(--dr-primary)] bg-white shadow-sm md:h-9 md:w-9">
              <Image
                src="/icon_01.png"
                alt="Delicious Route icon"
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dr-primary)]">
                Delicious Route
              </p>
              <p className="text-xs text-[#616161]">Real-time food truck finder</p>
            </div>
          </Link>

          <div className="hidden items-center gap-5 text-sm text-[#424242] md:flex">
            <a href="#vendors" className="hover:text-[var(--dr-primary)]">
              Find trucks
            </a>
            <a href="#events" className="hover:text-[var(--dr-primary)]">
              Events
            </a>
            <a href="#about" className="hover:text-[var(--dr-primary)]">
              About
            </a>
            {showCta && (
              <Link
                href={ctaHref}
                className="rounded-full border border-[var(--dr-primary)] bg-[var(--dr-primary)]/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--dr-primary)] shadow-sm hover:bg-[var(--dr-primary)]/10"
              >
                {ctaLabel}
              </Link>
            )}
          </div>

          {/* Hamburger menu */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-[var(--dr-text)] hover:bg-[var(--dr-neutral)] md:hidden"
            aria-label="Open menu"
          >
            <span className="flex h-4 w-4 flex-col justify-between">
              <span className="h-[2px] w-full rounded-full bg-current" />
              <span className="h-[2px] w-full rounded-full bg-current" />
              <span className="h-[2px] w-3/4 rounded-full bg-current" />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile slide-over menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden">
          <div className="absolute inset-y-0 right-0 w-72 max-w-full bg-white shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--dr-primary)]">
                Menu
              </p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--dr-neutral)] text-[var(--dr-text)] hover:bg-[#e0e0e0]"
                aria-label="Close menu"
              >
                <span className="h-4 w-4 rotate-45">+</span>
              </button>
            </div>
            <nav className="flex flex-col gap-1 px-3 py-4 text-sm">
              <MobileNavItem
                label="Contact Delicious Route"
                href="#contact"
                onClick={() => setMenuOpen(false)}
              />
              {showCta && (
                <MobileNavItem
                  label={ctaLabel}
                  href={ctaHref}
                  onClick={() => setMenuOpen(false)}
                />
              )}
              <MobileNavItem
                label="Customer Profile"
                href="/customer/profile"
                onClick={() => setMenuOpen(false)}
              />
              <MobileNavItem
                label="About Us"
                href="#about"
                onClick={() => setMenuOpen(false)}
              />
            </nav>
          </div>
        </div>
      )}
    </>
  );
}

type MobileNavItemProps = {
  label: string;
  href: string;
  onClick: () => void;
};

function MobileNavItem({ label, href, onClick }: MobileNavItemProps) {
  return (
    <a
      href={href}
      onClick={onClick}
      className="rounded-xl px-3 py-2 text-sm text-slate-100 hover:bg-white/5"
    >
      {label}
    </a>
  );
}
