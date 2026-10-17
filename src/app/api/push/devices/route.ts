import { NextRequest, NextResponse } from "next/server";
import { getDeviceSubscriptions } from "@/lib/services/push";
import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId") || DEFAULT_BUSINESS_ID;

    const [devices, logs] = await Promise.all([
      getDeviceSubscriptions(businessId),
      prisma.pushDeliveryLog.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          notificationType: true,
          title: true,
          body: true,
          status: true,
          recipientCount: true,
          error: true,
          sentAt: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      devices,
      logs,
    });
  } catch (error: any) {
    console.error("GET /api/push/devices error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load device subscriptions" },
      { status: 500 }
    );
  }
}
