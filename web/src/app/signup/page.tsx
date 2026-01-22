import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "@vercel/postgres";
import { hashPassword } from "@/lib/bcrypt";
import { randomUUID } from "crypto";
import { createSession, getCurrentUser } from "@/lib/auth";
import {
  sendCustomerWelcomeEmail,
  sendVendorWelcomeEmail,
} from "@/lib/email";
import { validatePasswordComplexity } from "@/lib/passwordPolicy";
import { recordPasswordInHistory } from "@/lib/passwordHistory";

async function createAccount(formData: FormData) {
  "use server";

  const firstName = (formData.get("firstName") || "").toString().trim();
  const lastName = (formData.get("lastName") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const password = (formData.get("password") || "").toString();
  const accountType = (formData.get("accountType") || "").toString();

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

  const existingUser = await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  `;

  if (existingUser.rows.length > 0) {
    redirect("/login?error=already_registered");
  }

  const passwordHash = await hashPassword(password);
  const userId = randomUUID();
  const displayName = `${firstName} ${lastName}`.trim();

  await sql`BEGIN`;
  try {
    await sql`
      INSERT INTO users (id, email, password_hash, display_name, first_name, last_name)
      VALUES (${userId}, ${email}, ${passwordHash}, ${displayName}, ${firstName}, ${lastName})
    `;

    await recordPasswordInHistory(userId, passwordHash);

    if (accountType === "vendor") {
      const vendorId = randomUUID();

      await sql`
        INSERT INTO vendors (id, owner_user_id, name, vendor_type)
        VALUES (${vendorId}, ${userId}, ${displayName}, 'food_truck')
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

      await sql`COMMIT`;
      await sendVendorWelcomeEmail({ to: email, vendorName: displayName });
      await createSession(userId);
      redirect("/vendor/profile");
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
      await sendCustomerWelcomeEmail({ to: email, displayName });
      await createSession(userId);
      redirect("/customer/profile");
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
  searchParams?: { type?: string };
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
      (row.name as string).toLowerCase()
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
                Must be at least 8 characters and include an uppercase letter,
                a number, and a special character.
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]">
                I&apos;m signing up as
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-xs font-medium text-[var(--dr-text)] hover:border-[var(--dr-primary)]">
                  <input
                    type="radio"
                    name="accountType"
                    value="customer"
                    defaultChecked={defaultType === "customer"}
                    className="h-3 w-3 text-[var(--dr-primary)] focus:ring-[var(--dr-primary)]"
                  />
                  <span>Customer</span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-xs font-medium text-[var(--dr-text)] hover:border-[var(--dr-primary)]">
                  <input
                    type="radio"
                    name="accountType"
                    value="vendor"
                    defaultChecked={defaultType === "vendor"}
                    className="h-3 w-3 text-[var(--dr-primary)] focus:ring-[var(--dr-primary)]"
                  />
                  <span>Vendor</span>
                </label>
              </div>
              <p className="text-[0.7rem] text-[#9e9e9e]">
                Vendors can manage their truck profile, locations, and hours.
                Customers can save favorites and preferences.
              </p>
            </fieldset>

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
