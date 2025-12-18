import Link from "next/link";

export default function VendorLoginPage() {
  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
            Manage my truck
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--dr-text)]">
            Vendor login
          </h1>
          <p className="mt-1 text-sm text-[#616161]">
            Sign in to update your truck profile, hours, and location.
          </p>
        </header>

        <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <form className="space-y-4" aria-label="Vendor login form">
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
            </div>

            <button
              type="submit"
              className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
            >
              Sign in
            </button>
          </form>

          <div className="mt-4 space-y-2 text-xs text-[#616161]">
            <p>
              Don&apos;t have an account?{" "}
              <Link
                href="/vendor/signup"
                className="font-semibold text-[var(--dr-primary)] hover:underline"
              >
                Create vendor account
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
