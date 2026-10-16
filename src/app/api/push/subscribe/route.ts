import { NextRequest, NextResponse } from "next/server";
import { registerPushSubscription } from "@/lib/services/push";
import { requireAuth } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { auth, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { subscription, deviceName } = body || {};

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { success: false, error: "Invalid subscription payload provided" },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || undefined;

    const registered = await registerPushSubscription({
      businessId: auth!.businessId,
      subscription: {
        ...subscription,
        userAgent,
        deviceName: deviceName || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Device successfully subscribed to push notifications",
      data: registered,
    });
  } catch (error: any) {
    console.error("POST /api/push/subscribe error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to register subscription" },
      { status: 500 }
    );
  }
}
