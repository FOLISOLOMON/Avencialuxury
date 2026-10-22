import { NextRequest, NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/services/notifications";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    const { auth } = await requireAuth(req);
    const businessId = auth?.businessId || DEFAULT_BUSINESS_ID;
    const count = await getUnreadCount(businessId);
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("GET /api/notifications/unread-count error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch unread count", count: 0 },
      { status: 500 }
    );
  }
}
