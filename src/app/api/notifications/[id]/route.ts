import { NextRequest, NextResponse } from "next/server";
import { deleteNotification } from "@/lib/services/notifications";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteNotification(id, DEFAULT_BUSINESS_ID);
    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("DELETE /api/notifications/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete notification" },
      { status: 500 }
    );
  }
}
