import { sql } from "@vercel/postgres";
import {
  VendorFeature,
  VendorSubscriptionTier,
  canUseVendorFeature,
  getTierDefinition,
  normalizeVendorTier,
} from "@/lib/vendorSubscription";

export type VendorSubscriptionContext = {
  vendorId: string;
  tier: VendorSubscriptionTier;
};

export async function getVendorSubscriptionContextForUser(
  userId: string,
): Promise<VendorSubscriptionContext | null> {
  if (!userId) return null;

  const result = await sql`
    SELECT id, subscription_tier
    FROM vendors
    WHERE owner_user_id = ${userId}
    LIMIT 1
  `;

  const row = result.rows[0] as
    | { id?: string; subscription_tier?: string | null }
    | undefined;

  if (!row?.id) return null;

  return {
    vendorId: row.id,
    tier: normalizeVendorTier(row.subscription_tier),
  };
}

export function createTierForbiddenResponse(feature: VendorFeature, tier: string) {
  const tierInfo = getTierDefinition(tier);

  return Response.json(
    {
      error: "feature_not_available",
      feature,
      tier: tierInfo.code,
      message: `${tierInfo.name} (${tierInfo.tagline}) does not include this feature.`,
    },
    { status: 403 },
  );
}

export function ensureFeatureAccess(
  tier: string,
  feature: VendorFeature,
): Response | null {
  if (canUseVendorFeature(tier, feature)) {
    return null;
  }

  return createTierForbiddenResponse(feature, tier);
}
