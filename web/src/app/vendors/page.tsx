import Link from "next/link";
import { sql } from "@vercel/postgres";

type DbVendorRow = {
  id: string;
  name: string | null;
  cuisine_style: string | null;
  primary_region: string | null;
  tagline: string | null;
  hours_text: string | null;
  profile_image_path: string | null;
  day_of_week: number | null;
  open_time: any;
  close_time: any;
};

type VendorCard = {
  id: string;
  name: string | null;
  cuisine_style: string | null;
  primary_region: string | null;
  tagline: string | null;
  hours_text: string | null;
  consolidated_hours: string | null;
  isOpenNow: boolean;
  profile_image_path: string | null;
};

const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function normalizeTime(value: any): string {
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
}

function formatTimeRange(open: string, close: string): string {
  const to12h = (time: string): string => {
    if (!time) return "";
    const [hStr, mStr] = time.split(":");
    const h24 = parseInt(hStr || "0", 10);
    const m = parseInt(mStr || "0", 10);
    const suffix = h24 < 12 ? "am" : "pm";
    const h12 = ((h24 + 11) % 12) + 1;
    const minPart = m === 0 ? "" : `:${m.toString().padStart(2, "0")}`;
    return `${h12}${minPart}${suffix}`;
  };

  return `${to12h(open)} - ${to12h(close)}`;
}

function buildConsolidatedHours(
  hoursByDay: Record<number, { open: string; close: string }>,
  fallback: string | null
): string | null {
  const entries: { day: number; open: string; close: string }[] = [];

  for (let day = 0; day < 7; day++) {
    const info = hoursByDay[day];
    if (info && info.open && info.close) {
      entries.push({ day, open: info.open, close: info.close });
    }
  }

  if (entries.length === 0) {
    return fallback || null;
  }

  type Group = { start: number; end: number; open: string; close: string };
  const groups: Group[] = [];

  for (const entry of entries) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.end === entry.day - 1 &&
      last.open === entry.open &&
      last.close === entry.close
    ) {
      last.end = entry.day;
    } else {
      groups.push({ start: entry.day, end: entry.day, open: entry.open, close: entry.close });
    }
  }

  const formatDayRange = (start: number, end: number): string => {
    const startLabel = dayLabels[start].slice(0, 3);
    const endLabel = dayLabels[end].slice(0, 3);
    if (start === end) return startLabel;
    return `${startLabel}-${endLabel}`;
  };

  const parts = groups.map((g) => {
    const dayRange = formatDayRange(g.start, g.end);
    const timeRange = formatTimeRange(g.open, g.close);
    return `${dayRange} ${timeRange}`;
  });

  return parts.join(" · ");
}

function isOpenNow(hoursByDay: Record<number, { open: string; close: string }>): boolean {
  const now = new Date();
  const day = now.getDay(); // 0-6
  const current = now.toTimeString().slice(0, 5); // HH:MM

  const info = hoursByDay[day];
  if (!info) return false;

  const { open, close } = info;
  if (!open || !close) return false;

  if (open <= close) {
    // Same-day range
    return current >= open && current <= close;
  }

  // Overnight range, e.g. 20:00-02:00
  return current >= open || current <= close;
}

export default async function VendorsListPage() {
  const result = await sql<DbVendorRow>`
    SELECT
      v.id,
      v.name,
      v.cuisine_style,
      v.primary_region,
      v.tagline,
      v.hours_text,
      v.profile_image_path,
      lh.day_of_week,
      lh.open_time,
      lh.close_time
    FROM vendors v
    LEFT JOIN vendor_locations vl
      ON vl.vendor_id = v.id AND vl.is_primary = true
    LEFT JOIN location_hours lh
      ON lh.vendor_location_id = vl.id
    ORDER BY v.name, lh.day_of_week
  `;

  const vendorMap = new Map<string, VendorCard & { hoursByDay: Record<number, { open: string; close: string }> }>();

  for (const row of result.rows) {
    let entry = vendorMap.get(row.id);
    if (!entry) {
      entry = {
        id: row.id,
        name: row.name,
        cuisine_style: row.cuisine_style,
        primary_region: row.primary_region,
        tagline: row.tagline,
        hours_text: row.hours_text,
        consolidated_hours: null,
        isOpenNow: false,
        profile_image_path: row.profile_image_path,
        hoursByDay: {},
      };
      vendorMap.set(row.id, entry);
    }

    if (row.day_of_week != null) {
      const day = Number(row.day_of_week);
      const open = normalizeTime(row.open_time);
      const close = normalizeTime(row.close_time);
      if (open && close) {
        entry.hoursByDay[day] = { open, close };
      }
    }
  }

  const vendors: VendorCard[] = [];

  for (const value of vendorMap.values()) {
    const { hoursByDay, ...rest } = value;
    const consolidated = buildConsolidatedHours(hoursByDay, rest.hours_text);
    const openNow = isOpenNow(hoursByDay);
    vendors.push({ ...rest, consolidated_hours: consolidated, isOpenNow: openNow });
  }

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <header className="mb-5 flex flex-col gap-1 border-b border-[#e0e0e0] bg-white/80 px-2 pb-3 pt-2 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
            Food venues
          </p>
          <h1 className="text-2xl font-semibold text-[var(--dr-text)]">
            Food venues near you
          </h1>
          <p className="mt-1 text-sm text-[#616161]">
            This list shows vendors created through the Delicious Route signup flow.
          </p>
        </header>

        {vendors.length === 0 ? (
          <div className="mt-10 flex flex-1 items-center justify-center">
            <div className="text-center text-sm text-[#757575]">
              <p className="text-4xl">🚚</p>
              <p className="mt-2 font-medium text-[var(--dr-text)]">
                No food venues registered yet
              </p>
              <p className="mt-1 text-xs text-[#9e9e9e]">
                Once vendors sign up, they will appear here.
              </p>
            </div>
          </div>
        ) : (
          <main className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <Link
                key={vendor.id}
                href={`/vendor/${vendor.id}`}
                className="vendor-profile-card flex h-full flex-col rounded-3xl border border-[#e0e0e0] bg-white p-4 text-sm text-[#424242] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex flex-1 items-start gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-full border border-[#e0e0e0] bg-[var(--dr-neutral)]">
                    <img
                      src={
                        vendor.profile_image_path || "/deliciousroute-icon.svg"
                      }
                      alt="Vendor profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-semibold text-[var(--dr-text)]">
                      {vendor.name || "Untitled venue"}
                    </h2>

                    {vendor.cuisine_style && (
                      <p className="mt-1 text-xs text-[var(--dr-accent)]">
                        {vendor.cuisine_style}
                      </p>
                    )}

                    {vendor.primary_region && (
                      <p className="mt-1 text-xs text-[#757575]">
                        {vendor.primary_region}
                      </p>
                    )}

                    {vendor.tagline && (
                      <p className="mt-2 line-clamp-2 text-xs text-[#616161]">
                        {vendor.tagline}
                      </p>
                    )}

                    {vendor.consolidated_hours && (
                      <p className="mt-2 text-[11px] text-[#9e9e9e]">
                        <span className="font-semibold">Hours:</span> {vendor.consolidated_hours}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-[#757575]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--dr-primary)]/60 px-3 py-1 font-semibold text-[var(--dr-primary)]">
                    View profile
                    <span aria-hidden>↗</span>
                  </span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] " +
                      (vendor.isOpenNow
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-[#eeeeee] text-[#757575]")
                    }
                  >
                    {vendor.isOpenNow ? "Open" : "Closed"}
                  </span>
                </div>
              </Link>
            ))}
          </main>
        )}
      </div>
    </div>
  );
}
