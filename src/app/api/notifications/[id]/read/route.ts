import { NextRequest, NextResponse } from "next/server";
import { markNotificationAsRead } from "@/lib/services/notifications";
import { requireAuth } from "@/lib/auth/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const success = await markNotificationAsRead(id, auth!.businessId);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("PATCH /api/notifications/[id]/read error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
