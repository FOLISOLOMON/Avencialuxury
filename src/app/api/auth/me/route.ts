import { NextResponse } from "next/server";
import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { extractTokenFromRequest, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { verifySessionToken } from "@/lib/auth/token";

export async function GET(request: Request) {
  try {
    const token = extractTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        { success: false, authenticated: false, user: null },
        { status: 401 }
      );
    }

    const payload = await verifySessionToken(token);
    if (!payload) {
      const res = NextResponse.json(
        { success: false, authenticated: false, user: null, error: "Invalid session token" },
        { status: 401 }
      );
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    const dbSession = await prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            businessId: true,
          },
        },
      },
    });

    if (!dbSession || dbSession.revokedAt !== null || dbSession.expiresAt < new Date()) {
      const res = NextResponse.json(
        {
          success: false,
          authenticated: false,
          sessionRevoked: true,
          error: "Session has been revoked or expired",
        },
        { status: 401 }
      );
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    const user = dbSession.user;
    if (!user || !user.isActive) {
      const res = NextResponse.json(
        {
          success: false,
          authenticated: false,
          deactivated: true,
          error: "Your account has been deactivated by the administrator",
        },
        { status: 403 }
      );
      res.cookies.delete(SESSION_COOKIE_NAME);
      return res;
    }

    const effectiveBusinessId = user.businessId || DEFAULT_BUSINESS_ID;

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        businessId: effectiveBusinessId,
      },
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          businessId: effectiveBusinessId,
        },
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
