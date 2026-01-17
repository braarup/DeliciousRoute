import { sql } from "@vercel/postgres";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { FavoriteTrucksSection } from "@/components/FavoriteTrucksSection";

async function updateCustomerProfile(formData: FormData) {
  "use server";

  const displayName = (formData.get("displayName") || "").toString().trim();
  const homeCity = (formData.get("homeCity") || "").toString().trim();
  const favoriteCuisines = (formData.get("favoriteCuisines") || "").toString().trim();
  const dietaryPreferences = (formData.get("dietaryPreferences") || "").toString().trim();
  const notificationPreferences = (formData.get("notificationPreferences") || "").toString().trim();

  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const existingResult = await sql`
    SELECT id
    FROM customer_profiles
    WHERE user_id = ${currentUser.id}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const existingId = existingResult.rows[0]?.id as string | undefined;

  if (!existingId) {
    const newId = randomUUID();

    await sql`
      INSERT INTO customer_profiles (
        id,
        user_id,
        display_name,
        home_city,
        favorite_cuisines,
        dietary_preferences,
        notification_preferences
      ) VALUES (
        ${newId},
        ${currentUser.id},
        ${displayName || null},
        ${homeCity || null},
        ${favoriteCuisines || null},
        ${dietaryPreferences || null},
        ${notificationPreferences || null}
      )
    `;
  } else {
    await sql`
      UPDATE customer_profiles
      SET
        display_name = ${displayName || null},
        home_city = ${homeCity || null},
        favorite_cuisines = ${favoriteCuisines || null},
        dietary_preferences = ${dietaryPreferences || null},
        notification_preferences = ${notificationPreferences || null},
        updated_at = now()
      WHERE id = ${existingId}
    `;
  }

  redirect("/customer/profile");
}

async function signOutCustomer() {
  "use server";

  await destroySession();
  redirect("/");
}

export default async function CustomerProfilePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const rolesResult = await sql`
    SELECT r.name
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ${currentUser.id}
  `;

  const roleNames = rolesResult.rows.map((row) =>
    (row.name as string).toLowerCase()
  );

  const isVendor = roleNames.includes("vendor_admin");
  const isConsumer = roleNames.includes("consumer");

  if (!isConsumer) {
    if (isVendor) {
      redirect("/vendor/profile");
    }

    redirect("/login");
  }

  const profileResult = await sql`
    SELECT display_name, home_city, favorite_cuisines, dietary_preferences, notification_preferences
    FROM customer_profiles
    WHERE user_id = ${currentUser.id}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const profile = profileResult.rows[0] ?? null;

  const favoritesResult = await sql`
    SELECT v.id, v.name, v.cuisine_style, v.primary_region, v.profile_image_path
    FROM favorites f
    JOIN vendors v ON v.id = f.vendor_id
    WHERE f.user_id = ${currentUser.id}
    ORDER BY f.created_at DESC
  `;

  const favoriteVendors = favoritesResult.rows as Array<{
    id: string;
    name: string | null;
    cuisine_style: string | null;
    primary_region: string | null;
    profile_image_path: string | null;
  }>;

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
              Customer profile
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--dr-text)]">
              Your Delicious Route profile
            </h1>
            <p className="mt-1 text-sm text-[#616161]">
              Save your preferences so we can surface the right trucks and reels for you.
            </p>
          </div>
          <form action={signOutCustomer} className="flex items-center">
            <button
              type="submit"
              className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#757575] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]"
            >
              Sign out
            </button>
          </form>
        </header>

        <form
          action={updateCustomerProfile}
          className="space-y-5 rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm"
        >
          <section className="space-y-3 text-sm">
            <div className="space-y-1">
              <label
                htmlFor="displayName"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Display name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                placeholder="What should we call you?"
                defaultValue={profile?.display_name ?? ""}
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="homeCity"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Home city / region
              </label>
              <input
                id="homeCity"
                name="homeCity"
                type="text"
                placeholder="e.g. Austin, TX"
                defaultValue={profile?.home_city ?? ""}
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="favoriteCuisines"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Favorite cuisines
              </label>
              <textarea
                id="favoriteCuisines"
                name="favoriteCuisines"
                rows={3}
                placeholder="Tacos, ramen, smash burgers, vegan bowls..."
                defaultValue={profile?.favorite_cuisines ?? ""}
                className="w-full resize-none rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="dietaryPreferences"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Dietary preferences
              </label>
              <textarea
                id="dietaryPreferences"
                name="dietaryPreferences"
                rows={2}
                placeholder="Gluten-free, halal, vegetarian, etc."
                defaultValue={profile?.dietary_preferences ?? ""}
                className="w-full resize-none rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="notificationPreferences"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Notification preferences
              </label>
              <textarea
                id="notificationPreferences"
                name="notificationPreferences"
                rows={2}
                placeholder="How often should we ping you about nearby trucks or favorite vendors?"
                defaultValue={profile?.notification_preferences ?? ""}
                className="w-full resize-none rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
              />
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
            >
              Save preferences
            </button>
            <p className="text-[11px] text-[#9e9e9e]">
              In a full app, this page would be tied to your logged-in account.
            </p>
          </div>
        </form>
        <FavoriteTrucksSection favoriteVendors={favoriteVendors} />
        <footer className="mt-6 border-t border-[#e0e0e0] pt-3 text-xs text-[#757575]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              © {new Date().getFullYear()} Delicious Route. Built for modern
              food truck culture.
            </p>
            <p className="text-[11px]" id="contact">
              For partnerships, email
              <span className="font-medium text-[var(--dr-text)]">
                {" "}
                hello@deliciousroute.app
              </span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
