export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto max-w-2xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[#e0e0e0] bg-white px-6 py-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-[var(--dr-text)]">Contact Us</h1>
          <p className="mt-2 text-sm text-[#616161]">
            Have a question, partnership idea, or just want to say hi? Send us a note below.
          </p>

          <form className="mt-5 space-y-4" aria-label="Contact form">
            <div className="space-y-1">
              <label
                htmlFor="name"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                placeholder="Your name"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="email"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="message"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                required
                className="w-full resize-none rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                placeholder="How can we help?"
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/40 hover:bg-[var(--dr-accent)]"
            >
              Send message
            </button>
            <p className="text-[11px] text-[#9e9e9e]">
              This is a demo contact form. In a full app it would post to a backend or support inbox.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
