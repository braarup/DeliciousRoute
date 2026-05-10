"use client";

import { useEffect, useRef, useState } from "react";

type PromoCodeScannerProps = {
  targetInputId: string;
};

type BarcodeWithRawValue = {
  rawValue?: string;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<BarcodeWithRawValue[]>;
    };
  }
}

export function PromoCodeScanner({ targetInputId }: PromoCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<{ detect: (source: CanvasImageSource) => Promise<BarcodeWithRawValue[]> } | null>(null);
  const rafRef = useRef<number | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<string>("");

  const writeCodeToInput = (code: string) => {
    const input = document.getElementById(targetInputId) as HTMLInputElement | null;
    if (!input) return;

    input.value = code;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  };

  const normalizeClaimCode = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return "";

    if (trimmed.startsWith("DRPROMO:")) {
      return trimmed.slice("DRPROMO:".length).trim();
    }

    return trimmed;
  };

  const stopScanner = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const scanLoop = async () => {
    if (!videoRef.current || !detectorRef.current) {
      return;
    }

    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      const rawValue = barcodes[0]?.rawValue || "";
      const claimCode = normalizeClaimCode(rawValue);

      if (claimCode) {
        writeCodeToInput(claimCode);
        setStatus(`Scanned: ${claimCode}`);
        stopScanner();
        return;
      }
    } catch {
      // Keep scanning; camera frames can intermittently fail detection.
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  };

  const startScanner = async () => {
    if (isScanning) return;

    const hasCamera =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";
    const hasDetector = typeof window !== "undefined" && !!window.BarcodeDetector;

    if (!hasCamera || !hasDetector || !window.BarcodeDetector) {
      setStatus("Camera QR scanning is not supported on this browser.");
      return;
    }

    detectorRef.current = new window.BarcodeDetector({ formats: ["qr_code"] });

    setStatus("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      rafRef.current = requestAnimationFrame(scanLoop);
    } catch {
      setStatus("Unable to access camera. You can still paste the claim code manually.");
      stopScanner();
    }
  };

  return (
    <div className="rounded-2xl border border-[#e0e0e0] bg-[var(--dr-neutral)] p-2">
      <div className="flex flex-wrap items-center gap-2">
        {!isScanning ? (
          <button
            type="button"
            onClick={startScanner}
            className="inline-flex items-center justify-center rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#616161]"
          >
            Start camera scan
          </button>
        ) : (
          <button
            type="button"
            onClick={stopScanner}
            className="inline-flex items-center justify-center rounded-full border border-[#e0e0e0] bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#616161]"
          >
            Stop scan
          </button>
        )}
        {status && <p className="text-[11px] text-[#616161]">{status}</p>}
      </div>

      <video
        ref={videoRef}
        muted
        playsInline
        className={`mt-2 h-40 w-full rounded-xl border border-[#e0e0e0] bg-black object-cover ${
          isScanning ? "block" : "hidden"
        }`}
      />
    </div>
  );
}
