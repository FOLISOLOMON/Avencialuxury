"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, Loader2, AlertTriangle, RefreshCw, Zap } from "lucide-react";

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  hint?: string;
}

export default function CameraScanner({ onScan, onClose, hint }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string | undefined>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResultRef = useRef<string | null>(null);

  const stopCamera = useCallback(() => {
    if (readerRef.current) {
      try { readerRef.current.reset(); } catch { /* ignore */ }
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async (deviceId?: string) => {
    setError(null);
    setLoading(true);
    stopCamera();

    try {
      if (typeof window === "undefined") return;
      // Dynamically import to avoid SSR issues
      const zxingBrowserModule: any = await import("@zxing/browser");
      const zxingLibModule: any = await import("@zxing/library");

      const BrowserMultiFormatReader = zxingBrowserModule.BrowserMultiFormatReader || zxingBrowserModule.default?.BrowserMultiFormatReader;
      const BarcodeFormat = zxingLibModule.BarcodeFormat || zxingLibModule.default?.BarcodeFormat;
      const DecodeHintType = zxingLibModule.DecodeHintType || zxingLibModule.default?.DecodeHintType;

      // Hints: decode all common barcode formats
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.QR_CODE,
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.ITF,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.AZTEC,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;

      // Enumerate available cameras
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      setCameras(devices);

      // Pick the back camera if available (prefer "environment" facing on mobile)
      let camId = deviceId;
      if (!camId) {
        // On mobile: prefer back camera; on laptop: just pick the first
        const backCam = devices.find(
          (d: MediaDeviceInfo) =>
            d.label.toLowerCase().includes("back") ||
            d.label.toLowerCase().includes("rear") ||
            d.label.toLowerCase().includes("environment")
        );
        camId = backCam?.deviceId || devices[0]?.deviceId;
        setSelectedCamera(camId);
      }

      if (!camId && devices.length === 0) {
        setError("No camera found on this device.");
        setLoading(false);
        return;
      }

      setLoading(false);

      if (!videoRef.current) return;

      await reader.decodeFromVideoDevice(
        camId || undefined,
        videoRef.current,
        (result: any, err: any) => {
          if (result) {
            const text = result.getText();
            // Debounce: don't fire twice for same barcode within 2 seconds
            if (text === lastResultRef.current) return;
            lastResultRef.current = text;
            setLastScan(text);

            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              lastResultRef.current = null;
            }, 2000);

            onScan(text);
          }
        }
      );
    } catch (err: any) {
      let msg = err.message || "Could not access camera";
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        msg = "Camera access was denied. Please allow camera permission in your browser settings and try again.";
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        msg = "No camera found. Please connect a camera and try again.";
      } else if (msg.includes("NotReadable") || msg.includes("TrackStartError")) {
        msg = "Camera is in use by another app. Please close other apps using the camera and try again.";
      }
      setError(msg);
      setLoading(false);
    }
  }, [onScan, stopCamera]);

  useEffect(() => {
    startScanner(selectedCamera);
    return () => {
      stopCamera();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchCamera = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    await startScanner(deviceId);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 z-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-400 flex items-center justify-center">
            <Camera className="w-4 h-4 text-slate-900" />
          </div>
          <div>
            <p className="text-white text-xs font-bold">Scan Barcode / QR Code</p>
            <p className="text-slate-400 text-[10px]">
              {hint || "Point camera at the barcode on the product box"}
            </p>
          </div>
        </div>
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Close camera scanner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera Viewport */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {/* Video element */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <p className="text-white text-sm font-medium">Starting camera...</p>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black px-6">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>
            <p className="text-white text-sm font-bold text-center">Camera Error</p>
            <p className="text-slate-400 text-xs text-center leading-relaxed">{error}</p>
            <button
              onClick={() => startScanner(selectedCamera)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-500/30 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              aria-label="Try camera again"
            >
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        )}

        {/* Scanning viewfinder (only when camera is live) */}
        {!loading && !error && (
          <>
            {/* Dark vignette around the scan zone */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top dark bar */}
              <div className="absolute top-0 left-0 right-0 h-[20%] bg-black/60" />
              {/* Bottom dark bar */}
              <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-black/60" />
              {/* Left dark bar */}
              <div className="absolute top-[20%] bottom-[20%] left-0 w-[10%] bg-black/60" />
              {/* Right dark bar */}
              <div className="absolute top-[20%] bottom-[20%] right-0 w-[10%] bg-black/60" />

              {/* Scan zone border corners - Indigo High Contrast */}
              <div className="absolute top-[20%] left-[10%] w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl shadow-lg" />
              <div className="absolute top-[20%] right-[10%] w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl shadow-lg" />
              <div className="absolute bottom-[20%] left-[10%] w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl shadow-lg" />
              <div className="absolute bottom-[20%] right-[10%] w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl shadow-lg" />

              {/* Scanning line animation */}
              <div
                className="absolute left-[10%] right-[10%] h-0.5 bg-indigo-400/90 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                style={{
                  top: "20%",
                  animation: "scanline 2s ease-in-out infinite",
                }}
              />
            </div>

            {/* Last scan feedback */}
            {lastScan && (
              <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-in fade-in zoom-in duration-200">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                Scanned: {lastScan}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom bar — camera selector */}
      {cameras.length > 1 && !loading && !error && (
        <div className="bg-black/90 px-4 py-3 flex items-center gap-2 overflow-x-auto border-t border-slate-800">
          <Camera className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="text-slate-400 text-[10px] font-semibold flex-shrink-0">Camera:</span>
          {cameras.map((cam, i) => (
            <button
              key={cam.deviceId}
              onClick={() => switchCamera(cam.deviceId)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold flex-shrink-0 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                selectedCamera === cam.deviceId
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {cam.label || `Camera ${i + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Scanning animation CSS */}
      <style jsx global>{`
        @keyframes scanline {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(${60}vh); opacity: 0.6; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
