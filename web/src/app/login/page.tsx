import Link from "next/link";

export default function LoginSelectorPage() {
  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
            Sign in
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--dr-text)]">
            Choose how you want to sign in
          </h1>
          <p className="mt-1 text-sm text-[#616161]">
            Vendors can manage their truck profile. Customers can save
            preferences and discover trucks faster.
          </p>
        </header>

        <main className="space-y-4 rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          <section className="space-y-2 text-sm">
            <h2 className="text-sm font-semibold text-[var(--dr-text)]">
              For vendors
            </h2>
            <p className="text-xs text-[#616161]">
              Update your truck details, hours, and default location.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/vendor/login"
                className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)]"
              >
                Vendor login
              </Link>
              <Link
                href="/vendor/signup"
                className="inline-flex items-center justify-center rounded-full border border-[var(--dr-primary)]/60 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)] hover:bg-[var(--dr-primary)]/5"
              >
                Create vendor account
              </Link>
            </div>
          </section>

          <div className="h-px bg-[#e0e0e0]" />

          <section className="space-y-2 text-sm">
            <h2 className="text-sm font-semibold text-[var(--dr-text)]">
              For customers
            </h2>
            <p className="text-xs text-[#616161]">
              Save your favorite cuisines, dietary preferences, and cities.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <Link
                href="/customer/profile"
                className="inline-flex items-center justify-center rounded-full bg-[var(--dr-neutral)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dr-text)] border border-[#e0e0e0] hover:border-[var(--dr-primary)] hover:bg-[var(--dr-primary)]/5"
              >
                Go to customer profile
              </Link>
            </div>
          </section>

          <section className="pt-2 text-xs text-[#9e9e9e]">
            <p>
              In a full production app, both vendor and customer areas would be
              secured behind authentication and personalized to your account.
            </p>
          </section>
        </main>

        <footer className="mt-4 text-xs text-[#757575]">
          <Link
            href="/"
            className="hover:text-[var(--dr-primary)]"
          >
            860 Back to Delicious Route
          </Link>
        </footer>
      </div>
    </div>
  );
}
