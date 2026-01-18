"use client";

import { useState } from "react";

export type VendorMenuItem = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  is_gluten_free: boolean | null;
  is_spicy: boolean | null;
  is_vegan: boolean | null;
  is_vegetarian: boolean | null;
};

interface Props {
  items: VendorMenuItem[];
}

const formatPrice = (priceCents: number | null) => {
  if (priceCents == null) return "";
  const dollars = (priceCents / 100).toFixed(2);
  return `$${dollars}`;
};

function DietaryIcons({ item }: { item: VendorMenuItem }) {
  const icons: JSX.Element[] = [];

  if (item.is_gluten_free) {
    icons.push(
      <span
        key="gf"
        className="inline-flex h-5 w-5 items-center justify-center text-[#43A047]"
        aria-label="Gluten free"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="#43A047" />
          <path
            d="M8.5 12.5 11 15l4.5-5"
            fill="none"
            stroke="#ffffff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  if (item.is_spicy) {
    icons.push(
      <span
        key="spicy"
        className="inline-flex h-5 w-5 items-center justify-center text-[#E53935]"
        aria-label="Spicy"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M9 3c1.5 1.2 2.5 2.8 2.8 4.6.9-.6 1.7-1.1 2.7-1.1 2.2 0 4 1.8 4 4.3 0 3.7-2.8 6.9-6.5 6.9-3.3 0-5.5-2.3-5.5-5.3 0-2.1 1.2-3.7 2.5-4.9C8.7 6.1 8.6 4.6 9 3Z"
            fill="#E53935"
          />
        </svg>
      </span>
    );
  }

  if (item.is_vegan) {
    icons.push(
      <span
        key="vegan"
        className="inline-flex h-5 w-5 items-center justify-center text-[#43A047]"
        aria-label="Vegan"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M5 13c3.5 0 5.6-2.4 6.5-5.5 2.2 0 4 1.8 4 4.2 0 3.7-2.8 6.8-6.5 6.8-1.7 0-3.1-.7-4-1.8C5.3 15.8 5.9 14.6 5 13Z"
            fill="#43A047"
          />
        </svg>
      </span>
    );
  }

  if (item.is_vegetarian && !item.is_vegan) {
    icons.push(
      <span
        key="vegetarian"
        className="inline-flex h-5 w-5 items-center justify-center text-[#43A047]"
        aria-label="Vegetarian"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path
            d="M6 13c2.6-.3 4.4-1.8 5.3-3.9C13.7 9.4 15 11 15 13.3 15 16.7 12.7 19 9.8 19 8 19 6.7 18.3 5.8 17.1 6.2 16 6.5 14.6 6 13Z"
            fill="#43A047"
          />
        </svg>
      </span>
    );
  }

  if (icons.length === 0) return null;

  return <div className="flex flex-wrap items-center gap-1">{icons}</div>;
}

export function VendorMenuSection({ items }: Props) {
  const [selectedItem, setSelectedItem] = useState<VendorMenuItem | null>(null);

  if (!items || items.length === 0) {
    return (
      <section className="rounded-3xl border border-[#e0e0e0] bg-white p-4 text-sm text-[#424242] shadow-sm">
        <h3 className="text-sm font-semibold text-[var(--dr-text)]">Menu</h3>
        <p className="mt-1 text-xs text-[#757575]">
          This vendor hasn&apos;t added menu items yet.
        </p>
      </section>
    );
  }

  const handleClose = () => setSelectedItem(null);

  const visibleItems = items;

  return (
    <>
      <section className="rounded-3xl border border-[#e0e0e0] bg-white p-4 text-sm text-[#424242] shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--dr-text)]">Menu</h3>
          <span className="text-[11px] text-[#9e9e9e]">
            {items.length} item{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
          {visibleItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedItem(item)}
              className="w-full rounded-2xl border border-[#eeeeee] bg-[var(--dr-neutral)] px-3 py-2 text-left text-xs text-[#424242] hover:border-[var(--dr-accent)] hover:bg-white"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[13px] font-semibold text-[var(--dr-text)]">
                  {item.name}
                </p>
                {item.price_cents != null && (
                  <p className="whitespace-nowrap text-[13px] font-semibold text-[var(--dr-accent)]">
                    {formatPrice(item.price_cents)}
                  </p>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1">
                <DietaryIcons item={item} />
              </div>
              {item.description && (
                <p className="mt-1 line-clamp-2 text-[11px] text-[#616161]">
                  {item.description}
                </p>
              )}
            </button>
          ))}
        </div>
      </section>

      {selectedItem && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 px-4 py-10">
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-5 text-sm text-[#424242] shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-2 text-xs text-[#757575]">
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#757575] hover:text-[var(--dr-primary)]"
              >
                <span aria-hidden>←</span>
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                className="text-lg leading-none text-[#9e9e9e] hover:text-[#616161]"
                aria-label="Close menu item details"
              >
                ×
              </button>
            </div>

            <h2 className="text-xl font-semibold text-[var(--dr-text)]">
              {selectedItem.name}
            </h2>
            {selectedItem.description && (
              <p className="mt-2 text-sm text-[#616161]">
                {selectedItem.description}
              </p>
            )}

            {selectedItem.price_cents != null && (
              <p className="mt-4 text-lg font-semibold text-[var(--dr-accent)]">
                {formatPrice(selectedItem.price_cents)}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <DietaryIcons item={selectedItem} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
