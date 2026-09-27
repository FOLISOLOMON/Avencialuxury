import { NextResponse } from "next/server";
import { getFinancialSummary, allocateProfit, getAllocations } from "@/lib/services/profit";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { AllocationType } from "@prisma/client";
import { serializePlainObject } from "@/lib/utils";

const VALID_ALLOCATION_TYPES = new Set(Object.values(AllocationType));

export async function GET() {
  try {
    const summary = await getFinancialSummary(DEFAULT_BUSINESS_ID);
    const allocations = await getAllocations(DEFAULT_BUSINESS_ID);
    return NextResponse.json({
      success: true,
      data: serializePlainObject({
        summary,
        allocations,
      }),
    });
  } catch (error: any) {
    console.error("GET /api/profit error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch profit summary" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Allocation amount must be a positive number (> 0)" }, { status: 400 });
    }

    if (!body.type || !VALID_ALLOCATION_TYPES.has(body.type)) {
      return NextResponse.json({ success: false, error: `Invalid allocation type. Must be one of: ${Array.from(VALID_ALLOCATION_TYPES).join(", ")}` }, { status: 400 });
    }

    const result = await allocateProfit({
      businessId: DEFAULT_BUSINESS_ID,
      amount,
      type: body.type,
      source: body.source ? String(body.source).trim() : undefined,
      notes: body.notes ? String(body.notes).trim() : undefined,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(result) });
  } catch (error: any) {
    console.error("POST /api/profit error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to allocate profit" }, { status: 400 });
  }
}
