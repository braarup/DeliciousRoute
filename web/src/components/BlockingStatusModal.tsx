"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  const [canClose, setCanClose] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsOpen(Boolean(message));
  }, [message]);

  useEffect(() => {
    if (!message) {
      setCanClose(false);
      return;
    }

    setCanClose(false);
    const timeoutId = window.setTimeout(() => {
      setCanClose(true);
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message]);

  if (!message || !isOpen || !isMounted) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-9999 flex items-start justify-center overflow-y-auto bg-black/55 px-4 pb-4 pt-[max(env(safe-area-inset-top),1rem)] sm:items-center sm:pt-4">
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
            disabled={!canClose}
            className="inline-flex items-center justify-center rounded-full bg-(--dr-primary) px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white disabled:cursor-not-allowed disabled:opacity-60 hover:bg-(--dr-accent)"
          >
            {canClose ? "Close" : "Please wait..."}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
