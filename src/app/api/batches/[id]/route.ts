import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";
import { requireAuth } from "@/lib/auth/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Batch ID is required" }, { status: 400 });
    }

    const batch = await prisma.batch.findFirst({
      where: { id: id.trim(), businessId: auth!.businessId },
      include: {
        supplier: true,
        batchItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                barcode: true,
                brand: true,
                size: true,
                category: true,
                sellingPrice: true,
                defaultCostPrice: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: serializePlainObject(batch) });
  } catch (error: any) {
    console.error("GET /api/batches/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch batch details" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Batch ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { additionalCosts, notes, supplierId } = body;

    const existing = await prisma.batch.findFirst({
      where: { id: id.trim(), businessId: auth!.businessId },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    const updatedCost = additionalCosts !== undefined ? Number(additionalCosts) : Number(existing.additionalCosts);
    const newTotalInvestment = Number(existing.purchaseCost) + updatedCost;

    const updated = await prisma.batch.update({
      where: { id: existing.id },
      data: {
        additionalCosts: updatedCost,
        totalInvestment: newTotalInvestment,
        notes: notes !== undefined ? notes : existing.notes,
        supplierId: supplierId !== undefined ? supplierId : existing.supplierId,
      },
    });

    return NextResponse.json({ success: true, data: serializePlainObject(updated) });
  } catch (error: any) {
    console.error("PATCH /api/batches/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update batch" }, { status: 500 });
  }
}
