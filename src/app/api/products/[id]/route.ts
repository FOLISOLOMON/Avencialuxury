import { NextRequest, NextResponse } from "next/server";
import { updateProduct, getProductById } from "@/lib/services/products";
import { serializePlainObject } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/session";
import { logAudit } from "@/lib/services/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    const product = await getProductById(id, auth!.businessId);
    if (!product) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    if (auth!.user.role === "WORKER") {
      const p = product as any;
      const sanitized = {
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
      };
      return NextResponse.json({ success: true, data: serializePlainObject(sanitized) });
    }

    return NextResponse.json({ success: true, data: serializePlainObject(product) });
  } catch (error: any) {
    console.error("GET /api/products/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only OWNER can alter prices, costs, or product attributes
    const { auth, errorResponse } = await requireAuth(req, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    let sellingPrice: number | undefined = undefined;
    if (body.sellingPrice !== undefined && body.sellingPrice !== null) {
      sellingPrice = parseFloat(body.sellingPrice);
      if (isNaN(sellingPrice) || sellingPrice < 0) {
        return NextResponse.json({ success: false, error: "Selling price must be a valid non-negative number" }, { status: 400 });
      }
    }

    let defaultCostPrice: number | undefined = undefined;
    if (body.defaultCostPrice !== undefined && body.defaultCostPrice !== null) {
      defaultCostPrice = parseFloat(body.defaultCostPrice);
      if (isNaN(defaultCostPrice) || defaultCostPrice < 0) {
        return NextResponse.json({ success: false, error: "Default cost price must be a valid non-negative number" }, { status: 400 });
      }
    }

    let lowStockThreshold: number | undefined = undefined;
    if (body.lowStockThreshold !== undefined && body.lowStockThreshold !== null) {
      lowStockThreshold = parseInt(body.lowStockThreshold, 10);
      if (isNaN(lowStockThreshold) || lowStockThreshold < 0) {
        return NextResponse.json({ success: false, error: "Low stock threshold must be a non-negative integer" }, { status: 400 });
      }
    }

    const existingProduct = await getProductById(id, auth!.businessId);
    if (!existingProduct) {
      return NextResponse.json({ success: false, error: "Product not found" }, { status: 404 });
    }

    const updated = await updateProduct({
      id,
      businessId: auth!.businessId,
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      barcode: body.barcode !== undefined ? (body.barcode ? String(body.barcode).trim() : null) : undefined,
      sku: body.sku !== undefined ? (body.sku ? String(body.sku).trim() : null) : undefined,
      description: body.description !== undefined ? (body.description ? String(body.description).trim() : null) : undefined,
      category: body.category !== undefined ? (body.category ? String(body.category).trim() : null) : undefined,
      brand: body.brand !== undefined ? (body.brand ? String(body.brand).trim() : null) : undefined,
      size: body.size !== undefined ? (body.size ? String(body.size).trim() : null) : undefined,
      sellingPrice,
      defaultCostPrice,
      lowStockThreshold,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    });

    await logAudit({
      businessId: auth!.businessId,
      userId: auth!.user.id,
      action: "PRODUCT_UPDATED",
      entityType: "PRODUCT",
      entityId: id,
      details: {
        priceChanged: sellingPrice !== undefined && sellingPrice !== existingProduct.sellingPrice.toNumber(),
        newSellingPrice: sellingPrice,
        previousSellingPrice: existingProduct.sellingPrice.toNumber(),
      },
    });

    return NextResponse.json({ success: true, data: serializePlainObject(updated) });
  } catch (error: any) {
    console.error("PATCH /api/products/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update product" },
      { status: 500 }
    );
  }
}
