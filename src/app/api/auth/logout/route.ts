import { NextResponse } from "next/server";
import { getAuthenticatedUser, revokeSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { logAudit } from "@/lib/services/audit";

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);

    if (auth) {
      await revokeSession(auth.sessionId);
      await logAudit({
        businessId: auth.businessId,
        userId: auth.user.id,
        action: "AUTH_LOGOUT",
        entityType: "USER",
        entityId: auth.user.id,
        details: { email: auth.user.email },
      });
    }

    const response = NextResponse.json({ success: true, message: "Signed out successfully" });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (error: any) {
    console.error("POST /api/auth/logout error:", error);
    const response = NextResponse.json({ success: true, message: "Signed out" });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }
}
