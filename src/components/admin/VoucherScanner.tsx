"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff, X, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Props = {
  onCodeScanned: (code: string) => void;
};

type ScanState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "scanning" }
  | { status: "error"; message: string };

const SCAN_INTERVAL_MS = 150;

export default function VoucherScanner({ onCodeScanned }: Props) {
  const [open, setOpen] = useState(false);
  const [scanState, setScanState] = useState<ScanState>({ status: "idle" });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastDecodedRef = useRef<string | null>(null);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    lastDecodedRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    setScanState({ status: "requesting" });
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
    } catch (err) {
      const msg = err instanceof DOMException && err.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access."
        : "Could not access camera.";
      setScanState({ status: "error", message: msg });
      return;
    }
    streamRef.current = stream;
    if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
    setScanState({ status: "scanning" });
    lastDecodedRef.current = null;
    intervalRef.current = setInterval(decodeFrame, SCAN_INTERVAL_MS);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function decodeFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
    if (!code) return;
    const value = code.data.trim().toUpperCase();
    if (value === lastDecodedRef.current) return;
    lastDecodedRef.current = value;
    stopCamera();
    setOpen(false);
    setScanState({ status: "idle" });
    onCodeScanned(value);
  }

  function handleOpen() { setOpen(true); setScanState({ status: "idle" }); }
  function handleClose() { stopCamera(); setOpen(false); setScanState({ status: "idle" }); }

  useEffect(() => { if (open) startCamera(); return () => stopCamera(); }, [open, startCamera, stopCamera]);
  useEffect(() => () => stopCamera(), [stopCamera]);

  return (
    <>
      <Button variant="outline" size="sm" className="h-9 shrink-0 px-2 gap-1 text-xs" onClick={handleOpen} aria-label="Scan voucher QR">
        <Camera className="h-3.5 w-3.5" />Scan
      </Button>

      <Dialog open={open} onOpenChange={o => !o && handleClose()}>
        <DialogContent className="max-w-sm gap-0 overflow-hidden p-0">
          <DialogHeader className="flex-row items-center justify-between px-4 py-3">
            <DialogTitle className="text-sm">Scan Voucher QR</DialogTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>

          <div className="relative aspect-square w-full overflow-hidden bg-black">
            <video ref={videoRef} className="h-full w-full object-cover" playsInline muted />
            <canvas ref={canvasRef} className="hidden" aria-hidden />

            {scanState.status === "scanning" && (
              <>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="relative h-48 w-48">
                    <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-2 border-t-2 border-white" />
                    <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-2 border-t-2 border-white" />
                    <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-2 border-l-2 border-white" />
                    <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-white" />
                  </div>
                </div>
                <div className="pointer-events-none absolute inset-x-[calc(50%-6rem)] top-[calc(50%-6rem)] h-48 overflow-hidden">
                  <div className="animate-scan-line h-0.5 w-full bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
                </div>
              </>
            )}

            {scanState.status === "requesting" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60 text-white">
                <Camera className="h-8 w-8 animate-pulse" />
                <p className="text-sm">Requesting camera…</p>
              </div>
            )}

            {scanState.status === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center text-white">
                <CameraOff className="h-10 w-10 text-red-400" />
                <p className="text-sm leading-relaxed">{scanState.message}</p>
                <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:text-white" onClick={startCamera}>Retry</Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 px-4 py-3 text-xs text-zinc-500">
            <ScanLine className="h-3.5 w-3.5" />
            Point camera at the voucher QR code
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
