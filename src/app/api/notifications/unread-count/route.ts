import { NextRequest, NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/services/notifications";
import { requireAuth } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const { auth, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const count = await getUnreadCount(auth!.businessId);
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("GET /api/notifications/unread-count error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch unread count", count: 0 },
      { status: 500 }
    );
  }
}
