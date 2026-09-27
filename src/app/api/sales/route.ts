import { NextResponse } from "next/server";
import { createSale, getSales } from "@/lib/services/sales";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

export async function GET() {
  try {
    const sales = await getSales(DEFAULT_BUSINESS_ID);
    return NextResponse.json({ success: true, data: serializePlainObject(sales) });
  } catch (error: any) {
    console.error("GET /api/sales error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch sales history" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, error: "A sale must contain at least one item" }, { status: 400 });
    }

    const items: Array<{ productId: string; quantity: number; unitPrice: number }> = [];
    for (let index = 0; index < body.items.length; index++) {
      const item = body.items[index];
      if (!item.productId || typeof item.productId !== "string" || !item.productId.trim()) {
        return NextResponse.json({ success: false, error: `Item ${index + 1} must have a valid product ID` }, { status: 400 });
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json({ success: false, error: `Item ${index + 1} quantity must be a positive integer (> 0)` }, { status: 400 });
      }

      const unitPrice = parseFloat(item.unitPrice);
      if (isNaN(unitPrice) || unitPrice < 0) {
        return NextResponse.json({ success: false, error: `Item ${index + 1} unit price must be a non-negative number (>= 0)` }, { status: 400 });
      }

      items.push({
        productId: item.productId.trim(),
        quantity: qty,
        unitPrice,
      });
    }

    let discount = 0;
    if (body.discount !== undefined && body.discount !== null) {
      discount = parseFloat(body.discount);
      if (isNaN(discount) || discount < 0) {
        return NextResponse.json({ success: false, error: "Discount must be a valid non-negative number" }, { status: 400 });
      }
    }

    let amountPaid: number | undefined = undefined;
    if (body.amountPaid !== undefined && body.amountPaid !== null) {
      amountPaid = parseFloat(body.amountPaid);
      if (isNaN(amountPaid) || amountPaid < 0) {
        return NextResponse.json({ success: false, error: "Amount paid must be a valid non-negative number" }, { status: 400 });
      }
    }

    let saleDate: Date | undefined = undefined;
    if (body.saleDate) {
      const parsedDate = new Date(body.saleDate);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ success: false, error: "Invalid sale date format" }, { status: 400 });
      }
      saleDate = parsedDate;
    }

    const sale = await createSale({
      businessId: DEFAULT_BUSINESS_ID,
      customerId: body.customerId ? String(body.customerId).trim() : undefined,
      saleDate,
      discount,
      paymentMethod: body.paymentMethod || "CASH",
      amountPaid,
      notes: body.notes ? String(body.notes).trim() : undefined,
      items,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(sale) });
  } catch (error: any) {
    console.error("POST /api/sales error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to record sale" }, { status: 400 });
  }
}
