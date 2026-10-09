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
  pushEnabled?: boolean;
  upcomingRemindersEnabled?: boolean;
  upcomingDaysAdvance?: number;
  dueTodayEnabled?: boolean;
  overdueEnabled?: boolean;
  overdueIntervalDays?: number;
  showCustomerDetailsInPush?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
  timezone?: string;
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
        pushEnabled: true,
        upcomingRemindersEnabled: true,
        upcomingDaysAdvance: 1,
        dueTodayEnabled: true,
        overdueEnabled: true,
        overdueIntervalDays: 3,
        showCustomerDetailsInPush: false,
        timezone: "Africa/Accra",
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
    pushEnabled: notificationSetting.pushEnabled ?? true,
    upcomingRemindersEnabled: notificationSetting.upcomingRemindersEnabled ?? true,
    upcomingDaysAdvance: notificationSetting.upcomingDaysAdvance ?? 1,
    dueTodayEnabled: notificationSetting.dueTodayEnabled ?? true,
    overdueEnabled: notificationSetting.overdueEnabled ?? true,
    overdueIntervalDays: notificationSetting.overdueIntervalDays ?? 3,
    showCustomerDetailsInPush: notificationSetting.showCustomerDetailsInPush ?? false,
    quietHoursStart: notificationSetting.quietHoursStart ?? null,
    quietHoursEnd: notificationSetting.quietHoursEnd ?? null,
    timezone: notificationSetting.timezone || "Africa/Accra",
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

  // Prepare NotificationSetting updates for automation rules & push controls
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
  if (input.pushEnabled !== undefined) {
    notificationUpdateData.pushEnabled = input.pushEnabled;
  }
  if (input.upcomingRemindersEnabled !== undefined) {
    notificationUpdateData.upcomingRemindersEnabled = input.upcomingRemindersEnabled;
  }
  if (input.upcomingDaysAdvance !== undefined) {
    notificationUpdateData.upcomingDaysAdvance = input.upcomingDaysAdvance;
  }
  if (input.dueTodayEnabled !== undefined) {
    notificationUpdateData.dueTodayEnabled = input.dueTodayEnabled;
  }
  if (input.overdueEnabled !== undefined) {
    notificationUpdateData.overdueEnabled = input.overdueEnabled;
  }
  if (input.overdueIntervalDays !== undefined) {
    notificationUpdateData.overdueIntervalDays = input.overdueIntervalDays;
  }
  if (input.showCustomerDetailsInPush !== undefined) {
    notificationUpdateData.showCustomerDetailsInPush = input.showCustomerDetailsInPush;
  }
  if (input.quietHoursStart !== undefined) {
    notificationUpdateData.quietHoursStart = input.quietHoursStart;
  }
  if (input.quietHoursEnd !== undefined) {
    notificationUpdateData.quietHoursEnd = input.quietHoursEnd;
  }
  if (input.timezone !== undefined) {
    notificationUpdateData.timezone = input.timezone;
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
      pushEnabled: input.pushEnabled ?? true,
      upcomingRemindersEnabled: input.upcomingRemindersEnabled ?? true,
      upcomingDaysAdvance: input.upcomingDaysAdvance ?? 1,
      dueTodayEnabled: input.dueTodayEnabled ?? true,
      overdueEnabled: input.overdueEnabled ?? true,
      overdueIntervalDays: input.overdueIntervalDays ?? 3,
      showCustomerDetailsInPush: input.showCustomerDetailsInPush ?? false,
      quietHoursStart: input.quietHoursStart ?? null,
      quietHoursEnd: input.quietHoursEnd ?? null,
      timezone: input.timezone || "Africa/Accra",
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
    pushEnabled: updatedNotificationSetting.pushEnabled ?? true,
    upcomingRemindersEnabled: updatedNotificationSetting.upcomingRemindersEnabled ?? true,
    upcomingDaysAdvance: updatedNotificationSetting.upcomingDaysAdvance ?? 1,
    dueTodayEnabled: updatedNotificationSetting.dueTodayEnabled ?? true,
    overdueEnabled: updatedNotificationSetting.overdueEnabled ?? true,
    overdueIntervalDays: updatedNotificationSetting.overdueIntervalDays ?? 3,
    showCustomerDetailsInPush: updatedNotificationSetting.showCustomerDetailsInPush ?? false,
    quietHoursStart: updatedNotificationSetting.quietHoursStart ?? null,
    quietHoursEnd: updatedNotificationSetting.quietHoursEnd ?? null,
    timezone: updatedNotificationSetting.timezone || "Africa/Accra",
    notificationSetting: updatedNotificationSetting,
  };
}

