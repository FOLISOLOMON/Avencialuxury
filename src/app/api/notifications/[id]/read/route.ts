import { NextRequest, NextResponse } from "next/server";
import { markNotificationAsRead } from "@/lib/services/notifications";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await markNotificationAsRead(id, DEFAULT_BUSINESS_ID);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("PATCH /api/notifications/[id]/read error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
