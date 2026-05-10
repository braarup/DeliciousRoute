import Link from "next/link";
import { sql } from "@vercel/postgres";
import { randomUUID } from "crypto";
import { unstable_noStore as noStore } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { FavoriteButton } from "@/components/FavoriteButton";
import { VendorMenuSection } from "@/components/VendorMenuSection";
import { slugifyVendorName } from "@/lib/slug";
import {
  canUseVendorFeature,
  getPhotoUploadLimit,
  normalizeVendorTier,
} from "@/lib/vendorSubscription";

interface PageProps {
  // In this project, params is passed as a Promise (Next 16 PPR pattern)
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

type DbVendor = {
  id: string;
  name: string | null;
  is_verified: boolean;
  subscription_tier: string | null;
  description: string | null;
  cuisine_style: string | null;
  primary_region: string | null;
  tagline: string | null;
  hours_text: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  tiktok_url: string | null;
  x_url: string | null;
  profile_image_path: string | null;
  header_image_path: string | null;
};

type DbHours = {
  day_of_week: number;
  open_time: any;
  close_time: any;
};

type DbLocation = {
  label: string | null;
  address_text: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
};

type DbReel = {
  id: string;
  caption: string | null;
  video_url: string;
  created_at: any;
};

type DbMedia = {
  url: string;
  media_type: string;
  sort_order: number | null;
};

type DbMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  is_gluten_free: boolean | null;
  is_spicy: boolean | null;
  is_vegan: boolean | null;
  is_vegetarian: boolean | null;
};

type DbActivePromo = {
  id: string;
  title: string;
  summary: string | null;
  details: string | null;
  discount_label: string | null;
  max_claims: number | null;
  ends_at: Date | string | null;
  claim_count: number;
};

type DbPromoClaim = {
  id: string;
  claim_code: string;
  status: "claimed" | "redeemed";
  claimed_at: Date | string;
  redeemed_at: Date | string | null;
};

const PROMO_CLAIM_STATUS_COPY: Record<string, string> = {
  success: "Promo claimed. Show your QR code at the truck to redeem.",
  already_claimed: "You already claimed this promo.",
  sold_out: "This promo has reached its claim limit.",
  inactive: "This promo is no longer active.",
  invalid: "Could not claim that promo. Please try again.",
  auth_required: "Sign in to claim this promo.",
  customer_only: "Promo claiming is available to customer accounts only.",
};

async function setVendorVerified(formData: FormData) {
  "use server";

  const currentUser = await getCurrentUser();
  if (!currentUser?.id) return;

  const rolesResult = await sql`
    SELECT r.name
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ${currentUser.id} AND r.name = 'super_admin'
    LIMIT 1
  `;

  if (!rolesResult.rowCount) return;

  const vendorId = (formData.get("vendorId") || "").toString().trim();
  const isVerified = formData.get("is_verified") === "true";
  const returnSlug = (formData.get("returnSlug") || "").toString().trim();

  if (!vendorId) return;

  await sql`
    UPDATE vendors
    SET is_verified = ${isVerified}, updated_at = now()
    WHERE id = ${vendorId}
  `;

  const { redirect } = await import("next/navigation");
  redirect(`/vendor/${returnSlug || vendorId}`);
}

async function claimVendorPromo(formData: FormData) {
  "use server";

  const currentUser = await getCurrentUser();
  const promoId = (formData.get("promoId") || "").toString().trim();
  const vendorId = (formData.get("vendorId") || "").toString().trim();
  const returnSlug = (formData.get("returnSlug") || "").toString().trim();
  const fallbackPath = `/vendor/${returnSlug || vendorId}`;

  const { redirect } = await import("next/navigation");
  const currentUserId = currentUser?.id?.toString();

  if (!currentUserId) {
    redirect(`/login?next=${encodeURIComponent(fallbackPath)}`);
    return;
  }

  if (!promoId || !vendorId) {
    redirect(`${fallbackPath}?promoClaimStatus=invalid`);
  }

  const userTypeResult = await sql<{ account_type: string | null }>`
    SELECT account_type
    FROM users
    WHERE id = ${currentUserId}
    LIMIT 1
  `;

  const accountType = (userTypeResult.rows[0]?.account_type || "").toLowerCase();
  if (accountType !== "customer") {
    redirect(`${fallbackPath}?promoClaimStatus=customer_only`);
  }

  const promoResult = await sql<{
    id: string;
    max_claims: number | null;
    claimed_count: number;
  }>`
    SELECT id, max_claims, claimed_count
    FROM vendor_promos
    WHERE id = ${promoId}
      AND vendor_id = ${vendorId}
      AND is_active = true
      AND (starts_at IS NULL OR starts_at <= now())
      AND (ends_at IS NULL OR ends_at > now())
    LIMIT 1
  `;

  const promo = promoResult.rows[0];
  if (!promo) {
    redirect(`${fallbackPath}?promoClaimStatus=inactive`);
  }

  const existingClaimResult = await sql<{ id: string }>`
    SELECT id
    FROM customer_promo_claims
    WHERE promo_id = ${promo.id}
      AND customer_user_id = ${currentUserId}
    LIMIT 1
  `;

  if (existingClaimResult.rowCount) {
    redirect(`${fallbackPath}?promoClaimStatus=already_claimed`);
  }

  if (promo.max_claims != null && promo.claimed_count >= promo.max_claims) {
    redirect(`${fallbackPath}?promoClaimStatus=sold_out`);
  }

  const claimCode = `DR-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;

  const claimAttemptResult = await sql<{
    slot_acquired: number;
    inserted_count: number;
  }>`
    WITH promo_slot AS (
      UPDATE vendor_promos
      SET claimed_count = claimed_count + 1,
          updated_at = now()
      WHERE id = ${promo.id}
        AND vendor_id = ${vendorId}
        AND is_active = true
        AND (starts_at IS NULL OR starts_at <= now())
        AND (ends_at IS NULL OR ends_at > now())
        AND (max_claims IS NULL OR claimed_count < max_claims)
      RETURNING id
    ),
    inserted_claim AS (
      INSERT INTO customer_promo_claims (
        id,
        promo_id,
        vendor_id,
        customer_user_id,
        claim_code,
        status,
        claimed_at
      )
      SELECT
        ${randomUUID()},
        ${promo.id},
        ${vendorId},
        ${currentUserId},
        ${claimCode},
        'claimed',
        now()
      FROM promo_slot
      ON CONFLICT (promo_id, customer_user_id) DO NOTHING
      RETURNING id
    ),
    released_slot AS (
      UPDATE vendor_promos
      SET claimed_count = GREATEST(claimed_count - 1, 0),
          updated_at = now()
      WHERE id = ${promo.id}
        AND EXISTS (SELECT 1 FROM promo_slot)
        AND NOT EXISTS (SELECT 1 FROM inserted_claim)
      RETURNING id
    )
    SELECT
      (EXISTS (SELECT 1 FROM promo_slot))::int AS slot_acquired,
      (EXISTS (SELECT 1 FROM inserted_claim))::int AS inserted_count
  `;

  const attempt = claimAttemptResult.rows[0];

  if (!attempt?.slot_acquired) {
    redirect(`${fallbackPath}?promoClaimStatus=sold_out`);
  }

  if (!attempt.inserted_count) {
    redirect(`${fallbackPath}?promoClaimStatus=already_claimed`);
  }

  redirect(`${fallbackPath}?promoClaimStatus=success`);
}

export default async function PublicVendorPage({
  params,
  searchParams,
}: PageProps) {
  noStore();
  const { id: slug } = await params;
  const queryParams = (await searchParams) || {};
  const getParam = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const promoClaimStatusParam = (getParam(queryParams.promoClaimStatus) || "")
    .toString()
    .trim();
  const promoClaimStatusMessage =
    PROMO_CLAIM_STATUS_COPY[promoClaimStatusParam] || "";
  const promoClaimStatusIsSuccess = promoClaimStatusParam === "success";

  const currentUser = await getCurrentUser();
  const slugStr = String(slug ?? "");
  const shortIdFromSlug = slugStr.includes("-")
    ? (slugStr.split("-").pop() ?? "")
    : "";

  let vendor: DbVendor | undefined;

  if (shortIdFromSlug && shortIdFromSlug.length <= 16) {
    const byIdResult = await sql<DbVendor>`
      SELECT id, name, is_verified, subscription_tier, description, cuisine_style, primary_region, tagline, hours_text, website_url, instagram_url, facebook_url, tiktok_url, x_url, profile_image_path, header_image_path
      FROM vendors
      WHERE LEFT(id::text, 8) = ${shortIdFromSlug}
      LIMIT 1
    `;
    vendor = byIdResult.rows[0];
  }

  if (!vendor) {
    const allResult = await sql<DbVendor>`
      SELECT id, name, is_verified, subscription_tier, description, cuisine_style, primary_region, tagline, hours_text, website_url, instagram_url, facebook_url, tiktok_url, x_url, profile_image_path, header_image_path
      FROM vendors
    `;

    vendor = allResult.rows.find(
      (row) => slugifyVendorName(row.name) === slugStr,
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-6">
          <header className="flex items-center justify-between gap-4 border-b border-[#e0e0e0] bg-white/90 px-3 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-sm font-semibold text-[var(--dr-text)] hover:bg-[var(--dr-neutral)]"
              >
                0
              </Link>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--dr-primary)]">
                  Food truck profile
                </p>
                <h1 className="text-lg font-semibold leading-snug text-[var(--dr-text)] sm:text-xl">
                  Truck not found
                </h1>
              </div>
            </div>
          </header>

          <main className="mt-6 flex flex-1 items-center justify-center">
            <div className="max-w-md rounded-3xl border border-[#e0e0e0] bg-white px-5 py-6 text-center text-sm text-[#616161] shadow-sm">
              <p className="text-base font-semibold text-[var(--dr-text)]">
                This food truck isn&apos;t available.
              </p>
              <p className="mt-2 text-xs">
                The link you followed may be out of date, or this vendor
                hasn&apos;t completed their public profile yet.
              </p>
              <div className="mt-4 flex justify-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2 text-white shadow-sm shadow-[var(--dr-primary)]/40 hover:bg-[var(--dr-accent)]"
                >
                  Back to home
                </Link>
                <Link
                  href="/vendors"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--dr-primary)]/50 px-4 py-2 text-[var(--dr-primary)] hover:bg-[var(--dr-primary)]/5"
                >
                  Browse vendors
                </Link>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const vendorTier = normalizeVendorTier(vendor.subscription_tier);
  const canShowMenu = canUseVendorFeature(vendorTier, "menu_upload");
  const canShowReels = canUseVendorFeature(vendorTier, "grub_reels");
  const publicPhotoLimit = getPhotoUploadLimit(vendorTier);

  const locationResult = await sql<DbLocation>`
    SELECT label, address_text, city, state, postal_code, lat, lng
    FROM vendor_locations
    WHERE vendor_id = ${vendor.id} AND is_primary = true
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const location = locationResult.rows[0] ?? null;

  let activeReel: DbReel | null = null;

  if (canShowReels) {
    const reelsResult = await sql<DbReel>`
      SELECT r.id, r.caption, rm.video_url, r.created_at
      FROM reels r
      JOIN reel_media rm ON rm.reel_id = r.id
      WHERE r.vendor_id = ${vendor.id}
        AND r.status = 'published'
        AND r.created_at > (now() - interval '24 hours')
      ORDER BY r.created_at DESC
      LIMIT 1
    `;

    activeReel = reelsResult.rows[0] ?? null;
  }

  const mediaResult = await sql<DbMedia>`
    SELECT url, media_type, sort_order
    FROM vendor_media
    WHERE vendor_id = ${vendor.id} AND media_type = 'photo'
    ORDER BY sort_order NULLS LAST, created_at
  `;

  const photos = mediaResult.rows;
  const visiblePhotos = photos.slice(0, publicPhotoLimit);

  let menuItems: DbMenuItem[] = [];

  if (canShowMenu) {
    const menuResult = await sql<{ id: string }>`
      SELECT id
      FROM menus
      WHERE vendor_id = ${vendor.id} AND is_active = true
      LIMIT 1
    `;

    const menuId = menuResult.rows[0]?.id as string | undefined;

    if (menuId) {
      const itemsResult = await sql<DbMenuItem>`
        SELECT id, name, description, price_cents, is_gluten_free, is_spicy, is_vegan, is_vegetarian
        FROM menu_items
        WHERE menu_id = ${menuId} AND is_available = true
        ORDER BY created_at
      `;

      menuItems = itemsResult.rows;
    }
  }

  const activePromoResult = await sql<DbActivePromo>`
    SELECT
      vp.id,
      vp.title,
      vp.summary,
      vp.details,
      vp.discount_label,
      vp.max_claims,
      vp.ends_at,
      COUNT(cpc.id)::int AS claim_count
    FROM vendor_promos vp
    LEFT JOIN customer_promo_claims cpc ON cpc.promo_id = vp.id
    WHERE vp.vendor_id = ${vendor.id}
      AND vp.is_active = true
      AND (vp.starts_at IS NULL OR vp.starts_at <= now())
      AND (vp.ends_at IS NULL OR vp.ends_at > now())
    GROUP BY vp.id
    ORDER BY vp.created_at DESC
    LIMIT 1
  `;

  const activePromo = activePromoResult.rows[0] ?? null;
  const promoClaimsRemaining =
    activePromo && activePromo.max_claims != null
      ? Math.max(activePromo.max_claims - (activePromo.claim_count ?? 0), 0)
      : null;

  let myPromoClaim: DbPromoClaim | null = null;
  if (activePromo && currentUser?.id) {
    const myPromoClaimResult = await sql<DbPromoClaim>`
      SELECT id, claim_code, status, claimed_at, redeemed_at
      FROM customer_promo_claims
      WHERE promo_id = ${activePromo.id}
        AND customer_user_id = ${currentUser.id}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    myPromoClaim = myPromoClaimResult.rows[0] ?? null;
  }

  let currentAccountType = "";
  if (currentUser?.id) {
    const userTypeResult = await sql<{ account_type: string | null }>`
      SELECT account_type
      FROM users
      WHERE id = ${currentUser.id}
      LIMIT 1
    `;
    currentAccountType = (
      userTypeResult.rows[0]?.account_type || ""
    ).toLowerCase();
  }

  const canCurrentUserClaimPromos = currentAccountType === "customer";

  const promoQrValue = myPromoClaim
    ? `DRPROMO:${myPromoClaim.claim_code}`
    : "";
  const promoQrUrl = promoQrValue
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
        promoQrValue,
      )}`
    : "";

  const hoursResult = await sql<DbHours>`
    SELECT lh.day_of_week, lh.open_time, lh.close_time
    FROM vendor_locations vl
    JOIN location_hours lh ON lh.vendor_location_id = vl.id
    WHERE vl.vendor_id = ${vendor.id}
    ORDER BY lh.day_of_week, lh.open_time
  `;

  const hoursByDay: Record<number, { open_time: any; close_time: any }> = {};

  for (const row of hoursResult.rows) {
    const day = Number(row.day_of_week);
    if (!(day in hoursByDay)) {
      hoursByDay[day] = {
        open_time: row.open_time,
        close_time: row.close_time,
      };
    }
  }

  const dayLabels = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const normalizeTime = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") {
      return value.slice(0, 5);
    }
    if (value instanceof Date) {
      const h = value.getHours().toString().padStart(2, "0");
      const m = value.getMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    }
    return "";
  };

  const to12h = (time: string): string => {
    if (!time) return "";
    const [hStr, mStr] = time.split(":");
    const h24 = parseInt(hStr || "0", 10);
    const m = parseInt(mStr || "0", 10);
    const suffix = h24 < 12 ? "am" : "pm";
    const h12 = ((h24 + 11) % 12) + 1;
    const minPart = m === 0 ? "" : `:${m.toString().padStart(2, "0")}`;
    return `${h12}${minPart}${suffix}`;
  };

  const getLocalDayAndTime = () => {
    const now = new Date();
    const timeZone = process.env.VENDOR_DEFAULT_TIMEZONE || "America/Chicago";
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === "weekday")?.value || "Sun";
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    const dayIndexMap: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    const day = dayIndexMap[weekday] ?? now.getDay();
    const current = `${hour}:${minute}`;
    return { day, current };
  };

  const isOpenNow = (
    hours: Record<number, { open_time: any; close_time: any }>,
  ): boolean => {
    const { day, current } = getLocalDayAndTime();
    const entry = hours[day];
    if (!entry) return false;

    const open = normalizeTime(entry.open_time);
    const close = normalizeTime(entry.close_time);
    if (!open || !close) return false;

    if (open <= close) {
      return current >= open && current <= close;
    }

    // Overnight range, e.g. 20:00-02:00
    return current >= open || current <= close;
  };

  const { day: todayIndex } = getLocalDayAndTime();
  const todayEntry = hoursByDay[todayIndex];

  const openNow = isOpenNow(hoursByDay);

  const favoriteCountResult = await sql<{ count: number }>`
    SELECT COUNT(*)::int AS count
    FROM favorites
    WHERE vendor_id = ${vendor.id}
  `;

  const favoriteCount = favoriteCountResult.rows[0]?.count ?? 0;
  let isFavoritedByCurrentUser = false;

  if (currentUser?.id) {
    const userFavoriteResult = await sql`
      SELECT 1
      FROM favorites
      WHERE user_id = ${currentUser.id} AND vendor_id = ${vendor.id}
      LIMIT 1
    `;

    isFavoritedByCurrentUser = !!userFavoriteResult.rowCount;
  }

  let isSuperAdmin = false;
  if (currentUser?.id) {
    const adminCheck = await sql`
      SELECT 1
      FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ${currentUser.id} AND r.name = 'super_admin'
      LIMIT 1
    `;
    isSuperAdmin = !!adminCheck.rowCount;
  }

  const latNumber = location?.lat != null ? Number(location.lat) : null;
  const lngNumber = location?.lng != null ? Number(location.lng) : null;
  const hasCoords =
    latNumber != null &&
    !Number.isNaN(latNumber) &&
    lngNumber != null &&
    !Number.isNaN(lngNumber);

  const showLiveGps = openNow && hasCoords;
  const isVerifiedVendor = vendor.is_verified;

  const mapsUrl = showLiveGps
    ? `https://www.google.com/maps/dir/?api=1&destination=${latNumber},${lngNumber}`
    : null;

  // Prefer a dedicated header image; fall back to profile image so
  // the header never feels empty when a photo exists.
  const headerImage = vendor.header_image_path || vendor.profile_image_path;

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8 lg:pt-6">
        <header className="relative overflow-hidden rounded-3xl border border-[#e0e0e0] px-3 py-3 shadow-sm">
          {headerImage && (
            <div className="pointer-events-none absolute inset-0 z-0">
              <img
                src={headerImage}
                alt="Vendor header"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-white/80" />
            </div>
          )}
          <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--dr-primary)]">
                  Food truck profile
                </p>
                <h1 className="relative inline-block pr-5 text-lg font-semibold leading-snug text-[var(--dr-text)] sm:text-xl">
                  {vendor.name || "Untitled venue"}
                  {isVerifiedVendor && (
                    <img
                      src="/checkverify.png"
                      alt="Verified Vendor"
                      title="Verified Vendor"
                      className="absolute right-0 top-0 h-5 w-5"
                    />
                  )}
                </h1>
                {vendor.primary_region && (
                  <p className="text-xs text-[#424242]">
                    {vendor.primary_region}
                  </p>
                )}
                {canShowMenu && (
                  <div className="absolute bottom-3 right-3 z-10 sm:bottom-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
                    <VendorMenuSection items={menuItems} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 sm:justify-end">
              <div className="flex flex-wrap items-center gap-1">
                {vendor.website_url && (
                  <a
                    href={vendor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[10px] text-[var(--dr-text)] shadow-sm hover:bg-[var(--dr-neutral)]"
                    aria-label="Website"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        className="fill-none stroke-current"
                        strokeWidth="1.6"
                      />
                      <path
                        d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"
                        className="fill-none stroke-current"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </a>
                )}
                {vendor.facebook_url && (
                  <a
                    href={vendor.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[10px] text-[#1877F2] shadow-sm hover:bg-[var(--dr-neutral)]"
                    aria-label="Facebook"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        d="M12 4c-2.2 0-4 1.8-4 4v2H6v3h2v7h3v-7h2.2l.8-3H11V8a1 1 0 0 1 1-1h3V4h-3Z"
                        className="fill-current"
                      />
                    </svg>
                  </a>
                )}
                {vendor.instagram_url && (
                  <a
                    href={vendor.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[10px] text-[#E4405F] shadow-sm hover:bg-[var(--dr-neutral)]"
                    aria-label="Instagram"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <rect
                        x="5"
                        y="5"
                        width="14"
                        height="14"
                        rx="4"
                        className="fill-none stroke-current"
                        strokeWidth="1.6"
                      />
                      <circle
                        cx="12"
                        cy="12"
                        r="3.2"
                        className="fill-none stroke-current"
                        strokeWidth="1.6"
                      />
                      <circle cx="16" cy="8" r="0.9" className="fill-current" />
                    </svg>
                  </a>
                )}
                {vendor.tiktok_url && (
                  <a
                    href={vendor.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[10px] text-[#000000] shadow-sm hover:bg-[var(--dr-neutral)]"
                    aria-label="TikTok"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        d="M15 5.5c.6.8 1.5 1.4 2.5 1.6V10a5.5 5.5 0 0 1-3-1v4.1a4.4 4.4 0 1 1-3.6-4.3V11a2.4 2.4 0 1 0 1.6 2.3V4.5H15v1Z"
                        className="fill-current"
                      />
                    </svg>
                  </a>
                )}
                {vendor.x_url && (
                  <a
                    href={vendor.x_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[10px] text-[#000000] shadow-sm hover:bg-[var(--dr-neutral)]"
                    aria-label="X"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        d="M7 5h2l3 4 3.5-4H19l-4.5 5.3L19 19h-2l-3.2-4.3L9 19H7l4.6-5.4L7 5Z"
                        className="fill-current"
                      />
                    </svg>
                  </a>
                )}
              </div>
              <Link
                href="/"
                aria-label="Back to home"
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#e0e0e0] bg-white text-base font-semibold text-[var(--dr-text)] hover:bg-[var(--dr-neutral)] sm:hidden z-20"
              >
                <span aria-hidden>×</span>
              </Link>
              <Link
                href="/"
                className="hidden items-center justify-center rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--dr-text)] hover:bg-[var(--dr-neutral)] sm:inline-flex"
              >
                Back to home
              </Link>
            </div>
          </div>
        </header>

        {isSuperAdmin && (
          <div className="mt-3 rounded-2xl border border-amber-300/50 bg-amber-50 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-700">
              DR Admin — Verification
            </p>
            <form
              action={setVendorVerified}
              className="mt-2 flex flex-wrap items-center gap-3"
            >
              <input type="hidden" name="vendorId" value={vendor.id} />
              <input type="hidden" name="returnSlug" value={slugStr} />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  name="is_verified"
                  value="true"
                  defaultChecked={vendor.is_verified}
                  className="h-4 w-4 rounded border-amber-400 accent-amber-600"
                />
                Mark as Verified Vendor
              </label>
              <button
                type="submit"
                className="rounded-full bg-amber-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-amber-700"
              >
                Save
              </button>
            </form>
          </div>
        )}

        <main className="mt-5 grid flex-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)]">
          {/* Left column: vendor info */}
          <section className="space-y-4">
            <div className="h-full rounded-3xl border border-[#e0e0e0] bg-white p-4 sm:p-5">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] shadow-sm">
                    <img
                      src={vendor.profile_image_path || "/icon_01.png"}
                      alt="Vendor profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <h2 className="relative inline-block pr-4 text-base font-semibold text-[var(--dr-text)] sm:text-lg">
                      {vendor.name || "Untitled venue"}
                      {isVerifiedVendor && (
                        <img
                          src="/checkverify.png"
                          alt="Verified Vendor"
                          title="Verified Vendor"
                          className="absolute right-0 top-0 h-4 w-4"
                        />
                      )}
                    </h2>
                    {vendor.cuisine_style && (
                      <p className="mt-1 text-xs font-medium text-[var(--dr-accent)]">
                        {vendor.cuisine_style}
                      </p>
                    )}
                    {vendor.tagline && (
                      <p className="mt-1 line-clamp-2 text-xs text-[#616161]">
                        {vendor.tagline}
                      </p>
                    )}
                  </div>
                </div>
                <FavoriteButton
                  vendorId={vendor.id}
                  initialCount={favoriteCount}
                  initialFavorited={isFavoritedByCurrentUser}
                />
              </div>

              {promoClaimStatusMessage && (
                <div
                  className={`mb-3 rounded-2xl border px-4 py-3 text-sm ${
                    promoClaimStatusIsSuccess
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }`}
                >
                  {promoClaimStatusMessage}
                </div>
              )}

              {activePromo && (
                <section className="mb-4 rounded-3xl border border-[var(--dr-primary)]/20 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--dr-primary)]">
                    Vendor promo
                  </p>
                  <h3 className="mt-1 text-2xl font-bold leading-tight text-[var(--dr-text)]">
                    {activePromo.title}
                  </h3>

                  {activePromo.discount_label && (
                    <p className="mt-2 inline-flex rounded-full bg-[var(--dr-primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--dr-primary)]">
                      {activePromo.discount_label}
                    </p>
                  )}

                  {(activePromo.summary || activePromo.details) && (
                    <p className="mt-3 text-base font-medium text-[#424242]">
                      {activePromo.summary || activePromo.details}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#616161]">
                    {promoClaimsRemaining != null && (
                      <span className="inline-flex rounded-full border border-[#e0e0e0] bg-[#fafafa] px-2.5 py-1">
                        Remaining claims: {promoClaimsRemaining}
                      </span>
                    )}
                    {activePromo.ends_at && (
                      <span className="inline-flex rounded-full border border-[#e0e0e0] bg-[#fafafa] px-2.5 py-1">
                        Expires: {new Date(activePromo.ends_at).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-[#e0e0e0] p-3.5">
                    {myPromoClaim ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)]">
                            Your claim
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[var(--dr-text)]">
                            Claim code: {myPromoClaim.claim_code}
                          </p>
                          <p className="mt-1 text-xs text-[#616161]">
                            Status: {myPromoClaim.status === "redeemed" ? "Redeemed" : "Claimed"}
                          </p>
                        </div>
                        {promoQrUrl && (
                          <img
                            src={promoQrUrl}
                            alt="Promo claim QR code"
                            className="h-24 w-24 rounded-xl border border-[#e0e0e0] bg-white p-1"
                          />
                        )}
                      </div>
                    ) : !currentUser?.id ? (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="max-w-[22ch] text-sm font-medium leading-relaxed text-[#616161]">
                          Sign in with a customer account to claim this promo.
                        </p>
                        <Link
                          href={`/login?next=${encodeURIComponent(`/vendor/${slugStr}`)}`}
                          className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-white hover:bg-[var(--dr-accent)]"
                        >
                          Sign in to claim
                        </Link>
                      </div>
                    ) : !canCurrentUserClaimPromos ? (
                      <p className="text-sm text-[#616161]">
                        Promo claiming is available to customer accounts.
                      </p>
                    ) : promoClaimsRemaining === 0 ? (
                      <p className="text-sm font-medium text-amber-700">
                        This promo is fully claimed.
                      </p>
                    ) : (
                      <form action={claimVendorPromo} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="promoId" value={activePromo.id} />
                        <input type="hidden" name="vendorId" value={vendor.id} />
                        <input type="hidden" name="returnSlug" value={slugStr} />
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-white hover:bg-[var(--dr-accent)]"
                        >
                          Claim this promo
                        </button>
                      </form>
                    )}
                  </div>
                </section>
              )}

              {todayEntry && (
                <p className="mt-1 inline-flex items-center gap-2 rounded-full bg-[var(--dr-primary)]/10 px-3 py-1 text-[11px] font-semibold text-[var(--dr-primary)]">
                  <span
                    className={
                      "h-1.5 w-1.5 rounded-full " +
                      (openNow ? "bg-emerald-500" : "bg-[#bdbdbd]")
                    }
                  />
                  <span>{openNow ? "Open now" : "Closed"}</span>
                  <span>
                    · Today: {to12h(normalizeTime(todayEntry.open_time))} –{" "}
                    {to12h(normalizeTime(todayEntry.close_time))}
                  </span>
                </p>
              )}

              {vendor.description && (
                <p className="text-sm leading-relaxed text-[#424242]">
                  {vendor.description}
                </p>
              )}

              {(Object.keys(hoursByDay).length > 0 || vendor.hours_text) && (
                <div className="mt-4">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)]/90">
                    Hours of operation
                  </h3>
                  {Object.keys(hoursByDay).length > 0 ? (
                    <ul className="space-y-0.5 text-xs text-[#616161]">
                      {dayLabels.map((label, index) => {
                        const entry = hoursByDay[index];
                        if (!entry) return null;

                        const openStr = to12h(normalizeTime(entry.open_time));
                        const closeStr = to12h(normalizeTime(entry.close_time));

                        return (
                          <li
                            key={label}
                            className="flex items-center justify-between"
                          >
                            <span className="font-medium text-[var(--dr-text)]">
                              {label}
                            </span>
                            <span>
                              {openStr} – {closeStr}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="whitespace-pre-line text-xs text-[#616161]">
                      {vendor.hours_text}
                    </p>
                  )}
                </div>
              )}

              {visiblePhotos.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)]/90">
                    Truck photos
                  </h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {visiblePhotos.map((media, index) => (
                      <div
                        key={media.url + index}
                        className="overflow-hidden rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)]"
                      >
                        <img
                          src={media.url}
                          alt="Truck photo"
                          className="h-28 w-full object-cover sm:h-32"
                          loading={index > 1 ? "lazy" : "eager"}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Right column: location & reel */}
          <section className="space-y-4">
            <div className="rounded-3xl border border-[#e0e0e0] bg-white p-4 text-sm text-[#424242] shadow-sm">
              <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)]/90">
                Location
              </h3>
              {location ? (
                <div className="mt-2 text-xs text-[#616161]">
                  {location.label && (
                    <p className="font-medium text-[var(--dr-text)]">
                      {location.label}
                    </p>
                  )}
                  {(location.address_text ||
                    location.city ||
                    location.state) && (
                    <p className="mt-1">
                      {location.address_text && (
                        <span>{location.address_text}</span>
                      )}
                      {location.city && (
                        <span>
                          {location.address_text ? ", " : ""}
                          {location.city}
                        </span>
                      )}
                      {location.state && (
                        <span>
                          {location.city ? ", " : ""}
                          {location.state}
                        </span>
                      )}
                      {location.postal_code && (
                        <span> {location.postal_code}</span>
                      )}
                    </p>
                  )}
                  {showLiveGps && latNumber != null && lngNumber != null && (
                    <p className="mt-1 text-[11px] text-[#9e9e9e]">
                      GPS: {latNumber.toFixed(4)}, {lngNumber.toFixed(4)}
                    </p>
                  )}

                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
                    >
                      Get directions
                      <span aria-hidden>↗</span>
                    </a>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-[#757575]">
                  This vendor hasn&apos;t set a default location yet. Once a
                  primary location is saved, it will appear here.
                </p>
              )}
            </div>

            {canShowReels && (
              <section
                aria-label="Vendor Grub Reel"
                className="rounded-3xl border border-[#e0e0e0] bg-white p-4 text-sm text-[#424242] shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[var(--dr-text)]">
                    Grub Reels
                  </h3>
                  {!activeReel && (
                    <span className="rounded-full bg-[var(--dr-accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--dr-accent)]">
                      No active reel
                    </span>
                  )}
                </div>
                {activeReel ? (
                  <div className="mt-2 space-y-2">
                    <div className="overflow-hidden rounded-2xl bg-black/5">
                      <video
                        src={activeReel.video_url}
                        controls
                        playsInline
                        className="h-56 w-full rounded-2xl bg-black object-cover"
                      />
                    </div>
                    {activeReel.caption && (
                      <p className="text-xs text-[#424242]">
                        {activeReel.caption}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-[#616161]">
                    This vendor hasn&apos;t posted a Grub Reel yet. Check back
                    later for fresh clips from their truck.
                  </p>
                )}
              </section>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
