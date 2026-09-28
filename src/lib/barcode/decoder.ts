"use client";

/**
 * Avencia 2.0 Barcode Decoder Helper
 * Multi-pass browser barcode decoder leveraging @zxing/browser & @zxing/library
 * Strictly preserves string primitives and leading zeros.
 */

export function normalizeBarcode(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  let str = String(raw).trim();
  // Remove surrounding quotes if present (e.g. '"8901234567890"' -> '8901234567890')
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }
  return str;
}

export async function decodeBarcodeFromImageFile(file: File): Promise<string> {
  if (!file || !file.type.startsWith("image/")) {
    console.error("[BARCODE] Invalid file type received:", file?.type);
    throw new Error("INVALID_FILE_TYPE");
  }

  console.log(`[BARCODE] Image received: ${file.name} (${file.type}, ${file.size} bytes)`);
  console.log("[BARCODE] Decoder started");

  // Dynamic imports for ZXing modules
  const zxingBrowserModule: any = await import("@zxing/browser");
  const zxingLibModule: any = await import("@zxing/library");

  const BrowserMultiFormatReader =
    zxingBrowserModule.BrowserMultiFormatReader ||
    zxingBrowserModule.default?.BrowserMultiFormatReader;
  const BarcodeFormat =
    zxingLibModule.BarcodeFormat || zxingLibModule.default?.BarcodeFormat;
  const DecodeHintType =
    zxingLibModule.DecodeHintType || zxingLibModule.default?.DecodeHintType;

  if (!BrowserMultiFormatReader || !BarcodeFormat || !DecodeHintType) {
    console.error("[BARCODE] Failed to initialize ZXing library modules");
    throw new Error("ZXING_LOAD_FAILED");
  }

  // Prepare Hints with TRY_HARDER and broad format coverage
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.ITF,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.AZTEC,
  ]);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new BrowserMultiFormatReader(hints);

  // Load File into HTMLImageElement
  const objectUrl = URL.createObjectURL(file);
  let img: HTMLImageElement;
  try {
    img = await loadImage(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  // Pass 1: Direct decode from Image Element
  try {
    const result = await reader.decodeFromImageElement(img);
    if (result && result.getText()) {
      const rawVal = result.getText();
      const normVal = normalizeBarcode(rawVal);
      console.log(`[BARCODE] Decoder result: ${rawVal}`);
      console.log(`[BARCODE] Normalized value: ${normVal}`);
      return normVal;
    }
  } catch {
    // Continue to next pass on exception
  }

  // Pass 2: Rotations on Original Resolution Canvas (0°, 90°, 180°, 270°)
  const rotations = [0, 90, 180, 270];
  for (const angle of rotations) {
    try {
      const canvas = renderImageToCanvas(img, angle);
      const result = await reader.decodeFromCanvas(canvas);
      if (result && result.getText()) {
        const rawVal = result.getText();
        const normVal = normalizeBarcode(rawVal);
        console.log(`[BARCODE] Decoder result (${angle}° rotation): ${rawVal}`);
        console.log(`[BARCODE] Normalized value: ${normVal}`);
        return normVal;
      }
    } catch {
      // Try next rotation angle
    }
  }

  // Pass 3: Downscaled Canvas (Max 1600px) + Rotations for High-Res Phone Photos
  const maxDim = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
  if (maxDim > 1600) {
    const scale = 1600 / maxDim;
    for (const angle of rotations) {
      try {
        const canvas = renderImageToCanvas(img, angle, scale);
        const result = await reader.decodeFromCanvas(canvas);
        if (result && result.getText()) {
          const rawVal = result.getText();
          const normVal = normalizeBarcode(rawVal);
          console.log(`[BARCODE] Decoder result (1600px, ${angle}° rotation): ${rawVal}`);
          console.log(`[BARCODE] Normalized value: ${normVal}`);
          return normVal;
        }
      } catch {
        // Try next
      }
    }
  }

  // Pass 4: Contrast & Grayscale Enhancement Pass
  for (const angle of [0, 90]) {
    try {
      const scale = maxDim > 1600 ? 1600 / maxDim : 1;
      const canvas = renderImageToCanvas(img, angle, scale);
      enhanceCanvasContrast(canvas);
      const result = await reader.decodeFromCanvas(canvas);
      if (result && result.getText()) {
        const rawVal = result.getText();
        const normVal = normalizeBarcode(rawVal);
        console.log(`[BARCODE] Decoder result (contrast pass, ${angle}° rotation): ${rawVal}`);
        console.log(`[BARCODE] Normalized value: ${normVal}`);
        return normVal;
      }
    } catch {
      // Try next
    }
  }

  console.log("[BARCODE] Decoder result: NOT_FOUND");
  throw new Error("NO_BARCODE_DETECTED");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("IMAGE_LOAD_FAILED"));
    img.src = src;
  });
}

function renderImageToCanvas(
  img: HTMLImageElement,
  angle: number,
  scale: number = 1
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const origW = (img.naturalWidth || img.width) * scale;
  const origH = (img.naturalHeight || img.height) * scale;

  if (angle === 90 || angle === 270) {
    canvas.width = Math.round(origH);
    canvas.height = Math.round(origW);
  } else {
    canvas.width = Math.round(origW);
    canvas.height = Math.round(origH);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.drawImage(img, -origW / 2, -origH / 2, origW, origH);
  ctx.restore();

  return canvas;
}

function enhanceCanvasContrast(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const contrast = 1.6;
  const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    let newGray = factor * (gray - 128) + 128;
    newGray = Math.max(0, Math.min(255, newGray));

    data[i] = newGray;
    data[i + 1] = newGray;
    data[i + 2] = newGray;
  }

  ctx.putImageData(imageData, 0, 0);
}
