import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getFeedbackById, updateFeedback, deleteFeedback } from "@/lib/services/feedback";
import { serializePlainObject } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const feedback = await getFeedbackById(auth!.businessId, params.id, {
      id: auth!.user.id,
      role: auth!.user.role,
    });

    if (!feedback) {
      return NextResponse.json({ success: false, error: "Feedback record not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: serializePlainObject(feedback),
    });
  } catch (error: any) {
    console.error("GET /api/feedback/[id] error:", error);
    const status = error.message?.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve feedback record" },
      { status }
    );
  }
}

export async function PATCH(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const updated = await updateFeedback(
      auth!.businessId,
      params.id,
      body,
      { id: auth!.user.id, role: auth!.user.role }
    );

    return NextResponse.json({
      success: true,
      data: serializePlainObject(updated),
    });
  } catch (error: any) {
    console.error("PATCH /api/feedback/[id] error:", error);
    const status = error.message?.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update feedback" },
      { status }
    );
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const result = await deleteFeedback(
      auth!.businessId,
      params.id,
      { id: auth!.user.id, role: auth!.user.role }
    );

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("DELETE /api/feedback/[id] error:", error);
    const status = error.message?.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete feedback" },
      { status }
    );
  }
}
