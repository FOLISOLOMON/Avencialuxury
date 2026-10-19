/**
 * AVENCIA 2.0 — COLLECTIONS & BANK DEPOSITS CALCULATION ENGINE
 * 
 * Pure mathematical, deterministic calculation functions for:
 * 1. Deriving actual customer payments collected (point-of-sale initial payments + subsequent debt payments).
 * 2. Avoiding double counting between initial sale payments and subsequent debt payments.
 * 3. Excluding voided, cancelled, and refunded sales and their associated transactions.
 * 4. Oldest-outstanding-first FIFO allocation of bank deposits to collections.
 * 5. Period aggregations (Total Collected, Total Deposited, Awaiting Deposit, Daily/Weekly/Monthly breakdowns).
 * 6. Over-allocation prevention (deposit amount cannot exceed eligible unallocated collections).
 */

export interface RawSaleRecord {
  id: string;
  saleDate: Date | string;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: string;
  status: string; // "COMPLETED" | "PARTIAL" | "UNPAID" | "VOIDED" | "REFUNDED"
  customer?: { id: string; name: string } | null;
  debtPayments?: Array<{
    id: string;
    amount: number;
    paymentDate: Date | string;
    paymentMethod: string;
    allocationBreakdown?: any;
    saleId?: string | null;
  }>;
}

export interface RawDebtPaymentRecord {
  id: string;
  amount: number;
  paymentDate: Date | string;
  paymentMethod: string;
  saleId?: string | null;
  sale?: { id: string; status: string } | null;
  customer?: { id: string; name: string } | null;
  allocationBreakdown?: Array<{
    saleId: string;
    amountApplied: number;
  }> | null;
  notes?: string | null;
}

export interface CollectionItem {
  id: string;
  type: "SALE_INITIAL" | "DEBT_PAYMENT";
  amount: number;
  date: Date;
  paymentMethod: string;
  description: string;
  customerName: string;
  saleId?: string;
}

export interface ExistingAllocationRecord {
  id: string;
  depositId: string;
  amount: number;
  collectionType: string;
  collectionId: string;
  collectionDate: Date | string;
}

export interface BankDepositRecord {
  id: string;
  amount: number;
  depositDate: Date | string;
  reference?: string | null;
  notes?: string | null;
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: Date | string;
}

export interface DailyCollectionBreakdown {
  dateKey: string; // YYYY-MM-DD
  dayLabel: string; // e.g. "Mon, Oct 19"
  totalCollected: number;
  totalDeposited: number;
  awaitingDeposit: number;
  cashAmount: number;
  momoAmount: number;
  otherAmount: number;
  transactionCount: number;
}

export interface PeriodSummary {
  periodKey: string;
  label: string;
  startDate: Date;
  endDate: Date;
  totalCollected: number;
  totalDeposited: number;
  awaitingDeposit: number;
}

export interface CollectionsReportResult {
  period: {
    quickRange?: string;
    startDate?: string;
    endDate?: string;
  };
  metrics: {
    totalCollected: number;
    totalDeposited: number;
    awaitingDeposit: number;
    allTimeUnallocatedPool: number;
  };
  paymentMethodBreakdown: {
    cash: number;
    mobileMoney: number;
    bankTransfer: number;
    card: number;
    other: number;
  };
  dailyBreakdown: DailyCollectionBreakdown[];
  weeklySummaries: PeriodSummary[];
  monthlySummaries: PeriodSummary[];
  depositHistory: BankDepositRecord[];
}

/**
 * Helper to round to 2 decimal places to avoid floating-point errors.
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Extracts normalized, deduplicated collection events from raw sales and debt payments.
 * 
 * Rules:
 * - Active sales: status not in ["VOIDED", "REFUNDED"].
 * - Initial payment = sale.amountPaid minus sum of all subsequent debt payments applied to that sale.
 * - Debt payments: only count if not on a voided/refunded sale.
 * - Each collection event records actual money received and actual date received.
 */
export function extractCollectionItems(
  sales: RawSaleRecord[],
  debtPayments: RawDebtPaymentRecord[]
): CollectionItem[] {
  // Map of voided sale IDs
  const voidedSaleIds = new Set<string>();
  sales.forEach((s) => {
    if (s.status === "VOIDED" || s.status === "REFUNDED") {
      voidedSaleIds.add(s.id);
    }
  });

  // Calculate sum of debt payments applied per sale
  const debtAppliedPerSale: Record<string, number> = {};

  const validDebtPayments = debtPayments.filter((dp) => {
    // If explicitly linked to a voided sale, exclude
    if (dp.saleId && voidedSaleIds.has(dp.saleId)) return false;
    if (dp.sale && (dp.sale.status === "VOIDED" || dp.sale.status === "REFUNDED")) return false;
    return true;
  });

  for (const dp of validDebtPayments) {
    const dpAmount = roundToTwoDecimals(Number(dp.amount) || 0);
    if (dpAmount <= 0) continue;

    if (Array.isArray(dp.allocationBreakdown) && dp.allocationBreakdown.length > 0) {
      for (const item of dp.allocationBreakdown) {
        if (item.saleId && !voidedSaleIds.has(item.saleId)) {
          const applied = roundToTwoDecimals(Number(item.amountApplied) || 0);
          debtAppliedPerSale[item.saleId] = roundToTwoDecimals(
            (debtAppliedPerSale[item.saleId] || 0) + applied
          );
        }
      }
    } else if (dp.saleId && !voidedSaleIds.has(dp.saleId)) {
      debtAppliedPerSale[dp.saleId] = roundToTwoDecimals(
        (debtAppliedPerSale[dp.saleId] || 0) + dpAmount
      );
    }
  }

  const items: CollectionItem[] = [];

  // 1. Initial point-of-sale payments from active sales
  for (const sale of sales) {
    if (sale.status === "VOIDED" || sale.status === "REFUNDED") continue;

    const currentAmountPaid = roundToTwoDecimals(Number(sale.amountPaid) || 0);
    const appliedDebts = debtAppliedPerSale[sale.id] || 0;
    // Initial amount paid at the time the sale was created
    const initialPaid = roundToTwoDecimals(Math.max(0, currentAmountPaid - appliedDebts));

    if (initialPaid > 0) {
      items.push({
        id: sale.id,
        type: "SALE_INITIAL",
        amount: initialPaid,
        date: new Date(sale.saleDate),
        paymentMethod: sale.paymentMethod || "CASH",
        description: `Sale #${sale.id.slice(-6)} upfront payment`,
        customerName: sale.customer?.name || "Direct Customer",
        saleId: sale.id,
      });
    }
  }

  // 2. Subsequent customer debt payments
  for (const dp of validDebtPayments) {
    const dpAmount = roundToTwoDecimals(Number(dp.amount) || 0);
    if (dpAmount > 0) {
      items.push({
        id: dp.id,
        type: "DEBT_PAYMENT",
        amount: dpAmount,
        date: new Date(dp.paymentDate),
        paymentMethod: dp.paymentMethod || "CASH",
        description: dp.notes || `Debt payment from ${dp.customer?.name || "Customer"}`,
        customerName: dp.customer?.name || "Customer",
        saleId: dp.saleId || undefined,
      });
    }
  }

  // Sort chronological (oldest to newest)
  items.sort((a, b) => a.date.getTime() - b.date.getTime());

  return items;
}

/**
 * Calculates FIFO allocations for a new bank deposit.
 * 
 * Connects the deposit to the oldest unallocated collections first.
 * Rejects over-allocation: deposit amount cannot exceed total unallocated collections.
 */
export function calculateDepositAllocations(
  collectionItems: CollectionItem[],
  existingAllocations: ExistingAllocationRecord[],
  depositAmount: number
): {
  success: boolean;
  error?: string;
  availablePool: number;
  newAllocations: Array<{
    collectionType: string;
    collectionId: string;
    collectionDate: Date;
    amount: number;
  }>;
} {
  const cleanDeposit = roundToTwoDecimals(depositAmount);
  if (cleanDeposit <= 0) {
    return {
      success: false,
      error: "Deposit amount must be greater than zero.",
      availablePool: 0,
      newAllocations: [],
    };
  }

  // Calculate already allocated amount per collection item
  const allocatedMap: Record<string, number> = {};
  for (const alloc of existingAllocations) {
    const key = `${alloc.collectionType}:${alloc.collectionId}`;
    allocatedMap[key] = roundToTwoDecimals(
      (allocatedMap[key] || 0) + (Number(alloc.amount) || 0)
    );
  }

  // Calculate unallocated balances per item (items are sorted chronologically oldest first)
  const sortedItems = [...collectionItems].sort((a, b) => a.date.getTime() - b.date.getTime());
  let totalAvailablePool = 0;
  const itemsWithUnallocated: Array<{
    item: CollectionItem;
    unallocatedAmount: number;
  }> = [];

  for (const item of sortedItems) {
    const key = `${item.type}:${item.id}`;
    const alreadyAllocated = allocatedMap[key] || 0;
    const unallocated = roundToTwoDecimals(Math.max(0, item.amount - alreadyAllocated));

    if (unallocated > 0) {
      itemsWithUnallocated.push({ item, unallocatedAmount: unallocated });
      totalAvailablePool = roundToTwoDecimals(totalAvailablePool + unallocated);
    }
  }

  // Over-allocation check
  if (cleanDeposit > totalAvailablePool) {
    return {
      success: false,
      error: `Deposit amount (GH₵${cleanDeposit.toFixed(
        2
      )}) exceeds eligible unallocated collections (GH₵${totalAvailablePool.toFixed(
        2
      )}). You cannot mark more funds as deposited than the amount actually collected.`,
      availablePool: totalAvailablePool,
      newAllocations: [],
    };
  }

  // Perform FIFO allocation: oldest outstanding collections first
  let remainingToAllocate = cleanDeposit;
  const newAllocations: Array<{
    collectionType: string;
    collectionId: string;
    collectionDate: Date;
    amount: number;
  }> = [];

  for (const { item, unallocatedAmount } of itemsWithUnallocated) {
    if (remainingToAllocate <= 0) break;

    const applyAmount = roundToTwoDecimals(Math.min(remainingToAllocate, unallocatedAmount));
    if (applyAmount > 0) {
      newAllocations.push({
        collectionType: item.type,
        collectionId: item.id,
        collectionDate: item.date,
        amount: applyAmount,
      });

      remainingToAllocate = roundToTwoDecimals(remainingToAllocate - applyAmount);
    }
  }

  return {
    success: true,
    availablePool: totalAvailablePool,
    newAllocations,
  };
}

/**
 * Builds the comprehensive Weekly Collections & Bank Deposits report.
 */
export function buildCollectionsReport(params: {
  collectionItems: CollectionItem[];
  allocations: ExistingAllocationRecord[];
  deposits: BankDepositRecord[];
  startDate?: Date;
  endDate?: Date;
  quickRange?: string;
}): CollectionsReportResult {
  const { collectionItems, allocations, deposits, startDate, endDate, quickRange } = params;

  // Build lookup of total deposited per collection item
  const allocatedMap: Record<string, number> = {};
  for (const alloc of allocations) {
    const key = `${alloc.collectionType}:${alloc.collectionId}`;
    allocatedMap[key] = roundToTwoDecimals(
      (allocatedMap[key] || 0) + (Number(alloc.amount) || 0)
    );
  }

  // Calculate All-Time Available / Unallocated Collections Pool
  let allTimeCollected = 0;
  let allTimeDeposited = 0;
  for (const item of collectionItems) {
    allTimeCollected = roundToTwoDecimals(allTimeCollected + item.amount);
    const key = `${item.type}:${item.id}`;
    allTimeDeposited = roundToTwoDecimals(allTimeDeposited + (allocatedMap[key] || 0));
  }
  const allTimeUnallocatedPool = roundToTwoDecimals(
    Math.max(0, allTimeCollected - allTimeDeposited)
  );

  // Filter items in the requested period
  const periodItems = collectionItems.filter((item) => {
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    return true;
  });

  // Calculate Period Metrics
  let totalCollected = 0;
  let totalDeposited = 0;

  const paymentMethodBreakdown = {
    cash: 0,
    mobileMoney: 0,
    bankTransfer: 0,
    card: 0,
    other: 0,
  };

  // Daily map
  const dailyMap: Record<
    string,
    {
      dateKey: string;
      dayLabel: string;
      totalCollected: number;
      totalDeposited: number;
      cashAmount: number;
      momoAmount: number;
      otherAmount: number;
      transactionCount: number;
    }
  > = {};

  for (const item of periodItems) {
    const itemAmount = item.amount;
    totalCollected = roundToTwoDecimals(totalCollected + itemAmount);

    const key = `${item.type}:${item.id}`;
    const itemDeposited = allocatedMap[key] || 0;
    totalDeposited = roundToTwoDecimals(totalDeposited + itemDeposited);

    // Method breakdown
    const m = (item.paymentMethod || "").toUpperCase();
    if (m === "CASH") {
      paymentMethodBreakdown.cash = roundToTwoDecimals(
        paymentMethodBreakdown.cash + itemAmount
      );
    } else if (m === "MOBILE_MONEY" || m === "MOMO") {
      paymentMethodBreakdown.mobileMoney = roundToTwoDecimals(
        paymentMethodBreakdown.mobileMoney + itemAmount
      );
    } else if (m === "BANK_TRANSFER" || m === "BANK") {
      paymentMethodBreakdown.bankTransfer = roundToTwoDecimals(
        paymentMethodBreakdown.bankTransfer + itemAmount
      );
    } else if (m === "CARD") {
      paymentMethodBreakdown.card = roundToTwoDecimals(
        paymentMethodBreakdown.card + itemAmount
      );
    } else {
      paymentMethodBreakdown.other = roundToTwoDecimals(
        paymentMethodBreakdown.other + itemAmount
      );
    }

    // Daily breakdown grouping (using local date YYYY-MM-DD)
    const year = item.date.getFullYear();
    const month = String(item.date.getMonth() + 1).padStart(2, "0");
    const day = String(item.date.getDate()).padStart(2, "0");
    const dateKey = `${year}-${month}-${day}`;

    if (!dailyMap[dateKey]) {
      const dayLabel = item.date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      dailyMap[dateKey] = {
        dateKey,
        dayLabel,
        totalCollected: 0,
        totalDeposited: 0,
        cashAmount: 0,
        momoAmount: 0,
        otherAmount: 0,
        transactionCount: 0,
      };
    }

    const d = dailyMap[dateKey];
    d.totalCollected = roundToTwoDecimals(d.totalCollected + itemAmount);
    d.totalDeposited = roundToTwoDecimals(d.totalDeposited + itemDeposited);
    d.transactionCount += 1;

    if (m === "CASH") {
      d.cashAmount = roundToTwoDecimals(d.cashAmount + itemAmount);
    } else if (m === "MOBILE_MONEY" || m === "MOMO") {
      d.momoAmount = roundToTwoDecimals(d.momoAmount + itemAmount);
    } else {
      d.otherAmount = roundToTwoDecimals(d.otherAmount + itemAmount);
    }
  }

  // If a date range was selected, make sure all days within range are represented (optional, but nice)
  // For now, sort days chronologically descending (newest day first)
  const dailyBreakdown: DailyCollectionBreakdown[] = Object.values(dailyMap)
    .map((d) => ({
      ...d,
      awaitingDeposit: roundToTwoDecimals(Math.max(0, d.totalCollected - d.totalDeposited)),
    }))
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  const awaitingDeposit = roundToTwoDecimals(Math.max(0, totalCollected - totalDeposited));

  // Compute Weekly Summaries (Last 4 weeks)
  const weeklySummaries = generateWeeklySummaries(collectionItems, allocatedMap);

  // Compute Monthly Summaries (Last 6 months)
  const monthlySummaries = generateMonthlySummaries(collectionItems, allocatedMap);

  return {
    period: {
      quickRange,
      startDate: startDate ? startDate.toISOString() : undefined,
      endDate: endDate ? endDate.toISOString() : undefined,
    },
    metrics: {
      totalCollected,
      totalDeposited,
      awaitingDeposit,
      allTimeUnallocatedPool,
    },
    paymentMethodBreakdown,
    dailyBreakdown,
    weeklySummaries,
    monthlySummaries,
    depositHistory: deposits.sort(
      (a, b) => new Date(b.depositDate).getTime() - new Date(a.depositDate).getTime()
    ),
  };
}

/**
 * Generates summaries grouped by calendar weeks (Monday - Sunday).
 */
function generateWeeklySummaries(
  collectionItems: CollectionItem[],
  allocatedMap: Record<string, number>
): PeriodSummary[] {
  const weeks: PeriodSummary[] = [];
  const now = new Date();

  for (let w = 0; w < 4; w++) {
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek - w * 7;
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diffToMonday,
      0,
      0,
      0,
      0
    );
    const endOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diffToMonday + 6,
      23,
      59,
      59,
      999
    );

    let collected = 0;
    let deposited = 0;

    for (const item of collectionItems) {
      if (item.date >= startOfWeek && item.date <= endOfWeek) {
        collected = roundToTwoDecimals(collected + item.amount);
        const key = `${item.type}:${item.id}`;
        deposited = roundToTwoDecimals(deposited + (allocatedMap[key] || 0));
      }
    }

    const startStr = startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = endOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const label = w === 0 ? `This Week (${startStr} – ${endStr})` : w === 1 ? `Last Week (${startStr} – ${endStr})` : `${startStr} – ${endStr}`;

    weeks.push({
      periodKey: `week-${w}`,
      label,
      startDate: startOfWeek,
      endDate: endOfWeek,
      totalCollected: collected,
      totalDeposited: deposited,
      awaitingDeposit: roundToTwoDecimals(Math.max(0, collected - deposited)),
    });
  }

  return weeks;
}

/**
 * Generates summaries grouped by calendar months.
 */
function generateMonthlySummaries(
  collectionItems: CollectionItem[],
  allocatedMap: Record<string, number>
): PeriodSummary[] {
  const months: PeriodSummary[] = [];
  const now = new Date();

  for (let m = 0; m < 6; m++) {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - m, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() - m + 1,
      0,
      23,
      59,
      59,
      999
    );

    let collected = 0;
    let deposited = 0;

    for (const item of collectionItems) {
      if (item.date >= startOfMonth && item.date <= endOfMonth) {
        collected = roundToTwoDecimals(collected + item.amount);
        const key = `${item.type}:${item.id}`;
        deposited = roundToTwoDecimals(deposited + (allocatedMap[key] || 0));
      }
    }

    const label = startOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    months.push({
      periodKey: `month-${m}`,
      label,
      startDate: startOfMonth,
      endDate: endOfMonth,
      totalCollected: collected,
      totalDeposited: deposited,
      awaitingDeposit: roundToTwoDecimals(Math.max(0, collected - deposited)),
    });
  }

  return months;
}
