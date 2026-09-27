import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";

export interface UpdateBusinessProfileInput {
  businessId: string;
  name?: string;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
}

export interface UpdateOwnerProfileInput {
  ownerId: string;
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

  const data: any = {};
  if (name !== undefined) data.name = name.trim();
  if (email !== undefined) data.email = email.trim();

  return await prisma.user.update({
    where: { id: ownerId },
    data: data,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}
