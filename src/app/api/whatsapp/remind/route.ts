import { NextResponse } from "next/server";
import { sendOrQueueWhatsAppMessage } from "@/lib/services/whatsapp";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const { customerId, messageType, phone, customMessage, forceSend } = body;

    const result = await sendOrQueueWhatsAppMessage({
      businessId: DEFAULT_BUSINESS_ID,
      customerId: customerId ? String(customerId).trim() : null,
      messageType: messageType || "PAYMENT_REMINDER",
      phone: phone ? String(phone).trim() : null,
      customMessage: customMessage ? String(customMessage).trim() : undefined,
      forceSend: Boolean(forceSend),
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.message,
          reason: result.reason,
          status: result.status,
          logId: result.logId,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      phone: result.phone,
      message: result.message,
      status: result.status,
      logId: result.logId,
    });
  } catch (error: any) {
    console.error("POST /api/whatsapp/remind error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process WhatsApp request" },
      { status: 500 }
    );
  }
}
