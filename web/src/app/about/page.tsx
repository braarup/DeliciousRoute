export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto max-w-3xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[#e0e0e0] bg-white px-6 py-8 shadow-sm">
          <h1 className="text-center text-3xl font-semibold text-[var(--dr-text)]">
            About Us
          </h1>
          <p className="mt-4 text-center text-sm text-[#616161]">
            Welcome to <span className="font-semibold text-[var(--dr-primary)]">Delicious Route</span>,
            your go-to platform for discovering the best food venues and vendors in your area.
          </p>
          <p className="mt-5 text-sm leading-relaxed text-[#424242]">
            Our mission is to connect food lovers with local venues and vendors, making it easier to
            find and enjoy memorable food experiences. Whether you&apos;re craving something new or
            returning to a favorite spot, Delicious Route helps you explore, discover, and connect.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-[#424242]">
            <li>
              <span className="mr-1" aria-hidden>
                🔎
              </span>
              <span>
                <strong>Discover</strong> unique food venues and hidden gems near you.
              </span>
            </li>
            <li>
              <span className="mr-1" aria-hidden>
                🍽️
              </span>
              <span>
                <strong>Connect</strong> with passionate local vendors.
              </span>
            </li>
            <li>
              <span className="mr-1" aria-hidden>
                ⭐
              </span>
              <span>
                <strong>Share</strong> your experiences and support your community.
              </span>
            </li>
          </ul>
          <div className="mt-6 flex justify-center">
            <a
              href="#vendors"
              className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/40 hover:bg-[var(--dr-accent)]"
            >
              Explore food venues
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
