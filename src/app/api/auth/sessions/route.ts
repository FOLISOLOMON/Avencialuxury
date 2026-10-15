import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireAuth, revokeSession, revokeAllUserSessions } from "@/lib/auth/session";
import { logAudit } from "@/lib/services/audit";

export async function GET(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const sessions = await prisma.session.findMany({
      where: {
        userId: auth!.user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActiveAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastActiveAt: true,
      },
    });

    const formatted = sessions.map((s) => ({
      id: s.id,
      userAgent: s.userAgent || "Unknown Device",
      ipAddress: s.ipAddress || "Unknown IP",
      createdAt: s.createdAt.toISOString(),
      lastActiveAt: s.lastActiveAt.toISOString(),
      isCurrent: s.id === auth!.sessionId,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    console.error("GET /api/auth/sessions error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load active sessions" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { auth, errorResponse } = await requireAuth(request);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const targetSessionId = searchParams.get("sessionId");
    const revokeAllOthers = searchParams.get("allOthers") === "true";

    if (revokeAllOthers) {
      // Revoke all sessions except the current one
      await prisma.session.updateMany({
        where: {
          userId: auth!.user.id,
          id: { not: auth!.sessionId },
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      await logAudit({
        businessId: auth!.businessId,
        userId: auth!.user.id,
        action: "SESSIONS_REVOKED_ALL_OTHERS",
        entityType: "SESSION",
        entityId: auth!.user.id,
      });

      return NextResponse.json({
        success: true,
        message: "All other sessions have been revoked.",
      });
    }

    if (!targetSessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required." },
        { status: 400 }
      );
    }

    // Verify ownership
    const session = await prisma.session.findUnique({
      where: { id: targetSessionId },
    });

    if (!session || session.userId !== auth!.user.id) {
      return NextResponse.json(
        { success: false, error: "Session not found or unauthorized." },
        { status: 404 }
      );
    }

    await revokeSession(targetSessionId);

    await logAudit({
      businessId: auth!.businessId,
      userId: auth!.user.id,
      action: "SESSION_REVOKED",
      entityType: "SESSION",
      entityId: targetSessionId,
    });

    return NextResponse.json({
      success: true,
      message: "Session successfully revoked.",
    });
  } catch (error: any) {
    console.error("DELETE /api/auth/sessions error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to revoke session" },
      { status: 500 }
    );
  }
}
