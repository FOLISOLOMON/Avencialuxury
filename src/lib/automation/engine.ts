import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { BusinessEvent, BusinessEventType } from "./events";
import { AutomationAction, executeAction } from "./actions";
import { randomUUID } from "crypto";

export interface ProcessResult {
  status: "COMPLETED" | "FAILED" | "SKIPPED";
  eventId: string;
  dedupeKey?: string;
  actionsExecuted?: number;
  error?: string;
}

export class AutomationEngine {
  private static instance: AutomationEngine;

  private constructor() {}

  /**
   * Singleton instance accessor.
   */
  public static getInstance(): AutomationEngine {
    if (!AutomationEngine.instance) {
      AutomationEngine.instance = new AutomationEngine();
    }
    return AutomationEngine.instance;
  }

  /**
   * Non-blocking async event emitter.
   */
  public emit(event: BusinessEvent): Promise<ProcessResult> {
    const eventId = event.id || randomUUID();
    const eventWithId: BusinessEvent = {
      ...event,
      id: eventId,
      timestamp: event.timestamp || new Date(),
    };

    // Non-blocking processing microtask
    return this.process(eventWithId).catch((err) => {
      console.error(`[AutomationEngine] Error during event emit (${event.eventType}):`, err);
      return {
        status: "FAILED",
        eventId,
        error: err instanceof Error ? err.message : String(err),
      };
    });
  }

  /**
   * Process a business event: idempotency check, rule & state machine evaluation, action execution & logging.
   */
  public async process(event: BusinessEvent): Promise<ProcessResult> {
    const businessId = event.businessId || DEFAULT_BUSINESS_ID;
    const eventId = event.id || randomUUID();

    // 1. Idempotency Check on Event DedupeKey
    if (event.dedupeKey) {
      const existing = await prisma.automationExecution.findFirst({
        where: {
          businessId,
          dedupeKey: event.dedupeKey,
          status: "COMPLETED",
        },
      });

      if (existing) {
        await prisma.automationExecution.create({
          data: {
            businessId,
            eventType: String(event.eventType),
            eventId,
            actionType: "NONE",
            status: "SKIPPED",
            dedupeKey: event.dedupeKey,
            metadata: {
              reason: "Event dedupeKey already executed successfully",
              existingExecutionId: existing.id,
            },
          },
        });

        return {
          status: "SKIPPED",
          eventId,
          dedupeKey: event.dedupeKey,
          actionsExecuted: 0,
        };
      }
    }

    // 2. Fetch Business Notification Settings & Preferences
    const settings = await prisma.notificationSetting.findUnique({
      where: { businessId },
    });

    const pref = {
      lowStockEnabled: settings?.lowStockEnabled ?? true,
      outOfStockEnabled: settings?.outOfStockEnabled ?? true,
      stockRestoredEnabled: settings?.stockRestoredEnabled ?? true,
      saleCompletedEnabled: settings?.saleCompletedEnabled ?? true,
      partialPaymentEnabled: settings?.partialPaymentEnabled ?? true,
      unpaidSaleEnabled: settings?.unpaidSaleEnabled ?? true,
      paymentReceivedEnabled: settings?.paymentReceivedEnabled ?? true,
      batchCreatedEnabled: settings?.batchCreatedEnabled ?? true,
      batchCompletedEnabled: settings?.batchCompletedEnabled ?? true,
      expenseEnabled: settings?.expenseEnabled ?? true,
      largeExpenseThreshold: settings?.largeExpenseThreshold ? Number(settings.largeExpenseThreshold) : 1000,
      batchNearCompletionThreshold: settings?.batchNearCompletionThreshold ? Number(settings.batchNearCompletionThreshold) : 10,
      dormantCustomerDays: settings?.dormantCustomerDays ?? 30,
    };

    // 3. Evaluate State Machines & Rules to Determine Actions
    const actions: AutomationAction[] = [];

    try {
      await this.evaluateStateMachines(event, pref, actions);
    } catch (err: any) {
      console.error(`[AutomationEngine] Rule evaluation error for event ${event.eventType}:`, err);
    }

    if (actions.length === 0) {
      // Log skipped execution if no rules matched
      await prisma.automationExecution.create({
        data: {
          businessId,
          eventType: String(event.eventType),
          eventId,
          actionType: "NO_ACTION",
          status: "SKIPPED",
          dedupeKey: event.dedupeKey,
          metadata: event.metadata ? (event.metadata as any) : undefined,
        },
      });

      return {
        status: "SKIPPED",
        eventId,
        dedupeKey: event.dedupeKey,
        actionsExecuted: 0,
      };
    }

    // 4. Execute Actions & Log Execution Status
    let executedCount = 0;
    let overallStatus: "COMPLETED" | "FAILED" = "COMPLETED";
    let lastError: string | undefined = undefined;

    for (const action of actions) {
      const actionDedupeKey = action.payload?.dedupeKey || event.dedupeKey || undefined;

      // Idempotency check for individual action dedupeKey
      if (actionDedupeKey) {
        const existingActionExecution = await prisma.automationExecution.findFirst({
          where: {
            businessId,
            dedupeKey: actionDedupeKey,
            status: "COMPLETED",
          },
        });

        if (existingActionExecution) {
          await prisma.automationExecution.create({
            data: {
              businessId,
              eventType: String(event.eventType),
              eventId,
              actionType: action.type,
              status: "SKIPPED",
              dedupeKey: actionDedupeKey,
              metadata: {
                reason: "Action dedupeKey already executed successfully",
              },
            },
          });
          continue;
        }
      }

      const result = await executeAction(action);

      if (!result.success) {
        overallStatus = "FAILED";
        lastError = result.error;
      } else {
        executedCount++;
      }

      await prisma.automationExecution.create({
        data: {
          businessId,
          eventType: String(event.eventType),
          eventId,
          actionType: action.type,
          status: result.success ? "COMPLETED" : "FAILED",
          dedupeKey: actionDedupeKey,
          error: result.error || null,
          metadata: (result.result as any) || action.payload || undefined,
          executedAt: new Date(),
        },
      });
    }

    return {
      status: overallStatus,
      eventId,
      dedupeKey: event.dedupeKey,
      actionsExecuted: executedCount,
      error: lastError,
    };
  }

  /**
   * State-Machine Evaluator
   */
  private async evaluateStateMachines(
    event: BusinessEvent,
    pref: any,
    actions: AutomationAction[]
  ): Promise<void> {
    const businessId = event.businessId || DEFAULT_BUSINESS_ID;

    // --- State Machine 1: Stock Transitions ---
    if (
      event.eventType === BusinessEventType.STOCK_CHANGED ||
      event.eventType === BusinessEventType.STOCK_LOW ||
      event.eventType === BusinessEventType.STOCK_OUT ||
      event.eventType === BusinessEventType.STOCK_RESTORED ||
      event.eventType === BusinessEventType.STOCK_ADJUSTED ||
      event.eventType === BusinessEventType.PRODUCT_UPDATED ||
      event.eventType === BusinessEventType.SALE_COMPLETED
    ) {
      const productId = event.entityId || event.metadata?.productId;
      if (productId) {
        await this.evaluateStockTransition(businessId, productId, event, pref, actions);
      }
    }

    // --- State Machine 2: Batch Near Completion ---
    if (
      event.eventType === BusinessEventType.BATCH_UPDATED ||
      event.eventType === BusinessEventType.BATCH_CREATED ||
      event.eventType === BusinessEventType.BATCH_NEAR_COMPLETION ||
      event.eventType === BusinessEventType.BATCH_COMPLETED ||
      event.eventType === BusinessEventType.STOCK_CHANGED ||
      event.eventType === BusinessEventType.SALE_COMPLETED
    ) {
      const batchId =
        event.entityType === "BATCH"
          ? event.entityId
          : event.metadata?.batchId || event.entityId;

      if (batchId) {
        await this.evaluateBatchTransition(businessId, batchId, event, pref, actions);
      }
    }

    // --- State Machine 3: Large Expense Detection ---
    if (
      event.eventType === BusinessEventType.EXPENSE_CREATED ||
      event.eventType === BusinessEventType.LARGE_EXPENSE_DETECTED
    ) {
      await this.evaluateExpenseTransition(businessId, event, pref, actions);
    }

    // --- State Machine 4: Customer Debt & Payment Transitions ---
    if (
      event.eventType === BusinessEventType.SALE_CREATED ||
      event.eventType === BusinessEventType.SALE_COMPLETED ||
      event.eventType === BusinessEventType.SALE_PARTIAL_PAYMENT ||
      event.eventType === BusinessEventType.SALE_UNPAID ||
      event.eventType === BusinessEventType.CUSTOMER_DEBT_CREATED ||
      event.eventType === BusinessEventType.CUSTOMER_PAYMENT_RECEIVED ||
      event.eventType === BusinessEventType.CUSTOMER_DEBT_OVERDUE ||
      event.eventType === BusinessEventType.CUSTOMER_DORMANT ||
      event.eventType === BusinessEventType.PAYMENT_RECEIVED
    ) {
      await this.evaluateCustomerDebtTransition(businessId, event, pref, actions);
    }

    // --- Generic System & Profit Event Handlers ---
    if (event.eventType === BusinessEventType.PROFIT_ALLOCATED && pref.profitAllocatedEnabled) {
      actions.push({
        businessId,
        type: "CREATE_NOTIFICATION",
        payload: {
          type: "PROFIT_ALLOCATED",
          category: "FINANCE",
          severity: "SUCCESS",
          title: "Profit Allocated",
          message: event.metadata?.message || `Profit allocation of GHS ${event.metadata?.amount || 0} recorded.`,
          actionLabel: "View Allocations",
          actionUrl: "/finance",
          entityType: event.entityType,
          entityId: event.entityId,
          metadata: event.metadata,
          dedupeKey: event.dedupeKey,
        },
      });
    }

    if (event.eventType === BusinessEventType.SYSTEM_ERROR || event.eventType === BusinessEventType.SYSTEM_WARNING) {
      actions.push({
        businessId,
        type: "CREATE_NOTIFICATION",
        payload: {
          type: event.eventType,
          category: "SYSTEM",
          severity: event.eventType === BusinessEventType.SYSTEM_ERROR ? "CRITICAL" : "WARNING",
          title: event.metadata?.title || (event.eventType === BusinessEventType.SYSTEM_ERROR ? "System Error Alert" : "System Warning"),
          message: event.metadata?.message || "An issue was detected in the system.",
          actionLabel: "View System Logs",
          actionUrl: "/settings",
          metadata: event.metadata,
          dedupeKey: event.dedupeKey,
        },
      });
    }
  }

  /**
   * Evaluates Stock Transitions:
   * (e.g., 5 -> 3 low stock, 1 -> 0 out of stock, 0 -> 5 stock restored)
   */
  private async evaluateStockTransition(
    businessId: string,
    productId: string,
    event: BusinessEvent,
    pref: any,
    actions: AutomationAction[]
  ): Promise<void> {
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
      include: {
        batchItems: {
          where: {
            batch: { status: "ACTIVE" },
          },
        },
      },
    });

    if (!product) return;

    const currentStock = product.batchItems.reduce(
      (sum, item) => sum + item.quantityRemaining,
      0
    );
    const threshold = product.lowStockThreshold || 3;
    const previousStock =
      typeof event.metadata?.previousStock === "number"
        ? event.metadata.previousStock
        : null;

    const lowStockDedupeKey = `LOW_STOCK:${product.id}`;
    const outOfStockDedupeKey = `OUT_OF_STOCK:${product.id}`;

    if (currentStock === 0) {
      // Transition: Out of stock (1 -> 0)
      if (pref.outOfStockEnabled) {
        actions.push({
          businessId,
          type: "CREATE_NOTIFICATION",
          payload: {
            type: "STOCK_OUT",
            category: "INVENTORY",
            severity: "CRITICAL",
            title: "Product Out of Stock",
            message: `${product.name} is completely out of stock. Immediate restocking required.`,
            actionLabel: "Restock Inventory",
            actionUrl: `/inventory?product=${product.id}`,
            entityType: "PRODUCT",
            entityId: product.id,
            dedupeKey: outOfStockDedupeKey,
            metadata: { productId: product.id, currentStock: 0, threshold },
          },
        });
      }
    } else if (currentStock <= threshold) {
      // Transition: Low stock (5 -> 3)
      if (pref.lowStockEnabled) {
        actions.push({
          businessId,
          type: "CREATE_NOTIFICATION",
          payload: {
            type: "STOCK_LOW",
            category: "INVENTORY",
            severity: "WARNING",
            title: "Low Stock Warning",
            message: `${product.name} has only ${currentStock} unit${currentStock !== 1 ? "s" : ""} remaining (threshold: ${threshold}).`,
            actionLabel: "View Inventory",
            actionUrl: `/inventory?product=${product.id}`,
            entityType: "PRODUCT",
            entityId: product.id,
            dedupeKey: lowStockDedupeKey,
            metadata: { productId: product.id, currentStock, threshold },
          },
        });
      }
    } else {
      // Transition: Stock restored (0 -> 5 or 3 -> 5)
      const isRestored =
        previousStock !== null
          ? previousStock <= threshold
          : await prisma.notification.findFirst({
              where: {
                businessId,
                dedupeKey: { in: [lowStockDedupeKey, outOfStockDedupeKey] },
              },
            });

      if (isRestored && pref.stockRestoredEnabled) {
        actions.push({
          businessId,
          type: "CREATE_NOTIFICATION",
          payload: {
            type: "STOCK_RESTORED",
            category: "INVENTORY",
            severity: "SUCCESS",
            title: "Stock Restored",
            message: `${product.name} stock restored to ${currentStock} units.`,
            actionLabel: "View Product",
            actionUrl: `/inventory?product=${product.id}`,
            entityType: "PRODUCT",
            entityId: product.id,
            metadata: { productId: product.id, currentStock, previousStock },
          },
        });

        // Clear active low/out of stock notifications for this product
        await prisma.notification.deleteMany({
          where: {
            businessId,
            dedupeKey: { in: [lowStockDedupeKey, outOfStockDedupeKey] },
          },
        });
      }
    }
  }

  /**
   * Evaluates Batch Transitions:
   * Near completion (<= 10% remaining), Batch Completed (0 remaining).
   */
  private async evaluateBatchTransition(
    businessId: string,
    batchId: string,
    event: BusinessEvent,
    pref: any,
    actions: AutomationAction[]
  ): Promise<void> {
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, businessId },
      include: { batchItems: true },
    });

    if (!batch || batch.status === "ARCHIVED") return;

    const totalPurchased = batch.batchItems.reduce((sum, item) => sum + item.quantityPurchased, 0);
    const totalRemaining = batch.batchItems.reduce((sum, item) => sum + item.quantityRemaining, 0);

    if (totalPurchased === 0) return;

    const percentageRemaining = (totalRemaining / totalPurchased) * 100;
    const threshold = pref.batchNearCompletionThreshold || 10;

    if (totalRemaining === 0) {
      // Batch Completed Transition
      if (pref.batchCompletedEnabled) {
        actions.push({
          businessId,
          type: "CREATE_NOTIFICATION",
          payload: {
            type: "BATCH_COMPLETED",
            category: "BATCHES",
            severity: "INFO",
            title: "Batch Sold Out / Completed",
            message: `Batch reference '${batch.reference}' has no remaining inventory.`,
            actionLabel: "View Batches",
            actionUrl: "/batches",
            entityType: "BATCH",
            entityId: batch.id,
            dedupeKey: `BATCH_COMPLETED:${batch.id}`,
            metadata: { batchId: batch.id, reference: batch.reference },
          },
        });
      }

      // Update batch status to COMPLETED if currently ACTIVE
      if (batch.status === "ACTIVE") {
        await prisma.batch.update({
          where: { id: batch.id },
          data: { status: "COMPLETED" },
        });
      }
    } else if (percentageRemaining <= threshold) {
      // Batch Near Completion Transition (<= 10% stock remaining)
      actions.push({
        businessId,
        type: "CREATE_NOTIFICATION",
        payload: {
          type: "BATCH_NEAR_COMPLETION",
          category: "BATCHES",
          severity: "WARNING",
          title: "Batch Near Completion",
          message: `Batch '${batch.reference}' is at ${percentageRemaining.toFixed(1)}% capacity (${totalRemaining} units remaining).`,
          actionLabel: "View Batch",
          actionUrl: `/batches?id=${batch.id}`,
          entityType: "BATCH",
          entityId: batch.id,
          dedupeKey: `BATCH_NEAR_COMPLETION:${batch.id}`,
          metadata: {
            batchId: batch.id,
            totalPurchased,
            totalRemaining,
            percentageRemaining,
          },
        },
      });
    }
  }

  /**
   * Evaluates Expense Transitions:
   * Large expense detection (>= threshold).
   */
  private async evaluateExpenseTransition(
    businessId: string,
    event: BusinessEvent,
    pref: any,
    actions: AutomationAction[]
  ): Promise<void> {
    if (!pref.expenseEnabled) return;

    let amount = typeof event.metadata?.amount === "number" ? event.metadata.amount : 0;
    let description = event.metadata?.description || "Expense";
    let category = event.metadata?.category || "OPERATIONS";
    let expenseId = event.entityId;

    if (!amount && expenseId) {
      const expense = await prisma.expense.findFirst({
        where: { id: expenseId, businessId },
      });
      if (expense) {
        amount = Number(expense.amount);
        description = expense.description;
        category = expense.category;
      }
    }

    const threshold = pref.largeExpenseThreshold || 1000;

    if (amount >= threshold) {
      actions.push({
        businessId,
        type: "CREATE_NOTIFICATION",
        payload: {
          type: "LARGE_EXPENSE_DETECTED",
          category: "FINANCE",
          severity: "WARNING",
          title: "Large Expense Detected",
          message: `A large expense of GHS ${amount.toFixed(2)} was created for '${description}'.`,
          actionLabel: "View Expenses",
          actionUrl: "/expenses",
          entityType: "EXPENSE",
          entityId: expenseId,
          dedupeKey: expenseId ? `LARGE_EXPENSE:${expenseId}` : undefined,
          metadata: { amount, threshold, category, description },
        },
      });
    }
  }

  /**
   * Evaluates Customer Debt & Payment Transitions:
   * Customer debt creation, payment received, debt overdue & dormant customers.
   */
  private async evaluateCustomerDebtTransition(
    businessId: string,
    event: BusinessEvent,
    pref: any,
    actions: AutomationAction[]
  ): Promise<void> {
    // 1. Debt Created / Partial / Unpaid Sale
    if (
      event.eventType === BusinessEventType.SALE_CREATED ||
      event.eventType === BusinessEventType.SALE_COMPLETED ||
      event.eventType === BusinessEventType.SALE_PARTIAL_PAYMENT ||
      event.eventType === BusinessEventType.SALE_UNPAID ||
      event.eventType === BusinessEventType.CUSTOMER_DEBT_CREATED
    ) {
      const saleId = event.entityId || event.metadata?.saleId;
      if (saleId) {
        const sale = await prisma.sale.findFirst({
          where: { id: saleId, businessId },
          include: { customer: true },
        });

        if (sale && Number(sale.balanceDue) > 0) {
          const balanceDue = Number(sale.balanceDue);
          const customerName = sale.customer?.name || "Customer";

          if (pref.unpaidSaleEnabled || pref.partialPaymentEnabled) {
            actions.push({
              businessId,
              type: "CREATE_NOTIFICATION",
              payload: {
                type: sale.paymentStatus === "UNPAID" ? "SALE_UNPAID" : "SALE_PARTIAL_PAYMENT",
                category: "CUSTOMERS",
                severity: "WARNING",
                title: sale.paymentStatus === "UNPAID" ? "Unpaid Sale Recorded" : "Partial Sale Payment",
                message: `${customerName} has an outstanding balance of GHS ${balanceDue.toFixed(2)}.`,
                actionLabel: "View Sale",
                actionUrl: `/sales?id=${sale.id}`,
                entityType: "SALE",
                entityId: sale.id,
                dedupeKey: `CUSTOMER_DEBT:${sale.id}`,
                metadata: {
                  saleId: sale.id,
                  customerId: sale.customerId,
                  totalAmount: Number(sale.totalAmount),
                  balanceDue,
                },
              },
            });
          }
        }
      }
    }

    // 2. Customer Debt Payment Received
    if (
      event.eventType === BusinessEventType.CUSTOMER_PAYMENT_RECEIVED ||
      event.eventType === BusinessEventType.PAYMENT_RECEIVED
    ) {
      const paymentId = event.entityId || event.metadata?.paymentId;
      const amount = typeof event.metadata?.amount === "number" ? event.metadata.amount : 0;
      const customerName = event.metadata?.customerName || "Customer";

      if (pref.paymentReceivedEnabled) {
        actions.push({
          businessId,
          type: "CREATE_NOTIFICATION",
          payload: {
            type: "CUSTOMER_PAYMENT_RECEIVED",
            category: "CUSTOMERS",
            severity: "SUCCESS",
            title: "Payment Received",
            message: `Payment of GHS ${amount > 0 ? amount.toFixed(2) : "0.00"} received from ${customerName}.`,
            actionLabel: "View Payments",
            actionUrl: "/customers",
            entityType: "DEBT_PAYMENT",
            entityId: paymentId,
            dedupeKey: paymentId ? `CUSTOMER_PAYMENT:${paymentId}` : undefined,
            metadata: event.metadata,
          },
        });
      }
    }

    // 3. Customer Debt Overdue & Dormant Reminders
    if (event.eventType === BusinessEventType.CUSTOMER_DEBT_OVERDUE) {
      const customerId = event.entityId || event.metadata?.customerId;
      const customerName = event.metadata?.customerName || "Customer";
      const totalOverdue = typeof event.metadata?.totalOverdue === "number" ? event.metadata.totalOverdue : 0;

      actions.push({
        businessId,
        type: "SEND_REMINDER",
        payload: {
          type: "CUSTOMER_DEBT_OVERDUE",
          category: "CUSTOMERS",
          severity: "CRITICAL",
          title: "Overdue Customer Debt",
          message: `${customerName} has overdue debt totaling GHS ${totalOverdue.toFixed(2)}.`,
          actionLabel: "Send Payment Reminder",
          actionUrl: `/customers?id=${customerId}`,
          entityType: "CUSTOMER",
          entityId: customerId,
          dedupeKey: `DEBT_OVERDUE:${customerId}`,
          metadata: { customerId, totalOverdue },
        },
      });
    }

    if (event.eventType === BusinessEventType.CUSTOMER_DORMANT) {
      const customerId = event.entityId || event.metadata?.customerId;
      const customerName = event.metadata?.customerName || "Customer";
      const daysInactive = event.metadata?.daysInactive || pref.dormantCustomerDays;

      actions.push({
        businessId,
        type: "SEND_REMINDER",
        payload: {
          type: "CUSTOMER_DORMANT",
          category: "CUSTOMERS",
          severity: "INFO",
          title: "Dormant Customer Follow-up",
          message: `${customerName} has not made a purchase in over ${daysInactive} days. Consider reaching out.`,
          actionLabel: "View Customer Profile",
          actionUrl: `/customers?id=${customerId}`,
          entityType: "CUSTOMER",
          entityId: customerId,
          dedupeKey: event.dedupeKey || `CUSTOMER_DORMANT:${customerId}`,
          metadata: { customerId, daysInactive },
        },
      });
    }
  }
}

export const automationEngine = AutomationEngine.getInstance();
export default automationEngine;
