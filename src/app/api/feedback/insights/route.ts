import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getProductInsightsService } from "@/lib/services/feedback";
import { serializePlainObject } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    // Strictly OWNER only: Workers must not view business-wide product insights
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const insights = await getProductInsightsService(
      auth!.businessId,
      { id: auth!.user.id, role: auth!.user.role },
      { productId, startDate, endDate }
    );

    return NextResponse.json({
      success: true,
      data: serializePlainObject(insights),
    });
  } catch (error: any) {
    console.error("GET /api/feedback/insights error:", error);
    const status = error.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to compute product feedback insights" },
      { status }
    );
  }
}
