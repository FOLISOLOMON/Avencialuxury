import { NextResponse } from "next/server";
import { getInventorySummary, getInventoryLedger } from "@/lib/services/inventory";
import { serializePlainObject } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as any;
    const search = searchParams.get("search") || undefined;

    const summary = await getInventorySummary(auth!.businessId);
    const ledger = await getInventoryLedger(auth!.businessId, type || undefined, search);

    return NextResponse.json({
      success: true,
      data: serializePlainObject({
        summary,
        ledger,
      }),
    });
  } catch (error: any) {
    console.error("GET /api/inventory error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch inventory ledger" }, { status: 500 });
  }
}
