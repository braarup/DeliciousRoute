"use client";

import { useState } from "react";

export function SignupRoleFields({
  defaultType,
}: {
  defaultType: "customer" | "vendor";
}) {
  const [accountType, setAccountType] = useState<"customer" | "vendor">(
    defaultType,
  );

  return (
    <>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]">
          I&apos;m signing up as
        </legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-xs font-medium text-[var(--dr-text)] hover:border-[var(--dr-primary)]">
            <input
              type="radio"
              name="accountType"
              value="customer"
              checked={accountType === "customer"}
              onChange={() => setAccountType("customer")}
              className="h-3 w-3 text-[var(--dr-primary)] focus:ring-[var(--dr-primary)]"
            />
            <span>Customer</span>
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-xs font-medium text-[var(--dr-text)] hover:border-[var(--dr-primary)]">
            <input
              type="radio"
              name="accountType"
              value="vendor"
              checked={accountType === "vendor"}
              onChange={() => setAccountType("vendor")}
              className="h-3 w-3 text-[var(--dr-primary)] focus:ring-[var(--dr-primary)]"
            />
            <span>Vendor</span>
          </label>
        </div>
        <p className="text-[0.7rem] text-[#9e9e9e]">
          Vendors can manage their truck profile, locations, and hours.
          Customers can save favorites and preferences.
        </p>
      </fieldset>

      {accountType === "vendor" ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]">
            Vendor tier
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-xs text-[var(--dr-text)] hover:border-[var(--dr-primary)]">
              <input
                type="radio"
                name="vendorTier"
                value="starter"
                defaultChecked
                className="mt-0.5 h-3 w-3 text-[var(--dr-primary)] focus:ring-[var(--dr-primary)]"
              />
              <span>
                <strong className="block">Starter</strong>
                <span className="text-[#757575]">
                  $29/month. Vendor listing, profile, GPS updates, social links,
                  website, favorite count, up to 5 photos.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-xs text-[var(--dr-text)] hover:border-[var(--dr-primary)]">
              <input
                type="radio"
                name="vendorTier"
                value="growth"
                className="mt-0.5 h-3 w-3 text-[var(--dr-primary)] focus:ring-[var(--dr-primary)]"
              />
              <span>
                <strong className="block">Growth</strong>
                <span className="text-[#757575]">
                  $59/month. Everything in Starter, up to 10 photos, menu
                  uploads, Grub Reels, Verified Vendor badge.
                </span>
              </span>
            </label>
          </div>
          <p className="text-[0.7rem] text-[#9e9e9e]">
            If you sign up as a customer, this setting is ignored.
          </p>
        </fieldset>
      ) : null}
    </>
  );
}
