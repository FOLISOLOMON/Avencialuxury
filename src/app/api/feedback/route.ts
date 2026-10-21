import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { createFeedback, getFeedbackList } from "@/lib/services/feedback";
import { serializePlainObject } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const productId = searchParams.get("productId") || undefined;
    const customerId = searchParams.get("customerId") || undefined;
    const saleId = searchParams.get("saleId") || undefined;
    const category = (searchParams.get("category") as any) || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const source = (searchParams.get("source") as any) || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50;
    const offset = searchParams.get("offset") ? parseInt(searchParams.get("offset")!, 10) : 0;

    const result = await getFeedbackList(auth!.businessId, {
      userRole: auth!.user.role,
      userId: auth!.user.id,
      search,
      productId,
      customerId,
      saleId,
      category,
      status,
      source,
      startDate,
      endDate,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: serializePlainObject(result),
    });
  } catch (error: any) {
    console.error("GET /api/feedback error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve feedback records" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!body.comments || typeof body.comments !== "string" || !body.comments.trim()) {
      return NextResponse.json({ success: false, error: "Customer comments are required" }, { status: 400 });
    }

    const feedback = await createFeedback(
      {
        businessId: auth!.businessId,
        createdById: auth!.user.id,
        customerId: body.customerId || null,
        productId: body.productId || null,
        saleId: body.saleId || null,
        batchId: body.batchId || null,
        source: body.source || "OTHER",
        category: body.category || "OTHER",
        comments: body.comments,
        rating: body.rating !== undefined && body.rating !== null && body.rating !== "" ? Number(body.rating) : null,
        feedbackDate: body.feedbackDate || new Date(),
        status: body.status || "NEW",
        internalNotes: body.internalNotes || null,
      },
      { id: auth!.user.id, role: auth!.user.role }
    );

    return NextResponse.json({
      success: true,
      data: serializePlainObject(feedback),
    });
  } catch (error: any) {
    console.error("POST /api/feedback error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record customer feedback" },
      { status: 400 }
    );
  }
}
