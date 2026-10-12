import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { editSale } from "@/lib/services/sales";
import { serializePlainObject } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { id: saleId } = await params;
    const body = await request.json();
    const { notes, dueDate, customerId } = body || {};

    const updatedSale = await editSale({
      saleId,
      editor: {
        id: auth!.user.id,
        role: auth!.user.role,
      },
      notes,
      dueDate,
      customerId,
    });

    return NextResponse.json({
      success: true,
      data: serializePlainObject(updatedSale),
      message: "Sale updated successfully.",
    });
  } catch (error: any) {
    console.error("PATCH /api/sales/[id]/edit error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to edit sale" }, { status: 400 });
  }
}
