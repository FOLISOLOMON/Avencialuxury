import { NextRequest, NextResponse } from "next/server";
import { unregisterPushSubscription } from "@/lib/services/push";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { endpoint, businessId } = body;

    if (!endpoint) {
      return NextResponse.json(
        { success: false, error: "Subscription endpoint is required" },
        { status: 400 }
      );
    }

    const removed = await unregisterPushSubscription(
      endpoint,
      businessId || DEFAULT_BUSINESS_ID
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
