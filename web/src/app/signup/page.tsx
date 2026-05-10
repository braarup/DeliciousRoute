import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/bcrypt";
import { randomUUID } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureEmailAuthSchema,
  sendEmailVerificationChallenge,
} from "@/lib/emailAuth";
import { validatePasswordComplexity } from "@/lib/passwordPolicy";
import { recordPasswordInHistory } from "@/lib/passwordHistory";
import { normalizeVendorTier } from "@/lib/vendorSubscription";
import { SignupRoleFields } from "@/components/SignupRoleFields";
import {
  getAppBaseUrl,
  getStripeClient,
  getStripePriceIdForTier,
} from "@/lib/stripe";

async function createAccount(formData: FormData) {
  "use server";

  await ensureEmailAuthSchema();

  const firstName = (formData.get("firstName") || "").toString().trim();
  const lastName = (formData.get("lastName") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const password = (formData.get("password") || "").toString();
  const accountType = (formData.get("accountType") || "").toString();
  const vendorTier = normalizeVendorTier(
    (formData.get("vendorTier") || "starter").toString(),
  );

  if (!firstName || !lastName || !email || !password || !accountType) {
    throw new Error("Missing required signup fields");
  }

  if (accountType !== "vendor" && accountType !== "customer") {
    throw new Error("Invalid account type");
  }

  const complexityErrors = validatePasswordComplexity(password);

  if (complexityErrors.length > 0) {
    throw new Error("Password does not meet complexity requirements");
  }

  const existingUser = await sql<{
    id: string;
    email_verified_at: string | null;
  }>`
    SELECT id, email_verified_at
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  if (existingUser.rows.length > 0) {
    const matchedUser = existingUser.rows[0];

    if (!matchedUser.email_verified_at) {
      try {
        await sendEmailVerificationChallenge({
          userId: matchedUser.id,
          email,
        });
      } catch (error) {
        console.error("Failed to resend verification email", error);
        redirect(
          `/verify-email?email=${encodeURIComponent(email)}&error=email_delivery_failed`,
        );
      }

      redirect(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
    }

    redirect("/login?error=already_registered");
  }

  const passwordHash = await hashPassword(password);
  const userId = randomUUID();
  const displayName = `${firstName} ${lastName}`.trim();

  await sql`BEGIN`;
  try {
    await sql`
      INSERT INTO users (id, email, password_hash, display_name)
      VALUES (${userId}, ${email}, ${passwordHash}, ${displayName})
    `;

    const userNameColumnsResult = await sql<{ column_name: string }>`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name IN ('first_name', 'last_name')
    `;

    const hasFirstNameColumn = userNameColumnsResult.rows.some(
      (row) => row.column_name === "first_name",
    );
    const hasLastNameColumn = userNameColumnsResult.rows.some(
      (row) => row.column_name === "last_name",
    );

    if (hasFirstNameColumn || hasLastNameColumn) {
      await sql`
        UPDATE users
        SET
          first_name = CASE WHEN ${hasFirstNameColumn} THEN ${firstName} ELSE first_name END,
          last_name = CASE WHEN ${hasLastNameColumn} THEN ${lastName} ELSE last_name END,
          updated_at = now()
        WHERE id = ${userId}
      `;
    }

    await recordPasswordInHistory(userId, passwordHash);

    if (accountType === "vendor") {
      const vendorId = randomUUID();

      await sql`
        INSERT INTO vendors (
          id,
          owner_user_id,
          name,
          vendor_type,
          subscription_tier,
          subscription_status,
          subscription_started_at
        )
        VALUES (
          ${vendorId},
          ${userId},
          ${displayName},
          'food_truck',
          ${vendorTier},
          'incomplete',
          now()
        )
      `;

      const roleResult = await sql`
        INSERT INTO roles (name)
        VALUES ('vendor_admin')
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;

      const roleId = roleResult.rows[0]?.id;

      if (roleId != null) {
        await sql`
          INSERT INTO user_roles (user_id, role_id)
          VALUES (${userId}, ${roleId})
          ON CONFLICT (user_id, role_id) DO NOTHING
        `;
      }

      const billingTableResult = await sql`
        SELECT to_regclass('public.vendor_subscriptions') AS table_name
      `;

      const billingTableExists = !!billingTableResult.rows[0]?.table_name;

      if (billingTableExists) {
        await sql`
          INSERT INTO vendor_subscriptions (
            id,
            vendor_id,
            provider,
            tier,
            status,
            current_period_start,
            metadata,
            updated_at
          )
          VALUES (
            ${randomUUID()},
            ${vendorId},
            'stripe',
            ${vendorTier},
            'incomplete',
            now(),
            ${JSON.stringify({
              source: "vendor_signup",
            })}::jsonb,
            now()
          )
          ON CONFLICT (vendor_id)
          DO UPDATE SET
            provider = EXCLUDED.provider,
            tier = EXCLUDED.tier,
            status = EXCLUDED.status,
            current_period_start = EXCLUDED.current_period_start,
            metadata = EXCLUDED.metadata,
            updated_at = now()
        `;
      }

      await sql`COMMIT`;

      try {
        await sendEmailVerificationChallenge({
          userId,
          email,
        });
      } catch (error) {
        console.error("Failed to send vendor verification email", error);
        redirect(
          `/verify-email?email=${encodeURIComponent(email)}&error=email_delivery_failed`,
        );
      }

      const stripe = getStripeClient();
      const priceId = getStripePriceIdForTier(vendorTier);
      const appBaseUrl = getAppBaseUrl();
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: email,
        success_url: `${appBaseUrl}/vendor/profile?tierStatus=upgraded&tier=${vendorTier}`,
        cancel_url: `${appBaseUrl}/vendor/profile?tierStatus=no_change&tier=${vendorTier}`,
        metadata: {
          userId,
          vendorId,
          vendorTier,
          source: "vendor_signup",
        },
      });

      if (!checkoutSession.url) {
        throw new Error("stripe_checkout_url_missing");
      }

      redirect(checkoutSession.url);
    } else {
      const roleResult = await sql`
        INSERT INTO roles (name)
        VALUES ('consumer')
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `;

      const roleId = roleResult.rows[0]?.id;

      if (roleId != null) {
        await sql`
          INSERT INTO user_roles (user_id, role_id)
          VALUES (${userId}, ${roleId})
          ON CONFLICT (user_id, role_id) DO NOTHING
        `;
      }

      // Seed an initial customer profile record for convenience
      const profileId = randomUUID();

      await sql`
        INSERT INTO customer_profiles (id, user_id, display_name)
        VALUES (${profileId}, ${userId}, ${displayName})
      `;

      await sql`COMMIT`;

      try {
        await sendEmailVerificationChallenge({
          userId,
          email,
        });
      } catch (error) {
        console.error("Failed to send customer verification email", error);
        redirect(
          `/verify-email?email=${encodeURIComponent(email)}&error=email_delivery_failed`,
        );
      }

      redirect(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
    }
  } catch (error) {
    await sql`ROLLBACK`;
    console.error("Error creating account", error);
    throw error;
  }
}

export default async function SignupPage({
  searchParams,
}: {
  searchParams?: {
    type?: string;
    sent?: string;
    error?: string;
    email?: string;
  };
}) {
  const existingUser = await getCurrentUser();

  if (existingUser) {
    const rolesResult = await sql`
      SELECT r.name
      FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ${existingUser.id}
    `;

    const roleNames = rolesResult.rows.map((row) =>
      (row.name as string).toLowerCase(),
    );

    const isVendor = roleNames.includes("vendor_admin");

    if (isVendor) {
      redirect("/vendor/profile");
    } else {
      redirect("/customer/profile");
    }
  }

  const defaultType =
    searchParams?.type === "vendor" || searchParams?.type === "customer"
      ? searchParams.type
      : "customer";

  const notice =
    searchParams?.sent === "1"
      ? "We sent a verification email. Check your inbox to finish creating your account."
      : searchParams?.error === "email_delivery_failed"
        ? "We created your account, but we could not send the verification email right now. Please try again from the verification page."
        : null;

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
            Sign up
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--dr-text)]">
            Create your Delicious Route account
          </h1>
          <p className="mt-1 text-sm text-[#616161]">
            Use one account whether you&apos;re a vendor or a customer.
          </p>
          <p className="mt-2 text-xs text-[#616161]">
            Sign-in now requires a verified email and a one-time code sent by
            email.
          </p>
          {notice ? (
            <p className="mt-3 rounded-2xl bg-[var(--dr-neutral)] px-3 py-2 text-xs text-[var(--dr-text)]">
              {notice}
            </p>
          ) : null}
        </header>

        <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <form
            className="space-y-4"
            aria-label="Create account form"
            action={createAccount}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="firstName"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                >
                  First name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  placeholder="e.g. Jordan"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="lastName"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                >
                  Last name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  placeholder="e.g. Lee"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                placeholder="Create a password"
              />
              <p className="mt-1 text-[0.7rem] text-[#9e9e9e]">
                Must be at least 8 characters and include an uppercase letter, a
                number, and a special character.
              </p>
            </div>

            <SignupRoleFields defaultType={defaultType} />

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
            >
              Create account
            </button>
          </form>

          <div className="mt-4 space-y-2 text-xs text-[#616161]">
            <p>
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[var(--dr-primary)] hover:underline"
              >
                Sign in
              </Link>
              .
            </p>
            <p>
              <Link
                href="/"
                className="text-[#757575] hover:text-[var(--dr-primary)]"
              >
                7 Back to Delicious Route
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
