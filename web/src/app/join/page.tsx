import Link from "next/link";

const vendorBenefits = [
  {
    title: "Real-time visibility",
    detail: "Show up when hungry customers are searching near your current location.",
  },
  {
    title: "Promote & share",
    detail: "Launch limited-time offers, specials, and seasonal promos instantly.",
  },
  {
    title: "New customers",
    detail: "Reach local food lovers and grow repeat traffic to your truck.",
  },
  {
    title: "Grub Reels",
    detail: "Post short videos to showcase your food, your story, and your vibe.",
  },
  {
    title: "Your own profile",
    detail: "Control your menu, photos, hours, location, and deal availability.",
  },
];

export default function JoinLandingPage() {
  return (
    <div className="min-h-screen bg-[#f6f1ec] text-[#342a24]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(226,74,56,0.16),transparent_38%),radial-gradient(circle_at_86%_18%,rgba(61,42,33,0.18),transparent_45%),radial-gradient(circle_at_50%_88%,rgba(255,177,112,0.18),transparent_46%)]" />

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pt-14">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/icon_01.png"
                alt="Delicious Route"
                className="h-12 w-12 rounded-full border border-[#e24a38]/35 bg-white object-cover shadow-[0_8px_18px_rgba(0,0,0,0.2)]"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#e24a38]">
                  Delicious Route
                </p>
                <p className="text-sm text-[#5f4d43]">Vendor growth platform</p>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-[#e24a38]/60 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#a63b2f] hover:bg-[#e24a38] hover:text-white"
            >
              Main DR page
            </Link>
          </header>

          <main className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <section className="rounded-3xl border border-[#e24a38]/30 bg-white p-6 shadow-[0_20px_45px_rgba(0,0,0,0.14)] sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#a63b2f]">
                Vendor advertising
              </p>
              <h1 className="mt-3 text-4xl font-extrabold uppercase leading-[0.95] text-[#2f2420] sm:text-5xl">
                Grow your
                <span className="block text-[#e24a38]">food business</span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#56463d] sm:text-base">
                This page is built for vendors. If you scanned our QR code, you
                are in the right place. Join Delicious Route to get your truck in
                front of customers, publish promotions, and build a stronger local
                fan base.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {vendorBenefits.map((benefit) => (
                  <article
                    key={benefit.title}
                    className="rounded-2xl border border-[#e7d7cb] bg-[#fbf8f5] px-3 py-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a63b2f]">
                      {benefit.title}
                    </p>
                    <p className="mt-1 text-xs text-[#6a5950]">{benefit.detail}</p>
                  </article>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
                <Link
                  href="/signup?type=vendor"
                  className="inline-flex items-center justify-center rounded-full bg-[#e24a38] px-5 py-2.5 text-white shadow-[0_10px_24px_rgba(226,74,56,0.38)] hover:bg-[#f35d49]"
                >
                  Create vendor account
                </Link>
                <Link
                  href="/vendor/login"
                  className="inline-flex items-center justify-center rounded-full border border-[#a63b2f]/45 px-5 py-2.5 text-[#a63b2f] hover:bg-[#fbe9e5]"
                >
                  Vendor sign in
                </Link>
              </div>
            </section>

            <section className="rounded-3xl border border-[#f0cab2] bg-[#2a1e18] p-6 text-[#f8efe8] shadow-[0_16px_40px_rgba(0,0,0,0.2)] sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ffb071]">
                Why vendors choose DR
              </p>

              <ul className="mt-4 space-y-3 text-sm">
                <li className="rounded-xl border border-[#e24a38]/35 bg-[#33251f] px-3 py-2">
                  Capture customers where they already search for local food.
                </li>
                <li className="rounded-xl border border-[#e24a38]/35 bg-[#33251f] px-3 py-2">
                  Keep your menu, hours, photos, and location updated in one place.
                </li>
                <li className="rounded-xl border border-[#e24a38]/35 bg-[#33251f] px-3 py-2">
                  Convert views into orders with Feature Deals and Grub Reels.
                </li>
              </ul>

              <div className="mt-6 rounded-2xl border border-[#ffb071]/30 bg-[#231813] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb071]">
                  Verified. Trusted. Delicious.
                </p>
                <p className="mt-2 text-sm text-[#e8d9cf]">
                  Be discoverable, look professional, and stand out from the
                  competition with a complete vendor profile.
                </p>
              </div>

              <Link
                href="/signup?type=vendor"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-[#ffb071]/50 bg-[#e24a38] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-[#f35d49]"
              >
                Sign up as vendor
              </Link>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
