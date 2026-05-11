"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";

type PromoCodeScannerProps = {
  targetInputId: string;
};

export function PromoCodeScanner({ targetInputId }: PromoCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState<string>("");

  const writeCodeToInput = (code: string) => {
    const input = document.getElementById(
      targetInputId,
    ) as HTMLInputElement | null;
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
    controlsRef.current?.stop();
    controlsRef.current = null;

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

  const startScanner = async () => {
    if (isScanning) return;

    const hasCamera =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";

    if (!hasCamera) {
      setStatus("Camera QR scanning is not supported on this browser.");
      return;
    }

    if (!readerRef.current) {
      readerRef.current = new BrowserQRCodeReader();
    }

    setStatus("");
    setIsScanning(true);

    try {
      const videoElement = videoRef.current;

      if (!videoElement) {
        setStatus("Unable to start the camera preview.");
        stopScanner();
        return;
      }

      const controls = await readerRef.current.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
          },
        },
        videoElement,
        (result, error, scanControls) => {
          if (result) {
            const claimCode = normalizeClaimCode(result.getText());
            if (claimCode) {
              writeCodeToInput(claimCode);
              setStatus(`Scanned: ${claimCode}`);
              scanControls.stop();
              controlsRef.current = null;
              setIsScanning(false);
            }
          }

          if (error && !(error as { name?: string }).name?.includes("NotFound")) {
            // Keep scanning on transient decode errors.
          }
        },
      );

      controlsRef.current = controls;

      if (videoRef.current) {
        await videoRef.current.play().catch(() => {
          // Ignore play() rejections on iOS; decode can still proceed.
        });
      }
    } catch {
      setStatus(
        "Unable to access camera. You can still paste the claim code manually.",
      );
      stopScanner();
    }
  };

  return (
    <div className="rounded-2xl border border-[#e0e0e0] bg-(--dr-neutral) p-2">
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
