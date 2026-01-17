"use client";

import { useState, useTransition, MouseEvent } from "react";

type FavoriteButtonProps = {
  vendorId: string;
  initialCount: number;
  initialFavorited: boolean;
};

export function FavoriteButton({
  vendorId,
  initialCount,
  initialFavorited,
}: FavoriteButtonProps) {
  const [count, setCount] = useState(initialCount);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [isPending, startTransition] = useTransition();

  const handleClick = (event?: MouseEvent<HTMLButtonElement>) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    startTransition(async () => {
      const previous = { favorited, count };
      try {
        // Optimistic update
        const nextFavorited = !favorited;
        setFavorited(nextFavorited);
        setCount((c) => Math.max(0, c + (nextFavorited ? 1 : -1)));

        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ vendorId }),
        });

        if (res.status === 401) {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          throw new Error("Unauthorized");
        }

        if (!res.ok) {
          throw new Error("Failed to update favorite");
        }

        const data = await res.json();
        if (typeof data.favoriteCount === "number") {
          setCount(data.favoriteCount);
        }
        if (typeof data.favorited === "boolean") {
          setFavorited(data.favorited);
        }
      } catch (error) {
        console.error("Error toggling favorite", error);
        // Revert on error
        setFavorited(previous.favorited);
        setCount(previous.count);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] transition " +
        (favorited
          ? "border-[var(--dr-primary)] bg-[var(--dr-primary)]/10 text-[var(--dr-primary)]"
          : "border-[#e0e0e0] bg-white text-[#616161] hover:border-[var(--dr-primary)] hover:text-[var(--dr-primary)]")
      }
    >
      <span aria-hidden className="flex h-4 w-4 items-center justify-center">
        <img
          src="/fav-icon.png"
          alt={favorited ? "Favorited" : "Favorite"}
          className="h-4 w-4 object-contain"
        />
      </span>
      <span className="text-[10px] text-[#9e9e9e]">{count}</span>
    </button>
  );
}
