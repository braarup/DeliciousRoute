import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getCurrentUser } from "@/lib/auth";

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

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const lat = Number(body.lat);
    const lng = Number(body.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ error: "invalid_coords" }, { status: 400 });
    }

    const vendorResult = await sql`
      SELECT v.id, vl.id AS location_id
      FROM vendors v
      LEFT JOIN vendor_locations vl
        ON vl.vendor_id = v.id AND vl.is_primary = true
      WHERE v.owner_user_id = ${user.id}
      ORDER BY v.created_at DESC
      LIMIT 1
    `;

    const vendorRow = vendorResult.rows[0] as { id: string; location_id: string | null } | undefined;

    if (!vendorRow?.location_id) {
      return NextResponse.json({ error: "no_location" }, { status: 400 });
    }

    const hoursResult = await sql`
      SELECT day_of_week, open_time, close_time
      FROM location_hours
      WHERE vendor_location_id = ${vendorRow.location_id}
    `;

    const hoursByDay: Record<number, { open: string; close: string }> = {};
    for (const row of hoursResult.rows as any[]) {
      const day = Number(row.day_of_week);
      const open = normalizeTime(row.open_time);
      const close = normalizeTime(row.close_time);
      if (open && close) {
        hoursByDay[day] = { open, close };
      }
    }

    if (!isOpenNow(hoursByDay)) {
      return NextResponse.json({ error: "closed" }, { status: 400 });
    }

    await sql`
      UPDATE vendor_locations
      SET lat = ${lat}, lng = ${lng}
      WHERE id = ${vendorRow.location_id}
    `;

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error updating vendor GPS", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
