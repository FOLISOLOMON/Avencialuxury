import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/services/settings";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { PaymentMethod } from "@prisma/client";
import { serializePlainObject } from "@/lib/utils";

const VALID_PAYMENT_METHODS = new Set(Object.values(PaymentMethod));

export async function GET() {
  try {
    const settings = await getSettings(DEFAULT_BUSINESS_ID);
    return NextResponse.json({ success: true, data: serializePlainObject(settings) });
  } catch (error: any) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    let lowStockThreshold: number | undefined = undefined;
    if (body.lowStockThreshold !== undefined && body.lowStockThreshold !== null) {
      const parsed = parseInt(body.lowStockThreshold, 10);
      if (isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { success: false, error: "Low stock threshold must be a non-negative integer" },
          { status: 400 }
        );
      }
      lowStockThreshold = parsed;
    }

    let defaultPaymentMethod: PaymentMethod | undefined = undefined;
    if (body.defaultPaymentMethod) {
      if (!VALID_PAYMENT_METHODS.has(body.defaultPaymentMethod)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid payment method. Must be one of: ${Array.from(VALID_PAYMENT_METHODS).join(", ")}`,
          },
          { status: 400 }
        );
      }
      defaultPaymentMethod = body.defaultPaymentMethod;
    }

    // Automation Rules Validations
    let largeExpenseThreshold: number | undefined = undefined;
    if (body.largeExpenseThreshold !== undefined && body.largeExpenseThreshold !== null) {
      const parsed = parseFloat(body.largeExpenseThreshold);
      if (isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { success: false, error: "Large expense threshold must be a non-negative number" },
          { status: 400 }
        );
      }
      largeExpenseThreshold = parsed;
    }

    let batchNearCompletionThreshold: number | undefined = undefined;
    if (body.batchNearCompletionThreshold !== undefined && body.batchNearCompletionThreshold !== null) {
      const parsed = parseFloat(body.batchNearCompletionThreshold);
      if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
        return NextResponse.json(
          { success: false, error: "Batch near completion threshold must be between 1% and 100%" },
          { status: 400 }
        );
      }
      batchNearCompletionThreshold = parsed;
    }

    let dormantCustomerDays: number | undefined = undefined;
    if (body.dormantCustomerDays !== undefined && body.dormantCustomerDays !== null) {
      const parsed = parseInt(body.dormantCustomerDays, 10);
      if (isNaN(parsed) || parsed < 1) {
        return NextResponse.json(
          { success: false, error: "Dormant customer threshold must be at least 1 day" },
          { status: 400 }
        );
      }
      dormantCustomerDays = parsed;
    }

    const dailySummaryEnabled =
      body.dailySummaryEnabled !== undefined ? Boolean(body.dailySummaryEnabled) : undefined;
    const weeklySummaryEnabled =
      body.weeklySummaryEnabled !== undefined ? Boolean(body.weeklySummaryEnabled) : undefined;

    const settings = await updateSettings({
      businessId: DEFAULT_BUSINESS_ID,
      lowStockThreshold,
      currency: body.currency ? String(body.currency).trim() : undefined,
      defaultPaymentMethod,
      largeExpenseThreshold,
      batchNearCompletionThreshold,
      dormantCustomerDays,
      dailySummaryEnabled,
      weeklySummaryEnabled,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(settings) });
  } catch (error: any) {
    console.error("POST /api/settings error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update settings" },
      { status: 500 }
    );
  }
}
