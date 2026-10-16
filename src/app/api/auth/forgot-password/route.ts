import { getClientIp, checkForgotPasswordRateLimit, recordForgotPasswordAttempt } from "@/lib/auth/rate-limit";
import { NextResponse } from "next/server";
import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/token";
import { logAudit } from "@/lib/services/audit";
import { sendPasswordResetEmail } from "@/lib/services/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body || {};

    const ip = getClientIp(request);
    const rateLimit = await checkForgotPasswordRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many password recovery requests. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }
    await recordForgotPasswordAttempt(ip);

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({
        success: false,
        error: "A valid email address is required",
      }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Do NOT reveal whether account exists (timing attack & email enumeration protection)
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (user && user.isActive) {
      // Invalidate existing tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email: normalizedEmail },
      });

      // Generate 32-byte high entropy token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = await hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      await prisma.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          tokenHash,
          expiresAt,
        },
      });

      await logAudit({
        businessId: user.businessId || DEFAULT_BUSINESS_ID,
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "USER",
        entityId: user.id,
        details: { email: normalizedEmail },
      });

      const appBaseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetUrl = `${appBaseUrl}/reset-password/${rawToken}`;

      await sendPasswordResetEmail({
        to: normalizedEmail,
        resetUrl,
        expiresAt,
      });
    }

    // Always return uniform neutral response
    return NextResponse.json({
      success: true,
      message: "If an active account exists for that email, password recovery instructions have been processed.",
    });
  } catch (error: any) {
    console.error("POST /api/auth/forgot-password error:", error);
    return NextResponse.json({
      success: true,
      message: "If an active account exists for that email, password recovery instructions have been processed.",
    });
  }
}
