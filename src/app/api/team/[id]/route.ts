import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { deactivateWorker, activateWorker } from "@/lib/services/team";
import { serializePlainObject } from "@/lib/utils";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const { id: workerId } = await params;
    const body = await request.json();
    const { action } = body || {};

    if (action === "deactivate") {
      const updated = await deactivateWorker({
        businessId: auth!.businessId,
        workerId,
        ownerId: auth!.user.id,
      });
      return NextResponse.json({
        success: true,
        data: serializePlainObject(updated),
        message: "Worker deactivated. All active sessions have been revoked immediately.",
      });
    } else if (action === "activate") {
      const updated = await activateWorker({
        businessId: auth!.businessId,
        workerId,
        ownerId: auth!.user.id,
      });
      return NextResponse.json({
        success: true,
        data: serializePlainObject(updated),
        message: "Worker reactivated successfully.",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action. Expected 'activate' or 'deactivate'" }, { status: 400 });
  } catch (error: any) {
    console.error("PATCH /api/team/[id] error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update worker status" }, { status: 400 });
  }
}
