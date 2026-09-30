import { NextResponse } from "next/server";
import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { getWhatsAppLogs } from "@/lib/services/whatsapp";
import { serializePlainObject } from "@/lib/utils";

export async function GET() {
  try {
    const executions = await prisma.automationExecution.findMany({
      where: { businessId: DEFAULT_BUSINESS_ID },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const whatsAppLogs = await getWhatsAppLogs(DEFAULT_BUSINESS_ID, 50);

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
