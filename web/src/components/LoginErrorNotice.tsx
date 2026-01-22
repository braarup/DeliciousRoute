"use client";

import { useSearchParams } from "next/navigation";

export function LoginErrorNotice({ includeAlreadyRegistered }: { includeAlreadyRegistered?: boolean }) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  if (!error) return null;

  let message: string;

  if (error === "missing_fields") {
    message = "Please enter both email and password.";
  } else if (includeAlreadyRegistered && error === "already_registered") {
    message = "An account already exists for that email. Please sign in instead.";
  } else if (error === "account_locked") {
    message =
      "Your account has been temporarily locked after several failed sign-in attempts. Reset your password using the link below to unlock it.";
  } else {
    message = "Email or password was incorrect. Please try again.";
  }

  return <p className="text-xs text-red-600">{message}</p>;
}
