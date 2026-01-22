import Link from "next/link";
import { sql } from "@vercel/postgres";
import { UpdateGpsButton } from "@/components/UpdateGpsButton";
import { VendorManageMenuSection } from "@/components/VendorManageMenuSection";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { randomUUID } from "crypto";
import { Buffer } from "buffer";
import fs from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { publishInstagramReel } from "@/lib/instagram";
import { sendVendorProfileChangeEmail, sendPasswordChangedEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/bcrypt";

async function changeVendorPassword(formData: FormData) {
  "use server";

  const currentPassword = (formData.get("currentPassword") || "").toString();
  const newPassword = (formData.get("newPassword") || "").toString();
  const confirmPassword = (formData.get("confirmPassword") || "").toString();

  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const baseRedirect = "/vendor/profile";

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect(`${baseRedirect}?passwordStatus=missing_fields`);
  }

  if (newPassword.length < 8) {
    redirect(`${baseRedirect}?passwordStatus=weak_password`);
  }

  if (newPassword !== confirmPassword) {
    redirect(`${baseRedirect}?passwordStatus=mismatch`);
  }

  const userResult = await sql`
    SELECT password_hash
    FROM users
    WHERE id = ${currentUser.id}
    LIMIT 1
  `;

  const userRow = userResult.rows[0] as { password_hash: string | null } | undefined;

  if (!userRow?.password_hash) {
    redirect(`${baseRedirect}?passwordStatus=no_password`);
  }

  const ok = await verifyPassword(currentPassword, userRow.password_hash as string);

  if (!ok) {
    redirect(`${baseRedirect}?passwordStatus=invalid_current`);
  }

  if (currentPassword === newPassword) {
    redirect(`${baseRedirect}?passwordStatus=no_change`);
  }

  const newHash = await hashPassword(newPassword);

  await sql`
    UPDATE users
    SET password_hash = ${newHash}, updated_at = now()
    WHERE id = ${currentUser.id}
  `;

  const to = (currentUser as any)?.email as string | undefined;

  if (to) {
    await sendPasswordChangedEmail({
      to,
      role: "vendor",
    });
  }

  redirect(`${baseRedirect}?passwordStatus=success`);
}

async function updateVendorProfile(formData: FormData) {
  "use server";

  const truckName = (formData.get("truckName") || "").toString().trim();
  const description = (formData.get("description") || "").toString().trim();
  const cuisine = (formData.get("cuisine") || "").toString().trim();
  const city = (formData.get("city") || "").toString().trim();
  const tagline = (formData.get("tagline") || "").toString().trim();
  const website = (formData.get("website") || "").toString().trim();
  const facebook = (formData.get("facebook") || "").toString().trim();
  const instagram = (formData.get("instagram") || "").toString().trim();
  const tiktok = (formData.get("tiktok") || "").toString().trim();
  const xHandle = (formData.get("x") || "").toString().trim();
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

  const maxReelSizeBytes = 50 * 1024 * 1024; // 50MB
  const allowedReelTypes = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
  ];

  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const vendorResult = await sql`
    SELECT
      id,
      name,
      description,
      cuisine_style,
      primary_region,
      tagline,
      website_url,
      instagram_url,
      facebook_url,
      tiktok_url,
      x_url,
      profile_image_path,
      header_image_path
    FROM vendors
    WHERE owner_user_id = ${currentUser.id}
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const vendorRow = vendorResult.rows[0] as
    | {
        id: string;
        name: string | null;
        description: string | null;
        cuisine_style: string | null;
        primary_region: string | null;
        tagline: string | null;
        website_url: string | null;
        instagram_url: string | null;
        facebook_url: string | null;
        tiktok_url: string | null;
        x_url: string | null;
        profile_image_path: string | null;
        header_image_path: string | null;
      }
    | undefined;
  const vendorId = vendorRow?.id as string | undefined;

  if (!vendorId) {
    throw new Error("No vendor found to update");
  }

  const profileImageFile = formData.get("profileImage");
  const headerImageFile = formData.get("headerImage");
  let profileImagePath: string | null = null;
  let headerImagePath: string | null = null;
  let imageErrorCode: string | null = null;
  let photoErrorCode: string | null = null;
  let reelErrorCode: string | null = null;

  let basicInfoChanged = false;
  let linksChanged = false;
  let locationChanged = false;
  let hoursChanged = false;
  let profilePhotoUpdated = false;
  let headerPhotoUpdated = false;
  let galleryPhotosAdded = false;
  let reelUploaded = false;

  const normalize = (value: string | null | undefined) =>
    (value || "").trim();

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

    if (!imageErrorCode && profileImagePath) {
      profilePhotoUpdated = true;
    }
  }

  if (headerImageFile instanceof File && headerImageFile.size > 0) {
    const contentType = (headerImageFile as any).type as string | undefined;
    const isValidType = !contentType || allowedImageTypes.includes(contentType);
    const isValidSize = headerImageFile.size <= maxImageSizeBytes;

    if (isValidType && isValidSize) {
      const isOnVercel = process.env.VERCEL === "1";
      const hasBlobToken =
        !!process.env.BLOB_READ_WRITE_TOKEN ||
        !!process.env.VERCEL_BLOB_READ_WRITE_TOKEN;

      const originalName = headerImageFile.name || "header.png";
      const extMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
      const ext = (extMatch ? extMatch[0] : ".png").toLowerCase();
      const uniqueSuffix = randomUUID();
      const fileName = `${vendorId}-header-${uniqueSuffix}${ext}`;

      const arrayBuffer = await headerImageFile.arrayBuffer();

      if (isOnVercel) {
        if (!hasBlobToken) {
          imageErrorCode = imageErrorCode ?? "storage_unavailable";
        } else {
          const blob = await put(`vendor-header-images/${fileName}`, arrayBuffer, {
            access: "public",
            contentType: contentType || "application/octet-stream",
          });

          headerImagePath = blob.url;
        }
      } else {
        const buffer = Buffer.from(arrayBuffer);
        const uploadsDir = path.join(process.cwd(), "public", "vendor-header-images");
        await fs.mkdir(uploadsDir, { recursive: true });

        const targetPath = `/vendor-header-images/${fileName}`;

        const fileNameOnDisk = targetPath.replace(/^\/+/, "");
        const fullPath = path.join(process.cwd(), "public", fileNameOnDisk);
        await fs.writeFile(fullPath, buffer);
        headerImagePath = targetPath;
      }
    } else {
      imageErrorCode = imageErrorCode ?? "invalid_image";
    }

    if (!imageErrorCode && headerImagePath) {
      headerPhotoUpdated = true;
    }
  }

  if (
    normalize(truckName) !== normalize(vendorRow?.name) ||
    normalize(description) !== normalize(vendorRow?.description) ||
    normalize(cuisine) !== normalize(vendorRow?.cuisine_style) ||
    normalize(city) !== normalize(vendorRow?.primary_region) ||
    normalize(tagline) !== normalize(vendorRow?.tagline)
  ) {
    basicInfoChanged = true;
  }

  if (
    normalize(website) !== normalize(vendorRow?.website_url) ||
    normalize(instagram) !== normalize(vendorRow?.instagram_url) ||
    normalize(facebook) !== normalize(vendorRow?.facebook_url) ||
    normalize(tiktok) !== normalize(vendorRow?.tiktok_url) ||
    normalize(xHandle) !== normalize(vendorRow?.x_url)
  ) {
    linksChanged = true;
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
      instagram_url = ${instagram || null},
      facebook_url = ${facebook || null},
      tiktok_url = ${tiktok || null},
      x_url = ${xHandle || null},
      profile_image_path = COALESCE(${profileImagePath}, profile_image_path),
      header_image_path = COALESCE(${headerImagePath}, header_image_path),
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
    locationChanged = true;
  } else if (latitude != null && longitude != null) {
    // Update coordinates if the vendor provided new ones
    await sql`
      UPDATE vendor_locations
      SET lat = ${latitude}, lng = ${longitude}
      WHERE id = ${locationId}
    `;

    locationChanged = true;
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

      hoursChanged = true;
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
        photoErrorCode = photoErrorCode ?? "invalid_photo";
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
          // Surface a clear error if blob storage isn't configured
          imageErrorCode = imageErrorCode ?? "storage_unavailable";
          photoErrorCode = photoErrorCode ?? "storage_unavailable";
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

        galleryPhotosAdded = true;
      }
    }
  }

  // Optional: Grub Reel upload (single active reel per vendor)
  const reelFile = formData.get("grubReel");
  const reelCaption = (formData.get("grubReelCaption") || "").toString().trim();

  if (reelFile instanceof File && reelFile.size > 0) {
    const reelType = (reelFile as any).type as string | undefined;
    const isValidReelType = !!reelType && allowedReelTypes.includes(reelType);
    const isValidReelSize = reelFile.size <= maxReelSizeBytes;

    if (isValidReelType && isValidReelSize) {
      const isOnVercel = process.env.VERCEL === "1";
      const hasBlobToken =
        !!process.env.BLOB_READ_WRITE_TOKEN ||
        !!process.env.VERCEL_BLOB_READ_WRITE_TOKEN;

      const originalName = reelFile.name || "reel.mp4";
      const extMatch = originalName.match(/\.[a-zA-Z0-9]+$/);
      const ext = (extMatch ? extMatch[0] : ".mp4").toLowerCase();
      const uniqueSuffix = randomUUID();
      const fileName = `${vendorId}-reel-${uniqueSuffix}${ext}`;

      const arrayBuffer = await reelFile.arrayBuffer();
      let videoUrl: string | null = null;

      if (isOnVercel) {
        if (hasBlobToken) {
          const blob = await put(`vendor-reels/${fileName}`, arrayBuffer, {
            access: "public",
            contentType: reelType || "application/octet-stream",
          });
          videoUrl = blob.url;
        } else {
          // Surface a clear error if blob storage isn't configured
          imageErrorCode = imageErrorCode ?? "storage_unavailable";
          reelErrorCode = reelErrorCode ?? "storage_unavailable";
        }
      } else {
        const buffer = Buffer.from(arrayBuffer);
        const uploadsDir = path.join(process.cwd(), "public", "vendor-reels");
        await fs.mkdir(uploadsDir, { recursive: true });

        const targetPath = `/vendor-reels/${fileName}`;
        const fileNameOnDisk = targetPath.replace(/^\/+/, "");
        const fullPath = path.join(process.cwd(), "public", fileNameOnDisk);
        await fs.writeFile(fullPath, buffer);

        videoUrl = targetPath;
      }

      if (videoUrl) {
        // Remove any existing reels for this vendor (only one active reel)
        await sql`
          DELETE FROM reels
          WHERE vendor_id = ${vendorId}
        `;

        const reelId = randomUUID();

        await sql`
          INSERT INTO reels (id, vendor_id, created_by_user_id, caption, status, created_at)
          VALUES (${reelId}, ${vendorId}, ${currentUser.id}, ${reelCaption || null}, 'published', now())
        `;

        await sql`
          INSERT INTO reel_media (id, reel_id, video_url)
          VALUES (${randomUUID()}, ${reelId}, ${videoUrl})
        `;

        // Fire-and-forget: try to publish this reel to Instagram
        publishInstagramReel({
          videoUrl,
          caption: reelCaption || null,
        }).catch((error) => {
          console.error("Instagram Reel publish failed", error);
        });

        // Optional cleanup of expired reels globally
        await sql`
          DELETE FROM reels
          WHERE created_at < (now() - interval '24 hours')
        `;

        reelUploaded = true;
      }
    } else {
      // Invalid reel type or size
      reelErrorCode = reelErrorCode ?? "invalid_reel";
    }
  }

  const params = new URLSearchParams();
  if (imageErrorCode) {
    params.set("imageError", imageErrorCode);
  }
  if (photoErrorCode) {
    params.set("photoError", photoErrorCode);
  }
  if (reelErrorCode) {
    params.set("reelError", reelErrorCode);
  }
  const to = (currentUser as any)?.email as string | undefined;
  const changes: string[] = [];

  type AuditEvent = { event_type: string; description: string };
  const auditEvents: AuditEvent[] = [];

  if (basicInfoChanged) {
    const description =
      "Updated basic truck profile details (name, cuisine, city, tagline, description).";
    changes.push(description);
    auditEvents.push({ event_type: "basic_info_updated", description });
  }
  if (linksChanged) {
    const description = "Updated website and/or social links.";
    changes.push(description);
    auditEvents.push({ event_type: "links_updated", description });
  }
  if (locationChanged) {
    const description = "Updated primary location and/or GPS coordinates.";
    changes.push(description);
    auditEvents.push({ event_type: "location_updated", description });
  }
  if (hoursChanged) {
    const description = "Updated open hours schedule.";
    changes.push(description);
    auditEvents.push({ event_type: "hours_updated", description });
  }
  if (profilePhotoUpdated) {
    const description = "Updated profile photo.";
    changes.push(description);
    auditEvents.push({ event_type: "profile_photo_updated", description });
  }
  if (headerPhotoUpdated) {
    const description = "Updated header/cover photo.";
    changes.push(description);
    auditEvents.push({ event_type: "header_photo_updated", description });
  }
  if (galleryPhotosAdded) {
    const description = "Added one or more gallery photos.";
    changes.push(description);
    auditEvents.push({ event_type: "gallery_photos_added", description });
  }
  if (reelUploaded) {
    const description = "Uploaded a new Grub Reel.";
    changes.push(description);
    auditEvents.push({ event_type: "grub_reel_uploaded", description });
  }

  if (auditEvents.length > 0) {
    for (const event of auditEvents) {
      await sql`
        INSERT INTO vendor_audit_events (id, vendor_id, user_id, event_type, description)
        VALUES (${randomUUID()}, ${vendorId}, ${currentUser.id}, ${event.event_type}, ${event.description})
      `;
    }
  }

  if (to && changes.length > 0) {
    await sendVendorProfileChangeEmail({
      to,
      vendorName: vendorRow?.name || null,
      changes,
    });
  }

  redirect(params.toString() ? `/vendor/profile?${params.toString()}` : "/vendor/profile");
}

async function signOutVendor() {
  "use server";

  await destroySession();
  redirect("/");
}

async function addMenuItem(formData: FormData) {
  "use server";

  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const title = (formData.get("menuItemTitle") || "").toString().trim();
  const description = (formData.get("menuItemDescription") || "").toString().trim();
  const priceRaw = (formData.get("menuItemPrice") || "").toString().trim();

  if (!title) {
    redirect("/vendor/profile");
  }

  const priceNumber = priceRaw ? Number(priceRaw.replace(/[^0-9.]/g, "")) : NaN;
  const priceCents = Number.isFinite(priceNumber)
    ? Math.round(priceNumber * 100)
    : null;

  const isGlutenFree = !!formData.get("menuItemGlutenFree");
  const isSpicy = !!formData.get("menuItemSpicy");
  const isVegan = !!formData.get("menuItemVegan");
  const isVegetarian = !!formData.get("menuItemVegetarian");

  const fromManageMenuModal =
    (formData.get("fromManageMenuModal") || "").toString() === "1";

  const vendorResult = await sql`
    SELECT id
    FROM vendors
    WHERE owner_user_id = ${currentUser.id}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const vendorId = vendorResult.rows[0]?.id as string | undefined;

  if (!vendorId) {
    redirect("/vendor/profile");
  }

  const menuResult = await sql`
    SELECT id
    FROM menus
    WHERE vendor_id = ${vendorId} AND is_active = true
    LIMIT 1
  `;

  let menuId = menuResult.rows[0]?.id as string | undefined;

  if (!menuId) {
    menuId = randomUUID();
    await sql`
      INSERT INTO menus (id, vendor_id, name, is_active)
      VALUES (${menuId}, ${vendorId}, 'Main Menu', true)
    `;
  }

  const menuItemId = randomUUID();

  await sql`
    INSERT INTO menu_items (
      id,
      menu_id,
      name,
      description,
      price_cents,
      is_available,
      is_gluten_free,
      is_spicy,
      is_vegan,
      is_vegetarian
    ) VALUES (
      ${menuItemId},
      ${menuId},
      ${title},
      ${description || null},
      ${priceCents},
      true,
      ${isGlutenFree},
      ${isSpicy},
      ${isVegan},
      ${isVegetarian}
    )
  `;

  if (!fromManageMenuModal) {
    redirect("/vendor/profile");
  }

  return {
    id: menuItemId,
    name: title,
    description: description || null,
    price_cents: priceCents,
    is_gluten_free: isGlutenFree,
    is_spicy: isSpicy,
    is_vegan: isVegan,
    is_vegetarian: isVegetarian,
  };
}

async function deleteMenuItem(formData: FormData) {
  "use server";

  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const rawId = formData.get("menuItemId");
  const menuItemId =
    typeof rawId === "string" ? rawId : rawId ? rawId.toString() : null;

  if (!menuItemId) {
    redirect("/vendor/profile");
  }

  const vendorResult = await sql`
    SELECT id
    FROM vendors
    WHERE owner_user_id = ${currentUser.id}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const vendorId = vendorResult.rows[0]?.id as string | undefined;

  if (!vendorId) {
    redirect("/vendor/profile");
  }

  await sql`
    DELETE FROM menu_items
    WHERE id = ${menuItemId}
      AND menu_id IN (
        SELECT id FROM menus WHERE vendor_id = ${vendorId}
      )
  `;

  const fromManageMenuModal =
    (formData.get("fromManageMenuModal") || "").toString() === "1";

  if (!fromManageMenuModal) {
    redirect("/vendor/profile");
  }

  return { ok: true };
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
  searchParams?: {
    imageError?: string;
    photoError?: string;
    reelError?: string;
    passwordStatus?: string;
  };
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
      v.facebook_url,
      v.tiktok_url,
      v.x_url,
      v.profile_image_path,
      v.header_image_path,
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
  let currentReel: any | null = null;
  let menuItems: Array<{
    id: string;
    name: string;
    description: string | null;
    price_cents: number | null;
    is_gluten_free: boolean | null;
    is_spicy: boolean | null;
    is_vegan: boolean | null;
    is_vegetarian: boolean | null;
  }> = [];

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

    const reelResult = await sql`
      SELECT r.id, r.caption, r.created_at
      FROM reels r
      WHERE r.vendor_id = ${vendorId}
        AND r.status = 'published'
        AND r.created_at > (now() - interval '24 hours')
      ORDER BY r.created_at DESC
      LIMIT 1
    `;

    currentReel = reelResult.rows[0] ?? null;

    const menuResult = await sql<{ id: string }>`
      SELECT id
      FROM menus
      WHERE vendor_id = ${vendorId} AND is_active = true
      LIMIT 1
    `;

    const menuId = menuResult.rows[0]?.id as string | undefined;

    if (menuId) {
      const itemsResult = await sql<{
        id: string;
        name: string;
        description: string | null;
        price_cents: number | null;
        is_gluten_free: boolean | null;
        is_spicy: boolean | null;
        is_vegan: boolean | null;
        is_vegetarian: boolean | null;
      }>`
        SELECT id, name, description, price_cents, is_gluten_free, is_spicy, is_vegan, is_vegetarian
        FROM menu_items
        WHERE menu_id = ${menuId} AND is_available = true
        ORDER BY created_at
      `;

      menuItems = itemsResult.rows;
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

  const imageErrorCode = searchParams?.imageError;
  const imageErrorMessage =
    imageErrorCode === "invalid_image"
      ? "Image not updated. Please upload JPEG, PNG, WEBP, GIF, or SVG up to 5MB."
      : imageErrorCode === "storage_unavailable"
      ? "Image upload is not available yet in this deployment. Ask your admin to configure Vercel Blob (VERCEL_BLOB_READ_WRITE_TOKEN)."
      : null;

  const photoErrorCodeFromQuery = searchParams?.photoError;
  const photoErrorMessage =
    photoErrorCodeFromQuery === "invalid_photo"
      ? "Photo not uploaded. Please upload JPEG, PNG, WEBP, GIF, or SVG up to 5MB."
      : photoErrorCodeFromQuery === "storage_unavailable"
      ? "Photo upload is not available yet in this deployment. Ask your admin to configure Vercel Blob."
      : null;

  const reelErrorCodeFromQuery = searchParams?.reelError;
  const reelErrorMessage =
    reelErrorCodeFromQuery === "invalid_reel"
      ? "Video not uploaded. Please upload MP4, WebM, or QuickTime (MOV) up to 50MB."
      : reelErrorCodeFromQuery === "storage_unavailable"
      ? "Grub Reel upload is not available yet in this deployment. Ask your admin to configure Vercel Blob."
      : null;

  const passwordStatus = searchParams?.passwordStatus;
  const passwordMessage =
    passwordStatus === "success"
      ? "Your password has been updated."
      : passwordStatus === "missing_fields"
      ? "Please fill in your current password, new password, and confirmation."
      : passwordStatus === "weak_password"
      ? "Please choose a stronger password with at least 8 characters."
      : passwordStatus === "mismatch"
      ? "New password and confirmation do not match."
      : passwordStatus === "invalid_current"
      ? "Your current password was incorrect."
      : passwordStatus === "no_password"
      ? "We couldnt find an existing password for this account. Try resetting it from the login page instead."
      : passwordStatus === "no_change"
      ? "Your new password must be different from your current password."
      : null;
  const passwordIsError =
    !!passwordStatus && passwordStatus !== "success";

  const formatPrice = (priceCents: number | null) => {
    if (priceCents == null) return "";
    const dollars = (priceCents / 100).toFixed(2);
    return `$${dollars}`;
  };

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
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#757575] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]"
            >
              Back home
            </Link>
            <form action={signOutVendor} className="flex items-center">
              <button
                type="submit"
                className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#757575] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]"
              >
                Sign out
              </button>
            </form>
          </div>
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

              <div className="mt-4 space-y-1 text-xs">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-[#757575]">
                  Header image (banner)
                </p>
                <input
                  type="file"
                  name="headerImage"
                  accept="image/*"
                  className="block text-[0.7rem] text-[#616161] file:mr-2 file:rounded-full file:border file:border-[#e0e0e0] file:bg-white file:px-2 file:py-1 file:text-[0.7rem] file:font-semibold file:uppercase file:tracking-[0.16em] file:text-[var(--dr-primary)] hover:file:border-[var(--dr-primary)] hover:file:bg-[var(--dr-primary)]/5"
                />
                <p className="text-[0.7rem] text-[#9e9e9e]">
                  Recommended size: at least 1440×240 pixels, in a wide
                  landscape format (16:3). JPEG or PNG, up to 5MB. This image
                  appears behind your Food Truck Profile header.
                </p>
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
                    htmlFor="facebook"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Facebook URL
                  </label>
                  <input
                    id="facebook"
                    name="facebook"
                    type="url"
                    placeholder="https://facebook.com/yourtruck"
                    defaultValue={(vendor as any)?.facebook_url ?? ""}
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="instagram"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Instagram URL
                  </label>
                  <input
                    id="instagram"
                    name="instagram"
                    type="url"
                    placeholder="https://instagram.com/yourtruck"
                    defaultValue={vendor?.instagram_url ?? ""}
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="tiktok"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    TikTok URL
                  </label>
                  <input
                    id="tiktok"
                    name="tiktok"
                    type="url"
                    placeholder="https://www.tiktok.com/@yourtruck"
                    defaultValue={(vendor as any)?.tiktok_url ?? ""}
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="x"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    X (Twitter) URL
                  </label>
                  <input
                    id="x"
                    name="x"
                    type="url"
                    placeholder="https://x.com/yourtruck"
                    defaultValue={(vendor as any)?.x_url ?? ""}
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
                  {photoErrorMessage && (
                    <p className="text-[0.7rem] text-red-500">
                      {photoErrorMessage}
                    </p>
                  )}
                </div>

                {photos.length > 0 && (
                  <div className="space-y-3 pt-3 text-xs">
                    <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-[#757575]">
                      Current truck photos
                    </p>
                    <p className="text-[0.7rem] text-[#9e9e9e]">
                      These photos appear on your public Food Truck Profile. Remove any you no longer want to show.
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {photos.map((photo, index) => (
                        <div
                          key={photo.id ?? photo.url ?? index}
                          className="relative overflow-hidden rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)]"
                        >
                          <img
                            src={photo.url}
                            alt="Truck photo"
                            className="h-20 w-full object-cover sm:h-24"
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

          {/* Right: menu, hours and location */}
          <section className="space-y-4">
            <VendorManageMenuSection
              items={menuItems}
              addMenuItem={addMenuItem}
              deleteMenuItem={deleteMenuItem}
            />
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
                Grub Reel
              </h2>
              <p className="mt-1 text-xs text-[#757575]">
                Upload a short vertical video to feature on the Grub Reels tab
                and your vendor profile. Each reel stays live for 24 hours,
                then disappears.
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="space-y-1 text-xs">
                  <label
                    htmlFor="grubReel"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Upload Grub Reel
                  </label>
                  <input
                    id="grubReel"
                    type="file"
                    name="grubReel"
                    accept="video/mp4,video/webm,video/quicktime"
                    className="block text-[0.7rem] text-[#616161] file:mr-2 file:rounded-full file:border file:border-[#e0e0e0] file:bg-white file:px-2 file:py-1 file:text-[0.7rem] file:font-semibold file:uppercase file:tracking-[0.16em] file:text-[var(--dr-primary)] hover:file:border-[var(--dr-primary)] hover:file:bg-[var(--dr-primary)]/5"
                  />
                  <p className="text-[0.7rem] text-[#9e9e9e]">
                    Allowed types: MP4, WebM, or QuickTime (MOV) up to 50MB.
                    Uploading a new reel replaces any previous one.
                  </p>
                </div>

                <div className="space-y-1 text-xs">
                  <label
                    htmlFor="grubReelCaption"
                    className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                  >
                    Reel caption (optional)
                  </label>
                  <input
                    id="grubReelCaption"
                    name="grubReelCaption"
                    type="text"
                    placeholder="e.g. Midnight birria tacos on 6th Street tonight"
                    className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  />
                </div>

                {reelErrorMessage && (
                  <p className="text-[0.7rem] text-red-500">
                    {reelErrorMessage}
                  </p>
                )}

                {currentReel && (
                  <div className="mt-2 rounded-2xl bg-[var(--dr-neutral)] px-3 py-2 text-[11px] text-[#616161]">
                    <p className="font-semibold text-[var(--dr-text)]">
                      Active Grub Reel
                    </p>
                    <p className="mt-1">
                      Your latest reel is live in Grub Reels and on your
                      profile. It will be removed automatically 24 hours after
                      upload.
                    </p>
                    {currentReel.caption && (
                      <p className="mt-1 italic">“{currentReel.caption}”</p>
                    )}
                  </div>
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

        {false && photos.length > 0 && null}

        <section className="mt-6 rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--dr-text)]">
            Account security
          </h2>
          <p className="mt-1 text-xs text-[#757575]">
            Change the password you use to sign in to Delicious Route.
          </p>

          {passwordMessage && (
            <div
              className={`mt-3 rounded-2xl px-3 py-2 text-[11px] ${
                passwordIsError
                  ? "border border-[#ffcdd2] bg-[#ffebee] text-[#c62828]"
                  : "border border-[#c8e6c9] bg-[#e8f5e9] text-[#2e7d32]"
              }`}
            >
              {passwordMessage}
            </div>
          )}

          <form
            action={changeVendorPassword}
            className="mt-4 space-y-3 text-sm"
            aria-label="Change password for vendor account"
          >
            <div className="space-y-1">
              <label
                htmlFor="currentPassword"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Current password
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                placeholder="Enter your current password"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="newPassword"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                >
                  New password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  placeholder="At least 8 characters"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  placeholder="Re-enter new password"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#9e9e9e]">
              For your security, we recommend using a unique password that you
              don&apos;t reuse on other sites.
            </p>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
            >
              Update password
            </button>
          </form>
        </section>

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
