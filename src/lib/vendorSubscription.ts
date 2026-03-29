export type VendorSubscriptionTier = "starter" | "growth" | "pro";

export type VendorFeature =
  | "vendor_profile"
  | "basic_info"
  | "daily_location_update"
  | "menu_upload"
  | "grub_reels";

export type TierDefinition = {
  code: VendorSubscriptionTier;
  name: string;
  tagline: string;
  photoUploadLimit: number;
  features: Record<VendorFeature, boolean>;
};

export const VENDOR_TIER_DEFINITIONS: Record<
  VendorSubscriptionTier,
  TierDefinition
> = {
  starter: {
    code: "starter",
    name: "Starter Tier",
    tagline: "Get Discovered",
    photoUploadLimit: 5,
    features: {
      vendor_profile: true,
      basic_info: true,
      daily_location_update: true,
      menu_upload: false,
      grub_reels: false,
    },
  },
  growth: {
    code: "growth",
    name: "Growth Tier",
    tagline: "Get Customers",
    photoUploadLimit: 10,
    features: {
      vendor_profile: true,
      basic_info: true,
      daily_location_update: true,
      menu_upload: true,
      grub_reels: true,
    },
  },
  pro: {
    code: "pro",
    name: "Pro Tier",
    tagline: "Cominate the Map",
    // Pro defaults to Growth capabilities until additional Pro-only features are defined.
    photoUploadLimit: 10,
    features: {
      vendor_profile: true,
      basic_info: true,
      daily_location_update: true,
      menu_upload: true,
      grub_reels: true,
    },
  },
};

export function normalizeVendorTier(
  input: string | null | undefined,
): VendorSubscriptionTier {
  if (input === "starter" || input === "growth" || input === "pro") {
    return input;
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

export function getPhotoUploadLimit(
  tier: string | null | undefined,
): number {
  return getTierDefinition(tier).photoUploadLimit;
}

export function canUploadAdditionalPhotos(params: {
  tier: string | null | undefined;
  existingPhotoCount: number;
  incomingPhotoCount?: number;
}): boolean {
  const incoming = params.incomingPhotoCount ?? 1;
  const limit = getPhotoUploadLimit(params.tier);
  return params.existingPhotoCount + incoming <= limit;
}
