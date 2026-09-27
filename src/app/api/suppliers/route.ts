import { NextResponse } from "next/server";
import { createSupplier, getSuppliers } from "@/lib/services/suppliers";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const suppliers = await getSuppliers(DEFAULT_BUSINESS_ID, search);
    return NextResponse.json({ success: true, data: serializePlainObject(suppliers) });
  } catch (error: any) {
    console.error("GET /api/suppliers error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ success: false, error: "Supplier name is required" }, { status: 400 });
    }

    const supplier = await createSupplier({
      businessId: DEFAULT_BUSINESS_ID,
      name: body.name.trim(),
      contactPerson: body.contactPerson ? String(body.contactPerson).trim() : undefined,
      phone: body.phone ? String(body.phone).trim() : undefined,
      email: body.email ? String(body.email).trim() : undefined,
      address: body.address ? String(body.address).trim() : undefined,
      notes: body.notes ? String(body.notes).trim() : undefined,
    });

    return NextResponse.json({ success: true, data: serializePlainObject(supplier) });
  } catch (error: any) {
    console.error("POST /api/suppliers error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to create supplier" }, { status: 400 });
  }
}
