import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);

    if (!auth) {
      return NextResponse.json(
        { success: false, authenticated: false, user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: auth.user,
      data: {
        user: auth.user,
      },
    });
  } catch (error: any) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { success: false, authenticated: false, error: "Failed to retrieve session" },
      { status: 500 }
    );
  }
}
