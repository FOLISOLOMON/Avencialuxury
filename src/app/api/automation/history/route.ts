import { NextResponse } from "next/server";
import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { getWhatsAppLogs } from "@/lib/services/whatsapp";
import { serializePlainObject } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;
    const executions = await prisma.automationExecution.findMany({
      where: { businessId: auth!.businessId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const whatsAppLogs = await getWhatsAppLogs(auth!.businessId, 50);

    return NextResponse.json({
      success: true,
      data: {
        automationExecutions: serializePlainObject(executions),
        whatsAppLogs: serializePlainObject(whatsAppLogs),
      },
    });
  } catch (error: any) {
    console.error("GET /api/automation/history error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch automation history" },
      { status: 500 }
    );
  }
}
