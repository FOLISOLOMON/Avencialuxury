import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Batch ID is required" }, { status: 400 });
    }

    const batch = await prisma.batch.findFirst({
      where: { id: id.trim(), businessId: DEFAULT_BUSINESS_ID },
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
