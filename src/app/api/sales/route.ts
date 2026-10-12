import { NextResponse } from "next/server";
import { createSale } from "@/lib/services/sales";
import { getSalesReport } from "@/lib/services/reports";
import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);

    // If worker, strictly enforce scoping to their own sales
    let creatorIdFilter = searchParams.get("creatorId") || undefined;
    if (auth!.user.role === "WORKER") {
      creatorIdFilter = auth!.user.id;
    }

    const filter = {
      quickRange: searchParams.get("quickRange") || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      customerId: searchParams.get("customerId") || undefined,
      paymentStatus: searchParams.get("paymentStatus") || undefined,
      paymentMethod: searchParams.get("paymentMethod") || undefined,
      batchId: searchParams.get("batchId") || undefined,
      productId: searchParams.get("productId") || undefined,
      creatorId: creatorIdFilter,
      search: searchParams.get("search") || undefined,
    };

    const result = await getSalesReport(auth!.businessId, filter);

    // Data minimization for worker: do NOT expose total gross profits or purchase costs
    if (auth!.user.role === "WORKER") {
      const sanitizedSales = result.sales.map((s) => ({
        id: s.id,
        saleDate: s.saleDate,
        totalAmount: s.totalAmount,
        amountPaid: s.amountPaid,
        balanceDue: s.balanceDue,
        dueDate: s.dueDate,
        paymentMethod: s.paymentMethod,
        paymentStatus: s.paymentStatus,
        status: s.status,
        notes: s.notes,
        customer: s.customer,
        creator: s.creator,
        cancellationRequest: s.cancellationRequest,
        saleItems: s.saleItems.map((item) => ({
          id: item.id,
          productId: item.productId,
          product: item.product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          revenue: item.revenue,
          // unitCost, cost, profit redacted
        })),
      }));

      return NextResponse.json({
        success: true,
        data: serializePlainObject(sanitizedSales),
        summary: {
          totalSalesCount: sanitizedSales.filter((s) => s.status !== "VOIDED").length,
          totalRevenue: result.summary.totalSalesRevenue,
          totalAmountCollected: result.summary.totalAmountCollected,
          totalOutstanding: result.summary.totalOutstanding,
        },
      });
    }

    // Owner view: complete financial reports
    const summaryWithAliases = {
      ...result.summary,
      totalRevenue: result.summary.totalSalesRevenue,
      totalSalesCount: result.summary.totalTransactions,
    };

    return NextResponse.json({
      success: true,
      data: serializePlainObject(result.sales),
      summary: serializePlainObject(summaryWithAliases),
      paymentMethodBreakdown: serializePlainObject(result.paymentMethodBreakdown),
      dailySalesTrend: serializePlainObject(result.dailySalesTrend),
    });
  } catch (error: any) {
    console.error("GET /api/sales error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch sales history" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ success: false, error: "A sale must contain at least one item" }, { status: 400 });
    }

    // Product lookup and authoritative pricing verification
    const productIds = body.items.map((i: any) => String(i.productId || "").trim()).filter(Boolean);
    const dbProducts = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId: auth!.businessId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        sellingPrice: true,
      },
    });

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    const items: Array<{ productId: string; quantity: number; unitPrice: number }> = [];
    for (let index = 0; index < body.items.length; index++) {
      const item = body.items[index];
      const pId = item.productId ? String(item.productId).trim() : "";
      if (!pId) {
        return NextResponse.json({ success: false, error: `Item ${index + 1} must have a valid product ID` }, { status: 400 });
      }

      const product = productMap.get(pId);
      if (!product) {
        return NextResponse.json({ success: false, error: `Product not found or inactive for item ${index + 1}` }, { status: 400 });
      }

      const qty = parseInt(item.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return NextResponse.json({ success: false, error: `Item ${index + 1} quantity must be a positive integer (> 0)` }, { status: 400 });
      }

      let unitPrice = parseFloat(item.unitPrice);
      const configuredSellingPrice = product.sellingPrice.toNumber();

      // WORKER PRICE PROTECTION: Workers cannot alter product prices without owner authorization
      if (auth!.user.role === "WORKER") {
        unitPrice = configuredSellingPrice;
      } else {
        if (isNaN(unitPrice) || unitPrice < 0) {
          unitPrice = configuredSellingPrice;
        }
      }

      items.push({
        productId: pId,
        quantity: qty,
        unitPrice,
      });
    }

    // Workers cannot give unauthorized custom discounts
    let discount = 0;
    if (auth!.user.role === "OWNER" && body.discount !== undefined && body.discount !== null) {
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
    if (body.saleDate && auth!.user.role === "OWNER") {
      const parsedDate = new Date(body.saleDate);
      if (!isNaN(parsedDate.getTime())) {
        saleDate = parsedDate;
      }
    }

    let dueDate: Date | undefined = undefined;
    if (body.dueDate) {
      const parsedDueDate = new Date(body.dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return NextResponse.json({ success: false, error: "Invalid payment due date format" }, { status: 400 });
      }
      dueDate = parsedDueDate;
    }

    const sale = await createSale({
      businessId: auth!.businessId,
      creatorId: auth!.user.id, // Strictly bind authoritative creator from session
      customerId: body.customerId ? String(body.customerId).trim() : undefined,
      saleDate,
      dueDate,
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
