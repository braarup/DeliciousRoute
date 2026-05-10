import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function VerifyEmailChallengePage({
  params,
  searchParams,
}: {
  params: { challengeId: string };
  searchParams?: { token?: string };
}) {
  const token = (searchParams?.token || "").toString().trim();

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

  redirect(
    `/verify-email/${encodeURIComponent(params.challengeId)}/${encodeURIComponent(token)}`,
  );
}
