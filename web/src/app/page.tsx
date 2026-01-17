"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type TabKey = "grub" | "vendors" | "events";

type VendorsTabVendor = {
  id: string;
  name: string;
  cuisine: string;
  city: string;
  tagline?: string | null;
  todayHours?: string;
  isOpenNow?: boolean;
   profileImagePath?: string | null;
};

const ads = [
  {
    id: 1,
    title: "Promote your food truck on Delicious Route",
    subtitle: "Reach hungry customers right where they are.",
    cta: "Become a Featured Truck",
    href: "#manage-my-truck",
  },
  {
    id: 2,
    title: "Host your next event with local trucks",
    subtitle: "Curated lineups for festivals, offices, and private parties.",
    cta: "Book Trucks",
    href: "#events",
  },
  {
    id: 3,
    title: "Grub Reels: See what’s sizzling now",
    subtitle: "Short clips from the best trucks in your city.",
    cta: "Watch Reels",
    href: "#grub-reels",
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabKey>("grub");
  const [search, setSearch] = useState("");
  const [activeAdIndex, setActiveAdIndex] = useState(0);
  const [vendors, setVendors] = useState<VendorsTabVendor[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveAdIndex((prev) => (prev + 1) % ads.length);
    }, 6000);

    return () => clearInterval(timer);
  }, []);

  const filteredVendors = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return vendors;
    return vendors.filter((vendor) => {
      return (
        vendor.name.toLowerCase().includes(query) ||
        vendor.cuisine.toLowerCase().includes(query) ||
        vendor.city.toLowerCase().includes(query)
      );
    });
  }, [search, vendors]);

  const activeAd = ads[activeAdIndex];

  useEffect(() => {
    let cancelled = false;

    async function loadVendors() {
      try {
        const res = await fetch("/api/vendors");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.vendors)) {
          setVendors(data.vendors);
        }
      } catch (error) {
        console.error("Failed to load vendors", error);
      }
    }

    loadVendors();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        {/* Advertising carousel */}
        <section
          aria-label="Sponsored promotions"
          className="mt-4 rounded-3xl border border-[var(--dr-primary)]/30 bg-gradient-to-r from-[var(--dr-primary)]/12 via-[var(--dr-accent)]/10 to-[var(--dr-primary)]/16 p-[1px] shadow-sm shadow-[var(--dr-primary)]/30"
        >
          <div className="relative flex flex-col gap-3 rounded-[1.35rem] bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-5">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--dr-primary)]">
                Featured
              </p>
              <h2 className="mt-1 text-lg font-semibold text-[var(--dr-text)] sm:text-xl">
                {activeAd.title}
              </h2>
              <p className="mt-1 text-sm text-[#616161] sm:text-base">
                {activeAd.subtitle}
              </p>
            </div>
            <div className="flex flex-col items-start justify-between gap-3 sm:items-end">
              <Link
                href={activeAd.href}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--dr-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
              >
                {activeAd.cta}
                <span aria-hidden>&rarr;</span>
              </Link>
              <div className="flex items-center gap-1">
                {ads.map((ad, index) => (
                  <button
                    key={ad.id}
                    aria-label={`Go to promotion ${index + 1}`}
                    onClick={() => setActiveAdIndex(index)}
                    className={`h-1.5 w-4 rounded-full transition-all ${
                      index === activeAdIndex
                        ? "bg-[var(--dr-primary)]"
                        : "bg-[var(--dr-primary)]/20 hover:bg-[var(--dr-primary)]/40"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <main className="mt-6 grid flex-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          {/* Left: Map + tabs content */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 rounded-3xl border border-[#e0e0e0] bg-white p-3 sm:p-4">
              <nav
                aria-label="Main content tabs"
                className="flex gap-2 rounded-2xl bg-[var(--dr-neutral)] p-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#616161]"
              >
                <TabButton
                  label="Grub Reels"
                  active={activeTab === "grub"}
                  onClick={() => setActiveTab("grub")}
                  href="#grub-reels"
                />
                <TabButton
                  label="Vendors"
                  active={activeTab === "vendors"}
                  onClick={() => setActiveTab("vendors")}
                  href="#vendors"
                />
                <TabButton
                  label="Events"
                  active={activeTab === "events"}
                  onClick={() => setActiveTab("events")}
                  href="#events"
                />
              </nav>

              <div className="mt-1">
                {activeTab === "grub" && <GrubReelsTab />}
                {activeTab === "vendors" && (
                  <VendorsTab
                    search={search}
                    onSearchChange={setSearch}
                    vendors={filteredVendors}
                  />
                )}
                {activeTab === "events" && <EventsTab />}
              </div>
            </div>
          </section>

          {/* Right: Hero and quick links */}
          <aside className="flex flex-col justify-between gap-4">
            <section className="rounded-3xl border border-[#e0e0e0] bg-white px-5 py-6 shadow-sm">
              <p
                id="about"
                className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]"
              >
                Find the flavor
              </p>
              <h1 className="mt-2 text-2xl font-semibold leading-snug text-[var(--dr-text)] sm:text-3xl">
                Track your favorite food trucks in real time.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-[#424242]">
                Delicious Route connects hungry explorers with roaming kitchens.
                Search by truck, cuisine, or city, then get instant directions
                to their live GPS location.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
                <a
                  href="#vendors"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--dr-primary)] px-4 py-2 text-white shadow-sm shadow-[var(--dr-primary)]/40 hover:bg-[var(--dr-accent)] sm:flex-none sm:px-5"
                >
                  Find trucks nearby
                  <span aria-hidden>&rarr;</span>
                </a>
                <Link
                  id="manage-my-truck"
                  href="/login"
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-[var(--dr-primary)]/50 px-4 py-2 text-[var(--dr-primary)] hover:bg-[var(--dr-primary)]/5 sm:flex-none sm:px-5"
                >
                  Vendor & customer login
                </Link>
              </div>
            </section>

            <section
              id="events"
              className="rounded-3xl border border-[#e0e0e0] bg-white px-5 py-4 text-sm text-[#424242]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)]/90">
                For organizers
              </p>
              <p className="mt-1 font-medium text-[var(--dr-text)]">
                Planning a festival, office lunch, or block party?
              </p>
              <p className="mt-1 text-xs text-[#616161]">
                Use our Events tab to curate a lineup and share a live map so
                guests always know where the flavor is.
              </p>
            </section>
          </aside>
        </main>

        <footer className="mt-6 border-t border-[#e0e0e0] pt-3 text-xs text-[#757575]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              © {new Date().getFullYear()} Delicious Route. Built for modern
              food truck culture.
            </p>
            <p className="text-[11px]" id="contact">
              For partnerships, email
              <span className="font-medium text-[var(--dr-text)]">
                {" "}
                hello@deliciousroute.app
              </span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

type TabButtonProps = {
  label: string;
  active: boolean;
  href: string;
  onClick: () => void;
};

function TabButton({ label, active, href, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-2xl px-3 py-2 transition-all ${
        active
          ? "bg-amber-400 text-slate-950 shadow-sm shadow-amber-500/40"
          : "text-slate-300 hover:bg-slate-800/80"
      }`}
    >
      <span className="block text-[11px]">
        <a href={href}>{label}</a>
      </span>
    </button>
  );
}

type VendorsTabProps = {
  search: string;
  onSearchChange: (value: string) => void;
  vendors: VendorsTabVendor[];
};

function VendorsTab({ search, onSearchChange, vendors }: VendorsTabProps) {
  return (
    <section id="vendors" aria-label="Nearby food trucks" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-200">
            Vendors
          </h2>
          <p className="text-xs text-slate-400">
            Search by truck, cuisine, or city. Tap a card for details.
          </p>
        </div>
      </div>

      <div className="mt-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-200">
        <span className="text-xs text-slate-500">Search</span>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Try: tacos, burgers, or Austin"
          className="flex-1 bg-transparent text-sm text-slate-50 placeholder:text-slate-500 focus:outline-none"
        />
      </div>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {vendors.length === 0 ? (
          <p className="col-span-full text-sm text-slate-400">
            No trucks match that search yet. Try a different city or cuisine.
          </p>
        ) : (
          vendors.map((vendor) => (
            <Link
              key={vendor.id}
              href={`/vendor/${vendor.id}`}
              className="group flex flex-col gap-2 rounded-2xl border border-white/10 bg-slate-950/80 p-3 text-sm text-slate-200 shadow-sm shadow-black/40 hover:border-amber-400/60 hover:bg-slate-900/90"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 overflow-hidden rounded-full border border-amber-400/40 bg-slate-900">
                    <img
                      src={vendor.profileImagePath || "/icon_01.png"}
                      alt="Vendor profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-50">
                      {vendor.name}
                    </h3>
                    <p className="text-xs text-amber-200">{vendor.cuisine}</p>
                  </div>
                </div>
                <span
                  className={
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ring-1 " +
                    (vendor.isOpenNow
                      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-400/40"
                      : "bg-slate-500/20 text-slate-200 ring-slate-400/30")
                  }
                >
                  {vendor.isOpenNow ? "Open" : "Closed"}
                </span>
              </div>
              <p className="line-clamp-2 text-xs text-slate-300">
                {vendor.tagline}
              </p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <p>
                  {vendor.city}
                  <span className="mx-1">•</span>
                  {vendor.todayHours}
                </p>
                <p className="flex items-center gap-1 text-amber-200">
                  <span className="transition-transform group-hover:translate-x-0.5">
                    View route
                  </span>
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                    ↗
                  </span>
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function GrubReelsTab() {
  const [reels, setReels] = useState<
    Array<{
      id: string;
      vendorId: string;
      caption: string | null;
      createdAt: string;
      videoUrl: string;
      vendorName: string;
      city: string;
    }>
  >([]);

  useEffect(() => {
    let cancelled = false;

    async function loadReels() {
      try {
        const res = await fetch("/api/reels");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data.reels)) {
          setReels(
            data.reels.map((r: any) => ({
              id: String(r.id),
              vendorId: String(r.vendorId),
              caption: r.caption ?? null,
              createdAt: typeof r.createdAt === "string" ? r.createdAt : new Date(r.createdAt).toISOString(),
              videoUrl: String(r.videoUrl),
              vendorName: r.vendorName ?? "",
              city: r.city ?? "",
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load reels", err);
      }
    }

    loadReels();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="grub-reels"
      aria-label="Short video reels from trucks"
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--dr-primary)]">
            Grub Reels
          </h2>
          <p className="text-xs text-[#757575]">
            Swipe-worthy clips from trucks around the country.
          </p>
        </div>
        {/* Coming soon badge removed */}
      </div>

      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {reels.length === 0 ? (
          <p className="col-span-full text-xs text-[#757575]">
            No Grub Reels are live right now. Check back soon!
          </p>
        ) : (
          reels.map((reel) => (
            <article
              key={reel.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-[#e0e0e0] bg-white text-xs text-[var(--dr-text)] shadow-sm"
            >
              <div className="relative bg-black/80">
                <video
                  src={reel.videoUrl}
                  controls
                  playsInline
                  muted
                  className="h-40 w-full object-cover sm:h-44"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between px-3 py-2">
                <div>
                  <h3 className="line-clamp-2 text-[11px] font-semibold text-[var(--dr-text)]">
                    {reel.caption || `Grub Reel from ${reel.vendorName || "this truck"}`}
                  </h3>
                  <p className="mt-1 text-[10px] text-[#616161]">
                    {reel.vendorName}
                    {reel.city && (
                      <>
                        <span className="mx-1"> b7</span>
                        {reel.city}
                      </>
                    )}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-[#757575]">
                  <span className="rounded-full bg-black/80 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-white">
                    Grub Reel
                  </span>
                  <Link
                    href={`/vendor/${reel.vendorId}`}
                    className="text-[11px] font-medium text-[var(--dr-primary)] hover:underline"
                  >
                    View vendor profile
                  </Link>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function EventsTab() {
  const events = [
    {
      id: 1,
      name: "Downtown Street Food Fridays",
      city: "Austin, TX",
      date: "Every Friday · 6–10pm",
      trucks: 14,
    },
    {
      id: 2,
      name: "Rooftop Lunchtime Rally",
      city: "Seattle, WA",
      date: "Wednesdays · 11am–2pm",
      trucks: 8,
    },
    {
      id: 3,
      name: "Night Market by the River",
      city: "Sacramento, CA",
      date: "First Saturdays · 5–11pm",
      trucks: 22,
    },
  ];

  return (
    <section
      aria-label="Upcoming food truck events"
      className="flex flex-col gap-3 text-sm text-slate-200"
    >
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--dr-primary)]">
          Events
        </h2>
        <p className="text-xs text-[#757575]">
          Discover curated food truck rallies, night markets, and office
          takeovers.
        </p>
      </div>

      <div className="mt-1 space-y-2">
        {events.map((event) => (
          <article
            key={event.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-[#e0e0e0] bg-white px-3 py-2.5 text-xs shadow-sm"
          >
            <div>
              <h3 className="font-semibold text-[var(--dr-text)]">{event.name}</h3>
              <p className="text-[#616161]">
                {event.city}
                <span className="mx-1">•</span>
                {event.date}
              </p>
            </div>
            <div className="text-right text-[11px] text-[#757575]">
              <p>{event.trucks} trucks</p>
              <p className="text-[var(--dr-primary)]">View lineup</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}




