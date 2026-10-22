import { AIToolDefinition, AIToolResult, AuthUserContext } from "./types";
import {
  getSalesReport,
  getProductReport,
  getBatchReport,
  getExpenseReport,
  getProfitReport,
  ReportFilter,
} from "@/lib/services/reports";
import { getCustomers, getCustomerById } from "@/lib/services/customers";
import { getWeeklyCollectionsReport } from "@/lib/services/collections";
import { getFeedbackList, getProductInsightsService } from "@/lib/services/feedback";
import { parseNaturalDateRange } from "@/lib/utils";
import { isRealDataTransmissionAllowed } from "./gemini";

// ----------------------------------------------------------------------
// 1. TOOL DEFINITIONS FOR GEMINI FUNCTION CALLING
// ----------------------------------------------------------------------
export const AVENCIA_TOOLS: AIToolDefinition[] = [
  {
    name: "get_sales_summary",
    description:
      "Retrieve sales metrics including revenue, collected cash, outstanding debt, and order counts. (Owner also receives gross/net profit; Worker receives only their own sales metrics).",
    parameters: {
      type: "object",
      properties: {
        timeframe: {
          type: "string",
          description: "Natural language date phrase, e.g. 'today', 'yesterday', 'this week', 'this month', 'last 7 days'",
        },
        startDate: { type: "string", description: "ISO YYYY-MM-DD start date" },
        endDate: { type: "string", description: "ISO YYYY-MM-DD end date" },
        paymentStatus: {
          type: "string",
          description: "PAID, PARTIAL, UNPAID, or ALL",
        },
      },
    },
  },
  {
    name: "get_sales_list",
    description:
      "Retrieve sales transactions with date, customer name, total amount, amount paid, and balance due. (Workers only see sales they personally recorded).",
    parameters: {
      type: "object",
      properties: {
        timeframe: { type: "string", description: "Natural date timeframe e.g. 'this month'" },
        startDate: { type: "string", description: "ISO start date" },
        endDate: { type: "string", description: "ISO end date" },
        limit: { type: "string", description: "Number of records to return (default 10)" },
      },
    },
  },
  {
    name: "get_collections_summary",
    description:
      "Retrieve authoritative cash collections, bank deposits, and pending deposits for a period. Distinguishes upfront sales collections from subsequent debt payments. (Owner only).",
    parameters: {
      type: "object",
      properties: {
        timeframe: { type: "string", description: "Natural date range e.g. 'this week', 'this month'" },
        startDate: { type: "string", description: "ISO start date" },
        endDate: { type: "string", description: "ISO end date" },
      },
    },
  },
  {
    name: "get_customer_balances",
    description:
      "Retrieve customer credit accounts and outstanding debt balances, calculated authoritatively without exposing unnecessary phone numbers or PII.",
    parameters: {
      type: "object",
      properties: {
        search: { type: "string", description: "Optional customer name search string" },
      },
    },
  },
  {
    name: "get_customer_summary",
    description:
      "Retrieve customer profile summary: purchase count, total spend, and outstanding balance for a specific customer name.",
    parameters: {
      type: "object",
      properties: {
        customerName: {
          type: "string",
          description: "Customer name or identifier to look up",
        },
      },
      required: ["customerName"],
    },
  },
  {
    name: "get_product_performance",
    description:
      "Retrieve product sales volume, best-selling perfumes, units sold, and inventory counts. (Profit margins restricted to Owner).",
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
      "Retrieve inventory stock shortage alerts: products that are low in stock or completely sold out.",
    parameters: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_customer_feedback_summary",
    description:
      "Retrieve customer sentiment and feedback summaries across longevity, scent, projection, delivery, and value. (Owner sees business-wide feedback; Worker sees only feedback they recorded).",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "Optional category filter: LONGEVITY, FRAGRANCE_SCENT, PROJECTION, PACKAGING, VALUE_FOR_MONEY, DELIVERY_SERVICE, COMPLAINT, POSITIVE_GENERAL" },
        timeframe: { type: "string", description: "Natural date timeframe e.g. 'this month'" },
      },
    },
  },
  {
    name: "get_expense_summary",
    description:
      "Retrieve operational expenses and category breakdown. (Owner only).",
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
      "Retrieve perfume consignment batch investments and performance. (Owner only).",
    parameters: {
      type: "object",
      properties: {
        batchRef: { type: "string", description: "Optional batch reference number" },
      },
    },
  },
  {
    name: "get_business_summary",
    description:
      "Retrieve executive business performance overview: revenue, collections, outstanding debts, inventory count, and operational metrics. (Owner only).",
    parameters: {
      type: "object",
      properties: {
        timeframe: { type: "string", description: "Natural date range e.g. 'this month', 'today', 'last week'" },
      },
    },
  },
];

// ----------------------------------------------------------------------
// 2. HELPER FUNCTIONS FOR FILTERING & DATE RESOLUTION
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

// ----------------------------------------------------------------------
// 3. SYNTHETIC FIXTURE GENERATOR FOR SAFE DEMO (When Real Data Opt-In Is Pending)
// ----------------------------------------------------------------------
function getSyntheticDemoData(toolName: string, isOwner: boolean): any {
  switch (toolName) {
    case "get_sales_summary":
      return {
        _mode: "SYNTHETIC_DEMO",
        timeframe: "This Month (Demonstration Data)",
        revenue: 12500.0,
        amountCollected: 10200.0,
        outstanding: 2300.0,
        transactions: 28,
        itemsSold: 42,
        ...(isOwner ? { grossProfit: 4500.0, netProfit: 3100.0, profitMarginPct: 36.0 } : {}),
      };
    case "get_collections_summary":
      return {
        _mode: "SYNTHETIC_DEMO",
        timeframe: "This Week (Demonstration Data)",
        totalCollections: 3200.0,
        salesCashCollected: 2400.0,
        debtPaymentsCollected: 800.0,
        totalDeposited: 2500.0,
        awaitingDeposit: 700.0,
      };
    case "get_low_stock_products":
      return {
        _mode: "SYNTHETIC_DEMO",
        lowStockCount: 2,
        outOfStockCount: 1,
        lowStockItems: [
          { name: "Oud Royale 100ml", currentStock: 2, threshold: 3, sellingPrice: 650.0 },
          { name: "Amber Silk 50ml", currentStock: 1, threshold: 3, sellingPrice: 420.0 },
        ],
        outOfStockItems: [
          { name: "Vanilla Santal 100ml", currentStock: 0, sellingPrice: 580.0 },
        ],
      };
    case "get_customer_balances":
      return {
        _mode: "SYNTHETIC_DEMO",
        debtorCount: 3,
        totalOutstandingDebt: 1850.0,
        debtors: [
          { customerName: "Customer A", outstandingBalance: 850.0, totalOrders: 4 },
          { customerName: "Customer B", outstandingBalance: 600.0, totalOrders: 2 },
          { customerName: "Customer C", outstandingBalance: 400.0, totalOrders: 1 },
        ],
      };
    case "get_product_performance":
      return {
        _mode: "SYNTHETIC_DEMO",
        totalProducts: 15,
        totalUnitsSold: 84,
        topSellingByRevenue: [
          { name: "Oud Royale 100ml", unitsSold: 24, revenue: 15600.0 },
          { name: "Amber Silk 50ml", unitsSold: 18, revenue: 7560.0 },
        ],
      };
    case "get_customer_feedback_summary":
      return {
        _mode: "SYNTHETIC_DEMO",
        totalFeedbackCount: 18,
        averageRating: 4.6,
        topCompliment: "Longevity (lasts over 12 hours)",
        topIssue: "Packaging atomizers on 50ml bottles",
      };
    default:
      return {
        _mode: "SYNTHETIC_DEMO",
        message: "Demonstration business data mode active. Live records are restricted pending owner data transmission consent.",
      };
  }
}

// ----------------------------------------------------------------------
// 4. SERVER-SIDE TOOL EXECUTORS (SECURE AUTHORITATIVE RBAC WRAPPER)
// ----------------------------------------------------------------------
export async function executeAITool(
  toolName: string,
  args: Record<string, any>,
  businessId: string,
  authUser?: AuthUserContext
): Promise<AIToolResult> {
  try {
    if (!authUser) {
      return {
        toolName,
        success: false,
        error: "Unauthorized: Active authenticated session context is required to execute business queries.",
      };
    }

    const isOwner = authUser.role === "OWNER";
    const isWorker = authUser.role === "WORKER";

    // 1. RBAC Guard: Strictly OWNER-only tools
    const OWNER_ONLY_TOOLS = [
      "get_expense_summary",
      "get_batch_summary",
      "get_business_summary",
      "get_dashboard_summary",
      "get_collections_summary",
    ];

    if (OWNER_ONLY_TOOLS.includes(toolName) && !isOwner) {
      return {
        toolName,
        success: false,
        error: "Access Denied: This financial summary requires business owner privileges. Workers are not authorized to view operational expenses, profit margins, batch consignments, or business health summaries.",
      };
    }

    // 2. Privacy Guard: If owner has not approved real-data transmission to external AI
    const realDataAllowed = isRealDataTransmissionAllowed();
    if (!realDataAllowed) {
      const demoData = getSyntheticDemoData(toolName, isOwner);
      return {
        toolName,
        success: true,
        data: demoData,
        sourceContext: `[Privacy Guard Active: Live database transmission to Google Gemini Free Tier is disabled pending owner approval. Displaying synthetic data fixture.]`,
        requiresOwnerApproval: true,
      };
    }

    // 3. Authorized execution of live authoritative application services
    switch (toolName) {
      case "get_sales_summary": {
        const filter = resolveFilterDates(args.timeframe, args.startDate, args.endDate);
        if (args.paymentStatus) filter.paymentStatus = args.paymentStatus;

        // Workers can ONLY view their own sales!
        if (isWorker) {
          filter.creatorId = authUser.id;
        }

        const report = await getSalesReport(businessId, filter);
        const tfLabel = args.timeframe || "Selected Period";

        const baseSummary: Record<string, any> = {
          timeframe: tfLabel,
          revenue: report.summary.totalSalesRevenue,
          amountCollected: report.summary.totalAmountCollected,
          outstanding: report.summary.totalOutstanding,
          transactions: report.summary.totalTransactions,
          itemsSold: report.summary.totalItemsSold,
        };

        // Redact profit and margins from workers
        if (isOwner) {
          baseSummary.grossProfit = report.summary.totalGrossProfit;
          baseSummary.netProfit = report.summary.netProfit;
          baseSummary.averageOrderValue = report.summary.averageOrderValue;
          baseSummary.profitMarginPct = report.summary.profitMargin;
        }

        return {
          toolName,
          success: true,
          data: baseSummary,
          sourceContext: isWorker
            ? `Based on ${report.summary.totalTransactions} personal sales records for ${tfLabel}`
            : `Based on ${report.summary.totalTransactions} company sales records for ${tfLabel}`,
        };
      }

      case "get_sales_list": {
        const filter = resolveFilterDates(args.timeframe, args.startDate, args.endDate);
        if (args.paymentStatus) filter.paymentStatus = args.paymentStatus;

        if (isWorker) {
          filter.creatorId = authUser.id;
        }

        const report = await getSalesReport(businessId, filter);
        const limit = Math.min(Math.max(parseInt(args.limit || "10", 10), 1), 20);

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
            productName: item.product?.name || "Product",
            quantity: item.quantity,
            unitPrice: item.unitPrice.toNumber(),
            // Exclude unitCost and item profit for workers
            ...(isOwner ? { unitCost: item.unitCost.toNumber(), profit: item.profit.toNumber() } : {}),
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
          sourceContext: `Retrieved ${sales.length} verified sales transactions`,
        };
      }

      case "get_collections_summary": {
        const filter = resolveFilterDates(args.timeframe, args.startDate, args.endDate);
        const collections = await getWeeklyCollectionsReport(businessId, {
          quickRange: filter.quickRange,
          startDate: filter.startDate,
          endDate: filter.endDate,
        });

        return {
          toolName,
          success: true,
          data: {
            timeframe: args.timeframe || "Selected Range",
            totalCollections: collections.metrics.totalCollected,
            salesCashCollected: collections.paymentMethodBreakdown.cash,
            totalDeposited: collections.metrics.totalDeposited,
            awaitingDeposit: collections.metrics.awaitingDeposit,
            breakdownCount: collections.dailyBreakdown.length,
          },
          sourceContext: `Authoritative collections calculation from sales cash and debt settlements`,
        };
      }

      case "get_customer_balances": {
        const customers = await getCustomers(businessId, args.search);
        const debtors = customers
          .filter((c) => c.totalOutstandingDebt > 0)
          .map((c) => ({
            customerId: c.id,
            name: c.name,
            // PII minimization: Phone numbers redacted for external AI safety
            phone: c.phone ? `${c.phone.slice(0, 3)}****${c.phone.slice(-3)}` : "None",
            outstandingBalance: c.totalOutstandingDebt,
            totalOrders: c.totalOrders,
            totalSpend: c.totalSpend,
            lastPurchaseDate: c.lastPurchaseDate ? new Date(c.lastPurchaseDate).toISOString().split("T")[0] : "N/A",
          }));

        const totalDebt = debtors.reduce((sum, d) => sum + d.outstandingBalance, 0);

        return {
          toolName,
          success: true,
          data: {
            debtorCount: debtors.length,
            totalOutstandingDebt: Math.round(totalDebt * 100) / 100,
            debtors: debtors.slice(0, 15),
          },
          sourceContext: `Found ${debtors.length} customers with outstanding balances totaling GH₵${totalDebt.toFixed(2)}`,
        };
      }

      case "get_customer_summary": {
        const query = (args.customerName || args.customerNameOrId || "").trim();
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
            phone: match.phone ? `${match.phone.slice(0, 3)}****${match.phone.slice(-3)}` : "None",
            totalOrders: match.totalOrders,
            totalSpend: match.totalSpend,
            outstandingBalance: match.totalOutstandingDebt,
            lastPurchaseDate: match.lastPurchaseDate ? match.lastPurchaseDate.toISOString().split("T")[0] : null,
            ...(isOwner ? { totalProfitGenerated: match.totalProfit } : {}),
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

        const topProducts = productReport.topSellingProducts.slice(0, 5).map((p) => ({
          name: p.name,
          sku: p.sku,
          unitsSold: p.unitsSold,
          revenue: p.revenue,
          currentStock: p.currentStock,
          ...(isOwner ? { profit: p.profit, marginPct: p.margin } : {}),
        }));

        return {
          toolName,
          success: true,
          data: {
            totalProducts: productReport.totalProductsCount,
            totalStockUnits: productReport.totalStockCount,
            totalUnitsSold: productReport.totalUnitsSold,
            topSellingByRevenue: topProducts,
            ...(isOwner
              ? {
                  totalInventoryValue: productReport.totalInventoryValue,
                  mostProfitable: productReport.mostProfitableProducts.slice(0, 5).map((p) => ({
                    name: p.name,
                    profit: p.profit,
                    marginPct: p.margin,
                    revenue: p.revenue,
                  })),
                }
              : {}),
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

      case "get_customer_feedback_summary": {
        const filter = resolveFilterDates(args.timeframe);

        if (isOwner) {
          const insights = await getProductInsightsService(
            businessId,
            { id: authUser.id, role: authUser.role },
            { startDate: filter.startDate as string, endDate: filter.endDate as string }
          );

          return {
            toolName,
            success: true,
            data: {
              totalFeedbackCount: insights.totalFeedbackCount,
              averageRating: insights.averageRating,
              positiveCount: insights.positiveCount,
              concernCount: insights.concernCount,
              topCategories: insights.topCategories.slice(0, 3),
            },
            sourceContext: `Customer feedback insights from ${insights.totalFeedbackCount} verified responses`,
          };
        } else {
          // Worker role: scope strictly to feedback recorded by this worker
          const result = await getFeedbackList(businessId, {
            userId: authUser.id,
            userRole: authUser.role,
            startDate: filter.startDate,
            endDate: filter.endDate,
            category: args.category as any,
          });

          return {
            toolName,
            success: true,
            data: {
              totalFeedbackRecorded: result.total,
              records: result.feedbacks.slice(0, 5).map((f: any) => ({
                productName: f.productName || "Product",
                category: f.category,
                rating: f.rating,
                status: f.status,
                comments: f.comments,
                date: f.feedbackDate ? new Date(f.feedbackDate).toISOString().split("T")[0] : null,
              })),
            },
            sourceContext: `Summary of feedback personally recorded by staff member`,
          };
        }
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
          sourceContext: `Operational expenses GH₵${expReport.totalExpenses.toFixed(2)} across ${expReport.expenseCount} records`,
        };
      }

      case "get_batch_summary": {
        const batchReport = await getBatchReport(businessId);
        let batches = batchReport.batches;

        if (args.batchRef && args.batchRef.trim() !== "") {
          const ref = args.batchRef.trim().toLowerCase();
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
          sourceContext: `Analyzed ${batches.length} consignment stock batches`,
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
          sourceContext: `Avencia Executive Business Overview`,
        };
      }

      default:
        return {
          toolName,
          success: false,
          error: `Unknown AI tool '${toolName}'. Tool is not permitted.`,
        };
    }
  } catch (error: any) {
    console.error(`AI Tool Execution Error [${toolName}]:`, error);
    return {
      toolName,
      success: false,
      error: error.message || `Failed executing tool ${toolName}`,
    };
  }
}
