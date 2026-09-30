import { prisma } from "@/lib/db/prisma";
import { PaymentMethod, ExpenseCategory, AllocationType, Prisma } from "@prisma/client";
import { getBusinessDayBounds } from "@/lib/utils";

export interface ReportFilter {
  quickRange?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  customerId?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  batchId?: string;
  productId?: string;
  search?: string;
}

/**
 * Helper function to round numbers to 2 decimal places.
 */
function roundCurrency(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Helper function to calculate percentage safely.
 */
function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 10000) / 100;
}

// ----------------------------------------------------------------------
// 1. SALES REPORT SERVICE (Authoritative Single Source of Truth)
// ----------------------------------------------------------------------
export async function getSalesReport(businessId: string, filter?: ReportFilter) {
  const { startDate, endDate } = getBusinessDayBounds(
    filter?.quickRange,
    filter?.startDate,
    filter?.endDate
  );

  const dateCondition: Prisma.DateTimeFilter = {};
  if (startDate) dateCondition.gte = startDate;
  if (endDate) dateCondition.lte = endDate;

  const saleWhere: Prisma.SaleWhereInput = {
    businessId,
    ...(startDate || endDate ? { saleDate: dateCondition } : {}),
  };

  if (filter?.customerId) {
    saleWhere.customerId = filter.customerId;
  }

  if (filter?.paymentMethod && filter.paymentMethod !== "ALL") {
    saleWhere.paymentMethod = filter.paymentMethod as PaymentMethod;
  }

  if (filter?.productId || filter?.batchId) {
    saleWhere.saleItems = {
      some: {
        ...(filter.productId ? { productId: filter.productId } : {}),
        ...(filter.batchId ? { batchId: filter.batchId } : {}),
      },
    };
  }

  if (filter?.search && filter.search.trim() !== "") {
    const q = filter.search.trim();
    saleWhere.OR = [
      { id: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
      { customer: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const pStatus = filter?.paymentStatus?.toUpperCase();
  if (pStatus && pStatus !== "ALL") {
    if (pStatus === "VOIDED") {
      saleWhere.status = "VOIDED";
    } else if (pStatus === "REFUNDED") {
      saleWhere.status = "REFUNDED";
    } else if (pStatus === "PAID" || pStatus === "PARTIAL" || pStatus === "UNPAID") {
      saleWhere.status = { notIn: ["VOIDED", "REFUNDED"] };
      saleWhere.paymentStatus = pStatus as any;
    }
  }

  const salesList = await prisma.sale.findMany({
    where: saleWhere,
    orderBy: { saleDate: "desc" },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      saleItems: {
        include: {
          product: { select: { id: true, name: true, sku: true, barcode: true } },
          batch: { select: { id: true, reference: true } },
        },
      },
    },
  });

  // Calculate metrics from exact filtered dataset
  const activeSales = salesList.filter((s) => s.status !== "VOIDED" && s.status !== "REFUNDED");
  const voidedSalesCount = salesList.filter((s) => s.status === "VOIDED").length;
  const refundedSalesCount = salesList.filter((s) => s.status === "REFUNDED").length;

  const totalTransactions = activeSales.length;
  const totalItemsSold = activeSales.reduce(
    (sum, s) => sum + s.saleItems.reduce((iSum, item) => iSum + item.quantity, 0),
    0
  );

  const totalSalesRevenue = roundCurrency(
    activeSales.reduce((sum, s) => sum + s.totalAmount.toNumber(), 0)
  );

  const totalAmountCollected = roundCurrency(
    activeSales.reduce((sum, s) => sum + s.amountPaid.toNumber(), 0)
  );

  const totalOutstanding = roundCurrency(
    activeSales.reduce((sum, s) => sum + s.balanceDue.toNumber(), 0)
  );

  const totalCostOfGoods = roundCurrency(
    activeSales.reduce((sum, s) => sum + s.totalCost.toNumber(), 0)
  );

  const totalGrossProfit = roundCurrency(
    activeSales.reduce((sum, s) => sum + s.grossProfit.toNumber(), 0)
  );

  const averageOrderValue = totalTransactions > 0 ? roundCurrency(totalSalesRevenue / totalTransactions) : 0;
  const profitMargin = calculatePercentage(totalGrossProfit, totalSalesRevenue);

  // Operational Expenses for same period
  const expenseWhere: Prisma.ExpenseWhereInput = {
    businessId,
    ...(startDate || endDate ? { expenseDate: dateCondition } : {}),
  };

  const expenseAgg = await prisma.expense.aggregate({
    where: expenseWhere,
    _sum: { amount: true },
  });
  const totalExpenses = roundCurrency(expenseAgg._sum.amount?.toNumber() || 0);
  const netProfit = roundCurrency(totalGrossProfit - totalExpenses);

  // Payment Method Breakdown for active sales
  const paymentMethodMap = new Map<string, { count: number; revenue: number }>();
  activeSales.forEach((s) => {
    const pm = s.paymentMethod;
    const existing = paymentMethodMap.get(pm) || { count: 0, revenue: 0 };
    paymentMethodMap.set(pm, {
      count: existing.count + 1,
      revenue: roundCurrency(existing.revenue + s.totalAmount.toNumber()),
    });
  });

  const paymentMethodBreakdown = Array.from(paymentMethodMap.entries()).map(([pm, data]) => ({
    paymentMethod: pm,
    count: data.count,
    revenue: data.revenue,
    percentage: calculatePercentage(data.revenue, totalSalesRevenue),
  }));

  // Daily Trend for active sales
  const salesByDateMap = new Map<string, { revenue: number; cost: number; profit: number; count: number }>();
  activeSales.forEach((s) => {
    const dateKey = s.saleDate.toISOString().split("T")[0];
    const existing = salesByDateMap.get(dateKey) || { revenue: 0, cost: 0, profit: 0, count: 0 };
    salesByDateMap.set(dateKey, {
      revenue: roundCurrency(existing.revenue + s.totalAmount.toNumber()),
      cost: roundCurrency(existing.cost + s.totalCost.toNumber()),
      profit: roundCurrency(existing.profit + s.grossProfit.toNumber()),
      count: existing.count + 1,
    });
  });

  const dailySalesTrend = Array.from(salesByDateMap.entries())
    .map(([date, metrics]) => ({ date, ...metrics }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    sales: salesList,
    summary: {
      totalTransactions,
      totalItemsSold,
      totalSalesRevenue,
      totalAmountCollected,
      totalOutstanding,
      totalCostOfGoods,
      totalGrossProfit,
      totalExpenses,
      netProfit,
      averageOrderValue,
      profitMargin,
      voidedSalesCount,
      refundedSalesCount,
    },
    paymentMethodBreakdown,
    dailySalesTrend,
  };
}

// ----------------------------------------------------------------------
// 2. PRODUCT REPORT SERVICE
// ----------------------------------------------------------------------
export async function getProductReport(businessId: string, filter?: ReportFilter) {
  const products = await prisma.product.findMany({
    where: { businessId },
    include: {
      batchItems: {
        select: {
          quantityRemaining: true,
          unitCost: true,
        },
      },
    },
  });

  const saleItemWhere: Prisma.SaleItemWhereInput = {
    sale: {
      businessId,
      status: { notIn: ["VOIDED", "REFUNDED"] },
      ...(filter?.startDate || filter?.endDate
        ? {
            saleDate: {
              ...(filter?.startDate ? { gte: filter.startDate } : {}),
              ...(filter?.endDate ? { lte: filter.endDate } : {}),
            },
          }
        : {}),
    },
  };

  const saleItemsGrouped = await prisma.saleItem.groupBy({
    by: ["productId"],
    where: saleItemWhere,
    _sum: {
      quantity: true,
      revenue: true,
      cost: true,
      profit: true,
    },
  });

  const productMetricsMap = new Map<
    string,
    { unitsSold: number; revenue: number; cost: number; profit: number }
  >();

  saleItemsGrouped.forEach((group) => {
    productMetricsMap.set(group.productId, {
      unitsSold: group._sum.quantity || 0,
      revenue: roundCurrency(group._sum.revenue?.toNumber() || 0),
      cost: roundCurrency(group._sum.cost?.toNumber() || 0),
      profit: roundCurrency(group._sum.profit?.toNumber() || 0),
    });
  });

  let totalInventoryValue = 0;
  let totalStockCount = 0;
  let totalUnitsSold = 0;

  const productDetails = products.map((p) => {
    const currentStock = p.batchItems.reduce((sum, bi) => sum + bi.quantityRemaining, 0);
    const estimatedValue = p.batchItems.reduce(
      (sum, bi) => sum + bi.quantityRemaining * bi.unitCost.toNumber(),
      0
    );

    totalStockCount += currentStock;
    totalInventoryValue += estimatedValue;

    const salesMetrics = productMetricsMap.get(p.id) || {
      unitsSold: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
    };

    totalUnitsSold += salesMetrics.unitsSold;

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      brand: p.brand,
      sellingPrice: p.sellingPrice.toNumber(),
      defaultCostPrice: p.defaultCostPrice.toNumber(),
      currentStock,
      lowStockThreshold: p.lowStockThreshold,
      stockValue: roundCurrency(estimatedValue),
      unitsSold: salesMetrics.unitsSold,
      revenue: salesMetrics.revenue,
      cost: salesMetrics.cost,
      profit: salesMetrics.profit,
      margin: calculatePercentage(salesMetrics.profit, salesMetrics.revenue),
      isLowStock: currentStock <= p.lowStockThreshold && currentStock > 0,
      isOutOfStock: currentStock === 0,
    };
  });

  totalInventoryValue = roundCurrency(totalInventoryValue);

  const topSellingProducts = [...productDetails]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const mostProfitableProducts = [...productDetails]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

  const lowStockProducts = productDetails.filter((p) => p.isLowStock);
  const outOfStockProducts = productDetails.filter((p) => p.isOutOfStock);

  return {
    totalProductsCount: products.length,
    totalStockCount,
    totalInventoryValue,
    totalUnitsSold,
    topSellingProducts,
    mostProfitableProducts,
    lowStockProducts,
    outOfStockProducts,
    allProducts: productDetails,
  };
}

// ----------------------------------------------------------------------
// 3. BATCH REPORT SERVICE
// ----------------------------------------------------------------------
export async function getBatchReport(businessId: string, filter?: ReportFilter) {
  const batchWhere: Prisma.BatchWhereInput = {
    businessId,
    ...(filter?.startDate || filter?.endDate
      ? {
          purchaseDate: {
            ...(filter?.startDate ? { gte: filter.startDate } : {}),
            ...(filter?.endDate ? { lte: filter.endDate } : {}),
          },
        }
      : {}),
  };

  const batches = await prisma.batch.findMany({
    where: batchWhere,
    orderBy: { purchaseDate: "desc" },
    include: {
      batchItems: {
        include: {
          product: { select: { name: true } },
        },
      },
      expenses: {
        select: { amount: true },
      },
      saleItems: {
        where: {
          sale: { status: { notIn: ["VOIDED", "REFUNDED"] } },
        },
        select: {
          revenue: true,
          cost: true,
          profit: true,
          quantity: true,
        },
      },
    },
  });

  let totalInvestmentAllBatches = 0;
  let totalRevenueAllBatches = 0;
  let totalBatchProfit = 0;

  const batchDetails = batches.map((b) => {
    const purchaseCost = b.purchaseCost.toNumber();
    const additionalCosts = b.additionalCosts.toNumber();
    const totalInvestment = b.totalInvestment.toNumber();

    totalInvestmentAllBatches += totalInvestment;

    const initialQuantity = b.batchItems.reduce((sum, item) => sum + item.quantityPurchased, 0);
    const remainingQuantity = b.batchItems.reduce((sum, item) => sum + item.quantityRemaining, 0);
    const quantitySold = initialQuantity - remainingQuantity;

    const totalRevenue = roundCurrency(
      b.saleItems.reduce((sum, item) => sum + item.revenue.toNumber(), 0)
    );
    const totalCostOfSold = roundCurrency(
      b.saleItems.reduce((sum, item) => sum + item.cost.toNumber(), 0)
    );
    const realizedGrossProfit = roundCurrency(
      b.saleItems.reduce((sum, item) => sum + item.profit.toNumber(), 0)
    );

    const expensesAllocated = roundCurrency(
      b.expenses.reduce((sum, exp) => sum + exp.amount.toNumber(), 0)
    );

    const netBatchProfit = roundCurrency(realizedGrossProfit - expensesAllocated);

    totalRevenueAllBatches += totalRevenue;
    totalBatchProfit += netBatchProfit;

    const roiPercentage = calculatePercentage(netBatchProfit, totalInvestment);
    const sellThroughRate = calculatePercentage(quantitySold, initialQuantity);

    return {
      id: b.id,
      reference: b.reference,
      status: b.status,
      purchaseDate: b.purchaseDate,
      purchaseCost,
      additionalCosts,
      totalInvestment,
      initialQuantity,
      remainingQuantity,
      quantitySold,
      totalRevenue,
      totalCostOfSold,
      realizedGrossProfit,
      expensesAllocated,
      netBatchProfit,
      roiPercentage,
      sellThroughRate,
      itemsCount: b.batchItems.length,
    };
  });

  totalInvestmentAllBatches = roundCurrency(totalInvestmentAllBatches);
  totalRevenueAllBatches = roundCurrency(totalRevenueAllBatches);
  totalBatchProfit = roundCurrency(totalBatchProfit);

  return {
    totalBatchesCount: batches.length,
    activeBatchesCount: batches.filter((b) => b.status === "ACTIVE").length,
    completedBatchesCount: batches.filter((b) => b.status === "COMPLETED").length,
    totalInvestmentAllBatches,
    totalRevenueAllBatches,
    totalBatchProfit,
    batches: batchDetails,
  };
}

// ----------------------------------------------------------------------
// 4. EXPENSE REPORT SERVICE
// ----------------------------------------------------------------------
export async function getExpenseReport(businessId: string, filter?: ReportFilter) {
  const expenseWhere: Prisma.ExpenseWhereInput = {
    businessId,
    ...(filter?.startDate || filter?.endDate
      ? {
          expenseDate: {
            ...(filter?.startDate ? { gte: filter.startDate } : {}),
            ...(filter?.endDate ? { lte: filter.endDate } : {}),
          },
        }
      : {}),
  };

  const aggregate = await prisma.expense.aggregate({
    where: expenseWhere,
    _sum: { amount: true },
    _count: { id: true },
  });

  const totalExpenses = roundCurrency(aggregate._sum.amount?.toNumber() || 0);
  const expenseCount = aggregate._count.id || 0;
  const averageExpense = expenseCount > 0 ? roundCurrency(totalExpenses / expenseCount) : 0;

  // Category Breakdown
  const categoryGrouped = await prisma.expense.groupBy({
    by: ["category"],
    where: expenseWhere,
    _sum: { amount: true },
    _count: { id: true },
  });

  const categoryBreakdown = categoryGrouped.map((item) => {
    const amount = roundCurrency(item._sum.amount?.toNumber() || 0);
    return {
      category: item.category,
      amount,
      count: item._count.id,
      percentage: calculatePercentage(amount, totalExpenses),
    };
  });

  // Fetch expense details
  const expensesList = await prisma.expense.findMany({
    where: expenseWhere,
    orderBy: { expenseDate: "desc" },
    include: {
      batch: { select: { reference: true } },
    },
  });

  let batchExpensesTotal = 0;
  let generalExpensesTotal = 0;

  const dailyExpenseMap = new Map<string, number>();

  expensesList.forEach((exp) => {
    const amt = exp.amount.toNumber();
    if (exp.batchId) {
      batchExpensesTotal += amt;
    } else {
      generalExpensesTotal += amt;
    }

    const dateKey = exp.expenseDate.toISOString().split("T")[0];
    const existing = dailyExpenseMap.get(dateKey) || 0;
    dailyExpenseMap.set(dateKey, roundCurrency(existing + amt));
  });

  const dailyExpenseTrend = Array.from(dailyExpenseMap.entries())
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalExpenses,
    expenseCount,
    averageExpense,
    batchExpensesTotal: roundCurrency(batchExpensesTotal),
    generalExpensesTotal: roundCurrency(generalExpensesTotal),
    categoryBreakdown,
    dailyExpenseTrend,
    expensesList: expensesList.map((e) => ({
      id: e.id,
      category: e.category,
      description: e.description,
      amount: e.amount.toNumber(),
      expenseDate: e.expenseDate,
      batchReference: e.batch?.reference || null,
      notes: e.notes,
    })),
  };
}

// ----------------------------------------------------------------------
// 5. PROFIT REPORT SERVICE
// ----------------------------------------------------------------------
export async function getProfitReport(businessId: string, filter?: ReportFilter) {
  const salesReport = await getSalesReport(businessId, filter);
  const expenseReport = await getExpenseReport(businessId, filter);

  const totalRevenue = salesReport.summary.totalSalesRevenue;
  const totalCostOfGoods = salesReport.summary.totalCostOfGoods;
  const totalGrossProfit = salesReport.summary.totalGrossProfit;
  const grossMarginPercentage = calculatePercentage(totalGrossProfit, totalRevenue);

  const totalExpenses = expenseReport.totalExpenses;
  const totalNetProfit = roundCurrency(totalGrossProfit - totalExpenses);
  const netMarginPercentage = calculatePercentage(totalNetProfit, totalRevenue);

  // Profit Allocations in Date Range
  const allocationWhere: Prisma.ProfitAllocationWhereInput = {
    businessId,
    ...(filter?.startDate || filter?.endDate
      ? {
          allocationDate: {
            ...(filter?.startDate ? { gte: filter.startDate } : {}),
            ...(filter?.endDate ? { lte: filter.endDate } : {}),
          },
        }
      : {}),
  };

  const allocationsGrouped = await prisma.profitAllocation.groupBy({
    by: ["type"],
    where: allocationWhere,
    _sum: { amount: true },
  });

  let savingsAllocated = 0;
  let needsAllocated = 0;
  let wantsAllocated = 0;

  allocationsGrouped.forEach((item) => {
    const amt = roundCurrency(item._sum.amount?.toNumber() || 0);
    if (item.type === "SAVINGS") savingsAllocated = amt;
    if (item.type === "NEEDS") needsAllocated = amt;
    if (item.type === "WANTS") wantsAllocated = amt;
  });

  const totalAllocated = roundCurrency(savingsAllocated + needsAllocated + wantsAllocated);
  const remainingAllocatableProfit = Math.max(0, roundCurrency(totalNetProfit - totalAllocated));

  // Monthly Profit Trend
  const monthlyTrendMap = new Map<
    string,
    { revenue: number; cogs: number; grossProfit: number; expenses: number; netProfit: number }
  >();

  salesReport.sales.forEach((sale: any) => {
    const sDate = sale.createdAt ? new Date(sale.createdAt) : new Date(sale.saleDate);
    const monthKey = sDate.toISOString().slice(0, 7); // YYYY-MM
    const existing = monthlyTrendMap.get(monthKey) || {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      expenses: 0,
      netProfit: 0,
    };

    const rev = Number(sale.totalAmount || 0);
    const gp = Number(sale.grossProfit || 0);
    const cogs = Math.max(0, rev - gp);

    existing.revenue = roundCurrency(existing.revenue + rev);
    existing.cogs = roundCurrency(existing.cogs + cogs);
    existing.grossProfit = roundCurrency(existing.grossProfit + gp);
    monthlyTrendMap.set(monthKey, existing);
  });

  expenseReport.expensesList.forEach((exp) => {
    const monthKey = exp.expenseDate.toISOString().slice(0, 7);
    const existing = monthlyTrendMap.get(monthKey) || {
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
      expenses: 0,
      netProfit: 0,
    };

    existing.expenses = roundCurrency(existing.expenses + exp.amount);
    monthlyTrendMap.set(monthKey, existing);
  });

  const monthlyProfitTrend = Array.from(monthlyTrendMap.entries())
    .map(([month, data]) => {
      const netProfit = roundCurrency(data.grossProfit - data.expenses);
      return {
        month,
        revenue: data.revenue,
        cogs: data.cogs,
        grossProfit: data.grossProfit,
        expenses: data.expenses,
        netProfit,
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalRevenue,
    totalCostOfGoods,
    totalGrossProfit,
    grossMarginPercentage,
    totalExpenses,
    totalNetProfit,
    netMarginPercentage,
    allocations: {
      savings: savingsAllocated,
      needs: needsAllocated,
      wants: wantsAllocated,
      totalAllocated,
      remainingAllocatableProfit,
    },
    monthlyProfitTrend,
  };
}
