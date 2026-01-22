import Link from "next/link";
import { sql } from "@vercel/postgres";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { sendCustomerProfileChangeEmail, sendPasswordChangedEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/bcrypt";
import { validatePasswordComplexity } from "@/lib/passwordPolicy";
import {
  isPasswordReusedRecently,
  recordPasswordInHistory,
} from "@/lib/passwordHistory";
import { FavoriteTrucksSection } from "../../../components/FavoriteTrucksSection";
import { PasswordPolicyDialog } from "@/components/PasswordPolicyDialog";

async function changeCustomerPassword(formData: FormData) {
  "use server";

  const currentPassword = (formData.get("currentPassword") || "").toString();
  const newPassword = (formData.get("newPassword") || "").toString();
  const confirmPassword = (formData.get("confirmPassword") || "").toString();

  const currentUser = await getCurrentUser();

  if (!currentUser?.id) {
    redirect("/login");
  }

  const baseRedirect = "/customer/profile";

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect(`${baseRedirect}?passwordStatus=missing_fields`);
  }

  const complexityErrors = validatePasswordComplexity(newPassword);

  if (complexityErrors.length > 0) {
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

  const reused = await isPasswordReusedRecently(
    currentUser.id as string,
    newPassword,
    3
  );

  if (reused) {
    redirect(`${baseRedirect}?passwordStatus=reused_recent`);
  }

  const newHash = await hashPassword(newPassword);

  await sql`
    UPDATE users
    SET password_hash = ${newHash}, updated_at = now()
    WHERE id = ${currentUser.id}
  `;

  await recordPasswordInHistory(currentUser.id as string, newHash);

  const to = (currentUser as any)?.email as string | undefined;

  if (to) {
    await sendPasswordChangedEmail({
      to,
      role: "customer",
    });
  }

  redirect(`${baseRedirect}?passwordStatus=success`);
}

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
    SELECT id, display_name, home_city, favorite_cuisines, dietary_preferences, notification_preferences
    FROM customer_profiles
    WHERE user_id = ${currentUser.id}
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const existingRow = existingResult.rows[0] as
    | {
        id: string;
        display_name: string | null;
        home_city: string | null;
        favorite_cuisines: string | null;
        dietary_preferences: string | null;
        notification_preferences: string | null;
      }
    | undefined;

  const existingId = existingRow?.id as string | undefined;

  const normalize = (value: string | null | undefined) =>
    (value || "").trim();

  const changes: string[] = [];

  type AuditEvent = { event_type: string; description: string };
  const auditEvents: AuditEvent[] = [];

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
    if (normalize(displayName) !== normalize(existingRow?.display_name)) {
      const description = "Updated display name.";
      changes.push(description);
      auditEvents.push({ event_type: "display_name_updated", description });
    }
    if (normalize(homeCity) !== normalize(existingRow?.home_city)) {
      const description = "Updated home city/region.";
      changes.push(description);
      auditEvents.push({ event_type: "home_city_updated", description });
    }
    if (
      normalize(favoriteCuisines) !==
      normalize(existingRow?.favorite_cuisines)
    ) {
      const description = "Updated favorite cuisines.";
      changes.push(description);
      auditEvents.push({ event_type: "favorite_cuisines_updated", description });
    }
    if (
      normalize(dietaryPreferences) !==
      normalize(existingRow?.dietary_preferences)
    ) {
      const description = "Updated dietary preferences.";
      changes.push(description);
      auditEvents.push({ event_type: "dietary_preferences_updated", description });
    }
    if (
      normalize(notificationPreferences) !==
      normalize(existingRow?.notification_preferences)
    ) {
      const description = "Updated notification preferences.";
      changes.push(description);
      auditEvents.push({ event_type: "notification_preferences_updated", description });
    }

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

  for (const event of auditEvents) {
    await sql`
      INSERT INTO customer_audit_events (id, user_id, event_type, description)
      VALUES (${randomUUID()}, ${currentUser.id}, ${event.event_type}, ${event.description})
    `;
  }

  const to = (currentUser as any)?.email as string | undefined;

  if (to && changes.length > 0) {
    await sendCustomerProfileChangeEmail({
      to,
      displayName: displayName || existingRow?.display_name || null,
      changes,
    });
  }

  redirect("/customer/profile");
}

async function signOutCustomer() {
  "use server";

  await destroySession();
  redirect("/");
}

export default async function CustomerProfilePage({
  searchParams,
}: {
  searchParams?: { passwordStatus?: string };
}) {
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

  const passwordStatus = searchParams?.passwordStatus;
  const passwordMessage =
    passwordStatus === "success"
      ? "Your password has been updated."
      : passwordStatus === "missing_fields"
      ? "Please fill in your current password, new password, and confirmation."
      : passwordStatus === "weak_password"
      ? "Please choose a stronger password with at least 8 characters, including at least one uppercase letter, one number, and one special character."
      : passwordStatus === "mismatch"
      ? "New password and confirmation do not match."
      : passwordStatus === "invalid_current"
      ? "Your current password was incorrect."
      : passwordStatus === "no_password"
      ? "We couldn't find an existing password for this account. Try resetting it from the login page instead."
      : passwordStatus === "no_change"
      ? "Your new password must be different from your current password."
      : passwordStatus === "reused_recent"
      ? "Your new password cannot be the same as any of your last 3 passwords."
      : null;
  const passwordIsError =
    !!passwordStatus && passwordStatus !== "success";

  const favoritesResult = await sql`
    SELECT
      v.id,
      v.name,
      v.cuisine_style,
      v.primary_region,
      v.profile_image_path,
      COALESCE(fc.favorite_count, 0) AS favorite_count
    FROM favorites f
    JOIN vendors v ON v.id = f.vendor_id
    LEFT JOIN (
      SELECT vendor_id, COUNT(*)::int AS favorite_count
      FROM favorites
      GROUP BY vendor_id
    ) fc ON fc.vendor_id = v.id
    WHERE f.user_id = ${currentUser.id}
    ORDER BY f.created_at DESC
  `;

  const favoriteVendors = favoritesResult.rows as Array<{
    id: string;
    name: string | null;
    cuisine_style: string | null;
    primary_region: string | null;
    profile_image_path: string | null;
    favorite_count: number;
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
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#757575] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]"
            >
              Back home
            </Link>
            <form action={signOutCustomer} className="flex items-center">
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
        <section className="mt-6 rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--dr-text)]">
            Account security
          </h2>
          <p className="mt-1 text-xs text-[#757575]">
            Change the password you use to sign in to Delicious Route.
          </p>
          <div className="mt-1 text-[11px] text-[#9e9e9e]">
            <PasswordPolicyDialog />
          </div>

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
            action={changeCustomerPassword}
            className="mt-4 space-y-3 text-sm"
            aria-label="Change password for customer account"
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
              Must be at least 8 characters and include an uppercase letter,
              a number, and a special character. You also can&apos;t reuse your
              last 3 passwords.
            </p>
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
        <FavoriteTrucksSection favoriteVendors={favoriteVendors} />
        <footer className="mt-6 border-t border-[#e0e0e0] pt-3 text-xs text-[#757575]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              © 2026 Delicious Route. Built for modern street food culture and more.
            </p>
            <nav className="flex flex-wrap items-center gap-3 text-[11px]">
              <Link href="/terms" className="hover:text-[var(--dr-primary)]">
                Terms of Service
              </Link>
              <span aria-hidden>•</span>
              <Link href="/privacy" className="hover:text-[var(--dr-primary)]">
                Privacy Policy
              </Link>
              <span aria-hidden>•</span>
              <Link href="/disclaimer" className="hover:text-[var(--dr-primary)]">
                Disclaimer
              </Link>
              <span aria-hidden>•</span>
              <Link href="/contact" className="hover:text-[var(--dr-primary)]">
                Contact
              </Link>
            </nav>
          </div>
        </footer>
      </div>
    </div>
  );
}
