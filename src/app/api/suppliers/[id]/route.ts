import { NextRequest, NextResponse } from "next/server";
import { getSupplierById, updateSupplier, deleteSupplier } from "@/lib/services/suppliers";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Supplier ID is required" }, { status: 400 });
    }

    const supplier = await getSupplierById(id.trim(), DEFAULT_BUSINESS_ID);
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: serializePlainObject(supplier) });
  } catch (error: any) {
    console.error("GET /api/suppliers/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch supplier" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Supplier ID is required" }, { status: 400 });
    }

    const body = await req.json();
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim())) {
      return NextResponse.json({ success: false, error: "Supplier name cannot be empty" }, { status: 400 });
    }

    const supplier = await getSupplierById(id.trim(), DEFAULT_BUSINESS_ID);
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }

    const updated = await updateSupplier({
      id: id.trim(),
      businessId: DEFAULT_BUSINESS_ID,
      name: body.name !== undefined ? String(body.name).trim() : undefined,
      contactPerson: body.contactPerson !== undefined ? (body.contactPerson ? String(body.contactPerson).trim() : null) : undefined,
      phone: body.phone !== undefined ? (body.phone ? String(body.phone).trim() : null) : undefined,
      email: body.email !== undefined ? (body.email ? String(body.email).trim() : null) : undefined,
      address: body.address !== undefined ? (body.address ? String(body.address).trim() : null) : undefined,
      notes: body.notes !== undefined ? (body.notes ? String(body.notes).trim() : null) : undefined,
    });
    return NextResponse.json({ success: true, data: serializePlainObject(updated) });
  } catch (error: any) {
    console.error("PATCH /api/suppliers/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update supplier" }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Supplier ID is required" }, { status: 400 });
    }

    const supplier = await getSupplierById(id.trim(), DEFAULT_BUSINESS_ID);
    if (!supplier) {
      return NextResponse.json({ success: false, error: "Supplier not found" }, { status: 404 });
    }

    await deleteSupplier(id.trim(), DEFAULT_BUSINESS_ID);
    return NextResponse.json({ success: true, message: "Supplier deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/suppliers/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to delete supplier" }, { status: 400 });
  }
}
