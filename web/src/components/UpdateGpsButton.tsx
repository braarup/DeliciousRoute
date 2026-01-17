"use client";

import { useState } from "react";

export function UpdateGpsButton() {
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setStatus(null);

    if (!("geolocation" in navigator)) {
      setStatus("Location is not available in this browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("/api/vendor/gps", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            if (data?.error === "closed") {
              setStatus("GPS can only be updated during your open hours.");
            } else {
              setStatus("Could not update GPS location. Please try again.");
            }
            setLoading(false);
            return;
          }

          setStatus("GPS location updated for your current session.");
        } catch (e) {
          setStatus("Network error while updating GPS location.");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setLoading(false);
        setStatus("Unable to access your location. Please allow location access.");
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  return (
    <div className="mt-4 space-y-1 text-xs">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full border border-[var(--dr-primary)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--dr-primary)] hover:bg-[var(--dr-primary)]/5 disabled:opacity-60"
      >
        {loading ? "Updating GPS..." : "Use my current GPS"}
      </button>
      {status && <p className="text-[11px] text-[#757575]">{status}</p>}
    </div>
  );
}
