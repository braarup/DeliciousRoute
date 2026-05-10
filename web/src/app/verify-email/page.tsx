import Link from "next/link";
import { redirect } from "next/navigation";
import { getAccountLandingPath, getCurrentUser } from "@/lib/auth";
import { resendEmailVerificationByEmail } from "@/lib/emailAuth";

export const dynamic = "force-dynamic";

async function resendVerificationEmail(formData: FormData) {
  "use server";

  const email = (formData.get("email") || "").toString().trim();

  if (!email) {
    redirect("/verify-email?error=missing_email");
  }

  const result = await resendEmailVerificationByEmail(email);

  if (!result.ok) {
    redirect(`/verify-email?error=${encodeURIComponent(result.reason)}`);
  }

  redirect(`/verify-email?email=${encodeURIComponent(email)}&sent=1`);
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams?: { email?: string; sent?: string; error?: string };
}) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(await getAccountLandingPath(currentUser.id));
  }

  const email = (searchParams?.email || "").toString().trim();
  const notice =
    searchParams?.sent === "1"
      ? "We sent a verification link to your email address."
      : null;

  const errorMessage =
    searchParams?.error === "missing_email"
      ? "Enter the email address used to create the account."
      : searchParams?.error === "email_delivery_failed"
        ? "We could not send the verification email right now. Please try again in a moment."
        : searchParams?.error === "link_expired"
          ? "This verification link has expired. Request a new one below."
          : searchParams?.error === "invalid_link"
            ? "This verification link is invalid. Request a new one below."
            : searchParams?.error === "missing_email_service"
              ? "Email delivery is not configured right now."
              : null;

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
            Verify email
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--dr-text)]">
            Check your inbox
          </h1>
          <p className="mt-1 text-sm text-[#616161]">
            We&apos;ll use your verified email for sign-in and one-time codes.
          </p>
          {notice ? (
            <p className="mt-3 rounded-2xl bg-[var(--dr-neutral)] px-3 py-2 text-xs text-[var(--dr-text)]">
              {notice}
            </p>
          ) : null}
        </header>

        <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <div className="space-y-4 text-sm">
            <p>
              If you just signed up, open the verification link we sent to your
              email address to finish creating your account.
            </p>
            <p className="text-xs text-[#616161]">
              If the email did not arrive, you can request another link below.
            </p>

            <form className="space-y-4" action={resendVerificationEmail}>
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
                  defaultValue={email}
                  autoComplete="email"
                  className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
              >
                Resend verification link
              </button>

              {errorMessage ? (
                <p className="text-xs text-red-600">{errorMessage}</p>
              ) : null}
            </form>

            <p className="text-xs text-[#616161]">
              Already verified?{" "}
              <Link
                href="/login"
                className="font-semibold text-[var(--dr-primary)] hover:underline"
              >
                Continue to sign in
              </Link>
              .
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
