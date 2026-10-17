import { NextResponse } from "next/server";
import { getProductByBarcode } from "@/lib/services/products";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

// Server-side in-memory cache for external barcode lookups
interface CachedBarcodeData {
  data: {
    barcode: string;
    name: string;
    brand: string | null;
    category: string | null;
    size: string | null;
    description: string | null;
    gender: string | null;
    imageUrl: string | null;
  };
  timestamp: number;
}

const barcodeCache = new Map<string, CachedBarcodeData>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3500): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function inferGender(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("pour femme") || lower.includes("women") || lower.includes("female") || lower.includes("for women")) {
    return "Women";
  }
  if (lower.includes("pour homme") || lower.includes("men") || lower.includes("male") || lower.includes("for men")) {
    return "Men";
  }
  if (lower.includes("unisex") || lower.includes("gender neutral") || lower.includes("for all")) {
    return "Unisex";
  }
  return null;
}

async function fetchExternalBarcodeData(barcode: string) {
  const cleanCode = barcode.trim();

  // 1. Open Beauty Facts (Cosmetics, Fragrances, Perfumes)
  try {
    const obfRes = await fetchWithTimeout(
      `https://world.openbeautyfacts.org/api/v2/product/${cleanCode}.json`,
      {
        headers: { "User-Agent": "AvenciaOS/2.0 (perfumes-inventory-app)" },
        next: { revalidate: 86400 },
      },
      3500
    );
    if (obfRes.ok) {
      const obfJson = await obfRes.json();
      if (obfJson.status === 1 && obfJson.product) {
        const prod = obfJson.product;
        const name = prod.product_name || prod.product_name_en || prod.abbreviated_product_name;
        if (name && typeof name === "string" && name.trim()) {
          const desc = prod.generic_name || prod.summary || null;
          const gender = prod.gender || inferGender(`${name} ${desc || ''} ${prod.categories || ''}`);
          const imageUrl = prod.image_front_url || prod.image_url || prod.image_small_url || null;
          return {
            barcode: cleanCode,
            name: name.trim(),
            brand: prod.brands || prod.brand_owner || null,
            category: prod.categories ? prod.categories.split(",")[0].trim() : "Perfumes",
            size: prod.quantity || prod.packaging_text || prod.packaging || null,
            description: desc,
            gender: gender || null,
            imageUrl,
          };
        }
      }
    }
  } catch (e) {
    console.warn("Open Beauty Facts lookup warning/timeout:", e);
  }

  // 2. Open Food Facts
  try {
    const offRes = await fetchWithTimeout(
      `https://world.openfoodfacts.org/api/v2/product/${cleanCode}.json`,
      {
        headers: { "User-Agent": "AvenciaOS/2.0 (perfumes-inventory-app)" },
        next: { revalidate: 86400 },
      },
      3500
    );
    if (offRes.ok) {
      const offJson = await offRes.json();
      if (offJson.status === 1 && offJson.product) {
        const prod = offJson.product;
        const name = prod.product_name || prod.product_name_en;
        if (name && typeof name === "string" && name.trim()) {
          const desc = prod.generic_name || null;
          const gender = inferGender(`${name} ${desc || ''} ${prod.categories || ''}`);
          const imageUrl = prod.image_front_url || prod.image_url || prod.image_small_url || null;
          return {
            barcode: cleanCode,
            name: name.trim(),
            brand: prod.brands || null,
            category: prod.categories ? prod.categories.split(",")[0].trim() : "Perfumes",
            size: prod.quantity || null,
            description: desc,
            gender: gender || null,
            imageUrl,
          };
        }
      }
    }
  } catch (e) {
    console.warn("Open Food Facts lookup warning/timeout:", e);
  }

  // 3. UPC Item DB Trial API
  try {
    const upcRes = await fetchWithTimeout(
      `https://api.upcitemdb.com/prod/trial/lookup?upc=${cleanCode}`,
      { next: { revalidate: 86400 } },
      3500
    );
    if (upcRes.ok) {
      const upcJson = await upcRes.json();
      if (upcJson.items && upcJson.items.length > 0) {
        const item = upcJson.items[0];
        const name = item.title;
        if (name && typeof name === "string" && name.trim()) {
          const desc = item.description || null;
          const gender = inferGender(`${name} ${desc || ''} ${item.category || ''}`);
          const imageUrl = item.images && item.images.length > 0 ? item.images[0] : null;
          return {
            barcode: cleanCode,
            name: name.trim(),
            brand: item.brand || null,
            category: item.category ? item.category.split(">").pop()?.trim() || "Perfumes" : "Perfumes",
            size: item.size || null,
            description: desc,
            gender: gender || null,
            imageUrl,
          };
        }
      }
    }
  } catch (e) {
    console.warn("UPC Item DB lookup warning/timeout:", e);
  }

  // 4. BigProductData / Barcode Lookup Fallback
  try {
    const bpdRes = await fetchWithTimeout(
      `https://bigproductdata.com/api/v1/products/${cleanCode}`,
      { next: { revalidate: 86400 } },
      3500
    );
    if (bpdRes.ok) {
      const bpdJson = await bpdRes.json();
      if (bpdJson && (bpdJson.title || bpdJson.name)) {
        const name = bpdJson.title || bpdJson.name;
        const desc = bpdJson.description || null;
        const gender = inferGender(`${name} ${desc || ''}`);
        return {
          barcode: cleanCode,
          name: name.trim(),
          brand: bpdJson.brand || null,
          category: bpdJson.category || "Perfumes",
          size: bpdJson.size || null,
          description: desc,
          gender: gender || null,
          imageUrl: bpdJson.images?.[0] || bpdJson.image || null,
        };
      }
    }
  } catch (e) {
    console.warn("BigProductData lookup warning/timeout:", e);
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("code");
    if (!barcode || !barcode.trim()) {
      return NextResponse.json({ success: false, error: "Barcode code is required" }, { status: 400 });
    }

    const cleanBarcode = barcode.trim();
    console.log("[BARCODE] Product lookup started");
    console.log(`[BARCODE] Lookup query: ${cleanBarcode}`);

    // 1. Check local Avencia database first
    const localProduct = await getProductByBarcode(cleanBarcode, DEFAULT_BUSINESS_ID);
    if (localProduct) {
      console.log(`[BARCODE] Product found: true (Local: ${localProduct.name})`);
      return NextResponse.json({
        success: true,
        source: "local",
        data: serializePlainObject(localProduct),
        message: `Product found: ${localProduct.name}`,
      });
    }

    // 2. Check in-memory cache for repeated scans
    const cachedEntry = barcodeCache.get(cleanBarcode);
    if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
      console.log(`[BARCODE] Product found: true (Cached Online: ${cachedEntry.data.name})`);
      return NextResponse.json({
        success: true,
        source: "external",
        data: cachedEntry.data,
        message: `Barcode detected (${cleanBarcode}), found online! Review product details.`,
      });
    }

    // 3. Query external Internet barcode registries
    const externalProduct = await fetchExternalBarcodeData(cleanBarcode);
    if (externalProduct) {
      // Store in memory cache
      barcodeCache.set(cleanBarcode, { data: externalProduct, timestamp: Date.now() });
      console.log(`[BARCODE] Product found: true (Online: ${externalProduct.name})`);

      return NextResponse.json({
        success: true,
        source: "external",
        data: externalProduct,
        message: `Barcode detected (${cleanBarcode}), found online! Review product details.`,
      });
    }

    // 4. Fallback: Not found online or network fails
    console.log("[BARCODE] Product found: false");
    return NextResponse.json({
      success: true,
      source: "none",
      data: null,
      message: `Barcode detected (${cleanBarcode}), but no matching product was found in Avencia or online registry.`,
    });
  } catch (error: any) {
    console.error("[BARCODE] GET /api/products/barcode error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to query barcode" }, { status: 500 });
  }
}
