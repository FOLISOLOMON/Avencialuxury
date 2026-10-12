import { prisma, ensureDefaultBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { hashToken } from "@/lib/auth/token";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/session";
import { logAudit } from "./audit";
import crypto from "crypto";

export interface CreateInvitationInput {
  businessId: string;
  invitedById: string;
  name: string;
  email: string;
}

export async function getWorkersList(businessId: string) {
  await ensureDefaultBusiness(businessId);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { businessId },
        { businesses: { some: { id: businessId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [
      { role: "asc" }, // OWNER first, then WORKER
      { createdAt: "desc" },
    ],
  });

  const workersWithCounts = await Promise.all(
    users.map(async (u) => {
      const [salesCount, paymentsCount] = await Promise.all([
        prisma.sale.count({
          where: {
            creatorId: u.id,
            status: { notIn: ["VOIDED"] },
          },
        }),
        prisma.debtPayment.count({
          where: {
            collectorId: u.id,
          },
        }),
      ]);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        _count: {
          sales: salesCount,
          debtPayments: paymentsCount,
          createdSales: salesCount,
          collectedPayments: paymentsCount,
        },
      };
    })
  );

  return workersWithCounts;
}

export async function getPendingInvitations(businessId: string) {
  await ensureDefaultBusiness(businessId);

  const invitations = await prisma.workerInvitation.findMany({
    where: {
      businessId,
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      expiresAt: true,
      invitedBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return invitations;
}

export async function createWorkerInvitation(input: CreateInvitationInput) {
  await ensureDefaultBusiness(input.businessId);

  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedName = input.name.trim();

  if (!normalizedName) throw new Error("Worker name is required");
  if (!normalizedEmail || !normalizedEmail.includes("@")) throw new Error("A valid worker email is required");

  // Check if an active user already exists with this email
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser && existingUser.isActive) {
    throw new Error(`An active account for ${normalizedEmail} already exists in Avencia.`);
  }

  // Revoke any previous active invitations for this email
  await prisma.workerInvitation.updateMany({
    where: {
      email: normalizedEmail,
      usedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });

  // Generate 32-byte secure random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

  const invitation = await prisma.workerInvitation.create({
    data: {
      businessId: input.businessId,
      invitedById: input.invitedById,
      name: normalizedName,
      email: normalizedEmail,
      tokenHash,
      expiresAt,
    },
  });

  await logAudit({
    businessId: input.businessId,
    userId: input.invitedById,
    action: "WORKER_INVITED",
    entityType: "WORKER_INVITATION",
    entityId: invitation.id,
    details: { workerName: normalizedName, workerEmail: normalizedEmail },
  });

  return { invitation, rawToken };
}

export async function revokeWorkerInvitation(params: {
  businessId: string;
  invitationId: string;
  revokedById: string;
}) {
  const invitation = await prisma.workerInvitation.findUnique({
    where: { id: params.invitationId },
  });

  if (!invitation || invitation.businessId !== params.businessId) {
    throw new Error("Invitation not found");
  }

  const updated = await prisma.workerInvitation.update({
    where: { id: params.invitationId },
    data: { revokedAt: new Date() },
  });

  await logAudit({
    businessId: params.businessId,
    userId: params.revokedById,
    action: "WORKER_INVITATION_REVOKED",
    entityType: "WORKER_INVITATION",
    entityId: invitation.id,
    details: { workerEmail: invitation.email },
  });

  return updated;
}

export async function resendWorkerInvitation(params: {
  businessId: string;
  invitationId: string;
  sentById: string;
}) {
  const invitation = await prisma.workerInvitation.findUnique({
    where: { id: params.invitationId },
  });

  if (!invitation || invitation.businessId !== params.businessId) {
    throw new Error("Invitation not found");
  }
  if (invitation.usedAt !== null) {
    throw new Error("This invitation has already been accepted.");
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = await hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const updated = await prisma.workerInvitation.update({
    where: { id: params.invitationId },
    data: {
      tokenHash,
      expiresAt,
      revokedAt: null,
    },
  });

  await logAudit({
    businessId: params.businessId,
    userId: params.sentById,
    action: "WORKER_INVITATION_RESENT",
    entityType: "WORKER_INVITATION",
    entityId: invitation.id,
    details: { workerEmail: invitation.email },
  });

  return { invitation: updated, rawToken };
}

export async function deactivateWorker(params: {
  businessId: string;
  workerId: string;
  ownerId: string;
}) {
  if (params.workerId === params.ownerId) {
    throw new Error("The owner cannot deactivate their own account.");
  }

  const worker = await prisma.user.findUnique({
    where: { id: params.workerId },
  });

  if (!worker || worker.businessId !== params.businessId) {
    throw new Error("Worker not found");
  }

  if (worker.role === "OWNER") {
    throw new Error("Owner accounts cannot be deactivated via worker management.");
  }

  // 1. Mark worker as inactive
  const updated = await prisma.user.update({
    where: { id: params.workerId },
    data: { isActive: false },
  });

  // 2. Immediately revoke all active sessions for this worker
  await revokeAllUserSessions(params.workerId);

  // 3. Invalidate any pending invitations
  await prisma.workerInvitation.updateMany({
    where: { email: worker.email, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await logAudit({
    businessId: params.businessId,
    userId: params.ownerId,
    action: "WORKER_DEACTIVATED",
    entityType: "USER",
    entityId: worker.id,
    details: { workerName: worker.name, workerEmail: worker.email },
  });

  return updated;
}

export async function activateWorker(params: {
  businessId: string;
  workerId: string;
  ownerId: string;
}) {
  const worker = await prisma.user.findUnique({
    where: { id: params.workerId },
  });

  if (!worker || worker.businessId !== params.businessId) {
    throw new Error("Worker not found");
  }

  const updated = await prisma.user.update({
    where: { id: params.workerId },
    data: { isActive: true },
  });

  await logAudit({
    businessId: params.businessId,
    userId: params.ownerId,
    action: "WORKER_REACTIVATED",
    entityType: "USER",
    entityId: worker.id,
    details: { workerName: worker.name, workerEmail: worker.email },
  });

  return updated;
}

export async function acceptWorkerInvitation(params: {
  token: string;
  password: string;
}) {
  const tokenHash = await hashToken(params.token.trim());

  const invitation = await prisma.workerInvitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation) {
    throw new Error("Invalid invitation token.");
  }
  if (invitation.revokedAt !== null) {
    throw new Error("This invitation has been revoked. Contact the business owner for a new invite.");
  }
  if (invitation.usedAt !== null) {
    throw new Error("This invitation has already been accepted and used.");
  }
  if (invitation.expiresAt < new Date()) {
    throw new Error("This invitation link has expired. Contact the business owner to resend it.");
  }

  if (!params.password || params.password.length < 8) {
    throw new Error("Password must be at least 8 characters long.");
  }

  const passwordHash = await hashPassword(params.password);

  const user = await prisma.$transaction(async (tx) => {
    // 1. Mark invitation as used
    await tx.workerInvitation.update({
      where: { id: invitation.id },
      data: { usedAt: new Date() },
    });

    // 2. Create or update user strictly with role: WORKER
    const existing = await tx.user.findUnique({ where: { email: invitation.email } });
    if (existing) {
      return await tx.user.update({
        where: { id: existing.id },
        data: {
          name: invitation.name,
          passwordHash,
          role: "WORKER", // Strictly enforced: worker cannot become owner
          isActive: true,
          businessId: invitation.businessId,
        },
      });
    } else {
      return await tx.user.create({
        data: {
          name: invitation.name,
          email: invitation.email,
          passwordHash,
          role: "WORKER",
          isActive: true,
          businessId: invitation.businessId,
        },
      });
    }
  });

  await logAudit({
    businessId: invitation.businessId,
    userId: user.id,
    action: "WORKER_INVITATION_ACCEPTED",
    entityType: "USER",
    entityId: user.id,
    details: { email: user.email, name: user.name },
  });

  return user;
}
