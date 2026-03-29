import { randomUUID } from "crypto";
import { sql } from "@vercel/postgres";
import { getCurrentUser } from "@/lib/auth";
import { slugifyVendorName } from "@/lib/slug";
import {
  ensureFeatureAccess,
  getVendorSubscriptionContextForUser,
} from "@/lib/vendorEntitlements";

type ReelListRow = {
  id: string;
  vendor_id: string;
  caption: string | null;
  created_at: string;
  video_url: string | null;
  vendor_name: string | null;
  city: string | null;
};

export async function GET() {
  const result = await sql`
    SELECT
      r.id,
      r.vendor_id,
      r.caption,
      r.created_at,
      rm.video_url,
      v.name AS vendor_name,
      vl.city
    FROM reels r
    LEFT JOIN reel_media rm ON rm.reel_id = r.id
    LEFT JOIN vendors v ON v.id = r.vendor_id
    LEFT JOIN vendor_locations vl
      ON vl.vendor_id = v.id
      AND vl.is_primary = TRUE
    WHERE COALESCE(r.status, 'published') = 'published'
    ORDER BY r.created_at DESC
    LIMIT 60
  `;

  const reels = (result.rows as ReelListRow[]).map((row) => ({
    id: row.id,
    vendorId: row.vendor_id,
    vendorSlug: slugifyVendorName(row.vendor_name, row.vendor_id),
    caption: row.caption,
    createdAt: row.created_at,
    videoUrl: row.video_url ?? "",
    vendorName: row.vendor_name ?? "",
    city: row.city ?? "",
    favoriteCount: 0,
    isFavorited: false,
  }));

  return Response.json({ reels });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  const userId = String((currentUser as { id?: string } | null)?.id ?? "");

  if (!userId) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const context = await getVendorSubscriptionContextForUser(userId);
  if (!context) {
    return Response.json({ error: "vendor_not_found" }, { status: 404 });
  }

  const tierResponse = ensureFeatureAccess(context.tier, "grub_reels");
  if (tierResponse) return tierResponse;

  const body = (await request.json()) as {
    caption?: string | null;
    videoUrl?: string | null;
  };

  const videoUrl = String(body.videoUrl ?? "").trim();
  const caption = typeof body.caption === "string" ? body.caption.trim() : null;

  if (!videoUrl) {
    return Response.json({ error: "missing_video_url" }, { status: 400 });
  }

  const reelId = randomUUID();
  const reelMediaId = randomUUID();

  await sql`
    INSERT INTO reels (id, vendor_id, created_by_user_id, caption, status)
    VALUES (${reelId}, ${context.vendorId}, ${userId}, ${caption}, 'published')
  `;

  await sql`
    INSERT INTO reel_media (id, reel_id, video_url)
    VALUES (${reelMediaId}, ${reelId}, ${videoUrl})
  `;

  return Response.json(
    {
      id: reelId,
      vendorId: context.vendorId,
      caption,
      videoUrl,
    },
    { status: 201 },
  );
}
