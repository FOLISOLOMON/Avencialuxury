import { prisma, ensureDefaultBusiness } from "@/lib/db/prisma";
import { PaymentMethod, Prisma } from "@prisma/client";

export interface UpdateSettingsInput {
  businessId: string;
  lowStockThreshold?: number;
  currency?: string;
  defaultPaymentMethod?: PaymentMethod;
  largeExpenseThreshold?: number;
  batchNearCompletionThreshold?: number;
  dormantCustomerDays?: number;
  dailySummaryEnabled?: boolean;
  weeklySummaryEnabled?: boolean;
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

  let notificationSetting = await prisma.notificationSetting.findUnique({
    where: { businessId },
  });

  if (!notificationSetting) {
    notificationSetting = await prisma.notificationSetting.create({
      data: {
        businessId,
        largeExpenseThreshold: new Prisma.Decimal(1000),
        batchNearCompletionThreshold: new Prisma.Decimal(10),
        dormantCustomerDays: 30,
        dailySummaryEnabled: true,
        weeklySummaryEnabled: true,
      },
    });
  }

  return {
    ...setting,
    largeExpenseThreshold: notificationSetting.largeExpenseThreshold
      ? Number(notificationSetting.largeExpenseThreshold)
      : 1000,
    batchNearCompletionThreshold: notificationSetting.batchNearCompletionThreshold
      ? Number(notificationSetting.batchNearCompletionThreshold)
      : 10,
    dormantCustomerDays: notificationSetting.dormantCustomerDays ?? 30,
    dailySummaryEnabled: notificationSetting.dailySummaryEnabled ?? true,
    weeklySummaryEnabled: notificationSetting.weeklySummaryEnabled ?? true,
    notificationSetting,
  };
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

  // Prepare NotificationSetting updates for automation rules controls
  const notificationUpdateData: any = {};
  if (input.largeExpenseThreshold !== undefined) {
    notificationUpdateData.largeExpenseThreshold = new Prisma.Decimal(input.largeExpenseThreshold);
  }
  if (input.batchNearCompletionThreshold !== undefined) {
    notificationUpdateData.batchNearCompletionThreshold = new Prisma.Decimal(input.batchNearCompletionThreshold);
  }
  if (input.dormantCustomerDays !== undefined) {
    notificationUpdateData.dormantCustomerDays = input.dormantCustomerDays;
  }
  if (input.dailySummaryEnabled !== undefined) {
    notificationUpdateData.dailySummaryEnabled = input.dailySummaryEnabled;
  }
  if (input.weeklySummaryEnabled !== undefined) {
    notificationUpdateData.weeklySummaryEnabled = input.weeklySummaryEnabled;
  }

  const updatedNotificationSetting = await prisma.notificationSetting.upsert({
    where: { businessId: input.businessId },
    update: notificationUpdateData,
    create: {
      businessId: input.businessId,
      largeExpenseThreshold: new Prisma.Decimal(input.largeExpenseThreshold ?? 1000),
      batchNearCompletionThreshold: new Prisma.Decimal(input.batchNearCompletionThreshold ?? 10),
      dormantCustomerDays: input.dormantCustomerDays ?? 30,
      dailySummaryEnabled: input.dailySummaryEnabled ?? true,
      weeklySummaryEnabled: input.weeklySummaryEnabled ?? true,
    },
  });

  return {
    ...updatedSetting,
    largeExpenseThreshold: updatedNotificationSetting.largeExpenseThreshold
      ? Number(updatedNotificationSetting.largeExpenseThreshold)
      : 1000,
    batchNearCompletionThreshold: updatedNotificationSetting.batchNearCompletionThreshold
      ? Number(updatedNotificationSetting.batchNearCompletionThreshold)
      : 10,
    dormantCustomerDays: updatedNotificationSetting.dormantCustomerDays ?? 30,
    dailySummaryEnabled: updatedNotificationSetting.dailySummaryEnabled ?? true,
    weeklySummaryEnabled: updatedNotificationSetting.weeklySummaryEnabled ?? true,
    notificationSetting: updatedNotificationSetting,
  };
}
