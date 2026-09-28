"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Camera, X, Loader2, AlertTriangle, RefreshCw, Zap, Upload, Lock, ShieldAlert } from "lucide-react";
import { decodeBarcodeFromImageFile, normalizeBarcode } from "@/lib/barcode/decoder";

interface CameraScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  hint?: string;
}

export default function CameraScanner({ onScan, onClose, hint }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [isInsecureHttp, setIsInsecureHttp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageDecoding, setImageDecoding] = useState(false);
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

    // Detect if running on unencrypted HTTP (non-localhost)
    if (typeof window !== "undefined") {
      const isSecure = window.isSecureContext;
      const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (!isSecure && !isLocalhost) {
        setIsInsecureHttp(true);
        setError("Live camera streams require a secure HTTPS connection. Mobile browsers automatically block live video capture on unencrypted HTTP.");
        setLoading(false);
        return;
      }
    }

    try {
      if (typeof window === "undefined") return;
      const zxingBrowserModule: any = await import("@zxing/browser");
      const zxingLibModule: any = await import("@zxing/library");

      const BrowserMultiFormatReader = zxingBrowserModule.BrowserMultiFormatReader || zxingBrowserModule.default?.BrowserMultiFormatReader;
      const BarcodeFormat = zxingLibModule.BarcodeFormat || zxingLibModule.default?.BarcodeFormat;
      const DecodeHintType = zxingLibModule.DecodeHintType || zxingLibModule.default?.DecodeHintType;

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

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      setCameras(devices);

      let camId = deviceId;
      if (!camId) {
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
        setError("No active video camera detected on this device.");
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
            const rawText = result.getText();
            const text = normalizeBarcode(rawText);
            if (!text || text === lastResultRef.current) return;
            
            console.log("[BARCODE] Decoder result (Camera):", rawText);
            console.log("[BARCODE] Normalized value:", text);
            
            lastResultRef.current = text;
            setLastScan(text);

            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
              lastResultRef.current = null;
            }, 2000);

            onScan(text);
          }
          // Note: err is passed by ZXing when no barcode is found in the current frame.
          // We intentionally ignore NotFoundException / ChecksumException to prevent console noise.
        }
      );
    } catch (err: any) {
      let msg = err.message || "Could not access camera";
      if (msg.includes("Permission") || msg.includes("NotAllowed") || msg.includes("denied")) {
        msg = "Live camera access was blocked by your browser. Switch to HTTPS or use the 'Take / Upload Photo' option below.";
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        msg = "No camera found. Use the 'Take / Upload Photo' option below to scan your barcode.";
      } else if (msg.includes("NotReadable") || msg.includes("TrackStartError")) {
        msg = "Camera is currently used by another app. Close other camera apps or upload a photo below.";
      }
      setError(msg);
      setLoading(false);
    }
  }, [onScan, stopCamera]);

  // Handle uploading/snapping a photo of a barcode box
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageDecoding(true);
    setError(null);
    console.log("[BARCODE] Image received:", file.name, file.type);
    console.log("[BARCODE] Decoder started");

    try {
      const text = await decodeBarcodeFromImageFile(file);
      if (text) {
        console.log("[BARCODE] Decoder result:", text);
        console.log("[BARCODE] Normalized value:", text);
        setLastScan(text);
        onScan(text);
        stopCamera();
      } else {
        console.log("[BARCODE] Decoder result: NOT_FOUND");
        setError("No barcode detected. Try a clearer image.");
      }
    } catch (err: any) {
      console.log("[BARCODE] Decoder result: NOT_FOUND");
      if (err.message === "INVALID_FILE_TYPE") {
        setError("Selected file is not an image. Please upload a photo of the barcode.");
      } else if (err.message === "NO_BARCODE_DETECTED") {
        setError("No barcode detected. Try a clearer image.");
      } else {
        setError("No barcode detected. Try a clearer image.");
      }
    } finally {
      setImageDecoding(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
    <div className="fixed inset-0 z-[60] bg-black dark:bg-slate-950 flex flex-col font-sans">
      {/* Hidden native camera/photo file picker input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/90 dark:bg-slate-950/90 border-b border-slate-800 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <p className="text-white text-xs font-bold">Scan Barcode / QR Code</p>
            <p className="text-slate-400 text-[10px]">
              {hint || "Point camera at product barcode or upload a photo"}
            </p>
          </div>
        </div>
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="Close scanner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Viewport Area */}
      <div className="flex-1 relative overflow-hidden bg-black dark:bg-slate-950 flex items-center justify-center">
        {/* Video stream */}
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />

        {/* Loading spinner */}
        {(loading || imageDecoding) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 dark:bg-slate-950/90 z-20">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-white text-sm font-medium">
              {imageDecoding ? "Analyzing barcode photo..." : "Starting camera..."}
            </p>
          </div>
        )}

        {/* Error / HTTP Insecure Explanation Overlay */}
        {error && !imageDecoding && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/95 dark:bg-slate-950/95 text-center overflow-y-auto space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              {isInsecureHttp ? <Lock className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>
            
            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-white font-black text-base">
                {isInsecureHttp ? "HTTPS Connection Required for Live Camera" : "Camera Access Notice"}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {error}
              </p>
            </div>

            {/* Direct Solution 1: Take or Upload Photo */}
            <div className="w-full max-w-xs pt-2 space-y-2.5">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xl shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <Upload className="w-4 h-4" />
                <span>Take or Upload Barcode Photo</span>
              </button>

              {!isInsecureHttp && (
                <button
                  type="button"
                  onClick={() => startScanner(selectedCamera)}
                  className="w-full py-2.5 px-4 rounded-2xl bg-white/10 text-slate-200 hover:bg-white/20 font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Try Live Camera Again
                </button>
              )}
            </div>

            {/* HTTP Chrome Flag Instructions */}
            {isInsecureHttp && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 max-w-xs text-left text-[11px] text-slate-400 space-y-1">
                <p className="font-bold text-slate-200 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> Mobile Development Tip:
                </p>
                <p>To enable live camera on local HTTP, open <code className="text-indigo-400 font-mono">chrome://flags</code> on your phone, search <em>"Insecure origins"</em>, add your URL, and enable it.</p>
              </div>
            )}
          </div>
        )}

        {/* Live Viewfinder */}
        {!loading && !error && !imageDecoding && (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 right-0 h-[20%] bg-black/60 dark:bg-black/80" />
              <div className="absolute bottom-0 left-0 right-0 h-[20%] bg-black/60 dark:bg-black/80" />
              <div className="absolute top-[20%] bottom-[20%] left-0 w-[10%] bg-black/60 dark:bg-black/80" />
              <div className="absolute top-[20%] bottom-[20%] right-0 w-[10%] bg-black/60 dark:bg-black/80" />

              <div className="absolute top-[20%] left-[10%] w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl shadow-lg" />
              <div className="absolute top-[20%] right-[10%] w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl shadow-lg" />
              <div className="absolute bottom-[20%] left-[10%] w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl shadow-lg" />
              <div className="absolute bottom-[20%] right-[10%] w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-xl shadow-lg" />

              <div
                className="absolute left-[10%] right-[10%] h-0.5 bg-indigo-400/90 shadow-[0_0_8px_rgba(99,102,241,0.8)]"
                style={{
                  top: "20%",
                  animation: "scanline 2s ease-in-out infinite",
                }}
              />
            </div>

            {lastScan && (
              <div className="absolute bottom-[22%] left-1/2 -translate-x-1/2 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg animate-in fade-in zoom-in duration-200 z-10">
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                Scanned: {lastScan}
              </div>
            )}
          </>
        )}
      </div>

      {/* Action Footer Bar */}
      <div className="bg-black/90 dark:bg-slate-950/90 px-4 py-3 border-t border-slate-800 flex items-center justify-between gap-3 z-10">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 py-2 px-3 rounded-xl bg-slate-800 dark:bg-slate-900 hover:bg-slate-700 dark:hover:bg-slate-800 text-slate-100 text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-slate-700 dark:border-slate-800"
        >
          <Upload className="w-3.5 h-3.5 text-indigo-400" />
          <span>Snap / Upload Photo</span>
        </button>

        {cameras.length > 1 && !loading && !error && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {cameras.map((cam, i) => (
              <button
                key={cam.deviceId}
                onClick={() => switchCamera(cam.deviceId)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                  selectedCamera === cam.deviceId
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                    : "bg-white/10 dark:bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {cam.label || `Cam ${i + 1}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CSS keyframe animation */}
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
