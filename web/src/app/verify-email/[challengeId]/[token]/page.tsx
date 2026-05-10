import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createSession,
  getAccountLandingPath,
  getCurrentUser,
} from "@/lib/auth";
import {
  sendCustomerWelcomeEmail,
  sendVendorWelcomeEmail,
} from "@/lib/email";
import { verifyEmailVerificationChallenge } from "@/lib/emailAuth";

export const dynamic = "force-dynamic";

export default async function VerifyEmailChallengeTokenPage({
  params,
}: {
  params: { challengeId: string; token: string };
}) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(await getAccountLandingPath(currentUser.id));
  }

  const result = await verifyEmailVerificationChallenge({
    challengeId: params.challengeId,
    token: params.token,
  });

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

  await createSession(result.userId);

  const landingPath = await getAccountLandingPath(result.userId);

  if (landingPath === "/vendor/profile") {
    await sendVendorWelcomeEmail({
      to: result.email,
      vendorName: null,
    });
  } else {
    await sendCustomerWelcomeEmail({
      to: result.email,
      displayName: null,
    });
  }

  redirect(await getAccountLandingPath(result.userId));
}
