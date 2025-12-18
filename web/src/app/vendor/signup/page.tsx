import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "@vercel/postgres";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

async function createVendorAccount(formData: FormData) {
  "use server";

  const businessName = (formData.get("businessName") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const password = (formData.get("password") || "").toString();

  if (!businessName || !email || !password) {
    throw new Error("Missing required signup fields");
  }

  // If a user already exists for this email, send them to login instead
  const existingUser = await sql`
    SELECT id FROM users WHERE email = ${email} LIMIT 1
  `;
  if (existingUser.rows.length > 0) {
    redirect("/vendor/login?email=" + encodeURIComponent(email));
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const userId = randomUUID();
  const vendorId = randomUUID();

  await sql`BEGIN`;
  try {
    // Create user
    await sql`
      INSERT INTO users (id, email, password_hash, display_name)
      VALUES (${userId}, ${email}, ${passwordHash}, ${businessName})
    `;

    // Create vendor owned by this user
    await sql`
      INSERT INTO vendors (id, owner_user_id, name, vendor_type)
      VALUES (${vendorId}, ${userId}, ${businessName}, 'food_truck')
    `;

    // Ensure vendor_admin role exists and assign it
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
  } catch (error) {
    await sql`ROLLBACK`;
    console.error("Error creating vendor account", error);
    throw error;
  }

  redirect("/vendor/profile");
}

export default function VendorSignupPage() {
  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
            Manage my truck
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--dr-text)]">
            Create vendor account
          </h1>
          <p className="mt-1 text-sm text-[#616161]">
            Set up your Delicious Route profile so customers can find you.
          </p>
        </header>

        <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <form
            className="space-y-4"
            aria-label="Vendor sign up form"
            action={createVendorAccount}
          >
            <div className="space-y-1">
              <label
                htmlFor="businessName"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Truck name
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                required
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                placeholder="e.g. La Calle Roja"
              />
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
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
            >
              Sign up
            </button>
          </form>

          <div className="mt-4 space-y-2 text-xs text-[#616161]">
            <p>
              Already have an account?{" "}
              <Link
                href="/vendor/login"
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
                ← Back to Delicious Route
              </Link>
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
