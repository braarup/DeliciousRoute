"use client";

import { useState } from "react";

type Props = {
  action: (formData: FormData) => Promise<void>;
  photoCount: number;
  starterPhotoLimit: number;
  hasMenu: boolean;
};

export function TierDowngradeButton({
  action,
  photoCount,
  starterPhotoLimit,
  hasMenu,
}: Props) {
  const [open, setOpen] = useState(false);
  const excessPhotos = Math.max(0, photoCount - starterPhotoLimit);

  const warnings: string[] = [];
  if (excessPhotos > 0) {
    warnings.push(
      `${excessPhotos} photo${excessPhotos !== 1 ? "s" : ""} over the ${starterPhotoLimit}-photo Starter limit will be permanently removed`,
    );
  }
  warnings.push("All Grub Reels will be permanently removed");
  if (hasMenu) {
    warnings.push("All menu items will be permanently removed");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#616161] hover:border-red-400 hover:text-red-600"
      >
        Downgrade to Starter
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="downgrade-dialog-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h2
              id="downgrade-dialog-title"
              className="text-sm font-semibold text-[var(--dr-text)]"
            >
              Downgrade to Starter?
            </h2>
            <p className="mt-2 text-xs text-[#616161]">
              Downgrading will <strong>permanently remove</strong> the following
              content that is not included in the Starter tier:
            </p>
            <ul className="mt-3 space-y-2">
              {warnings.map((w) => (
                <li key={w} className="flex items-start gap-2 text-xs text-red-600">
                  <span aria-hidden className="mt-px shrink-0 text-red-500">
                    ⚠
                  </span>
                  {w}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-[#9e9e9e]">
              This cannot be undone. You may upgrade again later, but removed
              content will not be restored.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-full border border-[#e0e0e0] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#616161] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]"
              >
                Cancel
              </button>
              <form action={action} className="flex-1">
                <input type="hidden" name="tier" value="starter" />
                <button
                  type="submit"
                  className="w-full rounded-full bg-red-600 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white hover:bg-red-700"
                >
                  Downgrade &amp; remove
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
