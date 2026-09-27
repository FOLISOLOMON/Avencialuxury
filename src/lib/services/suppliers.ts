import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";

export interface CreateSupplierInput {
  businessId: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface UpdateSupplierInput {
  id: string;
  businessId: string;
  name?: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
}

export async function createSupplier(input: CreateSupplierInput) {
  await ensureDefaultBusiness(input.businessId);

  if (!input.name || input.name.trim() === "") {
    throw new Error("Supplier name is required");
  }

  return await prisma.supplier.create({
    data: {
      businessId: input.businessId,
      name: input.name.trim(),
      contactPerson: input.contactPerson?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
}

export async function getSuppliers(businessId: string, search?: string) {
  await ensureDefaultBusiness(businessId);

  const where: any = { businessId };
  if (search && search.trim() !== "") {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { contactPerson: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const suppliers = await prisma.supplier.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      batches: {
        select: {
          id: true,
          reference: true,
          totalInvestment: true,
          purchaseDate: true,
          status: true,
        },
      },
    },
  });

  return suppliers.map((s) => {
    const totalBatches = s.batches.length;
    const totalInvestment = s.batches.reduce((sum, b) => sum + b.totalInvestment.toNumber(), 0);

    return {
      ...s,
      totalBatches,
      totalInvestment,
    };
  });
}

export async function getSupplierById(id: string, businessId: string) {
  await ensureDefaultBusiness(businessId);

  const supplier = await prisma.supplier.findFirst({
    where: { id, businessId },
    include: {
      batches: {
        orderBy: { purchaseDate: "desc" },
        include: {
          batchItems: {
            include: { product: true },
          },
        },
      },
    },
  });

  if (!supplier) return null;

  const totalBatches = supplier.batches.length;
  const totalInvestment = supplier.batches.reduce((sum, b) => sum + b.totalInvestment.toNumber(), 0);

  return {
    ...supplier,
    totalBatches,
    totalInvestment,
  };
}

export async function updateSupplier(input: UpdateSupplierInput) {
  await ensureDefaultBusiness(input.businessId);

  const existing = await prisma.supplier.findFirst({
    where: { id: input.id, businessId: input.businessId },
  });

  if (!existing) {
    throw new Error("Supplier not found");
  }

  return await prisma.supplier.update({
    where: { id: input.id },
    data: {
      name: input.name !== undefined ? input.name.trim() : undefined,
      contactPerson: input.contactPerson !== undefined ? input.contactPerson?.trim() || null : undefined,
      phone: input.phone !== undefined ? input.phone?.trim() || null : undefined,
      email: input.email !== undefined ? input.email?.trim() || null : undefined,
      address: input.address !== undefined ? input.address?.trim() || null : undefined,
      notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
    },
  });
}

export async function deleteSupplier(id: string, businessId: string) {
  await ensureDefaultBusiness(businessId);

  const existing = await prisma.supplier.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    throw new Error("Supplier not found");
  }

  return await prisma.supplier.delete({ where: { id } });
}
