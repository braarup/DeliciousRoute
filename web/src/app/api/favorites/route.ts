import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as { vendorId?: string } | null;
    const vendorId = body?.vendorId;

    if (!vendorId) {
      return NextResponse.json({ error: "Missing vendorId" }, { status: 400 });
    }

    const existing = await sql`
      SELECT 1
      FROM favorites
      WHERE user_id = ${currentUser.id} AND vendor_id = ${vendorId}
      LIMIT 1
    `;

    let favorited: boolean;

    if (existing.rowCount && existing.rows[0]) {
      await sql`
        DELETE FROM favorites
        WHERE user_id = ${currentUser.id} AND vendor_id = ${vendorId}
      `;
      favorited = false;
    } else {
      await sql`
        INSERT INTO favorites (user_id, vendor_id)
        VALUES (${currentUser.id}, ${vendorId})
        ON CONFLICT DO NOTHING
      `;
      favorited = true;
    }

    const countResult = await sql<{ count: number }>`
      SELECT COUNT(*)::int AS count
      FROM favorites
      WHERE vendor_id = ${vendorId}
    `;

    const favoriteCount = countResult.rows[0]?.count ?? 0;

    return NextResponse.json({ favorited, favoriteCount });
  } catch (error) {
    console.error("Error updating favorite", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
