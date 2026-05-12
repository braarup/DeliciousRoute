import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";
import { slugifyVendorName } from "@/lib/slug";

type DealRow = {
  promo_id: string;
  vendor_id: string;
  vendor_name: string | null;
  is_verified: boolean;
  city: string | null;
  cuisine: string | null;
  profile_image_path: string | null;
  title: string;
  discount_label: string | null;
  summary: string | null;
  details: string;
  terms: string | null;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  max_claims: number | null;
  claim_count: number;
};

export async function GET() {
  const result = await sql<DealRow>`
    SELECT
      vp.id AS promo_id,
      vp.vendor_id,
      v.name AS vendor_name,
      v.is_verified,
      v.primary_region AS city,
      v.cuisine_style AS cuisine,
      v.profile_image_path,
      vp.title,
      vp.discount_label,
      vp.summary,
      vp.details,
      vp.terms,
      vp.starts_at,
      vp.ends_at,
      vp.max_claims,
      COALESCE(claims.claim_count, 0) AS claim_count
    FROM vendor_promos vp
    JOIN vendors v
      ON v.id = vp.vendor_id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS claim_count
      FROM customer_promo_claims cpc
      WHERE cpc.promo_id = vp.id
    ) claims ON true
    WHERE vp.is_active = true
      AND (vp.starts_at IS NULL OR vp.starts_at <= now())
      AND (vp.ends_at IS NULL OR vp.ends_at > now())
      AND (
        vp.max_claims IS NULL
        OR COALESCE(claims.claim_count, 0) < vp.max_claims
      )
    ORDER BY
      COALESCE(vp.ends_at, now() + interval '100 years') ASC,
      vp.created_at DESC
  `;

  const deals = result.rows.map((row) => {
    const remainingClaims =
      row.max_claims == null
        ? null
        : Math.max(row.max_claims - (row.claim_count ?? 0), 0);

    return {
      promoId: row.promo_id,
      title: row.title,
      discountLabel: row.discount_label,
      summary: row.summary,
      details: row.details,
      terms: row.terms,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      maxClaims: row.max_claims,
      claimCount: row.claim_count,
      remainingClaims,
      vendor: {
        id: row.vendor_id,
        slug: slugifyVendorName(
          row.vendor_name ?? "Untitled venue",
          row.vendor_id,
        ),
        name: row.vendor_name ?? "Untitled venue",
        isVerifiedVendor: !!row.is_verified,
        city: row.city ?? "",
        cuisine: row.cuisine ?? "Food truck",
        profileImagePath: row.profile_image_path,
      },
    };
  });

  return NextResponse.json({ deals });
}
