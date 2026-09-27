import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id || !id.trim()) {
      return NextResponse.json({ success: false, error: "Batch ID is required" }, { status: 400 });
    }

    const batch = await prisma.batch.findFirst({
      where: { id: id.trim(), businessId: DEFAULT_BUSINESS_ID },
    });

    if (!batch) {
      return NextResponse.json({ success: false, error: "Batch not found" }, { status: 404 });
    }

    if (batch.status === "COMPLETED") {
      return NextResponse.json({ success: true, data: serializePlainObject(batch), message: "Batch is already closed" });
    }

    const updated = await prisma.batch.update({
      where: { id: batch.id },
      data: { status: "COMPLETED" },
    });

    return NextResponse.json({ success: true, data: serializePlainObject(updated) });
  } catch (error: any) {
    console.error("POST /api/batches/[id]/close error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to close batch" }, { status: 500 });
  }
}
