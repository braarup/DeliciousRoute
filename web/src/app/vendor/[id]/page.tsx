import Link from "next/link";
import { sql } from "@vercel/postgres";
import { unstable_noStore as noStore } from "next/cache";

interface PageProps {
  // In this project, params is passed as a Promise (Next 16 PPR pattern)
  params: Promise<{ id: string }>;
}

type DbVendor = {
  id: string;
  name: string | null;
  description: string | null;
  cuisine_style: string | null;
  primary_region: string | null;
  tagline: string | null;
  hours_text: string | null;
  website_url: string | null;
  instagram_url: string | null;
};

type DbHours = {
  day_of_week: number;
  open_time: any;
  close_time: any;
};

type DbLocation = {
  label: string | null;
  address_text: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
};

export default async function PublicVendorPage({ params }: PageProps) {
  noStore();
  const { id } = await params;

  const vendorResult = await sql<DbVendor>`
    SELECT id, name, description, cuisine_style, primary_region, tagline, hours_text, website_url, instagram_url, profile_image_path
    FROM vendors
    WHERE id = ${id}
    LIMIT 1
  `;

  console.log("PublicVendorPage vendor query", {
    id,
    rowCount: vendorResult.rows.length,
    row: vendorResult.rows[0],
  });
  
  const vendor = vendorResult.rows[0];

  if (!vendor) {
    return (
      <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-6">
          <header className="flex items-center justify-between gap-4 border-b border-[#e0e0e0] bg-white/90 px-3 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-sm font-semibold text-[var(--dr-text)] hover:bg-[var(--dr-neutral)]"
              >
                0
              </Link>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--dr-primary)]">
                  Food truck profile
                </p>
                <h1 className="text-lg font-semibold leading-snug text-[var(--dr-text)] sm:text-xl">
                  Truck not found
                </h1>
              </div>
            </div>
          </header>

          <main className="mt-6 flex flex-1 items-center justify-center">
            <div className="max-w-md rounded-3xl border border-[#e0e0e0] bg-white px-5 py-6 text-center text-sm text-[#616161] shadow-sm">
              <p className="text-base font-semibold text-[var(--dr-text)]">
                This food truck isn&apos;t available.
              </p>
              <p className="mt-2 text-xs">
                The link you followed may be out of date, or this vendor hasn&apos;t completed their public profile yet.
              </p>
              <div className="mt-4 flex justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2 text-white shadow-sm shadow-[var(--dr-primary)]/40 hover:bg-[var(--dr-accent)]"
                >
                  Back to home
                </Link>
                <Link
                  href="/vendors"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--dr-primary)]/50 px-4 py-2 text-[var(--dr-primary)] hover:bg-[var(--dr-primary)]/5"
                >
                  Browse vendors
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const locationResult = await sql<DbLocation>`
    SELECT label, address_text, city, state, postal_code, lat, lng
    FROM vendor_locations
    WHERE vendor_id = ${vendor.id} AND is_primary = true
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const location = locationResult.rows[0] ?? null;

  const hoursResult = await sql<DbHours>`
    SELECT lh.day_of_week, lh.open_time, lh.close_time
    FROM vendor_locations vl
    JOIN location_hours lh ON lh.vendor_location_id = vl.id
    WHERE vl.vendor_id = ${vendor.id}
    ORDER BY lh.day_of_week, lh.open_time
  `;

  const hoursByDay: Record<number, { open_time: any; close_time: any }> = {};

  for (const row of hoursResult.rows) {
    const day = Number(row.day_of_week);
    if (!(day in hoursByDay)) {
      hoursByDay[day] = {
        open_time: row.open_time,
        close_time: row.close_time,
      };
    }
  }

  const dayLabels = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const normalizeTime = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") {
      return value.slice(0, 5);
    }
    if (value instanceof Date) {
      const h = value.getHours().toString().padStart(2, "0");
      const m = value.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    }
    return "";
  };

  const isOpenNow = (
    hours: Record<number, { open_time: any; close_time: any }>
  ): boolean => {
    const now = new Date();
    const day = now.getDay();
    const entry = hours[day];
    if (!entry) return false;

    const open = normalizeTime(entry.open_time);
    const close = normalizeTime(entry.close_time);
    if (!open || !close) return false;

    const current = now.toTimeString().slice(0, 5);

    if (open <= close) {
      return current >= open && current <= close;
    }

    // Overnight range, e.g. 20:00-02:00
    return current >= open || current <= close;
  };

  const todayIndex = new Date().getDay();
  const todayEntry = hoursByDay[todayIndex];

  const openNow = isOpenNow(hoursByDay);

  const hasCoords = location?.lat != null && location?.lng != null;
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`
    : null;

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        <header className="flex items-center justify-between gap-4 border-b border-[#e0e0e0] bg-white/90 px-3 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Link
              href="/vendors"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-sm font-semibold text-[var(--dr-text)] hover:bg-[var(--dr-neutral)]"
            >
              ←
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--dr-primary)]">
                Food truck profile
              </p>
              <h1 className="text-lg font-semibold leading-snug text-[var(--dr-text)] sm:text-xl">
                {vendor.name || "Untitled venue"}
              </h1>
              {vendor.primary_region && (
                <p className="text-xs text-[#757575]">{vendor.primary_region}</p>
              )}
            </div>
          </div>
          <Link
            href="/"
            className="hidden items-center justify-center rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--dr-text)] hover:bg-[var(--dr-neutral)] sm:inline-flex"
          >
            Back to home
          </Link>
        </header>

        <main className="mt-5 grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
          {/* Left column: vendor info */}
          <section className="space-y-4">
            <div className="h-full rounded-3xl border border-[#e0e0e0] bg-white p-4 sm:p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 overflow-hidden rounded-full border border-[#e0e0e0] bg-[var(--dr-neutral)]">
                    <img
                      src={
                        (vendor as any).profile_image_path || "/icon_01.png"
                      }
                      alt="Vendor profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-[var(--dr-text)] sm:text-lg">
                      {vendor.name || "Untitled venue"}
                    </h2>
                    {vendor.cuisine_style && (
                      <p className="mt-1 text-xs font-medium text-[var(--dr-accent)]">
                        {vendor.cuisine_style}
                      </p>
                    )}
                    {vendor.tagline && (
                      <p className="mt-2 text-xs text-[#616161]">{vendor.tagline}</p>
                    )}
                  </div>
                </div>
              </div>

              {todayEntry && (
                <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-[var(--dr-primary)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--dr-primary)]">
                  <span
                    className={
                      "h-1.5 w-1.5 rounded-full " +
                      (openNow ? "bg-emerald-500" : "bg-[#bdbdbd]")
                    }
                  />
                  <span>{openNow ? "Open now" : "Closed"}</span>
                  <span>
                    · Today: {normalizeTime(todayEntry.open_time)} – {normalizeTime(todayEntry.close_time)}
                  </span>
                </p>
              )}

              {vendor.description && (
                <p className="text-sm leading-relaxed text-[#424242]">
                  {vendor.description}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--dr-primary)]">
                {vendor.website_url && (
                  <a
                    href={vendor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:underline"
                  >
                    Website
                  </a>
                )}
                {vendor.website_url && vendor.instagram_url && (
                  <span className="text-[#bdbdbd]">|</span>
                )}
                {vendor.instagram_url && (
                  <a
                    href={vendor.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#616161] hover:text-[var(--dr-primary)]"
                  >
                    Social
                  </a>
                )}
              </div>

              {vendor.instagram_url && (
                <a
                  href={vendor.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--dr-primary)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
                >
                  Follow this vendor
                  <span aria-hidden>↗</span>
                </a>
              )}

              {(Object.keys(hoursByDay).length > 0 || vendor.hours_text) && (
                <div className="mt-4">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)]/90">
                    Hours of operation
                  </h3>
                  {Object.keys(hoursByDay).length > 0 ? (
                    <ul className="space-y-0.5 text-xs text-[#616161]">
                      {dayLabels.map((label, index) => {
                        const entry = hoursByDay[index];
                        if (!entry) return null;

                        const openStr = normalizeTime(entry.open_time);
                        const closeStr = normalizeTime(entry.close_time);

                        return (
                          <li
                            key={label}
                            className="flex items-center justify-between"
                          >
                            <span className="font-medium text-[var(--dr-text)]">
                              {label}
                            </span>
                            <span>
                              {openStr} – {closeStr}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="whitespace-pre-line text-xs text-[#616161]">
                      {vendor.hours_text}
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Right column: location & map stub */}
          <section className="space-y-4">
            <div className="rounded-3xl border border-[#e0e0e0] bg-white p-4 text-sm text-[#424242] shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)]/90">
                Location
              </h3>
              {location ? (
                <div className="mt-2 text-xs text-[#616161]">
                  {location.label && (
                    <p className="font-medium text-[var(--dr-text)]">{location.label}</p>
                  )}
                  {(location.address_text || location.city || location.state) && (
                    <p className="mt-1">
                      {location.address_text && <span>{location.address_text}</span>}
                      {location.city && (
                        <span>
                          {location.address_text ? ", " : ""}
                          {location.city}
                        </span>
                      )}
                      {location.state && (
                        <span>
                          {location.city ? ", " : ""}
                          {location.state}
                        </span>
                      )}
                      {location.postal_code && <span> {location.postal_code}</span>}
                    </p>
                  )}
                  {hasCoords && (
                    <p className="mt-1 text-[11px] text-[#9e9e9e]">
                      GPS: {location.lat?.toFixed(4)}, {location.lng?.toFixed(4)}
                    </p>
                  )}

                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
                    >
                      Get directions
                      <span aria-hidden>↗</span>
                    </a>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#757575]">
                  This vendor hasn&apos;t set a default location yet. Once a primary location is saved, it will appear here.
                </p>
              )}
            </div>

            <section
              aria-label="Vendor reels placeholder"
              className="rounded-3xl border border-[#e0e0e0] bg-white p-4 text-sm text-[#424242] shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--dr-text)]">
                  Grub Reels
                </h3>
                <span className="rounded-full bg-[var(--dr-accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dr-accent)]">
                  Coming soon
                </span>
              </div>
              <p className="mt-2 text-xs text-[#616161]">
                In a future version, this section will surface short-form video reels for this vendor, similar to the original
                Delicious Route prototype.
              </p>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}
