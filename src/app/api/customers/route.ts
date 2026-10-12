import { NextResponse } from "next/server";
import { createCustomer, getCustomers } from "@/lib/services/customers";
import { serializePlainObject } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/session";
import { logAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const customers = await getCustomers(auth!.businessId, search);

    // Apply data minimization for workers
    if (auth!.user.role === "WORKER") {
      const sanitized = customers.map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        notes: c.notes,
        totalDebt: c.totalDebt,
        activeCreditOrdersCount: c.activeCreditOrdersCount,
      }));
      return NextResponse.json({ success: true, data: serializePlainObject(sanitized) });
    }

    return NextResponse.json({ success: true, data: serializePlainObject(customers) });
  } catch (error: any) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch customers" }, { status: 500 });
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

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ success: false, error: "Customer name is required" }, { status: 400 });
    }

    const customer = await createCustomer({
      businessId: auth!.businessId,
      name: body.name.trim(),
      phone: body.phone ? String(body.phone).trim() : undefined,
      email: body.email ? String(body.email).trim() : undefined,
      notes: body.notes ? String(body.notes).trim() : undefined,
    });

    await logAudit({
      businessId: auth!.businessId,
      userId: auth!.user.id,
      action: "CUSTOMER_REGISTERED",
      entityType: "CUSTOMER",
      entityId: customer.id,
      details: { name: customer.name, phone: customer.phone },
    });

    return NextResponse.json({ success: true, data: serializePlainObject(customer) });
  } catch (error: any) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create customer" }, { status: 400 });
  }
}
