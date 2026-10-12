import { NextResponse } from "next/server";
import { createProduct, getProducts } from "@/lib/services/products";
import { serializePlainObject } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/session";
import { logAudit } from "@/lib/services/audit";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const products = await getProducts(auth!.businessId, search);

    // Data minimization for worker: do not expose confidential purchase costs
    if (auth!.user.role === "WORKER") {
      const sanitized = products.map((p: any) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        sku: p.sku,
        description: p.description,
        category: p.category,
        brand: p.brand,
        size: p.size,
        sellingPrice: p.sellingPrice,
        sellingPriceNum: p.sellingPriceNum ?? (typeof p.sellingPrice?.toNumber === "function" ? p.sellingPrice.toNumber() : Number(p.sellingPrice || 0)),
        remainingStock: p.remainingStock ?? p.stockLevel ?? 0,
        stockLevel: p.stockLevel ?? p.remainingStock ?? 0,
        stock: p.remainingStock ?? p.stockLevel ?? 0,
        lowStockThreshold: p.lowStockThreshold,
        lowStockAlert: p.lowStockThreshold,
        isLowStock: p.isLowStock ?? (Number(p.remainingStock || 0) <= Number(p.lowStockThreshold || 5)),
        isActive: p.isActive,
        // defaultCostPrice redacted
      }));
      return NextResponse.json({ success: true, data: serializePlainObject(sanitized) });
    }

    return NextResponse.json({ success: true, data: serializePlainObject(products) });
  } catch (error: any) {
    console.error("GET /api/products error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Creating products and configuring prices is strictly OWNER only
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

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
      businessId: auth!.businessId,
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

    await logAudit({
      businessId: auth!.businessId,
      userId: auth!.user.id,
      action: "PRODUCT_CREATED",
      entityType: "PRODUCT",
      entityId: product.id,
      details: { name: product.name, sellingPrice, defaultCostPrice },
    });

    return NextResponse.json({ success: true, data: serializePlainObject(product) });
  } catch (error: any) {
    console.error("POST /api/products error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create product" }, { status: 400 });
  }
}
