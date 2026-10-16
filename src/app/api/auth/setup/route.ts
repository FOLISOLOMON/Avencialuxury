import { NextResponse } from "next/server";
import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/services/audit";
import { verifySetupSecret } from "@/lib/auth/setup";

export async function GET() {
  try {
    const existingOwner = await prisma.user.findFirst({
      where: { role: "OWNER", isActive: true },
    });
    return NextResponse.json({
      success: true,
      setupAvailable: !existingOwner,
    });
  } catch (error) {
    console.error("GET /api/auth/setup error:", error);
    return NextResponse.json(
      { success: false, setupAvailable: false, error: "Failed to determine setup status" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // 1. Initial outer check: If an active OWNER user already exists, reject immediately
    const existingOwner = await prisma.user.findFirst({
      where: { role: "OWNER", isActive: true },
    });

    if (existingOwner) {
      return NextResponse.json(
        {
          success: false,
          error: "Setup is unavailable. An authorized owner account already exists for Avencia.",
        },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, password } = body || {};

    // 2. Secret verification: Server-side timing-safe comparison
    // Accept from body.setupSecret or x-setup-secret header
    const providedSecret = body?.setupSecret || request.headers.get("x-setup-secret");
    const secretVerification = verifySetupSecret(providedSecret);

    if (!secretVerification.valid) {
      // Log constant reason only; NEVER log secrets
      console.warn("POST /api/auth/setup rejected: secret verification failed", {
        reason: secretVerification.reason,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Setup authorization failed. Ensure a valid setup secret is configured and provided.",
        },
        { status: 403 }
      );
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Full name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ success: false, error: "A valid email is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ success: false, error: "Password must be at least 8 characters long" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 3. Atomic first-owner creation with concurrency check inside transaction
    const newOwner = await prisma.$transaction(async (tx) => {
      const concurrencyCheck = await tx.user.findFirst({
        where: { role: "OWNER", isActive: true },
      });
      if (concurrencyCheck) {
        throw new Error("Owner account was already initialized by another request");
      }

      const passwordHash = await hashPassword(password);

      let user = await tx.user.findUnique({ where: { email: normalizedEmail } });
      if (user) {
        user = await tx.user.update({
          where: { id: user.id },
          data: {
            name: name.trim(),
            passwordHash,
            role: "OWNER",
            isActive: true,
            businessId: DEFAULT_BUSINESS_ID,
          },
        });
      } else {
        user = await tx.user.create({
          data: {
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            role: "OWNER",
            isActive: true,
            businessId: DEFAULT_BUSINESS_ID,
          },
        });
      }

      // Ensure business is bound to owner
      await tx.business.upsert({
        where: { id: DEFAULT_BUSINESS_ID },
        create: {
          id: DEFAULT_BUSINESS_ID,
          name: "Avencia Perfumes",
          ownerId: user.id,
          currency: "GHS",
        },
        update: {
          ownerId: user.id,
        },
      });

      return user;
    });

    await logAudit({
      businessId: DEFAULT_BUSINESS_ID,
      userId: newOwner.id,
      action: "OWNER_SETUP_COMPLETED",
      entityType: "USER",
      entityId: newOwner.id,
      details: { email: newOwner.email, name: newOwner.name },
    });

    return NextResponse.json({
      success: true,
      message: "Owner account created successfully. You may now sign in.",
    });
  } catch (error: any) {
    console.error("POST /api/auth/setup error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to set up owner account" },
      { status: 400 }
    );
  }
}
