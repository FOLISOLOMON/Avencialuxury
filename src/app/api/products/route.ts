import { NextResponse } from "next/server";
import { createProduct, getProducts } from "@/lib/services/products";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const products = await getProducts(DEFAULT_BUSINESS_ID, search);
    return NextResponse.json({ success: true, data: serializePlainObject(products) });
  } catch (error: any) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ success: false, error: "Product name is required" }, { status: 400 });
    }

    const sellingPrice = parseFloat(body.sellingPrice);
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      return NextResponse.json({ success: false, error: "Selling price must be a valid non-negative number" }, { status: 400 });
    }

    const defaultCostPrice = parseFloat(body.defaultCostPrice);
    if (isNaN(defaultCostPrice) || defaultCostPrice < 0) {
      return NextResponse.json({ success: false, error: "Default cost price must be a valid non-negative number" }, { status: 400 });
    }

    let lowStockThreshold: number | undefined = undefined;
    if (body.lowStockThreshold !== undefined && body.lowStockThreshold !== null) {
      const parsedThreshold = parseInt(body.lowStockThreshold, 10);
      if (isNaN(parsedThreshold) || parsedThreshold < 0) {
        return NextResponse.json({ success: false, error: "Low stock threshold must be a non-negative integer" }, { status: 400 });
      }
      lowStockThreshold = parsedThreshold;
    }

    let initialStock: number | undefined = undefined;
    if (body.initialStock !== undefined && body.initialStock !== null) {
      const parsedStock = parseInt(body.initialStock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return NextResponse.json({ success: false, error: "Initial stock must be a non-negative integer" }, { status: 400 });
      }
      initialStock = parsedStock;
    }

    const product = await createProduct({
      businessId: DEFAULT_BUSINESS_ID,
      name: body.name.trim(),
      barcode: body.barcode ? String(body.barcode).trim() : undefined,
      sku: body.sku ? String(body.sku).trim() : undefined,
      description: body.description ? String(body.description).trim() : undefined,
      category: body.category ? String(body.category).trim() : undefined,
      brand: body.brand ? String(body.brand).trim() : undefined,
      size: body.size ? String(body.size).trim() : undefined,
      sellingPrice,
      defaultCostPrice,
      lowStockThreshold,
      initialStock,
      batchId: body.batchId || undefined,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(product) });
  } catch (error: any) {
    console.error("POST /api/products error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create product" }, { status: 400 });
  }
}
