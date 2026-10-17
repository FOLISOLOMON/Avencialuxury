import { NextRequest, NextResponse } from "next/server";
import { getNotifications, NotificationCategory } from "@/lib/services/notifications";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const category = (searchParams.get("category") || "ALL") as NotificationCategory | "ALL";
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;
    const cursor = searchParams.get("cursor") || undefined;

    const result = await getNotifications({
      businessId: DEFAULT_BUSINESS_ID,
      unreadOnly,
      category,
      limit,
      cursor,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("GET /api/notifications error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
