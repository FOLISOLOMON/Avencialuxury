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

    const rawMethod = String(body.paymentMethod || "CASH").toUpperCase().trim();
    let paymentMethod: PaymentMethod = PaymentMethod.CASH;
    if (rawMethod === "MOBILE_MONEY" || rawMethod === "MOMO" || rawMethod === "MTN" || rawMethod === "VODAFONE" || rawMethod === "AIRTELTIGO") {
      paymentMethod = PaymentMethod.MOBILE_MONEY;
    } else if (rawMethod === "BANK_TRANSFER" || rawMethod === "BANK" || rawMethod === "TRANSFER") {
      paymentMethod = PaymentMethod.BANK_TRANSFER;
    } else if (rawMethod === "CARD" || rawMethod === "POS" || rawMethod === "VISA" || rawMethod === "MASTERCARD") {
      paymentMethod = PaymentMethod.CARD;
    } else if (rawMethod === "OTHER") {
      paymentMethod = PaymentMethod.OTHER;
    } else if (VALID_PAYMENT_METHODS.has(body.paymentMethod as any)) {
      paymentMethod = body.paymentMethod;
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

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { saleId, dueDate } = body;

    if (!saleId) {
      return NextResponse.json({ success: false, error: "saleId is required" }, { status: 400 });
    }

    const { updateSaleDueDate } = await import("@/lib/services/debt-reminder");
    const updated = await updateSaleDueDate({
      saleId,
      dueDate: dueDate ? new Date(dueDate) : null,
      businessId: DEFAULT_BUSINESS_ID,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(updated) });
  } catch (error: any) {
    console.error("PATCH /api/debt error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update debt due date" },
      { status: 400 }
    );
  }
}

