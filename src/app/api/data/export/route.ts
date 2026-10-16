import { NextResponse } from "next/server";
import { escapeCSV } from "@/lib/utils";
import { prisma } from "@/lib/db/prisma";
import { requireAuth } from "@/lib/auth/session";
import { logAudit } from "@/lib/services/audit";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // "products" | "customers" | "sales"

    if (!type || !["products", "customers", "sales"].includes(type)) {
      return NextResponse.json(
        { success: false, error: "Invalid export type. Must be 'products', 'customers', or 'sales'." },
        { status: 400 }
      );
    }

    let csvContent = "";
    let filename = "";

    if (type === "products") {
      filename = `avencia_products_${new Date().toISOString().slice(0, 10)}.csv`;
      const products = await prisma.product.findMany({
        where: { businessId: auth!.businessId },
        orderBy: { name: "asc" },
        include: {
          batchItems: {
            select: { quantityRemaining: true },
          },
        },
      });

      const headers = ["ID", "Name", "SKU", "Barcode", "Brand", "Category", "Size", "Selling Price", "Default Cost Price", "Remaining Stock", "Low Stock Threshold", "Status"];
      const rows = products.map((p) => {
        const remainingStock = p.batchItems.reduce((acc, bi) => acc + (bi.quantityRemaining || 0), 0);
        return [
          escapeCSV(p.id),
          escapeCSV(p.name),
          escapeCSV(p.sku),
          escapeCSV(p.barcode),
          escapeCSV(p.brand),
          escapeCSV(p.category),
          escapeCSV(p.size),
          escapeCSV(p.sellingPrice.toString()),
          escapeCSV(p.defaultCostPrice.toString()),
          escapeCSV(remainingStock),
          escapeCSV(p.lowStockThreshold),
          escapeCSV(p.isActive ? "Active" : "Archived"),
        ].join(",");
      });

      csvContent = [headers.join(","), ...rows].join("\n");
    } else if (type === "customers") {
      filename = `avencia_customers_${new Date().toISOString().slice(0, 10)}.csv`;
      const customers = await prisma.customer.findMany({
        where: { businessId: auth!.businessId },
        orderBy: { name: "asc" },
        include: {
          sales: {
            select: { totalAmount: true, balanceDue: true },
          },
        },
      });

      const headers = ["ID", "Name", "Phone", "Email", "Total Orders", "Total Debt Due", "Status", "Notes"];
      const rows = customers.map((c) => {
        const totalDebt = c.sales.reduce((acc, s) => acc + Number(s.balanceDue || 0), 0);
        return [
          escapeCSV(c.id),
          escapeCSV(c.name),
          escapeCSV(c.phone),
          escapeCSV(c.email),
          escapeCSV(c.sales.length),
          escapeCSV(totalDebt.toFixed(2)),
          escapeCSV(c.isActive ? "Active" : "Inactive"),
          escapeCSV(c.notes),
        ].join(",");
      });

      csvContent = [headers.join(","), ...rows].join("\n");
    } else if (type === "sales") {
      filename = `avencia_sales_${new Date().toISOString().slice(0, 10)}.csv`;
      const sales = await prisma.sale.findMany({
        where: { businessId: auth!.businessId },
        orderBy: { saleDate: "desc" },
        include: {
          customer: { select: { name: true, phone: true } },
          creator: { select: { name: true } },
        },
      });

      const headers = ["ID", "Sale Date", "Customer", "Subtotal", "Discount", "Total Amount", "Amount Paid", "Balance Due", "Payment Method", "Payment Status", "Sale Status", "Processed By"];
      const rows = sales.map((s) => [
        escapeCSV(s.id),
        escapeCSV(s.saleDate.toISOString()),
        escapeCSV(s.customer?.name || "Walk-in"),
        escapeCSV(s.subtotal.toString()),
        escapeCSV(s.discount.toString()),
        escapeCSV(s.totalAmount.toString()),
        escapeCSV(s.amountPaid.toString()),
        escapeCSV(s.balanceDue.toString()),
        escapeCSV(s.paymentMethod),
        escapeCSV(s.paymentStatus),
        escapeCSV(s.status),
        escapeCSV(s.creator?.name || "System"),
      ].join(","));

      csvContent = [headers.join(","), ...rows].join("\n");
    }

    await logAudit({
      businessId: auth!.businessId,
      userId: auth!.user.id,
      action: "DATA_EXPORTED",
      entityType: "BUSINESS_EXPORT",
      entityId: auth!.businessId,
      details: { exportType: type, filename },
    });

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("GET /api/data/export error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate business data export" },
      { status: 500 }
    );
  }
}
