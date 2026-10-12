import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { testEmailConnection } from "@/lib/services/email";

export async function POST(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request, { allowedRoles: ["OWNER"] });
    if (errorResponse) return errorResponse;

    const result = await testEmailConnection(auth!.user.email);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          diagnostics: result.diagnostics,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Test email successfully sent to ${auth!.user.email}!`,
    });
  } catch (error: any) {
    console.error("POST /api/team/test-email error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to test email connection" },
      { status: 500 }
    );
  }
}
