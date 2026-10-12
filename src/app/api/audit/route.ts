import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getAuditLogs } from "@/lib/services/audit";
import { serializePlainObject } from "@/lib/utils";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const action = searchParams.get("action") || undefined;
    const entityType = searchParams.get("entityType") || undefined;

    const result = await getAuditLogs(auth!.businessId, { limit, offset, action, entityType });

    return NextResponse.json({
      success: true,
      data: serializePlainObject(result.logs),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (error: any) {
    console.error("GET /api/audit error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch audit log" }, { status: 500 });
  }
}
