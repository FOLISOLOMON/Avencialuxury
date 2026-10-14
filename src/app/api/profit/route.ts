import { NextResponse } from "next/server";
import { getFinancialSummary, allocateProfit, allocateProfit50_30_20, getAllocations } from "@/lib/services/profit";
import { AllocationType } from "@prisma/client";
import { serializePlainObject } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/session";
import { logAudit } from "@/lib/services/audit";

const VALID_ALLOCATION_TYPES = new Set(Object.values(AllocationType));

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const summary = await getFinancialSummary(auth!.businessId);
    const allocations = await getAllocations(auth!.businessId);
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
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Allocation amount must be a positive number (> 0)" }, { status: 400 });
    }

    const is503020 = body.split === "50_30_20" || body.type === "50_30_20" || !body.type;

    if (is503020) {
      const confirmedEligible =
        body.confirmedEligibleAmount !== undefined && body.confirmedEligibleAmount !== null
          ? parseFloat(body.confirmedEligibleAmount)
          : undefined;

      const result = await allocateProfit50_30_20({
        businessId: auth!.businessId,
        amount,
        confirmedEligibleAmount: isNaN(confirmedEligible as number) ? undefined : confirmedEligible,
        idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey).trim() : undefined,
        source: body.source ? String(body.source).trim() : undefined,
        notes: body.notes ? String(body.notes).trim() : undefined,
      });

      await logAudit({
        businessId: auth!.businessId,
        userId: auth!.user.id,
        action: "PROFIT_ALLOCATED_503020",
        entityType: "PROFIT_ALLOCATION",
        entityId: (result as any).savings?.id || "503020",
        details: { amount, split: (result as any).split },
      });

      return NextResponse.json({ success: true, data: serializePlainObject(result) });
    }

    if (!VALID_ALLOCATION_TYPES.has(body.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid allocation type. Must be one of: ${Array.from(VALID_ALLOCATION_TYPES).join(", ")}, or 50_30_20`,
        },
        { status: 400 }
      );
    }

    const result = await allocateProfit({
      businessId: auth!.businessId,
      amount,
      type: body.type,
      source: body.source ? String(body.source).trim() : undefined,
      notes: body.notes ? String(body.notes).trim() : undefined,
    });

    await logAudit({
      businessId: auth!.businessId,
      userId: auth!.user.id,
      action: "PROFIT_ALLOCATED",
      entityType: "PROFIT_ALLOCATION",
      entityId: result.id,
      details: { amount, type: body.type },
    });

    return NextResponse.json({ success: true, data: serializePlainObject(result) });
  } catch (error: any) {
    console.error("POST /api/profit error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to allocate profit" }, { status: 400 });
  }
}
