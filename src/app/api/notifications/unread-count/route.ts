import { NextRequest, NextResponse } from "next/server";
import { getUnreadCount } from "@/lib/services/notifications";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const count = await getUnreadCount(DEFAULT_BUSINESS_ID);
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("GET /api/notifications/unread-count error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch unread count", count: 0 },
      { status: 500 }
    );
  }
}
