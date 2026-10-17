import { NextResponse } from "next/server";
import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createDatabaseSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth/session";
import { logAudit } from "@/lib/services/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body || {};

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Delay response slightly to prevent timing attacks
      await new Promise((r) => setTimeout(r, 200));
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "Your account has been deactivated. Please contact the owner." },
        { status: 403 }
      );
    }

    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      await logAudit({
        businessId: user.businessId || DEFAULT_BUSINESS_ID,
        userId: user.id,
        action: "AUTH_LOGIN_FAILED",
        entityType: "USER",
        entityId: user.id,
        details: { email: normalizedEmail, reason: "Invalid credentials" },
        ipAddress: request.headers.get("x-forwarded-for") || undefined,
        userAgent: request.headers.get("user-agent") || undefined,
      });

      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const effectiveBusinessId = user.businessId || DEFAULT_BUSINESS_ID;
    const { token, sessionId } = await createDatabaseSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      businessId: effectiveBusinessId,
      userAgent: request.headers.get("user-agent"),
      ipAddress: request.headers.get("x-forwarded-for"),
    });

    await logAudit({
      businessId: effectiveBusinessId,
      userId: user.id,
      action: "AUTH_LOGIN_SUCCESS",
      entityType: "USER",
      entityId: user.id,
      details: { role: user.role, email: user.email },
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: effectiveBusinessId,
      },
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessId: effectiveBusinessId,
        },
        token,
      },
      token,
    });

    // Set secure HTTP-only cookie
    const isProduction = process.env.NODE_ENV === "production";
    const isHttps = request.url.startsWith("https://") || request.headers.get("x-forwarded-proto") === "https";
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: isProduction && isHttps,
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { success: false, error: "Sign in failed. Please try again." },
      { status: 500 }
    );
  }
}
