import { NextResponse } from "next/server";
import { getInventorySummary, getInventoryLedger } from "@/lib/services/inventory";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as any;
    const search = searchParams.get("search") || undefined;

    const summary = await getInventorySummary(DEFAULT_BUSINESS_ID);
    const ledger = await getInventoryLedger(DEFAULT_BUSINESS_ID, type || undefined, search);

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
