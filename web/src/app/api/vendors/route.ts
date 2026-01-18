import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getCurrentUser } from "@/lib/auth";
import { slugifyVendorName } from "@/lib/slug";

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

const dayLabels = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function getLocalDayAndTime() {
  const now = new Date();
  const timeZone = process.env.VENDOR_DEFAULT_TIMEZONE || "America/Chicago";
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value || "Sun";
  const hour = parts.find((p) => p.type === "hour")?.value || "00";
  const minute = parts.find((p) => p.type === "minute")?.value || "00";
  const dayIndexMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = dayIndexMap[weekday] ?? now.getDay();
  const current = `${hour}:${minute}`;
  return { day, current };
}

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
  const { day, current } = getLocalDayAndTime();

  const info = hoursByDay[day];
  if (!info) return false;

  const { open, close } = info;
  if (!open || !close) return false;

  if (open <= close) {
    return current >= open && current <= close;
  }

  return current >= open || current <= close;
}

export async function GET() {
  const currentUser = await getCurrentUser();

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
    ORDER BY v.created_at DESC, lh.day_of_week
  `;

  const favoritesResult = await sql<{ vendor_id: string; count: number }>`
    SELECT vendor_id, COUNT(*)::int AS count
    FROM favorites
    GROUP BY vendor_id
  `;

  const favoriteCounts = new Map<string, number>();
  for (const row of favoritesResult.rows) {
    favoriteCounts.set(row.vendor_id, row.count);
  }

  const userFavoriteVendorIds = new Set<string>();
  if (currentUser?.id) {
    const userFavoritesResult = await sql<{ vendor_id: string }>`
      SELECT vendor_id
      FROM favorites
      WHERE user_id = ${currentUser.id}
    `;

    for (const row of userFavoritesResult.rows) {
      userFavoriteVendorIds.add(row.vendor_id);
    }
  }

  const vendorMap = new Map<
    string,
    {
      id: string;
      name: string | null;
      cuisine_style: string | null;
      primary_region: string | null;
      tagline: string | null;
      hours_text: string | null;
      profile_image_path: string | null;
      hoursByDay: Record<number, { open: string; close: string }>;
    }
  >();

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

  const vendors = Array.from(vendorMap.values()).map((row) => {
    const consolidated = buildConsolidatedHours(row.hoursByDay, row.hours_text);
    const openNow = isOpenNow(row.hoursByDay);
    return {
      id: row.id,
      slug: slugifyVendorName(row.name ?? "Untitled venue", row.id),
      name: row.name ?? "Untitled venue",
      cuisine: row.cuisine_style ?? "Food truck",
      city: row.primary_region ?? "",
      tagline: row.tagline,
      todayHours: consolidated ?? "",
      isOpenNow: openNow,
      profileImagePath: row.profile_image_path ?? null,
      favoriteCount: favoriteCounts.get(row.id) ?? 0,
      isFavorited: userFavoriteVendorIds.has(row.id),
    };
  });

  return NextResponse.json({ vendors });
}
