import { NextResponse } from "next/server";
import { createBatch, getBatches } from "@/lib/services/batches";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") as any;
    const batches = await getBatches(DEFAULT_BUSINESS_ID, status || "ALL");
    return NextResponse.json({ success: true, data: serializePlainObject(batches) });
  } catch (error: any) {
    console.error("GET /api/batches error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch batches" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!body.reference || typeof body.reference !== "string" || !body.reference.trim()) {
      return NextResponse.json({ success: false, error: "Batch reference code is required" }, { status: 400 });
    }

    let additionalCosts = 0;
    if (body.additionalCosts !== undefined && body.additionalCosts !== null) {
      additionalCosts = parseFloat(body.additionalCosts);
      if (isNaN(additionalCosts) || additionalCosts < 0) {
        return NextResponse.json({ success: false, error: "Additional costs must be a valid non-negative number" }, { status: 400 });
      }
    }

    let purchaseDate = new Date();
    if (body.purchaseDate) {
      const parsedDate = new Date(body.purchaseDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ success: false, error: "Invalid purchase date format" }, { status: 400 });
      }
      purchaseDate = parsedDate;
    }

    const items: Array<{ productId: string; quantityPurchased: number; unitCost: number }> = [];
    if (Array.isArray(body.items)) {
      for (let index = 0; index < body.items.length; index++) {
        const item = body.items[index];
        if (!item.productId || typeof item.productId !== "string") {
          return NextResponse.json({ success: false, error: `Item at position ${index + 1} must have a valid productId` }, { status: 400 });
        }
        const qty = parseInt(item.quantityPurchased, 10);
        if (isNaN(qty) || qty <= 0) {
          return NextResponse.json({ success: false, error: `Item at position ${index + 1} quantity must be a positive integer` }, { status: 400 });
        }
        const unitCost = parseFloat(item.unitCost);
        if (isNaN(unitCost) || unitCost < 0) {
          return NextResponse.json({ success: false, error: `Item at position ${index + 1} unit cost must be a non-negative number` }, { status: 400 });
        }
        items.push({
          productId: item.productId,
          quantityPurchased: qty,
          unitCost,
        });
      }
    }

    const batch = await createBatch({
      businessId: DEFAULT_BUSINESS_ID,
      reference: body.reference.trim(),
      purchaseDate,
      additionalCosts,
      notes: body.notes ? String(body.notes).trim() : undefined,
      supplierId: body.supplierId || undefined,
      items,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(batch) });
  } catch (error: any) {
    console.error("POST /api/batches error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create batch" }, { status: 400 });
  }
}
