import { NextRequest, NextResponse } from "next/server";
import { markAllNotificationsAsRead } from "@/lib/services/notifications";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export async function PATCH(req: NextRequest) {
  try {
    const count = await markAllNotificationsAsRead(DEFAULT_BUSINESS_ID);
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error("PATCH /api/notifications/read-all error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mark all as read" },
      { status: 500 }
    );
  }
}
