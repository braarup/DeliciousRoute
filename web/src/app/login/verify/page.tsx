import Link from "next/link";
import { redirect } from "next/navigation";
import {
  clearLoginMfaChallengeCookie,
  createSession,
  getAccountLandingPath,
  getCurrentUser,
  getLoginMfaChallengeCookie,
} from "@/lib/auth";
import { verifyLoginMfaChallenge } from "@/lib/emailAuth";

export const dynamic = "force-dynamic";

async function verifyMfaCode(formData: FormData) {
  "use server";

  const code = (formData.get("code") || "").toString().trim();
  const challengeFromForm = (formData.get("challenge") || "")
    .toString()
    .trim();
  const challengeFromCookie = await getLoginMfaChallengeCookie();
  const challengeId = challengeFromCookie || challengeFromForm;

  if (!challengeId) {
    redirect("/login?error=mfa_expired");
  }

  if (!code) {
    redirect("/login/verify?error=missing_code");
  }

  const result = await verifyLoginMfaChallenge({ challengeId, code });

  if (!result.ok) {
    if (result.reason === "expired") {
      await clearLoginMfaChallengeCookie();
    }
    redirect(`/login/verify?error=${encodeURIComponent(result.reason)}`);
  }

  await clearLoginMfaChallengeCookie();
  await createSession(result.userId);

  redirect(await getAccountLandingPath(result.userId));
}

export default async function LoginVerifyPage({
  searchParams,
}: {
  searchParams?: { error?: string; sent?: string; challenge?: string };
}) {
  const currentUser = await getCurrentUser();

  if (currentUser) {
    redirect(await getAccountLandingPath(currentUser.id));
  }

  const notice =
    searchParams?.sent === "1"
      ? "We sent a one-time sign-in code to your email address."
      : null;

  const errorMessage =
    searchParams?.error === "missing_code"
      ? "Enter the 6-digit code from your email."
      : searchParams?.error === "expired"
        ? "This sign-in code expired. Please sign in again to request a new code."
        : searchParams?.error === "invalid"
          ? "That code was incorrect. Please try again."
          : searchParams?.error === "missing_challenge"
            ? "Your sign-in session expired. Please sign in again."
            : null;

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
            Verify sign-in
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--dr-text)]">
            Enter the code we emailed you
          </h1>
          <p className="mt-1 text-sm text-[#616161]">
            Finish signing in with the one-time code sent to your verified email
            address.
          </p>
          {notice ? (
            <p className="mt-3 rounded-2xl bg-[var(--dr-neutral)] px-3 py-2 text-xs text-[var(--dr-text)]">
              {notice}
            </p>
          ) : null}
        </header>

        <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <form className="space-y-4" action={verifyMfaCode}>
            <div className="space-y-1">
              <label
                htmlFor="code"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                6-digit code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                placeholder="123456"
              />
              <input
                type="hidden"
                name="challenge"
                value={(searchParams?.challenge || "").toString()}
              />
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
            >
              Verify code
            </button>

            {errorMessage ? (
              <p className="text-xs text-red-600">{errorMessage}</p>
            ) : null}

            <p className="mt-3 text-xs text-[#616161]">
              Didn&apos;t get the email? Go back to the{" "}
              <Link
                href="/login"
                className="font-semibold text-[var(--dr-primary)] hover:underline"
              >
                sign-in page
              </Link>
              .
            </p>
          </form>
        </main>
      </div>
    </div>
  );
}
