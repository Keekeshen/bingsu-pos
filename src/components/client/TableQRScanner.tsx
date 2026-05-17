"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { QrCode, X, CameraOff, ScanLine } from "lucide-react";

const SCAN_INTERVAL_MS = 150;

const TABLE_SLUG_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function TableQRScanner() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "requesting" | "scanning" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastRef = useRef<string | null>(null);
  const router = useRouter();

  const stop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    lastRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setStatus("scanning");
      lastRef.current = null;
      intervalRef.current = setInterval(decode, SCAN_INTERVAL_MS);
    } catch {
      setStatus("error");
      setErrorMsg("Camera access denied. Please allow camera and try again.");
    }

  function decode() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
    if (!code) return;
    const val = code.data.trim();
    if (val === lastRef.current) return;
    lastRef.current = val;

    let slug: string | null = null;
    const fromUrl = val.match(/\/order\/([^/?#]+)/i)?.[1];
    if (fromUrl && TABLE_SLUG_RE.test(fromUrl)) slug = fromUrl;
    else if (TABLE_SLUG_RE.test(val)) slug = val;

    if (slug) {
      stop();
      setOpen(false);
      router.push(`/order/${slug}`);
      return;
    }

    setTimeout(() => { lastRef.current = null; }, 2000);
  }

  function handleOpen() { setOpen(true); setStatus("idle"); setErrorMsg(""); }
  function handleClose() { stop(); setOpen(false); setStatus("idle"); }

  useEffect(() => {
    if (open) start();
    return () => stop();
  }, [open, start, stop]);

  useEffect(() => () => stop(), [stop]);

  return (
    <>
      <button
        onClick={handleOpen}
        className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
        aria-label="Scan table QR code"
      >
        <QrCode className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80">
            <p className="text-sm font-semibold text-white">Scan Table QR Code</p>
            <button onClick={handleClose} className="rounded-full p-1.5 text-white hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Camera */}
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" />

            {status === "scanning" && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-56 w-56">
                    <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-white" />
                    <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-white" />
                    <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-white" />
                    <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-white" />
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-[calc(50%-7rem)] top-[calc(50%-7rem)] h-56 overflow-hidden">
                  <div className="animate-scan-line h-0.5 w-full bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                </div>
              </>
            )}

            {status === "requesting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <p className="text-sm">Starting camera...</p>
              </div>
            )}

            {status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center text-white">
                <CameraOff className="h-12 w-12 text-red-400" />
                <p className="text-sm leading-relaxed">{errorMsg}</p>
                <button onClick={start} className="rounded-xl border border-white/30 px-4 py-2 text-sm text-white hover:bg-white/10">
                  Retry
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 bg-black/80 px-4 py-4 text-xs text-white/60" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}>
            <ScanLine className="h-3.5 w-3.5" />
            Point camera at the table QR code to order
          </div>
        </div>
      )}
    </>
  );
}
