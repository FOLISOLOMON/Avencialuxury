import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { recordBankDeposit, getBankDeposits } from "@/lib/services/collections";

export const dynamic = "force-dynamic";

/**
 * GET /api/deposits
 * 
 * Lists bank deposits for the authenticated business.
 * Owner-only privilege required.
 */
export async function GET(request: NextRequest) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse || !auth) {
      return errorResponse || NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const deposits = await getBankDeposits(auth.businessId);

    return NextResponse.json({ success: true, data: deposits });
  } catch (error: any) {
    console.error("[API] GET /api/deposits error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve bank deposits." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/deposits
 * 
 * Records a new bank deposit and allocates funds to oldest unallocated collections.
 * Owner-only privilege required.
 */
export async function POST(request: NextRequest) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse || !auth) {
      return errorResponse || NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, depositDate, reference, notes, idempotencyKey } = body;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { success: false, error: "Valid positive deposit amount is required." },
        { status: 400 }
      );
    }

    const result = await recordBankDeposit({
      businessId: auth.businessId,
      userId: auth.user.id,
      amount: numAmount,
      depositDate,
      reference,
      notes,
      idempotencyKey,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[API] POST /api/deposits error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record bank deposit." },
      { status: 400 }
    );
  }
}
