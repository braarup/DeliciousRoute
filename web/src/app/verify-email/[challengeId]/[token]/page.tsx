import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sendCustomerWelcomeEmail, sendVendorWelcomeEmail } from "@/lib/email";
import {
  previewEmailVerificationChallenge,
  verifyEmailVerificationChallenge,
} from "@/lib/emailAuth";
import { sql } from "@vercel/postgres";

export const dynamic = "force-dynamic";

function safeShort(value: unknown) {
  return typeof value === "string" ? value.slice(0, 8) : "none";
}

export default async function VerifyEmailChallengeTokenPage({
  params,
}: {
  params?: { challengeId?: string; token?: string };
}) {
  const challengeId =
    typeof params?.challengeId === "string" ? params.challengeId : "";
  const token = typeof params?.token === "string" ? params.token : "";

  console.info("[email-verification-page] request", {
    at: new Date().toISOString(),
    challengeId: safeShort(challengeId),
    tokenLength: token.length,
  });

  if (!challengeId || !token) {
    console.info("[email-verification-page] missing_route_params", {
      at: new Date().toISOString(),
      challengeIdPresent: !!challengeId,
      tokenPresent: !!token,
    });

    redirect("/verify-email?error=invalid_link");
  }

  const currentUser = await getCurrentUser();

  if (currentUser) {
    console.info("[email-verification-page] current_user_redirect_login", {
      at: new Date().toISOString(),
      userId: currentUser.id?.slice(0, 8) || "none",
    });
    redirect("/login");
  }

  const result = await previewEmailVerificationChallenge({
    challengeId,
    token,
  });

  async function confirmVerification() {
    "use server";

    console.info("[email-verification-page] confirm_clicked", {
      at: new Date().toISOString(),
      challengeId: safeShort(challengeId),
      tokenLength: token.length,
    });

    const verified = await verifyEmailVerificationChallenge({
      challengeId,
      token,
    });

    if (!verified.ok) {
      console.info("[email-verification-page] confirm_rejected", {
        at: new Date().toISOString(),
        challengeId: safeShort(challengeId),
        reason: verified.reason,
      });

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

    console.info("[email-verification-page] confirm_success", {
      at: new Date().toISOString(),
      challengeId: safeShort(challengeId),
      userId: safeShort(verified.userId),
      role: isVendor ? "vendor" : "customer",
    });

    redirect("/login?verified=1");
  }

  if (!result.ok) {
    console.info("[email-verification-page] preview_rejected", {
      at: new Date().toISOString(),
      challengeId: safeShort(challengeId),
      reason: result.reason,
    });

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
                  You can sign in with your password and the one-time email
                  code.
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

  console.info("[email-verification-page] preview_valid", {
    at: new Date().toISOString(),
    challengeId: safeShort(challengeId),
  });

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <div className="space-y-3 text-sm">
            <p className="text-[var(--dr-text)]">
              Your verification link is valid.
            </p>
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
