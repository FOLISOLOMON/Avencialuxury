import { prisma, ensureDefaultBusiness, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";

export interface UpdateBusinessProfileInput {
  businessId: string;
  name?: string;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
}

export interface UpdateOwnerProfileInput {
  ownerId?: string;
  name?: string;
  email?: string;
}

export async function getProfile(businessId: string) {
  await ensureDefaultBusiness(businessId);

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
      settings: true,
    },
  });

  if (!business) {
    throw new Error("Business not found");
  }

  // Gather operating system summary stats
  const [productCount, activeBatchCount, customerCount] = await Promise.all([
    prisma.product.count({ where: { businessId, isActive: true } }),
    prisma.batch.count({ where: { businessId, status: "ACTIVE" } }),
    prisma.customer.count({ where: { businessId, isActive: true } }),
  ]);

  return {
    ...business,
    metrics: {
      productCount,
      activeBatchCount,
      customerCount,
    },
  };
}

export async function updateBusinessProfile(input: UpdateBusinessProfileInput) {
  await ensureDefaultBusiness(input.businessId);

  const { businessId, name, phone, address, description } = input;

  const data: any = {};
  if (name !== undefined) data.name = name.trim();
  if (phone !== undefined) data.phone = phone ? phone.trim() : null;
  if (address !== undefined) data.address = address ? address.trim() : null;
  if (description !== undefined) data.description = description ? description.trim() : null;

  return await prisma.business.update({
    where: { id: businessId },
    data,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function updateOwnerProfile(input: UpdateOwnerProfileInput) {
  const { ownerId, name, email } = input;

  // 1. Ensure the default business and owner exist in the database
  await ensureDefaultBusiness();

  // 2. Resolve target user safely
  let targetUser: { id: string; email: string } | null = null;

  // Try via explicitly passed ownerId (if non-empty string)
  if (ownerId && typeof ownerId === "string" && ownerId.trim().length > 0) {
    targetUser = await prisma.user.findUnique({
      where: { id: ownerId.trim() },
      select: { id: true, email: true },
    });
  }

  // If not found, try finding by business owner relation
  if (!targetUser) {
    const biz = await prisma.business.findUnique({
      where: { id: DEFAULT_BUSINESS_ID },
      include: {
        owner: {
          select: { id: true, email: true },
        },
      },
    });
    if (biz?.owner) {
      targetUser = biz.owner;
    }
  }

  // If not found, try finding by email if provided
  if (!targetUser && email && typeof email === "string" && email.trim().length > 0) {
    targetUser = await prisma.user.findUnique({
      where: { email: email.trim() },
      select: { id: true, email: true },
    });
  }

  // If still not found, find the first available user in the system
  if (!targetUser) {
    targetUser = await prisma.user.findFirst({
      select: { id: true, email: true },
    });
  }

  // If database somehow still has no user (e.g. freshly cleared DB), create one immediately
  if (!targetUser) {
    const defaultUser = await prisma.user.create({
      data: {
        id: "user_default_owner",
        name: name?.trim() || "Foli Solomon",
        email: email?.trim() || "solomonfoli19@gmail.com",
        passwordHash: "$2a$10$defaultHashForAvenciaOwner12345",
      },
      select: { id: true, email: true },
    });

    targetUser = defaultUser;

    // Link default business to this user
    await prisma.business.updateMany({
      where: { id: DEFAULT_BUSINESS_ID },
      data: { ownerId: targetUser.id },
    });
  }

  // Prepare data updates
  const data: { name?: string; email?: string } = {};
  if (name !== undefined && name !== null) data.name = name.trim();
  if (email !== undefined && email !== null) {
    const trimmedEmail = email.trim();
    if (trimmedEmail !== targetUser.email) {
      const existingWithEmail = await prisma.user.findUnique({
        where: { email: trimmedEmail },
        select: { id: true },
      });
      if (existingWithEmail && existingWithEmail.id !== targetUser.id) {
        throw new Error(`Email "${trimmedEmail}" is already used by another account.`);
      }
    }
    data.email = trimmedEmail;
  }

  // GUARANTEED: targetUser.id is a valid, non-empty string. Never undefined.
  return await prisma.user.update({
    where: { id: targetUser.id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}

