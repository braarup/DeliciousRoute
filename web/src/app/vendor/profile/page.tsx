import { sql } from "@vercel/postgres";
import { UpdateGpsButton } from "@/components/UpdateGpsButton";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { randomUUID } from "crypto";
import { Buffer } from "buffer";
import fs from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { destroySession, getCurrentUser } from "@/lib/auth";

async function updateVendorProfile(formData: FormData) {
  "use server";

  const truckName = (formData.get("truckName") || "").toString().trim();
  const description = (formData.get("description") || "").toString().trim();
  const cuisine = (formData.get("cuisine") || "").toString().trim();
  const city = (formData.get("city") || "").toString().trim();
  const tagline = (formData.get("tagline") || "").toString().trim();
  const website = (formData.get("website") || "").toString().trim();
  const socials = (formData.get("socials") || "").toString().trim();
  const latitudeRaw = (formData.get("latitude") || "").toString().trim();
  const longitudeRaw = (formData.get("longitude") || "").toString().trim();

  const latitude = latitudeRaw ? Number(latitudeRaw) : null;
  const longitude = longitudeRaw ? Number(longitudeRaw) : null;

  const maxImageSizeBytes = 5 * 1024 * 1024; // 5MB
  const allowedImageTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/svg+xml",
  ];

  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const vendorResult = await sql`
    SELECT id, profile_image_path FROM vendors
    WHERE owner_user_id = ${currentUser.id}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const vendorRow = vendorResult.rows[0] as
    | { id: string; profile_image_path: string | null }
    | undefined;
  const vendorId = vendorRow?.id as string | undefined;

  if (!vendorId) {
    throw new Error("No vendor found to update");
  }

  const profileImageFile = formData.get("profileImage");
  let profileImagePath: string | null = null;
  let imageErrorCode: string | null = null;

  if (profileImageFile instanceof File && profileImageFile.size > 0) {
    const contentType = (profileImageFile as any).type as string | undefined;
    const isValidType = !contentType || allowedImageTypes.includes(contentType);
    const isValidSize = profileImageFile.size <= maxImageSizeBytes;

    if (isValidType && isValidSize) {
      const isOnVercel = process.env.VERCEL === "1";
      const hasBlobToken =
        !!process.env.BLOB_READ_WRITE_TOKEN ||
        !!process.env.VERCEL_BLOB_READ_WRITE_TOKEN;

      const originalName = profileImageFile.name || "upload.png";
      const extMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
      const ext = (extMatch ? extMatch[0] : ".png").toLowerCase();
      const uniqueSuffix = randomUUID();
      const fileName = `${vendorId}-${uniqueSuffix}${ext}`;

      const arrayBuffer = await profileImageFile.arrayBuffer();

      if (isOnVercel) {
        if (!hasBlobToken) {
          imageErrorCode = "storage_unavailable";
        } else {
          const blob = await put(`vendor-profile-images/${fileName}`, arrayBuffer, {
            access: "public",
            contentType: contentType || "application/octet-stream",
          });

          profileImagePath = blob.url;
        }
      } else {
        const buffer = Buffer.from(arrayBuffer);
        const uploadsDir = path.join(process.cwd(), "public", "vendor-profile-images");
        await fs.mkdir(uploadsDir, { recursive: true });

        const targetPath = `/vendor-profile-images/${fileName}`;

        const fileNameOnDisk = targetPath.replace(/^\/+/, "");
        const fullPath = path.join(process.cwd(), "public", fileNameOnDisk);
        await fs.writeFile(fullPath, buffer);

        profileImagePath = targetPath;
      }
    } else {
      imageErrorCode = "invalid_image";
    }
  }

  await sql`
    UPDATE vendors
    SET
      name = ${truckName || null},
      description = ${description || null},
      cuisine_style = ${cuisine || null},
      primary_region = ${city || null},
      tagline = ${tagline || null},
      website_url = ${website || null},
      instagram_url = ${socials || null},
      profile_image_path = COALESCE(${profileImagePath}, profile_image_path),
      updated_at = now()
    WHERE id = ${vendorId}
  `;

  // Ensure a primary location exists for this vendor so we can attach hours
  const locationResult = await sql`
    SELECT id, lat, lng
    FROM vendor_locations
    WHERE vendor_id = ${vendorId} AND is_primary = true
    ORDER BY created_at DESC
    LIMIT 1
  `;

  let locationId = locationResult.rows[0]?.id as string | undefined;

  if (!locationId) {
    const newLocationId = randomUUID();

    await sql`
      INSERT INTO vendor_locations (id, vendor_id, label, address_text, city, state, postal_code, lat, lng, is_primary)
      VALUES (
        ${newLocationId},
        ${vendorId},
        'Default location',
        NULL,
        ${city || null},
        NULL,
        NULL,
        ${latitude ?? 0},
        ${longitude ?? 0},
        true
      )
    `;

    locationId = newLocationId;
  } else if (latitude != null && longitude != null) {
    // Update coordinates if the vendor provided new ones
    await sql`
      UPDATE vendor_locations
      SET lat = ${latitude}, lng = ${longitude}
      WHERE id = ${locationId}
    `;
  }

  if (locationId) {
    // Replace existing hours for this location with the submitted schedule
    await sql`
      DELETE FROM location_hours
      WHERE vendor_location_id = ${locationId}
    `;

    for (let day = 0; day < 7; day++) {
      const openFlag = formData.get(`day_${day}_open`);
      const openTime = (formData.get(`day_${day}_open_time`) || "").toString().trim();
      const closeTime = (formData.get(`day_${day}_close_time`) || "").toString().trim();

      if (!openFlag || !openTime || !closeTime) continue;

      await sql`
        INSERT INTO location_hours (id, vendor_location_id, day_of_week, open_time, close_time)
        VALUES (
          ${randomUUID()},
          ${locationId},
          ${day},
          ${openTime},
          ${closeTime}
        )
      `;
    }
  }

  // Optional: additional gallery photos for this vendor
  const photoFiles = formData
    .getAll("photos")
    .filter((v): v is File => v instanceof File && v.size > 0);

  if (photoFiles.length > 0) {
    for (const file of photoFiles) {
      const contentType = (file as any).type as string | undefined;
      const isValidType = !contentType || allowedImageTypes.includes(contentType);
      const isValidSize = file.size <= maxImageSizeBytes;

      if (!isValidType || !isValidSize) {
        continue;
      }

      const isOnVercel = process.env.VERCEL === "1";
      const hasBlobToken =
        !!process.env.BLOB_READ_WRITE_TOKEN ||
        !!process.env.VERCEL_BLOB_READ_WRITE_TOKEN;

      const originalName = file.name || "photo.png";
      const extMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
      const ext = (extMatch ? extMatch[0] : ".png").toLowerCase();
      const uniqueSuffix = randomUUID();
      const fileName = `${vendorId}-photo-${uniqueSuffix}${ext}`;

      const arrayBuffer = await file.arrayBuffer();
      let photoUrl: string | null = null;

      if (isOnVercel) {
        if (!hasBlobToken) {
          // Skip storing photos if blob storage isn't configured
          continue;
        }

        const blob = await put(`vendor-photos/${fileName}`, arrayBuffer, {
          access: "public",
          contentType: contentType || "application/octet-stream",
        });

        photoUrl = blob.url;
      } else {
        const buffer = Buffer.from(arrayBuffer);
        const uploadsDir = path.join(
          process.cwd(),
          "public",
          "vendor-photos"
        );
        await fs.mkdir(uploadsDir, { recursive: true });

        const targetPath = `/vendor-photos/${fileName}`;

        const fileNameOnDisk = targetPath.replace(/^\/+/, "");
        const fullPath = path.join(process.cwd(), "public", fileNameOnDisk);
        await fs.writeFile(fullPath, buffer);

        photoUrl = targetPath;
      }

      if (photoUrl) {
        await sql`
          INSERT INTO vendor_media (id, vendor_id, media_type, url, sort_order)
          VALUES (${randomUUID()}, ${vendorId}, 'photo', ${photoUrl}, 0)
        `;
      }
    }
  }

  redirect(
    imageErrorCode
      ? `/vendor/profile?imageError=${encodeURIComponent(imageErrorCode)}`
      : "/vendor/profile"
  );
}

async function signOutVendor() {
  "use server";

  await destroySession();
  redirect("/");
}

async function deleteVendorPhoto(formData: FormData) {
  "use server";

  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const photoIdRaw = formData.get("photoId");
  const photoId =
    typeof photoIdRaw === "string"
      ? photoIdRaw
      : photoIdRaw
      ? photoIdRaw.toString()
      : null;

  if (!photoId) {
    redirect("/vendor/profile");
  }

  const ownedResult = await sql`
    SELECT vm.id
    FROM vendor_media vm
    JOIN vendors v ON v.id = vm.vendor_id
    WHERE vm.id = ${photoId} AND v.owner_user_id = ${currentUser.id}
    LIMIT 1
  `;

  if (ownedResult.rowCount && ownedResult.rows[0]?.id) {
    await sql`
      DELETE FROM vendor_media
      WHERE id = ${photoId}
    `;
  }

  redirect("/vendor/profile");
}

export default async function VendorProfileManagePage({
  searchParams,
}: {
  searchParams?: { imageError?: string };
}) {
  noStore();
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

  if (!isVendor) {
    redirect("/customer/profile");
  }

  const vendorResult = await sql`
    SELECT
      v.id,
      v.name,
      v.description,
      v.cuisine_style,
      v.primary_region,
      v.tagline,
      v.website_url,
      v.instagram_url,
      v.profile_image_path,
      vl.lat AS default_lat,
      vl.lng AS default_lng
    FROM vendors v
    LEFT JOIN vendor_locations vl
      ON vl.vendor_id = v.id AND vl.is_primary = true
    WHERE v.owner_user_id = ${currentUser.id}
    ORDER BY v.created_at DESC
    LIMIT 1
  `;
  const vendor = vendorResult.rows[0] ?? null;

  const vendorId = vendor?.id as string | undefined;

  let hoursByDay: Record<number, { open_time: any; close_time: any }> = {};
  let photos: any[] = [];

  if (vendorId) {
    const hoursResult = await sql`
      SELECT lh.day_of_week, lh.open_time, lh.close_time
      FROM vendor_locations vl
      JOIN location_hours lh ON lh.vendor_location_id = vl.id
      WHERE vl.vendor_id = ${vendorId}
      ORDER BY lh.day_of_week, lh.open_time
    `;

    for (const row of hoursResult.rows) {
      const day = Number((row as any).day_of_week);
      if (!(day in hoursByDay)) {
        hoursByDay[day] = {
          open_time: (row as any).open_time,
          close_time: (row as any).close_time,
        };
      }
    }

    const mediaResult = await sql`
      SELECT id, url, media_type, sort_order
      FROM vendor_media
      WHERE vendor_id = ${vendorId} AND media_type = 'photo'
      ORDER BY sort_order NULLS LAST, created_at
    `;

    photos = mediaResult.rows;
  }

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
    hours: Record<number, { open_time: any; close_time: any }>
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

    return current >= open || current <= close;
  };

  const openNow = isOpenNow(hoursByDay);

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
      // Expecting HH:MM or HH:MM:SS from Postgres TIME
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

  const imageErrorCode = searchParams?.imageError;
  const imageErrorMessage =
    imageErrorCode === "invalid_image"
      ? "Image not updated. Please upload JPEG, PNG, WEBP, GIF, or SVG up to 5MB."
      : imageErrorCode === "storage_unavailable"
      ? "Image upload is not available yet in this deployment. Ask your admin to configure Vercel Blob (VERCEL_BLOB_READ_WRITE_TOKEN)."
      : null;

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
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
          <form action={signOutVendor} className="flex items-center">
            <button
              type="submit"
              className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#757575] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]"
            >
              Sign out
            </button>
          </form>
        </header>

        <form
          action={updateVendorProfile}
          encType="multipart/form-data"
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

                <div className="mt-3 flex items-center gap-3 text-xs">
                  <div className="h-12 w-12 overflow-hidden rounded-full border border-[#e0e0e0] bg-[var(--dr-neutral)]">
                    <img
                      src={
                        (vendor as any)?.profile_image_path || "/icon_01.png"
                      }
                      alt="Vendor profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-[#757575]">
                      Profile photo
                    </p>
                    <input
                      type="file"
                      name="profileImage"
                      accept="image/*"
                      className="block text-[0.7rem] text-[#616161] file:mr-2 file:rounded-full file:border file:border-[#e0e0e0] file:bg-white file:px-2 file:py-1 file:text-[0.7rem] file:font-semibold file:uppercase file:tracking-[0.16em] file:text-[var(--dr-primary)] hover:file:border-[var(--dr-primary)] hover:file:bg-[var(--dr-primary)]/5"
                    />
                    <p className="text-[0.7rem] text-[#9e9e9e]">
                      Upload a square image. New uploads overwrite the previous photo.
                    </p>
                    {imageErrorMessage && (
                      <p className="text-[0.7rem] text-red-500">
                        {imageErrorMessage}
                      </p>
                    )}
                  </div>
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

            <div className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--dr-text)]">
                Truck photos
              </h2>
              <p className="mt-1 text-xs text-[#757575]">
                Upload extra photos of your truck or food. These will appear
                on your public Food Truck Profile for customers.
              </p>

              <div className="mt-4 space-y-2 text-sm">
                <div className="space-y-1 text-xs">
                  <label className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]">
                    Upload photos
                  </label>
                  <input
                    type="file"
                    name="photos"
                    accept="image/*"
                    multiple
                    className="block text-[0.7rem] text-[#616161] file:mr-2 file:rounded-full file:border file:border-[#e0e0e0] file:bg-white file:px-2 file:py-1 file:text-[0.7rem] file:font-semibold file:uppercase file:tracking-[0.16em] file:text-[var(--dr-primary)] hover:file:border-[var(--dr-primary)] hover:file:bg-[var(--dr-primary)]/5"
                  />
                  <p className="text-[0.7rem] text-[#9e9e9e]">
                    You can select multiple images at once. Supported types:
                    JPEG, PNG, WEBP, GIF, SVG up to 5MB each.
                  </p>
                </div>

                {photos.length > 0 && (
                  <div className="space-y-2 pt-3 text-xs lg:hidden">
                    <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-[#757575]">
                      Current truck photos
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {photos.map((photo, index) => (
                        <div
                          key={photo.id ?? photo.url ?? index}
                          className="relative overflow-hidden rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)]"
                        >
                          <img
                            src={photo.url}
                            alt="Truck photo"
                            className="h-20 w-full object-cover"
                            loading={index > 1 ? "lazy" : "eager"}
                          />
                          <button
                            type="submit"
                            formAction={deleteVendorPhoto}
                            name="photoId"
                            value={photo.id}
                            className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-black/80"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
              <div className="mt-4 space-y-2 text-sm">
                {dayLabels.map((label, index) => {
                  const existing = hoursByDay[index];
                  const defaultOpen = !!existing;
                  const defaultOpenTime = normalizeTime(existing?.open_time);
                  const defaultCloseTime = normalizeTime(existing?.close_time);

                  return (
                    <div
                      key={label}
                      className="flex flex-wrap items-center gap-2 text-xs text-[#424242]"
                    >
                      <div className="w-20 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[#757575]">
                        {label.slice(0, 3)}
                      </div>
                      <label className="flex items-center gap-1 text-[0.7rem] text-[#757575]">
                        <input
                          type="checkbox"
                          name={`day_${index}_open`}
                          defaultChecked={defaultOpen}
                          className="h-3 w-3 text-[var(--dr-primary)] focus:ring-[var(--dr-primary)]"
                        />
                        <span>Open</span>
                      </label>
                      <input
                        type="time"
                        name={`day_${index}_open_time`}
                        defaultValue={defaultOpenTime}
                        className="h-8 rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-2 text-xs text-[var(--dr-text)] focus:border-[var(--dr-primary)] focus:outline-none"
                      />
                      <span className="text-[0.7rem] text-[#9e9e9e]">to</span>
                      <input
                        type="time"
                        name={`day_${index}_close_time`}
                        defaultValue={defaultCloseTime}
                        className="h-8 rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-2 text-xs text-[var(--dr-text)] focus:border-[var(--dr-primary)] focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 rounded-2xl bg-[var(--dr-neutral)] px-3 py-2 text-[11px] text-[#616161]">
                <p className="mb-1 font-semibold text-[var(--dr-text)]">
                  Saved hours
                </p>
                {Object.keys(hoursByDay).length === 0 ? (
                  <p className="text-[11px] text-[#9e9e9e]">
                    No hours saved yet. Choose your open days and times above,
                    then hit Save changes.
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {dayLabels.map((label, index) => {
                      const entry = hoursByDay[index];
                      if (!entry) return null;

                      const openStr = to12h(normalizeTime(entry.open_time));
                      const closeStr = to12h(normalizeTime(entry.close_time));

                      return (
                        <li key={label} className="flex items-center justify-between">
                          <span className="text-[0.7rem] font-medium text-[var(--dr-text)]">
                            {label}
                          </span>
                          <span className="text-[0.7rem] text-[#616161]">
                            {openStr} – {closeStr}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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
                    defaultValue={
                      openNow && vendor?.default_lat != null
                        ? String(vendor.default_lat)
                        : ""
                    }
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
                    defaultValue={
                      openNow && vendor?.default_lng != null
                        ? String(vendor.default_lng)
                        : ""
                    }
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <p className="mt-3 text-[11px] text-[#9e9e9e]">
                Tip: you can grab coordinates by right-clicking any spot on
                Google Maps, or use your current GPS below during open hours.
              </p>

              {/* Client-side GPS updater */}
              {/* eslint-disable-next-line @next/next/no-sync-scripts */}
              {/* Button component imported at top of file */}
              <UpdateGpsButton />
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

        {photos.length > 0 && (
          <div className="mt-4 hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)] gap-5 lg:grid">
            <section className="rounded-3xl border border-[#e0e0e0] bg-white p-5 text-sm shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--dr-text)]">
                Current truck photos
              </h2>
              <p className="mt-1 text-xs text-[#757575]">
                These photos appear on your public Food Truck Profile. Remove
                any you no longer want to show.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((photo, index) => (
                  <div
                    key={photo.id ?? photo.url ?? index}
                    className="relative overflow-hidden rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)]"
                  >
                    <img
                      src={photo.url}
                      alt="Truck photo"
                      className="h-24 w-full object-cover sm:h-28"
                      loading={index > 1 ? "lazy" : "eager"}
                    />
                    <form
                      action={deleteVendorPhoto}
                      className="absolute right-1 top-1"
                    >
                      <input type="hidden" name="photoId" value={photo.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-black/80"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            </section>

            {/* Empty right column so the gallery stays left-aligned */}
            <div className="hidden lg:block" />
          </div>
        )}

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
