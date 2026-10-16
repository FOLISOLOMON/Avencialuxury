import { getClientIp, checkResetPasswordRateLimit, recordResetPasswordAttempt } from "@/lib/auth/rate-limit";
import { NextResponse } from "next/server";
import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/token";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { logAudit } from "@/lib/services/audit";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, newPassword } = body || {};

    const ip = getClientIp(request);
    const rateLimit = await checkResetPasswordRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many password reset attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        }
      );
    }
    await recordResetPasswordAttempt(ip);

    if (!token || typeof token !== "string") {
      return NextResponse.json({ success: false, error: "Invalid or missing reset token" }, { status: 400 });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ success: false, error: "New password must be at least 8 characters long" }, { status: 400 });
    }

    const tokenHash = await hashToken(token.trim());

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetRecord || resetRecord.usedAt !== null || resetRecord.expiresAt < new Date()) {
      return NextResponse.json({
        success: false,
        error: "This password reset link is invalid or has expired. Please request a new one.",
      }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: resetRecord.email },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({
        success: false,
        error: "The account associated with this link is not active.",
      }, { status: 400 });
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.$transaction(async (tx) => {
      // 1. Update user password
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash },
      });

      // 2. Mark token as used
      await tx.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      });
    });

    // 3. Immediately revoke all existing sessions
    await revokeAllUserSessions(user.id);

    await logAudit({
      businessId: user.businessId || DEFAULT_BUSINESS_ID,
      userId: user.id,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "USER",
      entityId: user.id,
      details: { email: user.email },
    });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. Please sign in with your new password.",
    });
  } catch (error: any) {
    console.error("POST /api/auth/reset-password error:", error);
    return NextResponse.json({ success: false, error: "Failed to reset password" }, { status: 500 });
  }
}
