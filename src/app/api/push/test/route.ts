import { NextRequest, NextResponse } from "next/server";
import { sendPushNotification } from "@/lib/services/push";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const businessId = body.businessId || DEFAULT_BUSINESS_ID;

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
      { success: false, error: error.message || "Failed to dispatch test notification" },
      { status: 500 }
    );
  }
}
