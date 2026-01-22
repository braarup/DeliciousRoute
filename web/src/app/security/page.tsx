import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { sendSecurityIncidentReportEmail } from "@/lib/email";

async function reportSecurityIssue(formData: FormData) {
  "use server";

  const currentUser = await getCurrentUser();

  const reporterName = (formData.get("reporterName") || "").toString().trim();
  const reporterEmail = (formData.get("reporterEmail") || "").toString().trim();
  const accountEmail = (formData.get("accountEmail") || "").toString().trim();
  const role = (formData.get("role") || "").toString().trim() as
    | "vendor"
    | "customer"
    | "other"
    | "";
  const category = (formData.get("category") || "").toString().trim();
  const firstNoticedAt = (formData.get("firstNoticedAt") || "").toString().trim();
  const description = (formData.get("description") || "").toString().trim();

  if (!description) {
    // Require a description; redirect back with an error flag
    redirect("/security?error=missing_description");
  }

  await sendSecurityIncidentReportEmail({
    reporterName: reporterName || (currentUser?.id ? currentUser.displayName || null : null),
    reporterEmail: reporterEmail || (currentUser as any)?.email || null,
    accountEmail: accountEmail || (currentUser as any)?.email || null,
    role: role === "vendor" || role === "customer" || role === "other" ? role : null,
    category,
    description,
    firstNoticedAt,
  });

  redirect("/security?submitted=1");
}

export default async function SecurityPage({
  searchParams,
}: {
  searchParams?: { submitted?: string; error?: string };
}) {
  const currentUser = await getCurrentUser();
  const isSubmitted = searchParams?.submitted === "1";
  const hasError = searchParams?.error === "missing_description";

  const defaultEmail = (currentUser as any)?.email as string | undefined;

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto max-w-2xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
              Security
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[var(--dr-text)]">
              Report a security issue
            </h1>
            <p className="mt-1 text-sm text-[#616161]">
              If you see changes you didn&apos;t make, suspicious logins, or anything that
              doesn&apos;t look right with your Delicious Route account, use this form to
              reach our team.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#757575] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]"
            >
              Back home
            </Link>
          </div>
        </header>

        {isSubmitted && (
          <div className="mb-4 rounded-2xl border border-[#c8e6c9] bg-[#e8f5e9] px-4 py-3 text-sm text-[#2e7d32]">
            Thank you. We&apos;ve received your report. Our team will review it as soon
            as possible.
          </div>
        )}

        {hasError && !isSubmitted && (
          <div className="mb-4 rounded-2xl border border-[#ffcdd2] bg-[#ffebee] px-4 py-3 text-sm text-[#c62828]">
            Please include a brief description of what you&apos;re seeing.
          </div>
        )}

        <section className="rounded-3xl border border-[#e0e0e0] bg-white px-6 py-8 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--dr-text)]">Tell us what&apos;s going on</h2>
          <p className="mt-2 text-xs text-[#757575]">
            Don&apos;t share your password or full payment details here. We&apos;ll never ask for
            those.
          </p>

          <form
            action={reportSecurityIssue}
            className="mt-5 space-y-4"
            aria-label="Security incident report form"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label
                  htmlFor="reporterName"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                >
                  Your name
                </label>
                <input
                  id="reporterName"
                  name="reporterName"
                  type="text"
                  defaultValue={currentUser?.displayName || ""}
                  className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  placeholder="How should we address you?"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="reporterEmail"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                >
                  Contact email
                </label>
                <input
                  id="reporterEmail"
                  name="reporterEmail"
                  type="email"
                  defaultValue={defaultEmail || ""}
                  className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  placeholder="Where can we reach you?"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="accountEmail"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                Account email
              </label>
              <input
                id="accountEmail"
                name="accountEmail"
                type="email"
                defaultValue={defaultEmail || ""}
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                placeholder="Email used for your Delicious Route account"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="role"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                I&apos;m a...
              </label>
              <select
                id="role"
                name="role"
                defaultValue={""}
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] focus:border-[var(--dr-primary)] focus:outline-none"
              >
                <option value="">Select one</option>
                <option value="vendor">Vendor (truck, pop-up, etc.)</option>
                <option value="customer">Customer / eater</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="category"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                What best describes the issue?
              </label>
              <select
                id="category"
                name="category"
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] focus:border-[var(--dr-primary)] focus:outline-none"
                defaultValue="account_changes"
              >
                <option value="account_changes">I see changes I didn&apos;t make</option>
                <option value="login_issues">I can&apos;t log in or got locked out</option>
                <option value="suspicious_messages">Suspicious emails, messages, or links</option>
                <option value="bug_or_vulnerability">Bug or possible vulnerability</option>
                <option value="other">Something else</option>
              </select>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="firstNoticedAt"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                When did you first notice this?
              </label>
              <input
                id="firstNoticedAt"
                name="firstNoticedAt"
                type="text"
                className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                placeholder="For example: Today around 3:15pm local time"
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="description"
                className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
              >
                What&apos;s happening?
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                required
                className="w-full resize-none rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                placeholder="Share as much detail as you can: what looks wrong, what you expected, and any recent changes to your account."
              />
            </div>

            <div className="flex flex-col gap-2 text-xs text-[#616161]">
              <p>
                For urgent issues, we also recommend changing your password and
                enabling any additional security measures available on your email
                account.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/40 hover:bg-[var(--dr-accent)]"
            >
              Submit report
            </button>

            <p className="text-[11px] text-[#9e9e9e]">
              We&apos;ll review your report as quickly as we can. Submitting this form
              doesn&apos;t replace contacting your email provider or bank if you suspect a
              broader account compromise.
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
