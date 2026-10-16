import { NextRequest, NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/services/push";
import { requireAuth } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { auth, errorResponse } = await requireAuth(req, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const businessId = auth!.businessId;
    const dedupeKey = `TEST_PUSH:${businessId}:${Date.now()}`;

    const result = await sendPushNotification({
      businessId,
      notificationType: "TEST",
      title: "Avencia — Test Notification",
      body: "External push notifications are active and connected to your device! 🎉",
      url: "/settings",
      dedupeKey,
      extraData: {
        isTest: true,
      },
    });

    if (result.status === "NO_SUBSCRIBERS") {
      return NextResponse.json({
        success: false,
        error: "No active device subscriptions found. Please enable notifications on this device first.",
      });
    }

    if (result.status === "SKIPPED") {
      return NextResponse.json({
        success: false,
        error: "Push service is unconfigured or unavailable.",
      }, { status: 503 });
    }

    return NextResponse.json({
      success: result.status === "SENT",
      result,
      message: result.status === "SENT"
        ? `Test notification dispatched to ${result.successCount} active device(s).`
        : "Failed to dispatch test notification.",
    });
  } catch (error: any) {
    console.error("POST /api/push/test error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to dispatch test notification" },
      { status: 500 }
    );
  }
}
