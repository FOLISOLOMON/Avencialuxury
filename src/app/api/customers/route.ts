import { NextResponse } from "next/server";
import { createCustomer, getCustomers } from "@/lib/services/customers";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const customers = await getCustomers(DEFAULT_BUSINESS_ID, search);
    return NextResponse.json({ success: true, data: serializePlainObject(customers) });
  } catch (error: any) {
    console.error("GET /api/customers error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch customers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ success: false, error: "Customer name is required" }, { status: 400 });
    }

    const customer = await createCustomer({
      businessId: DEFAULT_BUSINESS_ID,
      name: body.name.trim(),
      phone: body.phone ? String(body.phone).trim() : undefined,
      email: body.email ? String(body.email).trim() : undefined,
      notes: body.notes ? String(body.notes).trim() : undefined,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(customer) });
  } catch (error: any) {
    console.error("POST /api/customers error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create customer" }, { status: 400 });
  }
}
