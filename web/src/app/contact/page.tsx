import Link from "next/link";
import Script from "next/script";
import { headers } from "next/headers";
import { sendContactEmails } from "@/lib/email";

async function handleContactSubmit(formData: FormData) {
  "use server";

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY || "";

  // Honeypot trap: bots often fill hidden fields that humans never see.
  const company = (formData.get("company") || "").toString().trim();
  if (company) {
    return;
  }

  const name = (formData.get("name") || "").toString().trim();
  const email = (formData.get("email") || "").toString().trim();
  const message = (formData.get("message") || "").toString().trim();

  if (!email || !message) {
    return;
  }

  if (message.length < 10 || message.length > 5000) {
    return;
  }

  const urlCount = (message.match(/https?:\/\//gi) || []).length;
  if (urlCount > 2) {
    return;
  }

  const turnstileToken = (formData.get("cf-turnstile-response") || "")
    .toString()
    .trim();

  if (!turnstileSecret || !turnstileToken) {
    return;
  }

  const headerStore = await headers();
  const remoteIp =
    headerStore
      .get("x-forwarded-for")
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean)[0] || "";

  try {
    const verifyBody = new URLSearchParams({
      secret: turnstileSecret,
      response: turnstileToken,
    });

    if (remoteIp) {
      verifyBody.set("remoteip", remoteIp);
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: verifyBody,
        cache: "no-store",
      },
    );

    if (!verifyResponse.ok) {
      return;
    }

    const verifyJson = (await verifyResponse.json()) as {
      success?: boolean;
    };

    if (!verifyJson.success) {
      return;
    }
  } catch {
    return;
  }

  await sendContactEmails({ name, email, message });
}

export default function ContactPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto max-w-2xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <div className="mb-4 flex justify-end">
          <Link
            href="/"
            className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#757575] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]"
          >
            Back home
          </Link>
        </div>
        <section className="rounded-3xl border border-[#e0e0e0] bg-white px-6 py-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-[var(--dr-text)]">Contact Us</h1>
          <p className="mt-2 text-sm text-[#616161]">
            Have a question, partnership idea, or just want to say hi? Send us a note below.
          </p>

          <form
            className="mt-5 space-y-4"
            aria-label="Contact form"
            action={handleContactSubmit}
          >
            {turnstileSiteKey && (
              <Script
                src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                strategy="afterInteractive"
              />
            )}

            <input
              type="text"
              name="company"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
            />

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

            {turnstileSiteKey ? (
              <div className="cf-turnstile" data-sitekey={turnstileSiteKey} />
            ) : (
              <p className="text-[11px] text-[#9e9e9e]">
                Anti-spam verification is currently unavailable.
              </p>
            )}

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/40 hover:bg-[var(--dr-accent)]"
            >
              Send message
            </button>
            <p className="text-[11px] text-[#9e9e9e]">
              We&apos;ll send you a confirmation email and someone from the Delicious Route team will follow up.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
