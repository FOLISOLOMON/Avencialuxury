import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { requestSaleCancellation } from "@/lib/services/sales";
import { serializePlainObject } from "@/lib/utils";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const resolvedParams = await Promise.resolve(params);
    const saleId = resolvedParams?.id;

    if (!saleId) {
      return NextResponse.json({ success: false, error: "Sale ID is required." }, { status: 400 });
    }

    const body = await request.json();
    const { reason } = body || {};

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      return NextResponse.json({ success: false, error: "A clear cancellation reason is required." }, { status: 400 });
    }

    const cancellationRequest = await requestSaleCancellation({
      saleId,
      requester: {
        id: auth!.user.id,
        role: auth!.user.role,
      },
      reason: reason.trim(),
    });

    return NextResponse.json({
      success: true,
      data: serializePlainObject(cancellationRequest),
      message: "Cancellation request submitted for owner approval. The sale remains active until reviewed.",
    });
  } catch (error: any) {
    console.error("POST /api/sales/[id]/cancel-request error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to submit cancellation request" }, { status: 400 });
  }
}
