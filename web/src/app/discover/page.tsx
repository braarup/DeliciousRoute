import Link from "next/link";

const customerPillars = [
  {
    title: "Local vendors",
    detail: "Find nearby food trucks with live profile updates and hours.",
  },
  {
    title: "Grub Reels",
    detail: "Watch quick clips to see what is hot before you pick your stop.",
  },
  {
    title: "Feature deals",
    detail: "Claim active promos before they expire or run out of claims.",
  },
];

export default function DiscoverLandingPage() {
  return (
    <div className="min-h-screen bg-[#1f1713] text-[#f5efe8]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(226,74,56,0.35),transparent_40%),radial-gradient(circle_at_82%_14%,rgba(255,188,92,0.25),transparent_42%),radial-gradient(circle_at_50%_88%,rgba(120,72,43,0.35),transparent_46%)]" />

        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-12 pt-10 sm:px-6 lg:px-8 lg:pt-14">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src="/icon_01.png"
                alt="Delicious Route"
                className="h-12 w-12 rounded-full object-cover ring-2 ring-[#ffb071]/35 shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#ffb071]">
                  Delicious Route
                </p>
                <p className="text-sm text-[#d8c5b2]">
                  Discover. Connect. Enjoy.
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-[#e24a38]/70 bg-[#2a1f19] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#f8f3ee] hover:bg-[#e24a38]"
            >
              Main DR page
            </Link>
          </header>

          <main className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <section className="rounded-3xl border border-[#e24a38]/35 bg-[#2a1f19]/90 p-6 shadow-[0_18px_45px_rgba(0,0,0,0.28)] sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#ffb071]">
                Customer guide
              </p>
              <h1 className="mt-3 text-4xl font-extrabold uppercase leading-[0.95] text-[#f8f3ee] sm:text-5xl">
                Find amazing
                <span className="block text-[#e24a38]">food near you</span>
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#dfcec0] sm:text-base">
                You scanned the right code. Delicious Route helps customers
                discover local food trucks, watch Grub Reels, and claim
                limited-time deals. This page is built for customers who want to
                choose faster and eat better.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {customerPillars.map((pillar) => (
                  <article
                    key={pillar.title}
                    className="rounded-2xl border border-[#e24a38]/25 bg-[#211914] px-3 py-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ffb071]">
                      {pillar.title}
                    </p>
                    <p className="mt-1 text-xs text-[#d8c5b2]">
                      {pillar.detail}
                    </p>
                  </article>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
                <Link
                  href="/vendors"
                  className="inline-flex items-center justify-center rounded-full bg-[#e24a38] px-5 py-2.5 text-[#fff4ea] shadow-[0_8px_24px_rgba(226,74,56,0.38)] hover:bg-[#f35d49]"
                >
                  Explore vendors
                </Link>
                <Link
                  href="/#grub-reels"
                  className="inline-flex items-center justify-center rounded-full border border-[#ffb071]/55 px-5 py-2.5 text-[#ffcf9f] hover:bg-[#ffb071]/10"
                >
                  Watch Grub Reels
                </Link>
                <Link
                  href="/#feature-deals"
                  className="inline-flex items-center justify-center rounded-full border border-[#ffb071]/55 px-5 py-2.5 text-[#ffcf9f] hover:bg-[#ffb071]/10"
                >
                  View Feature Deals
                </Link>
              </div>
            </section>

            <section className="rounded-3xl border border-[#ffb071]/30 bg-[#2f231d]/85 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.25)] sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ffb071]">
                Why customers use DR
              </p>

              <ul className="mt-4 space-y-3 text-sm text-[#f0dfcf]">
                <li className="rounded-xl border border-[#e24a38]/30 bg-[#2a1e18] px-3 py-2">
                  See what trucks are serving and where they are now.
                </li>
                <li className="rounded-xl border border-[#e24a38]/30 bg-[#2a1e18] px-3 py-2">
                  Catch short-form food videos to preview meals before ordering.
                </li>
                <li className="rounded-xl border border-[#e24a38]/30 bg-[#2a1e18] px-3 py-2">
                  Claim customer deals while they are still available.
                </li>
              </ul>

              <div className="mt-6 rounded-2xl border border-[#ffb071]/30 bg-[#261c17] px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffb071]">
                  Quick start
                </p>
                <ol className="mt-2 space-y-1 text-sm text-[#dfcec0]">
                  <li>1. Open vendors near you</li>
                  <li>2. Browse active deals</li>
                  <li>3. Claim and enjoy</li>
                </ol>
              </div>

              <Link
                href="/signup"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-[#e24a38]/70 bg-[#e24a38] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#fff7f0] hover:bg-[#f35d49]"
              >
                Sign Up Today
              </Link>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
