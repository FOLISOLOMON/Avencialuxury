import { NextRequest, NextResponse } from "next/server";
import { getDeviceSubscriptions } from "@/lib/services/push";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { auth, errorResponse } = await requireAuth(req, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const businessId = auth!.businessId;

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
      { success: false, error: "Failed to load device subscriptions" },
      { status: 500 }
    );
  }
}
