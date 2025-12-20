import { sql } from "@vercel/postgres";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

async function updateVendorProfile(formData: FormData) {
  "use server";

  const truckName = (formData.get("truckName") || "").toString().trim();
  const description = (formData.get("description") || "").toString().trim();
  const cuisine = (formData.get("cuisine") || "").toString().trim();
  const city = (formData.get("city") || "").toString().trim();
  const tagline = (formData.get("tagline") || "").toString().trim();
  const hours = (formData.get("hours") || "").toString().trim();
  const website = (formData.get("website") || "").toString().trim();
  const socials = (formData.get("socials") || "").toString().trim();

  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const vendorResult = await sql`
    SELECT id FROM vendors
    WHERE owner_user_id = ${currentUser.id}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const vendorId = vendorResult.rows[0]?.id as string | undefined;

  if (!vendorId) {
    throw new Error("No vendor found to update");
  }

  await sql`
    UPDATE vendors
    SET
      name = ${truckName || null},
      description = ${description || null},
      cuisine_style = ${cuisine || null},
      primary_region = ${city || null},
      tagline = ${tagline || null},
      hours_text = ${hours || null},
      website_url = ${website || null},
      instagram_url = ${socials || null},
      updated_at = now()
    WHERE id = ${vendorId}
  `;

  redirect("/vendor/profile");
}

export default async function VendorProfileManagePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const vendorResult = await sql`
    SELECT name, description, cuisine_style, primary_region, tagline, hours_text, website_url, instagram_url
    FROM vendors
    WHERE owner_user_id = ${currentUser.id}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const vendor = vendorResult.rows[0] ?? null;

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
              Vendor profile
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--dr-text)]">
              Manage my truck
            </h1>
            <p className="mt-1 text-sm text-[#616161]">
              Update how your food truck appears to customers across Delicious
              Route.
            </p>
          </div>
          <p className="mt-2 text-xs text-[#9e9e9e]">
            In production, this page would be secured behind login and
            connected to your backend.
          </p>
        </header>

        <form
          action={updateVendorProfile}
          className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)]"
        >
          {/* Left: core profile fields */}
          <section className="space-y-4">
            <div className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--dr-text)]">
                Basic info
              </h2>
              <p className="mt-1 text-xs text-[#757575]">
                These details appear on your public truck profile.
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="space-y-1">
                  <label
                    htmlFor="truckName"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Truck name
                  </label>
                  <input
                    id="truckName"
                    name="truckName"
                    type="text"
                    placeholder="e.g. La Calle Roja"
                    defaultValue={vendor?.name ?? ""}
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="cuisine"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Cuisine & style
                  </label>
                  <input
                    id="cuisine"
                    name="cuisine"
                    type="text"
                    placeholder="Birria tacos, smash burgers, plant-based bowls..."
                    defaultValue={vendor?.cuisine_style ?? ""}
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="city"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Primary city / region
                  </label>
                  <input
                    id="city"
                    name="city"
                    type="text"
                    placeholder="e.g. Austin, TX"
                    defaultValue={vendor?.primary_region ?? ""}
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="tagline"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Tagline
                  </label>
                  <input
                    id="tagline"
                    name="tagline"
                    type="text"
                    placeholder="One line that captures your truck."
                    defaultValue={vendor?.tagline ?? ""}
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="description"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    placeholder="Tell customers what makes your truck special. Menu highlights, sourcing, or story."
                    defaultValue={vendor?.description ?? ""}
                    className="w-full resize-none rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--dr-text)]">
                Links & socials
              </h2>
              <p className="mt-1 text-xs text-[#757575]">
                Optional links to help guests learn more.
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="space-y-1">
                  <label
                    htmlFor="website"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Website
                  </label>
                  <input
                    id="website"
                    name="website"
                    type="url"
                    placeholder="https://"
                    defaultValue={vendor?.website_url ?? ""}
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="socials"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Social handles
                  </label>
                  <input
                    id="socials"
                    name="socials"
                    type="text"
                    placeholder="@instagram, @tiktok, etc."
                    defaultValue={vendor?.instagram_url ?? ""}
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Right: hours and location */}
          <section className="space-y-4">
            <div className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--dr-text)]">
                Hours of operation
              </h2>
              <p className="mt-1 text-xs text-[#757575]">
                Share your usual weekly schedule. Customers will still see your
                live GPS when you&apos;re online.
              </p>

              <textarea
                id="hours"
                name="hours"
                rows={6}
                placeholder={"Mon: 11am – 3pm\nTue: 11am – 3pm\nWed: 11am – 3pm\nThu: 5pm – 10pm\nFri: 5pm – 12am"}
                defaultValue={vendor?.hours_text ?? ""}
                className="mt-4 w-full resize-none rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
              />
            </div>

            <div className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--dr-text)]">
                GPS & map settings
              </h2>
              <p className="mt-1 text-xs text-[#757575]">
                When your vendor app is connected, your GPS will update
                automatically. For now, you can set a default location.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    htmlFor="latitude"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Latitude
                  </label>
                  <input
                    id="latitude"
                    name="latitude"
                    type="text"
                    placeholder="30.2672"
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label
                    htmlFor="longitude"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Longitude
                  </label>
                  <input
                    id="longitude"
                    name="longitude"
                    type="text"
                    placeholder="-97.7431"
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <p className="mt-3 text-[11px] text-[#9e9e9e]">
                Tip: you can grab coordinates by right-clicking any spot on
                Google Maps.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
              >
                Save changes
              </button>
              <p className="text-[11px] text-[#9e9e9e]">
                Changes are now saved to your vendor record in the database.
              </p>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
