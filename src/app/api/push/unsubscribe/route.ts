import { NextRequest, NextResponse } from "next/server";
import { unregisterPushSubscription } from "@/lib/services/push";
import { requireAuth } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { auth, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { endpoint } = body || {};

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Subscription endpoint is required" },
        { status: 400 }
      );
    }

    const removed = await unregisterPushSubscription(
      endpoint,
      auth!.businessId
    );

    return NextResponse.json({
      success: true,
      message: removed
        ? "Device successfully unsubscribed"
        : "Subscription was not active",
    });
  } catch (error: any) {
    console.error("POST /api/push/unsubscribe error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
