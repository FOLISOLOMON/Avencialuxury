import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });


if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export const DEFAULT_BUSINESS_ID = "biz_default_avencia";

export async function ensureDefaultBusiness(businessId = DEFAULT_BUSINESS_ID) {
  let biz = await prisma.business.findUnique({
    where: { id: businessId },
    include: { settings: true },
  });

  if (!biz) {
    let user = await prisma.user.findFirst();
    if (!user) {
      user = await prisma.user.create({
        data: {
          id: "user_default_owner",
          name: "Avencia Owner",
          email: "owner@avencia.com",
          passwordHash: "$2a$10$defaultHashForAvenciaOwner12345",
        },
      });
    }

    biz = await prisma.business.create({
      data: {
        id: businessId,
        name: "Avencia Perfumes",
        currency: "GHS",
        ownerId: user.id,
        settings: {
          create: {
            lowStockThreshold: 3,
            currency: "GHS",
            defaultPaymentMethod: "CASH",
          },
        },
      },
      include: { settings: true },
    });
  }

  return biz;
}
