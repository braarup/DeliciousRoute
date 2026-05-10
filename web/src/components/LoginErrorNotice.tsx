"use client";

import { useSearchParams } from "next/navigation";

export function LoginErrorNotice({
  includeAlreadyRegistered,
}: {
  includeAlreadyRegistered?: boolean;
}) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (!error) return null;

  let message: string;

  if (error === "missing_fields") {
    message = "Please enter both email and password.";
  } else if (includeAlreadyRegistered && error === "already_registered") {
    message =
      "An account already exists for that email. Please sign in instead.";
  } else if (error === "account_locked") {
    message =
      "Your account has been temporarily locked after several failed sign-in attempts. Please check your email for a password reset link to unlock it.";
  } else if (error === "email_unverified") {
    message =
      "Your email address is not verified yet. Please check your inbox for the verification link.";
  } else if (error === "email_delivery_failed") {
    message =
      "We could not send an email right now. Please try again in a moment.";
  } else if (error === "mfa_expired") {
    message =
      "Your sign-in code expired. Please sign in again to request a new code.";
  } else {
    message = "Email or password was incorrect. Please try again.";
  }

  return <p className="text-xs text-red-600">{message}</p>;
}
