import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getFeedbackFormData } from "@/lib/services/feedback";
import { serializePlainObject } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId") || undefined;
    const productId = searchParams.get("productId") || undefined;

    const formData = await getFeedbackFormData(
      auth!.businessId,
      { id: auth!.user.id, role: auth!.user.role },
      { customerId, productId }
    );

    return NextResponse.json({
      success: true,
      data: serializePlainObject(formData),
    });
  } catch (error: any) {
    console.error("GET /api/feedback/form-data error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load feedback form options" },
      { status: 500 }
    );
  }
}
