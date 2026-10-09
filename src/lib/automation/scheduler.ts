import { prisma, DEFAULT_BUSINESS_ID, ensureDefaultBusiness } from "@/lib/db/prisma";
import { SaleStatus } from "@prisma/client";
import { createNotification } from "@/lib/services/notifications";
import { automationEngine } from "./engine";
import { BusinessEventType } from "./events";

/**
 * Calculates ISO 8601 week string (e.g. YYYY-WW).
 */
export function getISOWeekString(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const weekStr = weekNo < 10 ? `0${weekNo}` : `${weekNo}`;
  return `${d.getUTCFullYear()}-${weekStr}`;
}

/**
 * Helper to resolve target business IDs.
 */
async function resolveBusinessIds(businessId?: string): Promise<string[]> {
  if (businessId && businessId !== "all") {
    await ensureDefaultBusiness(businessId);
    return [businessId];
  }

  const businesses = await prisma.business.findMany({ select: { id: true } });
  if (businesses.length === 0) {
    await ensureDefaultBusiness(DEFAULT_BUSINESS_ID);
    return [DEFAULT_BUSINESS_ID];
  }

  return businesses.map((b) => b.id);
}

export interface SummaryResult {
  businessId: string;
  dedupeKey: string;
  notification: any;
  metrics: Record<string, any>;
}

/**
 * 1. runDailySummary(businessId)
 * Aggregates daily sales, revenue, gross profit, expenses, net profit,
 * transactions count, units sold, low stock items count, and outstanding debt,
 * creating a daily summary notification with dedupeKey DAILY_SUMMARY:<businessId>:<YYYY-MM-DD>.
 */
export async function runDailySummary(businessId?: string): Promise<SummaryResult[]> {
  const targetIds = await resolveBusinessIds(businessId);
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const results: SummaryResult[] = [];

  for (const bId of targetIds) {
    // 1. Sales & Revenue Aggregation
    const salesWhere = {
      businessId: bId,
      status: { notIn: [SaleStatus.VOIDED, SaleStatus.REFUNDED] },
      saleDate: { gte: startOfDay, lte: endOfDay },
    };

    const salesAgg = await prisma.sale.aggregate({
      where: salesWhere,
      _sum: {
        totalAmount: true,
        grossProfit: true,
      },
      _count: {
        id: true,
      },
    });

    const transactionsCount = salesAgg._count?.id || 0;
    const revenue = Math.round((salesAgg._sum?.totalAmount?.toNumber() || 0) * 100) / 100;
    const grossProfit = Math.round((salesAgg._sum?.grossProfit?.toNumber() || 0) * 100) / 100;

    // 2. Units Sold Aggregation
    const unitsSoldAgg = await prisma.saleItem.aggregate({
      where: {
        sale: salesWhere,
      },
      _sum: {
        quantity: true,
      },
    });
    const unitsSold = unitsSoldAgg._sum?.quantity || 0;

    // 3. Expenses Aggregation
    const expenseAgg = await prisma.expense.aggregate({
      where: {
        businessId: bId,
        expenseDate: { gte: startOfDay, lte: endOfDay },
      },
      _sum: {
        amount: true,
      },
    });
    const expenses = Math.round((expenseAgg._sum?.amount?.toNumber() || 0) * 100) / 100;
    const netProfit = Math.round((grossProfit - expenses) * 100) / 100;

    // 4. Low Stock Items Count
    const products = await prisma.product.findMany({
      where: { businessId: bId, isActive: true },
      select: {
        id: true,
        lowStockThreshold: true,
        batchItems: {
          where: { batch: { status: "ACTIVE" } },
          select: { quantityRemaining: true },
        },
      },
    });

    let lowStockItemsCount = 0;
    for (const p of products) {
      const currentStock = p.batchItems.reduce((sum, item) => sum + item.quantityRemaining, 0);
      const threshold = p.lowStockThreshold ?? 3;
      if (currentStock <= threshold) {
        lowStockItemsCount++;
      }
    }

    // 5. Outstanding Debt Aggregation
    const debtSalesAgg = await prisma.sale.aggregate({
      where: {
        businessId: bId,
        status: { notIn: [SaleStatus.VOIDED, SaleStatus.REFUNDED] },
        balanceDue: { gt: 0 },
      },
      _sum: {
        balanceDue: true,
      },
    });
    const outstandingDebt = Math.round((debtSalesAgg._sum?.balanceDue?.toNumber() || 0) * 100) / 100;

    const dedupeKey = `DAILY_SUMMARY:${bId}:${dateStr}`;

    const metrics = {
      date: dateStr,
      transactionsCount,
      revenue,
      grossProfit,
      expenses,
      netProfit,
      unitsSold,
      lowStockItemsCount,
      outstandingDebt,
    };

    const notification = await createNotification({
      businessId: bId,
      type: "DAILY_SUMMARY",
      category: "FINANCE",
      severity: "INFO",
      title: "Daily Business Summary",
      message: `Daily Summary (${dateStr}): GHS ${revenue.toFixed(2)} revenue, GHS ${netProfit.toFixed(2)} net profit across ${transactionsCount} transaction${transactionsCount !== 1 ? "s" : ""} (${unitsSold} units sold). Expenses: GHS ${expenses.toFixed(2)}. Low stock items: ${lowStockItemsCount}. Outstanding debt: GHS ${outstandingDebt.toFixed(2)}.`,
      actionLabel: "View Reports",
      actionUrl: "/reports",
      dedupeKey,
      metadata: metrics,
    });

    results.push({
      businessId: bId,
      dedupeKey,
      notification,
      metrics,
    });
  }

  return results;
}

/**
 * 2. runWeeklySummary(businessId)
 * Aggregates 7-day revenue, net profit, top-selling product, and metrics,
 * emitting a weekly digest with dedupeKey WEEKLY_SUMMARY:<businessId>:<YYYY-WW>.
 */
export async function runWeeklySummary(businessId?: string): Promise<SummaryResult[]> {
  const targetIds = await resolveBusinessIds(businessId);
  const now = new Date();
  const weekStr = getISOWeekString(now);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const results: SummaryResult[] = [];

  for (const bId of targetIds) {
    const salesWhere = {
      businessId: bId,
      status: { notIn: [SaleStatus.VOIDED, SaleStatus.REFUNDED] },
      saleDate: { gte: sevenDaysAgo, lte: endOfDay },
    };

    // 1. Sales & Revenue Aggregation (7 Days)
    const salesAgg = await prisma.sale.aggregate({
      where: salesWhere,
      _sum: {
        totalAmount: true,
        grossProfit: true,
      },
      _count: {
        id: true,
      },
    });

    const transactionsCount = salesAgg._count?.id || 0;
    const revenue = Math.round((salesAgg._sum?.totalAmount?.toNumber() || 0) * 100) / 100;
    const grossProfit = Math.round((salesAgg._sum?.grossProfit?.toNumber() || 0) * 100) / 100;

    // 2. Units Sold Aggregation (7 Days)
    const unitsSoldAgg = await prisma.saleItem.aggregate({
      where: {
        sale: salesWhere,
      },
      _sum: {
        quantity: true,
      },
    });
    const unitsSold = unitsSoldAgg._sum?.quantity || 0;

    // 3. Expenses Aggregation (7 Days)
    const expenseAgg = await prisma.expense.aggregate({
      where: {
        businessId: bId,
        expenseDate: { gte: sevenDaysAgo, lte: endOfDay },
      },
      _sum: {
        amount: true,
      },
    });
    const expenses = Math.round((expenseAgg._sum?.amount?.toNumber() || 0) * 100) / 100;
    const netProfit = Math.round((grossProfit - expenses) * 100) / 100;

    // 4. Top Selling Product (7 Days)
    const topSaleItems = await prisma.saleItem.groupBy({
      by: ["productId"],
      where: {
        sale: salesWhere,
      },
      _sum: {
        quantity: true,
        revenue: true,
      },
      orderBy: {
        _sum: {
          quantity: "desc",
        },
      },
      take: 1,
    });

    let topSellingProduct: { id: string; name: string; unitsSold: number; revenue: number } | null = null;

    if (topSaleItems.length > 0) {
      const topItem = topSaleItems[0];
      const product = await prisma.product.findUnique({
        where: { id: topItem.productId },
        select: { name: true },
      });
      topSellingProduct = {
        id: topItem.productId,
        name: product?.name || "Unknown Product",
        unitsSold: topItem._sum?.quantity || 0,
        revenue: Math.round((topItem._sum?.revenue?.toNumber() || 0) * 100) / 100,
      };
    }

    const dedupeKey = `WEEKLY_SUMMARY:${bId}:${weekStr}`;

    const metrics = {
      week: weekStr,
      revenue,
      grossProfit,
      expenses,
      netProfit,
      transactionsCount,
      unitsSold,
      topSellingProduct,
    };

    const topProductMsg = topSellingProduct
      ? ` Top seller: ${topSellingProduct.name} (${topSellingProduct.unitsSold} units).`
      : "";

    const notification = await createNotification({
      businessId: bId,
      type: "WEEKLY_SUMMARY",
      category: "FINANCE",
      severity: "INFO",
      title: "Weekly Performance Summary",
      message: `Weekly Digest (${weekStr}): GHS ${revenue.toFixed(2)} revenue, GHS ${netProfit.toFixed(2)} net profit across ${transactionsCount} transaction${transactionsCount !== 1 ? "s" : ""} (${unitsSold} units sold).${topProductMsg}`,
      actionLabel: "View Reports",
      actionUrl: "/reports",
      dedupeKey,
      metadata: metrics,
    });

    results.push({
      businessId: bId,
      dedupeKey,
      notification,
      metrics,
    });
  }

  return results;
}

export interface DormantCustomerScanResult {
  businessId: string;
  dormantCustomersCount: number;
  emittedEvents: any[];
}

/**
 * 3. scanDormantCustomers(businessId)
 * Identifies active customers whose last purchase was > 30 days ago and emits
 * a single state-transition CUSTOMER_DORMANT event with dedupeKey CUSTOMER_DORMANT:<customerId>:<YYYY-MM>.
 */
export async function scanDormantCustomers(businessId?: string): Promise<DormantCustomerScanResult[]> {
  const targetIds = await resolveBusinessIds(businessId);
  const now = new Date();
  const yearMonthStr = now.toISOString().slice(0, 7); // YYYY-MM

  const results: DormantCustomerScanResult[] = [];

  for (const bId of targetIds) {
    const pref = await prisma.notificationSetting.findUnique({
      where: { businessId: bId },
    });
    const dormantDays = pref?.dormantCustomerDays ?? 30;

    const cutoffDate = new Date(now.getTime() - dormantDays * 24 * 60 * 60 * 1000);

    const customers = await prisma.customer.findMany({
      where: {
        businessId: bId,
        isActive: true,
      },
      include: {
        sales: {
          where: { status: { notIn: [SaleStatus.VOIDED, SaleStatus.REFUNDED] } },
          orderBy: { saleDate: "desc" },
          take: 1,
          select: { saleDate: true },
        },
      },
    });

    const emittedEvents: any[] = [];

    for (const customer of customers) {
      const lastPurchaseDate = customer.sales.length > 0 ? customer.sales[0].saleDate : customer.createdAt;

      if (lastPurchaseDate < cutoffDate) {
        const daysInactive = Math.floor((now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24));
        const dedupeKey = `CUSTOMER_DORMANT:${customer.id}:${yearMonthStr}`;

        const processResult = await automationEngine.emit({
          eventType: BusinessEventType.CUSTOMER_DORMANT,
          businessId: bId,
          entityType: "CUSTOMER",
          entityId: customer.id,
          dedupeKey,
          metadata: {
            customerId: customer.id,
            customerName: customer.name,
            lastPurchaseDate,
            daysInactive,
          },
        });

        emittedEvents.push({
          customerId: customer.id,
          customerName: customer.name,
          daysInactive,
          dedupeKey,
          processResult,
        });
      }
    }

    results.push({
      businessId: bId,
      dormantCustomersCount: emittedEvents.length,
      emittedEvents,
    });
  }

  return results;
}

export interface CleanupResult {
  businessId?: string;
  deletedCount: number;
}

/**
 * 4. cleanupExpiredNotifications(businessId)
 * Deletes expired notifications.
 */
export async function cleanupExpiredNotifications(businessId?: string): Promise<CleanupResult> {
  const where: any = {
    expiresAt: {
      lte: new Date(),
    },
  };

  if (businessId && businessId !== "all") {
    where.businessId = businessId;
  }

  const deleted = await prisma.notification.deleteMany({
    where,
  });

  return {
    businessId: businessId || "all",
    deletedCount: deleted.count,
  };
}

/**
 * 5. runDebtReminders(businessId)
 * Scans active customer debts and sends external push notifications for upcoming,
 * due today, and overdue debts.
 */
export async function runDebtReminders(businessId?: string) {
  const { runDebtReminderScan } = await import("@/lib/services/debt-reminder");
  const targetIds = await resolveBusinessIds(businessId);
  const results = [];

  for (const bId of targetIds) {
    const scan = await runDebtReminderScan(bId);
    results.push(scan);
  }

  return results;
}

