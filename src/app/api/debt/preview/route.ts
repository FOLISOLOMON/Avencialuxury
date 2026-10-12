import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { previewDebtPaymentAllocation } from "@/lib/services/debt";
import { serializePlainObject } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { customerId, amount, saleId } = body || {};

    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json({ success: false, error: "customerId is required" }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ success: false, error: "amount must be greater than zero" }, { status: 400 });
    }

    const preview = await previewDebtPaymentAllocation({
      businessId: auth!.businessId,
      customerId,
      amount: numAmount,
      saleId: saleId ? String(saleId).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      data: serializePlainObject(preview),
    });
  } catch (error: any) {
    console.error("POST /api/debt/preview error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to preview allocation" }, { status: 400 });
  }
}
