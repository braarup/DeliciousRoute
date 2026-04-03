import Stripe from "stripe";
import { VendorSubscriptionTier, normalizeVendorTier } from "@/lib/vendorSubscription";

let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("stripe_secret_key_missing");
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
  });

  return stripeClient;
}

export function getStripePriceIdForTier(
  tierInput: string | null | undefined,
): string {
  const tier = normalizeVendorTier(tierInput) as VendorSubscriptionTier;

  const starterPriceId = process.env.STRIPE_PRICE_STARTER_MONTHLY || "";
  const growthPriceId = process.env.STRIPE_PRICE_GROWTH_MONTHLY || "";

  const priceId = tier === "growth" ? growthPriceId : starterPriceId;

  if (!priceId) {
    throw new Error(`stripe_price_missing_for_tier:${tier}`);
  }

  return priceId;
}

export function getAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.VERCEL_URL || "";

  if (!raw) {
    throw new Error("app_base_url_missing");
  }

  return raw.startsWith("http") ? raw : `https://${raw}`;
}
