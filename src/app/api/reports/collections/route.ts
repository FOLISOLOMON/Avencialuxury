import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getWeeklyCollectionsReport } from "@/lib/services/collections";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/collections
 * 
 * Returns authoritative Weekly Collections & Bank Deposits analytics.
 * Owner-only privilege required.
 */
export async function GET(request: NextRequest) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse || !auth) {
      return errorResponse || NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const quickRange = searchParams.get("quickRange") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const report = await getWeeklyCollectionsReport(auth.businessId, {
      quickRange,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data: report });
  } catch (error: any) {
    console.error("[API] GET /api/reports/collections error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve collections report." },
      { status: 500 }
    );
  }
}
