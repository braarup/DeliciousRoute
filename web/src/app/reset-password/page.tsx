"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function RequestResetPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const formData = new FormData(event.currentTarget);
    const email = (formData.get("email") || "").toString().trim();

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setStatus("error");
        return;
      }

      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-[var(--dr-neutral)] text-[var(--dr-text)]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--dr-primary)]">
            Reset password
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[var(--dr-text)]">
            Forgot your password?
          </h1>
          <p className="mt-1 text-sm text-[#616161]">
            Enter the email associated with your account. If it exists, we&apos;ll send a reset link.
          </p>
        </header>

        <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          {status === "success" ? (
            <div className="space-y-3 text-sm">
              <p className="text-[var(--dr-text)]">
                If an account exists for that email, a password reset link has been sent.
              </p>
              <p className="text-xs text-[#616161]">
                For local development, check the server logs for the reset link URL.
              </p>
              <p className="text-xs text-[#616161]">
                <Link href="/login" className="font-semibold text-[var(--dr-primary)] hover:underline">
                  Back to sign in
                </Link>
              </p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
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

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)] disabled:opacity-75"
              >
                {status === "submitting" ? "Sending..." : "Send reset link"}
              </button>

              {status === "error" ? (
                <p className="text-xs text-red-600">
                  Something went wrong. Please try again.
                </p>
              ) : null}

              <p className="mt-3 text-xs text-[#616161]">
                Remembered your password?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-[var(--dr-primary)] hover:underline"
                >
                  Back to sign in
                </Link>
                .
              </p>
            </form>
          )}
        </main>
      </div>
    </div>
  );
}
