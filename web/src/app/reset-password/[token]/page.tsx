"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function ResetPasswordTokenPage({
  params,
}: {
  params: { token: string };
}) {
  const { token } = params;
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error" | "invalid"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const formData = new FormData(event.currentTarget);
    const password = (formData.get("password") || "").toString();
    const confirm = (formData.get("confirmPassword") || "").toString();

    if (password !== confirm) {
      setStatus("error");
      setError("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.error === "invalid_or_expired") {
          setStatus("invalid");
        } else if (data?.error === "weak_password") {
          setStatus("error");
          setError(
            "Password must be at least 8 characters long and include at least one uppercase letter, one number, and one special character."
          );
        } else if (data?.error === "recent_password") {
          setStatus("error");
          setError(
            "Your new password cannot be the same as any of your last 3 passwords."
          );
        } else if (data?.error === "server_error") {
          setStatus("error");
          setError(
            "We ran into a problem updating your password. Please try again in a moment. If this keeps happening, contact support."
          );
        } else {
          setStatus("error");
          setError("Something went wrong. Please try again.");
        }
        return;
      }

      setStatus("success");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setError("Something went wrong. Please try again.");
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
            Choose a new password
          </h1>
        </header>

        <main className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
          {status === "success" ? (
            <div className="space-y-3 text-sm">
              <p className="text-[var(--dr-text)]">Your password has been updated.</p>
              <p className="text-xs text-[#616161]">
                You can now sign in with your new password.
              </p>
              <p className="text-xs text-[#616161]">
                <Link
                  href="/login"
                  className="font-semibold text-[var(--dr-primary)] hover:underline"
                >
                  Go to sign in
                </Link>
              </p>
            </div>
          ) : status === "invalid" ? (
            <div className="space-y-3 text-sm">
              <p className="text-[var(--dr-text)]">
                This reset link is invalid or has expired.
              </p>
              <p className="text-xs text-[#616161]">
                You can request a new link from the reset page.
              </p>
              <p className="text-xs text-[#616161]">
                <Link
                  href="/reset-password"
                  className="font-semibold text-[var(--dr-primary)] hover:underline"
                >
                  Request new reset link
                </Link>
              </p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <label
                  htmlFor="password"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                >
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  placeholder="Enter a new password"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                >
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                  placeholder="Re-enter your new password"
                />
              </div>

              <button
                type="submit"
                disabled={status === "submitting"}
                className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)] disabled:opacity-75"
              >
                {status === "submitting" ? "Updating..." : "Update password"}
              </button>

              {error ? <p className="text-xs text-red-600">{error}</p> : null}

              <p className="mt-3 text-xs text-[#616161]">
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
