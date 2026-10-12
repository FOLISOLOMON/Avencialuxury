import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getCancellationRequests, reviewSaleCancellation } from "@/lib/services/sales";
import { serializePlainObject } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status") as any;

    const requests = await getCancellationRequests(auth!.businessId, statusParam || undefined);

    return NextResponse.json({
      success: true,
      data: serializePlainObject(requests),
    });
  } catch (error: any) {
    console.error("GET /api/sales/cancellations error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch cancellation requests" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { requestId, decision, rejectionReason } = body || {};

    if (!requestId || typeof requestId !== "string") {
      return NextResponse.json({ success: false, error: "Cancellation request ID is required" }, { status: 400 });
    }
    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json({ success: false, error: "Decision must be 'APPROVE' or 'REJECT'" }, { status: 400 });
    }

    const result = await reviewSaleCancellation({
      requestId,
      reviewerId: auth!.user.id,
      decision,
      rejectionReason,
    });

    return NextResponse.json({
      success: true,
      data: serializePlainObject(result),
      message: decision === "APPROVE"
        ? "Cancellation approved. The sale has been voided and inventory returned to stock."
        : "Cancellation request rejected. The sale remains active.",
    });
  } catch (error: any) {
    console.error("POST /api/sales/cancellations error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to process cancellation decision" }, { status: 400 });
  }
}
