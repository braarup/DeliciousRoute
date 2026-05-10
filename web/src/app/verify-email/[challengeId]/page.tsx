import Link from "next/link";
import { redirect } from "next/navigation";
import { sql } from "@vercel/postgres";
import { getCurrentUser } from "@/lib/auth";
import { sendCustomerWelcomeEmail, sendVendorWelcomeEmail } from "@/lib/email";
import {
  previewEmailVerificationChallenge,
  verifyEmailVerificationChallenge,
} from "@/lib/emailAuth";

export const dynamic = "force-dynamic";

export default async function VerifyEmailChallengePage({
  params,
  searchParams,
}: {
  params:
    | { challengeId?: string }
    | Promise<{ challengeId?: string }>;
  searchParams?: { token?: string } | Promise<{ token?: string }>;
}) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect("/login");
  }

  const resolvedParams = await Promise.resolve(params);
  const resolvedSearchParams = await Promise.resolve(searchParams);

  const challengeId =
    typeof resolvedParams?.challengeId === "string"
      ? resolvedParams.challengeId
      : "";
  const token = (resolvedSearchParams?.token || "").toString().trim();

  if (!challengeId) {
    redirect("/verify-email?error=invalid_link");
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
          <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
            <div className="space-y-3 text-sm">
              <p className="text-[var(--dr-text)]">
                This verification link is incomplete.
              </p>
              <p className="text-xs text-[#616161]">
                Please open the full link from your email or request a new one
                from the verification page.
              </p>
              <p className="text-xs text-[#616161]">
                <Link
                  href="/verify-email"
                  className="font-semibold text-[var(--dr-primary)] hover:underline"
                >
                  Request a new verification link
                </Link>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const result = await previewEmailVerificationChallenge({
    challengeId,
    token,
  });

  async function confirmVerification() {
    "use server";

    const verified = await verifyEmailVerificationChallenge({
      challengeId,
      token,
    });

    if (!verified.ok) {
      if (verified.reason === "already_verified") {
        redirect("/login?verified=1");
      }

      if (verified.reason === "expired") {
        redirect("/verify-email?error=link_expired");
      }

      redirect("/verify-email?error=invalid_link");
    }

    const rolesResult = await sql`
      SELECT r.name
      FROM roles r
      JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = ${verified.userId}
    `;

    const roleNames = rolesResult.rows.map((row) =>
      (row.name as string).toLowerCase(),
    );

    const isVendor = roleNames.includes("vendor_admin");

    if (isVendor) {
      await sendVendorWelcomeEmail({
        to: verified.email,
        vendorName: null,
      });
    } else {
      await sendCustomerWelcomeEmail({
        to: verified.email,
        displayName: null,
      });
    }

    redirect("/login?verified=1");
  }

  if (!result.ok) {
    if (result.reason === "already_verified") {
      return (
        <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
          <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
            <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
              <div className="space-y-3 text-sm">
                <p className="text-[var(--dr-text)]">
                  This email address is already verified.
                </p>
                <p className="text-xs text-[#616161]">
                  You can sign in with your password and the one-time email code.
                </p>
                <p className="text-xs text-[#616161]">
                  <Link
                    href="/login"
                    className="font-semibold text-[var(--dr-primary)] hover:underline"
                  >
                    Go to sign in
                  </Link>
                </p>
              </div>
            </main>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
          <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
            <div className="space-y-3 text-sm">
              <p className="text-[var(--dr-text)]">
                This verification link is invalid or expired.
              </p>
              <p className="text-xs text-[#616161]">
                Request a new link on the verification page and try again.
              </p>
              <p className="text-xs text-[#616161]">
                <Link
                  href="/verify-email"
                  className="font-semibold text-[var(--dr-primary)] hover:underline"
                >
                  Request a new verification link
                </Link>
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <div className="space-y-3 text-sm">
            <p className="text-[var(--dr-text)]">Your verification link is valid.</p>
            <p className="text-xs text-[#616161]">
              Click confirm to verify your email and continue to sign in.
            </p>
            <form action={confirmVerification}>
              <button
                type="submit"
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
              >
                Confirm email verification
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
