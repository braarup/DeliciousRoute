"use client";

import { useState, useRef, FormEvent, useEffect } from "react";
import { createPortal } from "react-dom";

export type VendorManageMenuItem = {
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
  items: VendorManageMenuItem[];
  // Server actions from the vendor manage page; they may return data.
  // Use broad types here so changes to the server-side return shape
  // don't break the client component.
  addMenuItem: (formData: FormData) => any;
  deleteMenuItem: (formData: FormData) => any;
}

const formatPrice = (priceCents: number | null) => {
  if (priceCents == null) return "";
  const dollars = (priceCents / 100).toFixed(2);
  return `$${dollars}`;
};

export function VendorManageMenuSection({
  items,
  addMenuItem,
  deleteMenuItem,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<VendorManageMenuItem[]>(items);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleAddItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!formRef.current) return;

    const formData = new FormData(formRef.current);
    formData.set("fromManageMenuModal", "1");
    setIsSaving(true);
    setFeedback(null);

    try {
      const result = (await addMenuItem(formData)) as any;

      if (result && result.id) {
        setMenuItems((prev) => [...prev, result as VendorManageMenuItem]);
        formRef.current.reset();
        setFeedback("Item added. You can add another or close this window when you're done.");
      }
    } catch (error) {
      setFeedback("There was a problem saving this item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const formData = new FormData();
    formData.set("menuItemId", id);
    formData.set("fromManageMenuModal", "1");

    await deleteMenuItem(formData);
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="rounded-3xl border border-[#e0e0e0] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--dr-text)]">
            Menu items
          </h2>
          <p className="mt-1 text-xs text-[#757575]">
            Add a few of your signature dishes. These show on your
            public profile with dietary icons.
          </p>
          {menuItems.length > 0 && (
            <p className="mt-1 text-[11px] text-[#9e9e9e]">
              You currently have {menuItems.length} menu item
              {menuItems.length === 1 ? "" : "s"}.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center rounded-full border border-[var(--dr-primary)]/50 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)] shadow-sm hover:bg-[var(--dr-primary)] hover:text-white"
        >
          Create menu
        </button>
      </div>

      {mounted && isOpen &&
        createPortal(
          <div className="fixed inset-0 z-40 flex flex-col bg-white">
          <div className="flex items-center justify-between border-b border-[#e0e0e0] bg-[var(--dr-neutral)]/80 px-4 py-3 text-xs text-[#757575]">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#757575] hover:text-[var(--dr-primary)]"
            >
              <span aria-hidden>←</span>
              <span>Back</span>
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-lg leading-none text-[#9e9e9e] hover:text-[#616161]"
              aria-label="Close menu manager"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-6 pt-4 text-sm text-[#424242]">
            <h2 className="text-sm font-semibold text-[var(--dr-text)]">
              Manage your menu
            </h2>
            <p className="mt-1 text-xs text-[#757575]">
              Add new dishes and review your current menu items.
            </p>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)]">
              <div className="space-y-3 text-sm">
                <form
                  ref={formRef}
                  onSubmit={handleAddItem}
                  className="space-y-2 text-xs"
                >
                  <div className="space-y-1">
                    <label
                      htmlFor="menuItemTitle"
                      className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                    >
                      Dish name
                    </label>
                    <input
                      id="menuItemTitle"
                      name="menuItemTitle"
                      type="text"
                      placeholder="e.g. Vegan taco plate"
                      className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor="menuItemDescription"
                      className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                    >
                      Short description
                    </label>
                    <textarea
                      id="menuItemDescription"
                      name="menuItemDescription"
                      rows={3}
                      placeholder="3 vegan street tacos served with corn tortillas..."
                      className="w-full resize-none rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-end gap-3">
                    <div className="space-y-1">
                      <label
                        htmlFor="menuItemPrice"
                        className="text-xs font-medium uppercase tracking-[0.18em] text-[#757575]"
                      >
                        Price
                      </label>
                      <input
                        id="menuItemPrice"
                        name="menuItemPrice"
                        type="text"
                        placeholder="$12.00"
                        className="w-full rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] px-3 py-2 text-sm text-[var(--dr-text)] placeholder:text-[#bdbdbd] focus:border-[var(--dr-primary)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-[#757575]">
                        Dietary tags
                      </p>
                      <div className="flex flex-wrap gap-2 text-[0.7rem] text-[#616161]">
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            name="menuItemGlutenFree"
                            className="h-3 w-3 text-[var(--dr-primary)] focus:ring-[var(--dr-primary)]"
                          />
                          <span>Gluten free</span>
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            name="menuItemSpicy"
                            className="h-3 w-3 text-[var(--dr-primary)] focus:ring-[var(--dr-primary)]"
                          />
                          <span>Spicy</span>
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            name="menuItemVegan"
                            className="h-3 w-3 text-[var(--dr-primary)] focus:ring-[var(--dr-primary)]"
                          />
                          <span>Vegan</span>
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            name="menuItemVegetarian"
                            className="h-3 w-3 text-[var(--dr-primary)] focus:ring-[var(--dr-primary)]"
                          />
                          <span>Vegetarian</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-sm shadow-[var(--dr-primary)]/50 hover:bg-[var(--dr-accent)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSaving ? "Saving..." : "Add item"}
                    </button>
                    {feedback && (
                      <p className="mt-1 text-[11px] text-[#616161]">{feedback}</p>
                    )}
                  </div>
                </form>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-[#757575]">
                  Current menu
                </p>
                {menuItems.length === 0 ? (
                  <p className="text-[11px] text-[#9e9e9e]">
                    No items yet. Add your first dish on the left.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {menuItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-2xl bg-[var(--dr-neutral)] px-3 py-2"
                      >
                        <div className="min-w-0 text-[11px] text-[#424242]">
                          <p className="font-semibold text-[var(--dr-text)]">
                            {item.name}
                          </p>
                          {item.description && (
                            <p className="mt-0.5 text-[11px] text-[#616161]">
                              {item.description}
                            </p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-[#757575]">
                            {item.is_gluten_free && (
                              <span className="rounded-full bg-white/80 px-2 py-0.5">
                                Gluten free
                              </span>
                            )}
                            {item.is_spicy && (
                              <span className="rounded-full bg-white/80 px-2 py-0.5">
                                Spicy
                              </span>
                            )}
                            {item.is_vegan && (
                              <span className="rounded-full bg-white/80 px-2 py-0.5">
                                Vegan
                              </span>
                            )}
                            {item.is_vegetarian && (
                              <span className="rounded-full bg-white/80 px-2 py-0.5">
                                Vegetarian
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 text-[11px]">
                          {item.price_cents != null && (
                            <span className="font-semibold text-[var(--dr-accent)]">
                              {formatPrice(item.price_cents)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9e9e9e] hover:text-red-500"
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
}
