import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const result = await sql`
      SELECT
        r.id,
        r.vendor_id,
        r.caption,
        r.created_at,
        rm.video_url,
        v.name AS vendor_name,
        v.primary_region
      FROM reels r
      JOIN reel_media rm ON rm.reel_id = r.id
      JOIN vendors v ON v.id = r.vendor_id
      WHERE r.status = 'published'
        AND r.created_at > (now() - interval '24 hours')
      ORDER BY r.created_at DESC
      LIMIT 30
    `;

    const reels = result.rows.map((row) => ({
      id: row.id as string,
      vendorId: row.vendor_id as string,
      caption: (row.caption as string | null) ?? null,
      createdAt: row.created_at as Date,
      videoUrl: row.video_url as string,
      vendorName: (row.vendor_name as string) ?? "",
      city: (row.primary_region as string) ?? "",
    }));

    return NextResponse.json({ reels });
  } catch (err) {
    console.error("Error loading reels", err);
    return NextResponse.json({ reels: [] }, { status: 200 });
  }
}
