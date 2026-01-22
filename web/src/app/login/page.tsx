import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "@vercel/postgres";
import { verifyPassword } from "@/lib/bcrypt";
import { createSession, getCurrentUser } from "@/lib/auth";
import { LoginErrorNotice } from "@/components/LoginErrorNotice";
import { PasswordPolicyDialog } from "@/components/PasswordPolicyDialog";
import { sendAccountLockedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function loginUser(formData: FormData) {
  "use server";

  const email = (formData.get("email") || "").toString().trim().toLowerCase();
  const password = (formData.get("password") || "").toString();

  if (!email || !password) {
    redirect("/login?error=missing_fields");
  }

  const userResult = await sql`
    SELECT id, password_hash, status, failed_login_attempts, locked_at, email
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;

  const user = userResult.rows[0] as
    | {
        id: string;
        password_hash: string | null;
        status: string;
        failed_login_attempts: number | null;
        locked_at: string | null;
        email: string;
      }
    | undefined;

  if (!user || !user.password_hash) {
    redirect("/login?error=invalid_credentials");
  }

  if ((user.status || "").toLowerCase() === "locked") {
    redirect("/login?error=account_locked");
  }

  const ok = await verifyPassword(password, user.password_hash as string);

  if (!ok) {
    const currentAttempts = user.failed_login_attempts ?? 0;
    const newAttempts = currentAttempts + 1;

    if (newAttempts >= 3) {
      await sql`
        UPDATE users
        SET status = 'locked', locked_at = now(), failed_login_attempts = ${newAttempts}, updated_at = now()
        WHERE id = ${user.id}
      `;

      try {
        await sendAccountLockedEmail({ to: user.email, role: "other" });
      } catch (err) {
        console.error("Failed to send account locked email", err);
      }

      redirect("/login?error=account_locked");
    } else {
      await sql`
        UPDATE users
        SET failed_login_attempts = ${newAttempts}, updated_at = now()
        WHERE id = ${user.id}
      `;

      redirect("/login?error=invalid_credentials");
    }
  }

  const rolesResult = await sql`
    SELECT r.name
    FROM roles r
    JOIN user_roles ur ON ur.role_id = r.id
    WHERE ur.user_id = ${user.id}
  `;

  const roleNames = rolesResult.rows.map((row) =>
    (row.name as string).toLowerCase()
  );

  const isVendor = roleNames.includes("vendor_admin");

  if ((user.failed_login_attempts ?? 0) > 0 || user.locked_at) {
    await sql`
      UPDATE users
      SET failed_login_attempts = 0, locked_at = NULL, status = 'active', updated_at = now()
      WHERE id = ${user.id}
    `;
  }

  await createSession(user.id as string);

  if (isVendor) {
    redirect("/vendor/profile");
  } else {
    redirect("/customer/profile");
  }
}

export default async function LoginSelectorPage() {
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

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
            Sign in
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--dr-text)]">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-[#616161]">
            Sign in with your email to continue as a vendor or customer.
          </p>
        </header>

        <main className="space-y-4 rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <section className="space-y-3 text-sm">
            <h2 className="text-sm font-semibold text-[var(--dr-text)]">
              Sign in to Delicious Route
            </h2>
            <form
              className="space-y-3"
              aria-label="Sign in form"
              action={loginUser}
            >
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
                  autoComplete="current-password"
                  className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  placeholder="Enter your password"
                />
                <div className="mt-1">
                  <PasswordPolicyDialog />
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
              >
                Sign in
              </button>

              <p className="mt-2 text-xs text-[#616161]">
                <Link
                  href="/reset-password"
                  className="font-semibold text-[var(--dr-primary)] hover:underline"
                >
                  Forgot your password?
                </Link>
              </p>
              <LoginErrorNotice includeAlreadyRegistered />
            </form>
            <p className="mt-3 text-xs text-[#616161]">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-[var(--dr-primary)] hover:underline"
              >
                Create an account
              </Link>
              .
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
