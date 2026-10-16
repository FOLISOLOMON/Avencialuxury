import crypto from "node:crypto";
import { prisma, ensureDefaultBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { signSessionToken, verifySessionToken, hashToken, SessionPayload } from "./token";
import { Role, User } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "avencia_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
export const INACTIVITY_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days inactivity window

export interface AuthContext {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    isActive: boolean;
    businessId: string;
  };
  sessionId: string;
  businessId: string;
}

/**
 * Creates an authoritative database session and returns signed JWT token.
 */
export async function createDatabaseSession(params: {
  userId: string;
  email: string;
  role: Role;
  businessId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<{ token: string; sessionId: string }> {
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const randomEntropy = crypto.randomBytes(32).toString("hex");
  const rawTokenEntropy = `${params.userId}-${Date.now()}-${randomEntropy}`;
  const tokenHash = await hashToken(rawTokenEntropy);

  const session = await prisma.session.create({
    data: {
      userId: params.userId,
      tokenHash,
      expiresAt,
      userAgent: params.userAgent || null,
      ipAddress: params.ipAddress || null,
      lastActiveAt: new Date(),
    },
  });

  const token = await signSessionToken({
    userId: params.userId,
    email: params.email,
    role: params.role,
    businessId: params.businessId,
    sessionId: session.id,
  }, SESSION_MAX_AGE_SECONDS);

  return { token, sessionId: session.id };
}

/**
 * Revokes a single session immediately.
 */
export async function revokeSession(sessionId: string): Promise<void> {
  try {
    await prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (err) {
    console.error("[Auth] Revoke session error:", err);
  }
}

/**
 * Revokes all sessions for a specific user (e.g. upon deactivation or password change).
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  try {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch (err) {
    console.error("[Auth] Revoke all sessions error:", err);
  }
}

/**
 * Extracts raw session token from request cookies or Authorization header.
 */
export function extractTokenFromRequest(req: Request): string | null {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  if (authHeader && /^Bearer\s+/i.test(authHeader)) {
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (bearer) return bearer;
  }

  // 2. Check Cookie header
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const cookiesArr = cookieHeader.split(";").map((c) => c.trim());
    for (const c of cookiesArr) {
      if (c.startsWith(`${SESSION_COOKIE_NAME}=`)) {
        return decodeURIComponent(c.substring(SESSION_COOKIE_NAME.length + 1));
      }
    }
  }

  return null;
}

/**
 * Validates request session authoritatively against PostgreSQL.
 * Verifies account active, session not revoked, inactivity timeout, and role.
 */
export async function getAuthenticatedUser(req: Request): Promise<AuthContext | null> {
  const token = extractTokenFromRequest(req);
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  try {
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

    if (!dbSession) return null;
    if (dbSession.revokedAt !== null) return null;
    if (dbSession.expiresAt < new Date()) return null;

    // Check inactivity timeout
    const now = Date.now();
    const lastActive = new Date(dbSession.lastActiveAt).getTime();
    if (now - lastActive > INACTIVITY_TIMEOUT_MS) {
      await revokeSession(dbSession.id);
      return null;
    }

    const user = dbSession.user;
    if (!user || !user.isActive) return null;

    // Update lastActiveAt every 5 minutes
    if (now - lastActive > 5 * 60 * 1000) {
      prisma.session.update({
        where: { id: dbSession.id },
        data: { lastActiveAt: new Date() },
      }).catch((e) => console.warn("[Auth] Failed to update session heartbeat:", e));
    }

    const effectiveBusinessId = user.businessId || DEFAULT_BUSINESS_ID;

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        businessId: effectiveBusinessId,
      },
      sessionId: dbSession.id,
      businessId: effectiveBusinessId,
    };
  } catch (err) {
    console.error("[Auth] getAuthenticatedUser DB error:", err);
    return null;
  }
}

/**
 * Guard utility for Route Handlers.
 * Returns AuthContext if valid, or a NextResponse error to immediately return.
 */
export async function requireAuth(
  req: Request,
  options?: {
    allowedRoles?: Role[];
  }
): Promise<{ auth?: AuthContext; errorResponse?: NextResponse }> {
  const token = extractTokenFromRequest(req);
  if (!token) {
    const errorResponse = NextResponse.json(
      { success: false, error: "Unauthorized: Please sign in." },
      { status: 401 }
    );
    return { errorResponse };
  }

  const payload = await verifySessionToken(token);
  if (!payload) {
    const errorResponse = NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or expired session." },
      { status: 401 }
    );
    errorResponse.cookies.delete(SESSION_COOKIE_NAME);
    return { errorResponse };
  }

  try {
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
      const errorResponse = NextResponse.json(
        { success: false, error: "Unauthorized: Session has been revoked or expired.", sessionRevoked: true },
        { status: 401 }
      );
      errorResponse.cookies.delete(SESSION_COOKIE_NAME);
      return { errorResponse };
    }

    const user = dbSession.user;
    if (!user || !user.isActive) {
      const errorResponse = NextResponse.json(
        { success: false, error: "Forbidden: Account has been deactivated. Contact the owner.", deactivated: true },
        { status: 403 }
      );
      errorResponse.cookies.delete(SESSION_COOKIE_NAME);
      return { errorResponse };
    }

    if (options?.allowedRoles && !options.allowedRoles.includes(user.role)) {
      return {
        errorResponse: NextResponse.json(
          {
            success: false,
            error: `Forbidden: Access requires ${options.allowedRoles.join(" or ")} privileges.`,
          },
          { status: 403 }
        ),
      };
    }

    const effectiveBusinessId = user.businessId || DEFAULT_BUSINESS_ID;
    const auth: AuthContext = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        businessId: effectiveBusinessId,
      },
      sessionId: dbSession.id,
      businessId: effectiveBusinessId,
    };

    return { auth };
  } catch (err) {
    console.error("[Auth] requireAuth DB error:", err);
    return {
      errorResponse: NextResponse.json(
        { success: false, error: "Internal session error" },
        { status: 500 }
      ),
    };
  }
}
