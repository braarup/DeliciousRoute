"use client";

import { useEffect, useState } from "react";

type BlockingStatusModalProps = {
  title: string;
  message: string;
  isError?: boolean;
};

export function BlockingStatusModal({
  title,
  message,
  isError = false,
}: BlockingStatusModalProps) {
  const [isOpen, setIsOpen] = useState(Boolean(message));

  useEffect(() => {
    setIsOpen(Boolean(message));
  }, [message]);

  if (!message || !isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#e0e0e0] bg-white p-4 shadow-xl">
        <p
          className={`text-xs font-semibold uppercase tracking-[0.2em] ${
            isError ? "text-[#c62828]" : "text-[#2e7d32]"
          }`}
        >
          {title}
        </p>
        <p className="mt-2 text-sm text-[#424242]">{message}</p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="inline-flex items-center justify-center rounded-full bg-[var(--dr-primary)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white hover:bg-[var(--dr-accent)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
