import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { sql } from "@vercel/postgres";
import { getCurrentUser } from "@/lib/auth";
import {
  getTierDefinition,
  normalizeVendorTier,
  type VendorSubscriptionTier,
} from "@/lib/vendorSubscription";
import {
  getAppBaseUrl,
  getStripeClient,
  getStripePriceIdForTier,
  hasStripeSecretKey,
} from "@/lib/stripe";

type BillingSearchParams = {
  status?: string;
  tier?: string;
  error?: string;
};

const FEATURE_LABELS: Record<string, string> = {
  vendor_listing: "Public vendor listing",
  vendor_profile: "Public profile page",
  food_type: "Cuisine and service details",
  service_style: "Service style settings",
  hours: "Hours of operation",
  gps_update: "GPS and map location updates",
  social_links: "Social media links",
  website_link: "Website link",
  favorite_counter: "Favorites counter visibility",
  photo_upload: "Truck photo uploads",
  menu_upload: "Menu publishing",
  grub_reels: "Grub Reels video posts",
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function getStatusMessage(
  status: string | undefined,
  tier: string | undefined,
  error: string | undefined,
): { text: string; isError: boolean } | null {
  if (status === "success") {
    return {
      text: `Checkout completed. We are confirming your ${normalizeVendorTier(tier)} tier activation now.`,
      isError: false,
    };
  }

  if (status === "canceled") {
    return {
      text: "Checkout was canceled. No billing changes were applied.",
      isError: true,
    };
  }

  if (status === "error") {
    const detail = (error || "billing_setup_incomplete").replaceAll("_", " ");
    return {
      text: `Unable to start checkout: ${detail}.`,
      isError: true,
    };
  }

  return null;
}

export default async function VendorBillingPage({
  searchParams,
}: {
  searchParams?: Promise<BillingSearchParams>;
}) {
  noStore();

  const sp = (await (searchParams ?? Promise.resolve({}))) as BillingSearchParams;

  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const vendorResult = await sql`
    SELECT id, name, subscription_tier
    FROM vendors
    WHERE owner_user_id = ${currentUser.id}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const vendor = vendorResult.rows[0] as
    | { id: string; name: string | null; subscription_tier: string | null }
    | undefined;

  if (!vendor?.id) {
    redirect("/vendor/profile?tierStatus=missing_vendor");
  }

  const currentTier = normalizeVendorTier(vendor.subscription_tier);
  const starter = getTierDefinition("starter");
  const growth = getTierDefinition("growth");

  const statusMessage = getStatusMessage(sp.status, sp.tier, sp.error);

  async function startTierCheckout(formData: FormData) {
    "use server";

    const authedUser = await getCurrentUser();

    if (!authedUser?.id) {
      redirect("/login");
    }

    const requestedTier = normalizeVendorTier(
      (formData.get("tier") || "").toString().trim(),
    );

    const ownedVendorResult = await sql`
      SELECT id, subscription_tier
      FROM vendors
      WHERE owner_user_id = ${authedUser.id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const ownedVendor = ownedVendorResult.rows[0] as
      | { id: string; subscription_tier: string | null }
      | undefined;

    if (!ownedVendor?.id) {
      redirect("/vendor/profile?tierStatus=missing_vendor");
    }

    const currentVendorTier = normalizeVendorTier(ownedVendor.subscription_tier);

    if (currentVendorTier === requestedTier) {
      redirect(`/vendor/billing?status=error&error=already_on_${requestedTier}`);
    }

    try {
      if (!hasStripeSecretKey()) {
        redirect("/vendor/billing?status=error&error=stripe_secret_key_missing");
      }

      const stripe = getStripeClient();
      const priceId = getStripePriceIdForTier(requestedTier);
      const baseUrl = getAppBaseUrl();

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        success_url: `${baseUrl}/vendor/billing?status=success&tier=${requestedTier}`,
        cancel_url: `${baseUrl}/vendor/billing?status=canceled&tier=${requestedTier}`,
        line_items: [{
          price: priceId,
          quantity: 1,
        }],
        metadata: {
          vendorId: ownedVendor.id,
          vendorTier: requestedTier,
          source: "vendor_billing_page",
        },
        customer_email:
          typeof (authedUser as any)?.email === "string"
            ? (authedUser as any).email
            : undefined,
        allow_promotion_codes: true,
      });

      if (!session.url) {
        redirect("/vendor/billing?status=error&error=checkout_url_missing");
      }

      redirect(session.url);
    } catch (error: any) {
      // Next.js redirect() throws a framework control-flow error; do not treat it as a checkout failure.
      if (
        typeof error?.digest === "string" &&
        error.digest.startsWith("NEXT_REDIRECT")
      ) {
        throw error;
      }

      const message =
        typeof error?.message === "string"
          ? encodeURIComponent(error.message.slice(0, 120))
          : "checkout_create_failed";
      redirect(`/vendor/billing?status=error&error=${message}`);
    }
  }

  const renderTierCard = (tierCode: VendorSubscriptionTier) => {
    const def = tierCode === "starter" ? starter : growth;
    const isCurrent = currentTier === tierCode;
    const enabledFeatures = Object.entries(def.features)
      .filter(([, enabled]) => enabled)
      .map(([key]) => FEATURE_LABELS[key] || key.replaceAll("_", " "));

    return (
      <article
        key={def.code}
        className="rounded-3xl border border-[#e0e0e0] bg-white p-6 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-(--dr-primary)">
              {def.name}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">{def.tagline}</h2>
          </div>
          {isCurrent && (
            <span className="rounded-full border border-[#c8e6c9] bg-[#e8f5e9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2e7d32]">
              Current plan
            </span>
          )}
        </div>

        <p className="mt-3 text-3xl font-semibold text-foreground">
          {formatPrice(def.monthlyPriceCents)}
          <span className="ml-1 text-sm font-medium text-[#757575]">/ month</span>
        </p>

        <p className="mt-2 text-xs text-[#757575]">
          Photo limit: {def.photoUploadLimit} total photos.
        </p>

        <ul className="mt-4 space-y-2 text-sm text-[#424242]">
          {enabledFeatures.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <span aria-hidden className="text-(--dr-primary)">•</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        <form action={startTierCheckout} className="mt-6">
          <input type="hidden" name="tier" value={def.code} />
          <button
            type="submit"
            disabled={isCurrent}
            className="inline-flex w-full items-center justify-center rounded-full bg-(--dr-primary) px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white shadow-sm shadow-(--dr-primary)/40 hover:bg-(--dr-accent) disabled:cursor-not-allowed disabled:bg-[#bdbdbd]"
          >
            {isCurrent ? "Current tier" : `Select ${def.name}`}
          </button>
        </form>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-(--dr-neutral) text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-(--dr-primary)">
              Vendor billing
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-foreground">
              Choose your Delicious Route plan
            </h1>
            <p className="mt-2 text-sm text-[#616161]">
              Pick the tier that matches your growth goals. Your selected features activate
              after Stripe confirms payment.
            </p>
            {vendor.name && (
              <p className="mt-2 text-xs text-[#757575]">
                Managing billing for: <span className="font-semibold">{vendor.name}</span>
              </p>
            )}
          </div>

          <Link
            href="/vendor/profile"
            className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#757575] hover:border-(--dr-primary) hover:text-(--dr-primary)"
          >
            Back to profile
          </Link>
        </header>

        {statusMessage && (
          <div
            className={`mb-5 rounded-2xl border px-4 py-3 text-sm ${
              statusMessage.isError
                ? "border-[#ffcdd2] bg-[#ffebee] text-[#c62828]"
                : "border-[#c8e6c9] bg-[#e8f5e9] text-[#2e7d32]"
            }`}
          >
            {statusMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {renderTierCard("starter")}
          {renderTierCard("growth")}
        </div>

        <p className="mt-6 text-xs text-[#757575]">
          Secure checkout powered by Stripe. Test mode cards such as 4242 4242 4242 4242
          can be used in sandbox.
        </p>
      </div>
    </div>
  );
}
