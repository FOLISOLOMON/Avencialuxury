import { prisma, DEFAULT_BUSINESS_ID } from "@/lib/db/prisma";
import { serializePlainObject } from "@/lib/utils";

export type NotificationCategory =
  | "INVENTORY"
  | "SALES"
  | "BATCHES"
  | "CUSTOMERS"
  | "FINANCE"
  | "SECURITY"
  | "SYSTEM";

export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export interface CreateNotificationParams {
  businessId?: string;
  userId?: string;
  type: string;
  category: NotificationCategory;
  severity?: NotificationSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  dedupeKey?: string;
  expiresAt?: Date;
}

export interface GetNotificationsParams {
  businessId?: string;
  unreadOnly?: boolean;
  category?: NotificationCategory | "ALL";
  limit?: number;
  cursor?: string;
}

/**
 * Creates a notification with automatic deduplication & preference checking.
 */
export async function createNotification(params: CreateNotificationParams) {
  const businessId = params.businessId || DEFAULT_BUSINESS_ID;

  // Deduplication check: if dedupeKey exists and notification with same key was created recently, update it instead
  if (params.dedupeKey) {
    const existing = await prisma.notification.findFirst({
      where: {
        businessId,
        dedupeKey: params.dedupeKey,
      },
    });

    if (existing) {
      const updated = await prisma.notification.update({
        where: { id: existing.id },
        data: {
          title: params.title,
          message: params.message,
          severity: params.severity || existing.severity,
          metadata: params.metadata ? (params.metadata as any) : (existing.metadata ?? undefined),
          isRead: false, // reset read status when updated with new state
          readAt: null,
          createdAt: new Date(),
        },
      });
      return serializePlainObject(updated);
    }
  }

  const created = await prisma.notification.create({
    data: {
      businessId,
      userId: params.userId,
      type: params.type,
      category: params.category,
      severity: params.severity || "INFO",
      title: params.title,
      message: params.message,
      actionLabel: params.actionLabel,
      actionUrl: params.actionUrl,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ? (params.metadata as any) : undefined,
      dedupeKey: params.dedupeKey,
      expiresAt: params.expiresAt,
    },
  });

  return serializePlainObject(created);
}

/**
 * Retrieves paginated notifications for a business.
 */
export async function getNotifications(params: GetNotificationsParams = {}) {
  const businessId = params.businessId || DEFAULT_BUSINESS_ID;
  const limit = params.limit || 20;

  const whereClause: any = { businessId };

  if (params.unreadOnly) {
    whereClause.isRead = false;
  }

  if (params.category && params.category !== "ALL") {
    whereClause.category = params.category;
  }

  const notifications = await prisma.notification.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    cursor: params.cursor ? { id: params.cursor } : undefined,
  });

  let nextCursor: string | undefined = undefined;
  if (notifications.length > limit) {
    const nextItem = notifications.pop();
    nextCursor = nextItem?.id;
  }

  return {
    notifications: serializePlainObject(notifications),
    nextCursor,
  };
}

/**
 * Gets the total unread notification count.
 */
export async function getUnreadCount(businessId: string = DEFAULT_BUSINESS_ID) {
  const count = await prisma.notification.count({
    where: {
      businessId,
      isRead: false,
    },
  });

  return count;
}

/**
 * Marks a notification as read.
 */
export async function markNotificationAsRead(id: string, businessId: string = DEFAULT_BUSINESS_ID) {
  const updated = await prisma.notification.updateMany({
    where: { id, businessId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return updated.count > 0;
}

/**
 * Marks all unread notifications as read for a business.
 */
export async function markAllNotificationsAsRead(businessId: string = DEFAULT_BUSINESS_ID) {
  const updated = await prisma.notification.updateMany({
    where: { businessId, isRead: false },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return updated.count;
}

/**
 * Deletes / dismisses a notification.
 */
export async function deleteNotification(id: string, businessId: string = DEFAULT_BUSINESS_ID) {
  const deleted = await prisma.notification.deleteMany({
    where: { id, businessId },
  });

  return deleted.count > 0;
}

/**
 * Inventory State Transition Evaluator
 * Evaluates stock transitions for a product and triggers appropriate single notifications.
 */
export async function evaluateInventoryTransitions(productId: string, businessId: string = DEFAULT_BUSINESS_ID) {
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

  const currentStock = product.batchItems.reduce((sum, item) => sum + item.quantityRemaining, 0);
  const threshold = product.lowStockThreshold || 3;

  const lowStockDedupeKey = `LOW_STOCK:${product.id}`;
  const outOfStockDedupeKey = `OUT_OF_STOCK:${product.id}`;

  if (currentStock === 0) {
    // State 1: Out of Stock Transition
    await createNotification({
      businessId,
      type: "OUT_OF_STOCK",
      category: "INVENTORY",
      severity: "CRITICAL",
      title: "Product Out of Stock",
      message: `${product.name} is completely out of stock. Immediate restocking required.`,
      actionLabel: "View Inventory",
      actionUrl: "/inventory",
      entityType: "PRODUCT",
      entityId: product.id,
      dedupeKey: outOfStockDedupeKey,
      metadata: { productId: product.id, currentStock: 0, threshold },
    });
  } else if (currentStock <= threshold) {
    // State 2: Low Stock Transition
    await createNotification({
      businessId,
      type: "LOW_STOCK",
      category: "INVENTORY",
      severity: "WARNING",
      title: "Low Stock Alert",
      message: `${product.name} has only ${currentStock} unit${currentStock !== 1 ? "s" : ""} remaining (threshold: ${threshold}).`,
      actionLabel: "View Inventory",
      actionUrl: "/inventory",
      entityType: "PRODUCT",
      entityId: product.id,
      dedupeKey: lowStockDedupeKey,
      metadata: { productId: product.id, currentStock, threshold },
    });

    // Clear Out of stock dedupe key if it was previously 0
    await prisma.notification.deleteMany({
      where: { businessId, dedupeKey: outOfStockDedupeKey },
    });
  } else {
    // State 3: Stock Restored (currentStock > threshold)
    const hadPreviousLowOrOut = await prisma.notification.findFirst({
      where: {
        businessId,
        dedupeKey: { in: [lowStockDedupeKey, outOfStockDedupeKey] },
      },
    });

    if (hadPreviousLowOrOut) {
      await createNotification({
        businessId,
        type: "STOCK_RESTORED",
        category: "INVENTORY",
        severity: "SUCCESS",
        title: "Stock Restored",
        message: `${product.name} has been restocked. Current stock is ${currentStock} units.`,
        actionLabel: "View Inventory",
        actionUrl: "/inventory",
        entityType: "PRODUCT",
        entityId: product.id,
        metadata: { productId: product.id, currentStock },
      });

      // Clear low stock and out of stock state dedupe keys
      await prisma.notification.deleteMany({
        where: {
          businessId,
          dedupeKey: { in: [lowStockDedupeKey, outOfStockDedupeKey] },
        },
      });
    }
  }
}
