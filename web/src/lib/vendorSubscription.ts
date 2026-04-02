export type VendorSubscriptionTier = "starter" | "growth";

export type VendorFeature =
  | "vendor_listing"
  | "vendor_profile"
  | "food_type"
  | "service_style"
  | "hours"
  | "gps_update"
  | "social_links"
  | "website_link"
  | "favorite_counter"
  | "photo_upload"
  | "menu_upload"
  | "grub_reels";

export type TierDefinition = {
  code: VendorSubscriptionTier;
  name: string;
  tagline: string;
  monthlyPriceCents: number;
  photoUploadLimit: number;
  features: Record<VendorFeature, boolean>;
};

export const VENDOR_TIER_DEFINITIONS: Record<
  VendorSubscriptionTier,
  TierDefinition
> = {
  starter: {
    code: "starter",
    name: "Starter",
    tagline: "Get discovered",
    monthlyPriceCents: 0,
    photoUploadLimit: 5,
    features: {
      vendor_listing: true,
      vendor_profile: true,
      food_type: true,
      service_style: true,
      hours: true,
      gps_update: true,
      social_links: true,
      website_link: true,
      favorite_counter: true,
      photo_upload: true,
      menu_upload: false,
      grub_reels: false,
    },
  },
  growth: {
    code: "growth",
    name: "Growth",
    tagline: "Get customers",
    monthlyPriceCents: 4900,
    photoUploadLimit: 10,
    features: {
      vendor_listing: true,
      vendor_profile: true,
      food_type: true,
      service_style: true,
      hours: true,
      gps_update: true,
      social_links: true,
      website_link: true,
      favorite_counter: true,
      photo_upload: true,
      menu_upload: true,
      grub_reels: true,
    },
  },
};

export function normalizeVendorTier(
  input: string | null | undefined,
): VendorSubscriptionTier {
  if (input === "growth") {
    return "growth";
  }
  return "starter";
}

export function getTierDefinition(
  tier: string | null | undefined,
): TierDefinition {
  const normalized = normalizeVendorTier(tier);
  return VENDOR_TIER_DEFINITIONS[normalized];
}

export function canUseVendorFeature(
  tier: string | null | undefined,
  feature: VendorFeature,
): boolean {
  return getTierDefinition(tier).features[feature];
}

export function getPhotoUploadLimit(tier: string | null | undefined): number {
  return getTierDefinition(tier).photoUploadLimit;
}
