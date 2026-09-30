import { AIToolDefinition, AIToolResult } from "./types";
import {
  getSalesReport,
  getProductReport,
  getBatchReport,
  getExpenseReport,
  getProfitReport,
  ReportFilter,
} from "@/lib/services/reports";
import { getCustomers, getCustomerById } from "@/lib/services/customers";
import { getProducts } from "@/lib/services/products";
import { getBatches } from "@/lib/services/batches";
import { parseNaturalDateRange } from "@/lib/utils";

// ----------------------------------------------------------------------
// 1. TOOL DEFINITIONS FOR GEMINI / AI FUNCTION CALLING
// ----------------------------------------------------------------------
export const AVENCIA_TOOLS: AIToolDefinition[] = [
  {
    name: "get_sales_summary",
    description:
      "Retrieve authoritative sales calculations including revenue, collected amount, outstanding debt, gross profit, net profit, and order counts for a given period or customer/product filter.",
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          description:
            "Natural language date phrase, e.g. 'today', 'yesterday', 'this week', 'this month', 'last 7 days', 'September 1 to September 20'",
        },
        startDate: { type: "string", description: "ISO YYYY-MM-DD start date" },
        endDate: { type: "string", description: "ISO YYYY-MM-DD end date" },
        customerId: { type: "string", description: "Optional customer ID" },
        productId: { type: "string", description: "Optional product ID" },
        batchId: { type: "string", description: "Optional batch ID" },
        paymentStatus: {
          type: "string",
          description: "PAID, PARTIAL, UNPAID, VOIDED, or ALL",
        },
      },
    },
  },
  {
    name: "get_sales_list",
    description:
      "Retrieve matching sales transactions with date, customer name, total amount, amount paid, balance due, and items count.",
    parameters: {
      type: "object",
      properties: {
        timeframe: { type: "string", description: "Natural date timeframe e.g. 'this month'" },
        startDate: { type: "string", description: "ISO start date" },
        endDate: { type: "string", description: "ISO end date" },
        customerId: { type: "string", description: "Optional customer ID" },
        productId: { type: "string", description: "Optional product ID" },
        paymentStatus: { type: "string", description: "PAID, PARTIAL, UNPAID, or ALL" },
        limit: { type: "string", description: "Number of records to return (default 10)" },
      },
    },
  },
  {
    name: "get_customer_balances",
    description:
      "Retrieve all customers with outstanding debt balances, calculated authoritatively by the backend.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Optional customer name or phone search string" },
      },
    },
  },
  {
    name: "get_customer_summary",
    description:
      "Retrieve authoritative customer profile, total purchase spend, debt balance, total orders, and order history for a specific customer.",
    parameters: {
      type: "object",
      properties: {
        customerNameOrId: {
          type: "string",
          description: "Customer name, phone number, or customer ID to look up",
        },
      },
      required: ["customerNameOrId"],
    },
  },
  {
    name: "get_product_performance",
    description:
      "Retrieve product sales metrics including top-selling products, most profitable products, units sold, revenue, and profit margins.",
    parameters: {
      type: "object",
      properties: {
        timeframe: { type: "string", description: "Natural date range e.g. 'this month'" },
        startDate: { type: "string", description: "ISO start date" },
        endDate: { type: "string", description: "ISO end date" },
      },
    },
  },
  {
    name: "get_low_stock_products",
    description:
      "Retrieve products that are low on stock or completely out of stock based on Avencia's threshold logic.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_expense_summary",
    description:
      "Retrieve authoritative expense totals, category breakdown, and operational cost records.",
    parameters: {
      type: "object",
      properties: {
        timeframe: { type: "string", description: "Natural date range e.g. 'this month'" },
        startDate: { type: "string", description: "ISO start date" },
        endDate: { type: "string", description: "ISO end date" },
      },
    },
  },
  {
    name: "get_batch_summary",
    description:
      "Retrieve stock batch performance metrics including total investment, realized gross profit, ROI %, sell-through rate, and remaining stock.",
    parameters: {
      type: "object",
      properties: {
        batchRefOrId: { type: "string", description: "Optional batch reference (e.g. 'Batch 4') or batch ID" },
      },
    },
  },
  {
    name: "get_dashboard_summary",
    description:
      "Retrieve the standard high-level business dashboard metrics (Revenue, Gross Profit, Expenses, Net Profit, Low Stock Count, Active Debt Total).",
    parameters: {
      type: "object",
      properties: {
        timeframe: { type: "string", description: "Optional date timeframe" },
      },
    },
  },
  {
    name: "get_business_summary",
    description:
      "Retrieve a comprehensive multi-metric snapshot of the business combining sales, profit, customer debts, expenses, and inventory health.",
    parameters: {
      type: "object",
      properties: {
        timeframe: { type: "string", description: "Natural language date range e.g. 'this month', 'today', 'last week'" },
      },
    },
  },
];

// ----------------------------------------------------------------------
// 2. SERVER-SIDE TOOL EXECUTORS (AUTHORITATIVE BACKEND WRAPPERS)
// ----------------------------------------------------------------------

function resolveFilterDates(timeframe?: string, startDateStr?: string, endDateStr?: string): ReportFilter {
  if (timeframe) {
    const dates = parseNaturalDateRange(timeframe);
    if (dates.quickRange) return { quickRange: dates.quickRange };
    if (dates.startDate || dates.endDate) {
      return {
        startDate: dates.startDate?.toISOString(),
        endDate: dates.endDate?.toISOString(),
      };
    }
  }

  return {
    startDate: startDateStr ? new Date(startDateStr).toISOString() : undefined,
    endDate: endDateStr ? new Date(endDateStr).toISOString() : undefined,
  };
}

export async function executeAITool(
  toolName: string,
  args: Record<string, any>,
  businessId: string
): Promise<AIToolResult> {
  try {
    switch (toolName) {
      case "get_sales_summary": {
        const filter = resolveFilterDates(args.timeframe, args.startDate, args.endDate);
        if (args.customerId) filter.customerId = args.customerId;
        if (args.productId) filter.productId = args.productId;
        if (args.batchId) filter.batchId = args.batchId;
        if (args.paymentStatus) filter.paymentStatus = args.paymentStatus;

        const report = await getSalesReport(businessId, filter);
        const tfLabel = args.timeframe || "Selected Period";

        return {
          toolName,
          success: true,
          data: {
            timeframe: tfLabel,
            revenue: report.summary.totalSalesRevenue,
            amountCollected: report.summary.totalAmountCollected,
            outstanding: report.summary.totalOutstanding,
            transactions: report.summary.totalTransactions,
            itemsSold: report.summary.totalItemsSold,
            grossProfit: report.summary.totalGrossProfit,
            netProfit: report.summary.netProfit,
            averageOrderValue: report.summary.averageOrderValue,
            profitMarginPct: report.summary.profitMargin,
          },
          sourceContext: `Based on ${report.summary.totalTransactions} sales records for ${tfLabel}`,
        };
      }

      case "get_sales_list": {
        const filter = resolveFilterDates(args.timeframe, args.startDate, args.endDate);
        if (args.customerId) filter.customerId = args.customerId;
        if (args.productId) filter.productId = args.productId;
        if (args.paymentStatus) filter.paymentStatus = args.paymentStatus;

        const report = await getSalesReport(businessId, filter);
        const limit = parseInt(args.limit || "10", 10);
        const sales = report.sales.slice(0, limit).map((s) => ({
          id: s.id,
          date: s.saleDate.toISOString().split("T")[0],
          customerName: s.customer?.name || "Walk-in Customer",
          totalAmount: s.totalAmount.toNumber(),
          amountPaid: s.amountPaid.toNumber(),
          balanceDue: s.balanceDue.toNumber(),
          paymentStatus: s.paymentStatus,
          paymentMethod: s.paymentMethod,
          itemCount: s.saleItems.length,
          items: s.saleItems.map((item) => ({
            productName: item.product?.name || "Unknown Product",
            quantity: item.quantity,
            unitPrice: item.unitPrice.toNumber(),
          })),
        }));

        return {
          toolName,
          success: true,
          data: {
            count: sales.length,
            totalCount: report.sales.length,
            sales,
          },
          sourceContext: `Retrieved ${sales.length} matching sales transactions`,
        };
      }

      case "get_customer_balances": {
        const customers = await getCustomers(businessId, args.search);
        const debtors = customers
          .filter((c) => c.totalOutstandingDebt > 0)
          .map((c) => ({
            customerId: c.id,
            name: c.name,
            phone: c.phone || "No phone",
            outstandingBalance: c.totalOutstandingDebt,
            totalOrders: c.totalOrders,
            totalSpend: c.totalSpend,
            lastPurchaseDate: c.lastPurchaseDate ? c.lastPurchaseDate.toISOString().split("T")[0] : "N/A",
          }));

        const totalDebtSum = debtors.reduce((sum, d) => sum + d.outstandingBalance, 0);

        return {
          toolName,
          success: true,
          data: {
            debtorCount: debtors.length,
            totalOutstandingDebt: Math.round(totalDebtSum * 100) / 100,
            debtors,
          },
          sourceContext: `Found ${debtors.length} customers with outstanding balances totalling GH₵${totalDebtSum.toFixed(2)}`,
        };
      }

      case "get_customer_summary": {
        const query = (args.customerNameOrId || "").trim();
        const customers = await getCustomers(businessId, query);

        if (customers.length === 0) {
          return {
            toolName,
            success: true,
            data: { found: false, message: `No customer matching '${query}' was found.` },
            sourceContext: `Customer search for '${query}' returned 0 records`,
          };
        }

        const match = customers[0];
        const fullCustomer = await getCustomerById(match.id, businessId);

        return {
          toolName,
          success: true,
          data: {
            found: true,
            id: match.id,
            name: match.name,
            phone: match.phone,
            email: match.email,
            totalOrders: match.totalOrders,
            totalSpend: match.totalSpend,
            totalProfitGenerated: match.totalProfit,
            outstandingBalance: match.totalOutstandingDebt,
            lastPurchaseDate: match.lastPurchaseDate ? match.lastPurchaseDate.toISOString().split("T")[0] : null,
            recentSales: fullCustomer?.sales.slice(0, 5).map((s) => ({
              saleId: s.id,
              date: s.saleDate.toISOString().split("T")[0],
              totalAmount: s.totalAmount.toNumber(),
              amountPaid: s.amountPaid.toNumber(),
              balanceDue: s.balanceDue.toNumber(),
              paymentStatus: s.paymentStatus,
            })),
          },
          sourceContext: `Authoritative summary for customer '${match.name}'`,
        };
      }

      case "get_product_performance": {
        const filter = resolveFilterDates(args.timeframe, args.startDate, args.endDate);
        const productReport = await getProductReport(businessId, filter);

        return {
          toolName,
          success: true,
          data: {
            totalProducts: productReport.totalProductsCount,
            totalStockUnits: productReport.totalStockCount,
            totalInventoryValue: productReport.totalInventoryValue,
            totalUnitsSold: productReport.totalUnitsSold,
            topSellingByRevenue: productReport.topSellingProducts.slice(0, 5).map((p) => ({
              name: p.name,
              sku: p.sku,
              unitsSold: p.unitsSold,
              revenue: p.revenue,
              profit: p.profit,
              currentStock: p.currentStock,
            })),
            mostProfitable: productReport.mostProfitableProducts.slice(0, 5).map((p) => ({
              name: p.name,
              profit: p.profit,
              marginPct: p.margin,
              revenue: p.revenue,
            })),
          },
          sourceContext: `Analyzed product performance across ${productReport.totalProductsCount} products`,
        };
      }

      case "get_low_stock_products": {
        const productReport = await getProductReport(businessId);

        return {
          toolName,
          success: true,
          data: {
            lowStockCount: productReport.lowStockProducts.length,
            outOfStockCount: productReport.outOfStockProducts.length,
            lowStockItems: productReport.lowStockProducts.map((p) => ({
              name: p.name,
              sku: p.sku,
              currentStock: p.currentStock,
              threshold: p.lowStockThreshold,
              sellingPrice: p.sellingPrice,
            })),
            outOfStockItems: productReport.outOfStockProducts.map((p) => ({
              name: p.name,
              sku: p.sku,
              sellingPrice: p.sellingPrice,
            })),
          },
          sourceContext: `Found ${productReport.lowStockProducts.length} low-stock and ${productReport.outOfStockProducts.length} out-of-stock products`,
        };
      }

      case "get_expense_summary": {
        const filter = resolveFilterDates(args.timeframe, args.startDate, args.endDate);
        const expReport = await getExpenseReport(businessId, filter);

        return {
          toolName,
          success: true,
          data: {
            totalExpenses: expReport.totalExpenses,
            expenseCount: expReport.expenseCount,
            averageExpense: expReport.averageExpense,
            categoryBreakdown: expReport.categoryBreakdown,
            recentExpenses: expReport.expensesList.slice(0, 5),
          },
          sourceContext: `Total operational expenses GH₵${expReport.totalExpenses.toFixed(2)} across ${expReport.expenseCount} records`,
        };
      }

      case "get_batch_summary": {
        const batchReport = await getBatchReport(businessId);
        let batches = batchReport.batches;

        if (args.batchRefOrId && args.batchRefOrId.trim() !== "") {
          const ref = args.batchRefOrId.trim().toLowerCase();
          batches = batches.filter(
            (b) => b.id.toLowerCase() === ref || b.reference.toLowerCase().includes(ref)
          );
        }

        return {
          toolName,
          success: true,
          data: {
            totalBatches: batchReport.totalBatchesCount,
            activeBatches: batchReport.activeBatchesCount,
            totalInvestment: batchReport.totalInvestmentAllBatches,
            totalRevenue: batchReport.totalRevenueAllBatches,
            totalNetProfit: batchReport.totalBatchProfit,
            batches: batches.slice(0, 5),
          },
          sourceContext: `Analyzed ${batches.length} stock batches`,
        };
      }

      case "get_dashboard_summary":
      case "get_business_summary": {
        const filter = resolveFilterDates(args.timeframe);
        const salesReport = await getSalesReport(businessId, filter);
        const profitReport = await getProfitReport(businessId, filter);
        const productReport = await getProductReport(businessId);
        const customers = await getCustomers(businessId);

        const totalDebt = customers.reduce((acc, c) => acc + c.totalOutstandingDebt, 0);
        const debtorsCount = customers.filter((c) => c.totalOutstandingDebt > 0).length;

        return {
          toolName,
          success: true,
          data: {
            timeframe: args.timeframe || "All-time / Standard Period",
            revenue: salesReport.summary.totalSalesRevenue,
            amountCollected: salesReport.summary.totalAmountCollected,
            outstandingDebt: Math.round(totalDebt * 100) / 100,
            debtorsCount,
            grossProfit: salesReport.summary.totalGrossProfit,
            totalExpenses: profitReport.totalExpenses,
            netProfit: profitReport.totalNetProfit,
            totalOrders: salesReport.summary.totalTransactions,
            totalProducts: productReport.totalProductsCount,
            lowStockCount: productReport.lowStockProducts.length,
            outOfStockCount: productReport.outOfStockProducts.length,
            topProduct: productReport.topSellingProducts[0]?.name || "N/A",
          },
          sourceContext: `Avencia Business Overview Service`,
        };
      }

      default:
        return {
          toolName,
          success: false,
          error: `Unknown AI tool '${toolName}'`,
        };
    }
  } catch (error: any) {
    console.error(`AI Tool Error [${toolName}]:`, error);
    return {
      toolName,
      success: false,
      error: error.message || `Failed executing tool ${toolName}`,
    };
  }
}
