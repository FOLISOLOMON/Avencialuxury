import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { PaymentMethod } from "@prisma/client";

export interface UpdateSettingsInput {
  businessId: string;
  lowStockThreshold?: number;
  currency?: string;
  defaultPaymentMethod?: PaymentMethod;
}

export async function getSettings(businessId: string) {
  const biz = await ensureDefaultBusiness(businessId);

  let setting = await prisma.setting.findUnique({
    where: { businessId },
  });

  if (!setting) {
    setting = await prisma.setting.create({
      data: {
        businessId,
        lowStockThreshold: 3,
        currency: biz.currency || "GHS",
        defaultPaymentMethod: "CASH",
      },
    });
  }

  return setting;
}

export async function updateSettings(input: UpdateSettingsInput) {
  await ensureDefaultBusiness(input.businessId);

  const lowStockThreshold = input.lowStockThreshold ?? 3;
  const currency = input.currency?.trim() || "GHS";
  const defaultPaymentMethod = input.defaultPaymentMethod || "CASH";

  const updatedSetting = await prisma.setting.upsert({
    where: { businessId: input.businessId },
    update: {
      lowStockThreshold,
      currency,
      defaultPaymentMethod,
    },
    create: {
      businessId: input.businessId,
      lowStockThreshold,
      currency,
      defaultPaymentMethod,
    },
  });

  // Also update currency on the business record for consistency
  await prisma.business.update({
    where: { id: input.businessId },
    data: { currency },
  });

  // Optionally update lowStockThreshold on active products if desired
  await prisma.product.updateMany({
    where: { businessId: input.businessId },
    data: { lowStockThreshold },
  });

  return updatedSetting;
}
