import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

type DbVendorRow = {
  id: string;
  name: string | null;
  cuisine_style: string | null;
  primary_region: string | null;
  tagline: string | null;
  hours_text: string | null;
};

export async function GET() {
  const result = await sql<DbVendorRow>`
    SELECT id, name, cuisine_style, primary_region, tagline, hours_text
    FROM vendors
    ORDER BY created_at DESC
  `;

  const vendors = result.rows.map((row) => ({
    id: row.id,
    name: row.name ?? "Untitled venue",
    cuisine: row.cuisine_style ?? "Food truck",
    city: row.primary_region ?? "",
    tagline: row.tagline,
    todayHours: row.hours_text ?? "",
  }));

  return NextResponse.json({ vendors });
}
