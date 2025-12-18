import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { vendors } from "@/data/vendors";

interface VendorPageProps {
  params: Promise<{
    id: string;
  }>;
}

export function generateStaticParams() {
  return vendors.map((vendor) => ({ id: vendor.id }));
}

export default async function VendorPage({ params }: VendorPageProps) {
  const { id } = await params;
  const vendor = vendors.find((v) => v.id === id);

  if (!vendor) {
    notFound();
  }

  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${vendor.latitude},${vendor.longitude}`;

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        <header className="flex items-center justify-between gap-4 border-b border-[#e0e0e0] bg-white/90 px-3 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-sm font-semibold text-[var(--dr-text)] hover:bg-[var(--dr-neutral)]"
            >
              ←
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--dr-primary)]">
                Vendor profile
              </p>
              <h1 className="text-lg font-semibold leading-snug text-[var(--dr-text)] sm:text-xl">
                {vendor.name}
              </h1>
            </div>
          </div>
          <span className="rounded-full bg-[var(--dr-success)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--dr-success)] ring-1 ring-[var(--dr-success)]/40">
            Live GPS
          </span>
        </header>

        <main className="mt-5 grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
          {/* Left column: vendor card */}
          <section className="space-y-4">
            <div className="h-full rounded-3xl border border-[#e0e0e0] bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-[var(--dr-primary)]/40 bg-[var(--dr-neutral)]">
                  <Image
                    src={vendor.logoUrl || "/icon_01.png"}
                    alt={`${vendor.name} logo`}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[var(--dr-text)] sm:text-lg">
                    {vendor.name}
                  </h2>
                  <p className="text-xs font-medium text-[var(--dr-accent)]">
                    {vendor.cuisine}
                  </p>
                  {vendor.ownerName && (
                    <p className="mt-1 text-xs text-[#757575]">
                      Owner: {vendor.ownerName}
                    </p>
                  )}
                </div>
              </div>

              <p className="text-sm leading-relaxed text-[#424242]">
                {vendor.description}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--dr-primary)]">
                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    Website
                  </a>
                )}
                <span className="text-[#bdbdbd]">|</span>
                <a href="#menu" className="text-[#616161] hover:text-[var(--dr-primary)]">
                  Menu
                </a>
                <span className="text-[#bdbdbd]">|</span>
                <a href="#photos" className="text-[#616161] hover:text-[var(--dr-primary)]">
                  Photos
                </a>
              </div>

              {vendor.socials && (
                <p className="mt-2 text-xs text-[#616161]">
                  Social: <span className="font-medium">{vendor.socials}</span>
                </p>
              )}

              {vendor.hours && (
                <div className="mt-4">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)]/90">
                    Hours of Operation
                  </h3>
                  <div className="overflow-hidden rounded-2xl border border-[#eeeeee] bg-[var(--dr-neutral)]">
                    <table className="w-full text-left text-[11px] text-[#424242]">
                      <tbody>
                        {Object.entries(vendor.hours).map(([day, hours]) => (
                          <tr key={day} className="border-b border-[#e0e0e0] last:border-0">
                            <td className="px-3 py-1.5 text-[#9e9e9e]">{day}</td>
                            <td className="px-3 py-1.5">{hours}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--dr-accent)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--dr-accent)] shadow-sm hover:bg-[var(--dr-accent)]/5"
                >
                  <span className="mr-1.5">★</span>
                  <span className="mr-1">{vendor.likeCount ?? 0}</span>
                  Faved
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--dr-primary)] bg-white px-3 py-1.5 text-[11px] font-semibold text-[var(--dr-primary)] shadow-sm hover:bg-[var(--dr-primary)]/5"
                >
                  <span className="mr-1.5">🔖</span>
                  <span className="mr-1">{vendor.saveCount ?? 0}</span>
                  Saves
                </button>
              </div>

              <div className="mt-4">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
                >
                  Get directions
                  <span aria-hidden>↗</span>
                </a>
                <p className="mt-2 text-[11px] text-[#757575]">
                  Destination: {vendor.latitude.toFixed(4)}, {" "}
                  {vendor.longitude.toFixed(4)}
                </p>
                <p className="mt-1 text-[11px] text-[#9e9e9e]">
                  Last updated: {vendor.lastUpdated ?? "—"}
                </p>
              </div>
            </div>
          </section>

          {/* Right column: map placeholder + Grub Reels */}
          <section className="space-y-4">
            <div className="h-56 rounded-3xl border border-[#e0e0e0] bg-white p-4 text-sm text-[#424242] shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)]/90">
                Location preview
              </h3>
              <p className="mt-2 text-xs text-[#616161]">
                In a live deployment, this panel would embed an interactive
                map (Google Maps, Mapbox, etc.) centered on this truck&apos;s
                coordinates.
              </p>
              <p className="mt-2 text-xs text-[#616161]">
                Current GPS: {vendor.latitude.toFixed(4)}, {" "}
                {vendor.longitude.toFixed(4)} ({vendor.city})
              </p>
            </div>

            <section aria-label="Vendor Grub Reels" className="rounded-3xl border border-[#e0e0e0] bg-white p-4 text-sm text-[#424242] shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--dr-text)]">
                  Grub Reels
                </h3>
                <span className="rounded-full bg-[var(--dr-accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dr-accent)]">
                  Coming soon
                </span>
              </div>
              <p className="mt-2 text-xs text-[#616161]">
                Showcase short, vertical clips from this truck—sizzling tacos,
                burger smash shots, or behind-the-scenes moments from service.
              </p>
              <div className="mt-3 space-y-2 text-xs text-[#616161]">
                <div className="rounded-2xl border border-[#eeeeee] bg-[var(--dr-neutral)] px-3 py-2">
                  <p className="font-medium text-[var(--dr-text)]">
                    No reels uploaded yet.
                  </p>
                  <p className="text-[11px] text-[#9e9e9e]">
                    When this feature is connected to your backend, new reels
                    will appear here automatically.
                  </p>
                </div>
              </div>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}
