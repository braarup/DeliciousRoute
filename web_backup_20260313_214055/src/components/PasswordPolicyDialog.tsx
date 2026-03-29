"use client";

import { useState } from "react";
import { PASSWORD_POLICY_SUMMARY } from "@/lib/passwordPolicy";

export function PasswordPolicyDialog() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[0.7rem] font-medium text-[var(--dr-primary)] underline underline-offset-2 hover:text-[var(--dr-accent)]"
      >
        View password policy
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 text-xs text-[var(--dr-text)] shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-[#757575]">
                Password policy
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-[0.7rem] text-[#9e9e9e] hover:text-[var(--dr-text)]"
                aria-label="Close password policy"
              >
                Close
              </button>
            </div>
            <p className="mb-2 leading-snug">{PASSWORD_POLICY_SUMMARY}</p>
            <ul className="list-disc space-y-1 pl-4">
              <li>At least 8 characters long.</li>
              <li>At least one uppercase letter (A-Z).</li>
              <li>At least one number (0-9).</li>
              <li>At least one special character (for example ! @ # $ %).</li>
              <li>Cannot reuse any of your last 3 passwords.</li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
