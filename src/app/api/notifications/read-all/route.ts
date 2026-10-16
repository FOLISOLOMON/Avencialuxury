import { NextRequest, NextResponse } from "next/server";
import { markAllNotificationsAsRead } from "@/lib/services/notifications";
import { requireAuth } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { auth, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const count = await markAllNotificationsAsRead(auth!.businessId);
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("POST /api/notifications/read-all error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mark all as read" },
      { status: 500 }
    );
  }
}
