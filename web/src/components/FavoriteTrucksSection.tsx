"use client";

import { useState } from "react";
import Link from "next/link";
import { FavoriteButton } from "./FavoriteButton";
import { slugifyVendorName } from "@/lib/slug";

export type FavoriteVendor = {
  id: string;
  name: string | null;
  cuisine_style: string | null;
  primary_region: string | null;
  profile_image_path: string | null;
};

type FavoriteTrucksSectionProps = {
  favoriteVendors: FavoriteVendor[];
};

export function FavoriteTrucksSection({ favoriteVendors }: FavoriteTrucksSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [vendors, setVendors] = useState(favoriteVendors);

  const hasFavorites = vendors.length > 0;

  return (
    <section className="mt-6 space-y-3 rounded-3xl border border-[#e0e0e0] bg-white p-5 text-sm text-[#424242] shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-[var(--dr-text)]">
            Favorite trucks
          </h2>
          <p className="text-xs text-[#757575]">
            Trucks you&apos;ve favorited across Delicious Route.
          </p>
        </div>
        {hasFavorites && (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)] hover:underline"
          >
            View list
          </button>
        )}
      </div>

      {!hasFavorites ? (
        <p className="mt-2 text-xs text-[#9e9e9e]">
          You haven&apos;t favorited any trucks yet. Tap the heart icon on a
          vendor card or profile to save it here.
        </p>
      ) : (
        <p className="mt-1 text-[11px] text-[#9e9e9e]">
          You have {vendors.length} favorite
          {vendors.length === 1 ? " truck." : " trucks."}
        </p>
      )}

      {isOpen && hasFavorites && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-3xl border border-[#e0e0e0] bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-[#e0e0e0] px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-[var(--dr-text)]">
                  Your favorite trucks
                </h3>
                <p className="text-[11px] text-[#757575]">
                  Tap a truck to open its profile.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-[#e0e0e0] bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#757575] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]"
              >
                Close
              </button>
            </div>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto px-4 py-3">
              {vendors.map((vendor) => (
                <Link
                  key={vendor.id}
                  href={`/vendor/${slugifyVendorName(vendor.name, vendor.id)}`}
                  className="flex items-center gap-3 rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-xs text-[var(--dr-text)] hover:border-[var(--dr-primary)]/60 hover:bg-white"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="h-9 w-9 overflow-hidden rounded-full border border-[#e0e0e0] bg-white">
                    <img
                      src={vendor.profile_image_path || "/icon_01.png"}
                      alt="Vendor profile"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {vendor.name || "Untitled venue"}
                    </p>
                    <p className="text-[11px] text-[#757575]">
                      {vendor.cuisine_style || "Food truck"}
                      {vendor.primary_region && (
                        <>
                          <span className="mx-1">•</span>
                          {vendor.primary_region}
                        </>
                      )}
                    </p>
                  </div>
                  <FavoriteButton
                    vendorId={vendor.id}
                    initialCount={(vendor as any).favorite_count ?? 0}
                    initialFavorited={true}
                    onToggle={(favorited) => {
                      if (!favorited) {
                        setVendors((prev) => {
                          const next = prev.filter((v) => v.id !== vendor.id);
                          if (next.length === 0) {
                            setIsOpen(false);
                          }
                          return next;
                        });
                      }
                    }}
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
