import { NextResponse } from "next/server";
import { recordDebtPayment, getDebtorsList } from "@/lib/services/debt";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { PaymentMethod } from "@prisma/client";
import { serializePlainObject } from "@/lib/utils";

const VALID_PAYMENT_METHODS = new Set(Object.values(PaymentMethod));

export async function GET() {
  try {
    const debtors = await getDebtorsList(DEFAULT_BUSINESS_ID);
    return NextResponse.json({ success: true, data: serializePlainObject(debtors) });
  } catch (error: any) {
    console.error("GET /api/debt error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch debtors list" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!body.customerId || typeof body.customerId !== "string" || !body.customerId.trim()) {
      return NextResponse.json({ success: false, error: "Customer ID is required" }, { status: 400 });
    }

    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ success: false, error: "Payment amount must be a positive number (> 0)" }, { status: 400 });
    }

    const paymentMethod = body.paymentMethod || PaymentMethod.CASH;
    if (!VALID_PAYMENT_METHODS.has(paymentMethod)) {
      return NextResponse.json({ success: false, error: `Invalid payment method. Must be one of: ${Array.from(VALID_PAYMENT_METHODS).join(", ")}` }, { status: 400 });
    }

    const payment = await recordDebtPayment({
      businessId: DEFAULT_BUSINESS_ID,
      customerId: body.customerId.trim(),
      amount,
      paymentMethod,
      notes: body.notes ? String(body.notes).trim() : undefined,
      saleId: body.saleId ? String(body.saleId).trim() : undefined,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(payment) });
  } catch (error: any) {
    console.error("POST /api/debt error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to record debt payment" }, { status: 400 });
  }
}
