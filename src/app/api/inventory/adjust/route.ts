import { NextResponse } from "next/server";
import { adjustStock } from "@/lib/services/inventory";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { InventoryTransactionType } from "@prisma/client";
import { serializePlainObject } from "@/lib/utils";

const VALID_TRANSACTION_TYPES = new Set(Object.values(InventoryTransactionType));

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!body.productId || typeof body.productId !== "string" || !body.productId.trim()) {
      return NextResponse.json({ success: false, error: "Product ID is required" }, { status: 400 });
    }

    if (!body.type || !VALID_TRANSACTION_TYPES.has(body.type)) {
      return NextResponse.json({ success: false, error: `Invalid inventory adjustment type. Must be one of: ${Array.from(VALID_TRANSACTION_TYPES).join(", ")}` }, { status: 400 });
    }

    const quantity = parseInt(body.quantity, 10);
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json({ success: false, error: "Adjustment quantity must be a positive integer (> 0)" }, { status: 400 });
    }

    const result = await adjustStock({
      businessId: DEFAULT_BUSINESS_ID,
      productId: body.productId.trim(),
      batchId: body.batchId ? String(body.batchId).trim() : undefined,
      type: body.type,
      quantity,
      note: body.note ? String(body.note).trim() : undefined,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(result) });
  } catch (error: any) {
    console.error("POST /api/inventory/adjust error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to adjust stock" }, { status: 400 });
  }
}
