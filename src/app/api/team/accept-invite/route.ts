import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/token";
import { acceptWorkerInvitation } from "@/lib/services/team";
import { createDatabaseSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ success: false, error: "Missing invitation token" }, { status: 400 });
    }

    const tokenHash = await hashToken(token.trim());
    const invitation = await prisma.workerInvitation.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        name: true,
        email: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ success: false, error: "Invalid invitation token." }, { status: 404 });
    }
    if (invitation.revokedAt !== null) {
      return NextResponse.json({ success: false, error: "This invitation has been revoked." }, { status: 410 });
    }
    if (invitation.usedAt !== null) {
      return NextResponse.json({ success: false, error: "This invitation has already been accepted." }, { status: 410 });
    }
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ success: false, error: "This invitation link has expired." }, { status: 410 });
    }

    return NextResponse.json({
      success: true,
      invitation: {
        name: invitation.name,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error: any) {
    console.error("GET /api/team/accept-invite error:", error);
    return NextResponse.json({ success: false, error: "Failed to verify invitation" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, password } = body || {};

    if (!token || typeof token !== "string") {
      return NextResponse.json({ success: false, error: "Missing invitation token" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const user = await acceptWorkerInvitation({
      token: token.trim(),
      password,
    });

    // Automatically create a session for the worker upon accepting
    const { token: sessionToken } = await createDatabaseSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId || "biz_default_avencia",
      userAgent: request.headers.get("user-agent"),
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    const response = NextResponse.json({
      success: true,
      message: "Account activated successfully! Welcome to Avencia.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
    });

    const isProduction = process.env.NODE_ENV === "production";
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/team/accept-invite error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to accept invitation" }, { status: 400 });
  }
}
