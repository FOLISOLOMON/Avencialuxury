import { createNotification, CreateNotificationParams } from "@/lib/services/notifications";

export type ActionType =
  | "CREATE_NOTIFICATION"
  | "SEND_REMINDER"
  | "UPDATE_DASHBOARD_STATE"
  | "CREATE_DAILY_SUMMARY"
  | "CREATE_WEEKLY_SUMMARY";

export interface AutomationAction {
  id?: string;
  type: ActionType | string;
  businessId: string;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ActionExecutionResult {
  success: boolean;
  actionType: string;
  result?: any;
  error?: string;
}

/**
 * Reusable handler for executing automation actions.
 */
export async function executeAction(action: AutomationAction): Promise<ActionExecutionResult> {
  try {
    switch (action.type) {
      case "CREATE_NOTIFICATION": {
        const params: CreateNotificationParams = {
          businessId: action.businessId,
          userId: action.payload.userId,
          type: action.payload.type || "AUTOMATION_NOTICE",
          category: action.payload.category || "SYSTEM",
          severity: action.payload.severity || "INFO",
          title: action.payload.title || "Notification",
          message: action.payload.message || "",
          actionLabel: action.payload.actionLabel,
          actionUrl: action.payload.actionUrl,
          entityType: action.payload.entityType,
          entityId: action.payload.entityId,
          metadata: action.payload.metadata || action.metadata,
          dedupeKey: action.payload.dedupeKey,
          expiresAt: action.payload.expiresAt,
        };
        const notification = await createNotification(params);
        return {
          success: true,
          actionType: action.type,
          result: notification,
        };
      }

      case "SEND_REMINDER": {
        const params: CreateNotificationParams = {
          businessId: action.businessId,
          userId: action.payload.userId,
          type: action.payload.type || "REMINDER",
          category: action.payload.category || "CUSTOMERS",
          severity: action.payload.severity || "WARNING",
          title: action.payload.title || "Reminder Alert",
          message: action.payload.message || "You have a pending reminder.",
          actionLabel: action.payload.actionLabel || "View Details",
          actionUrl: action.payload.actionUrl || "/customers",
          entityType: action.payload.entityType,
          entityId: action.payload.entityId,
          metadata: action.payload.metadata || action.metadata,
          dedupeKey: action.payload.dedupeKey,
        };
        const notification = await createNotification(params);
        return {
          success: true,
          actionType: action.type,
          result: notification,
        };
      }

      case "UPDATE_DASHBOARD_STATE": {
        const params: CreateNotificationParams = {
          businessId: action.businessId,
          type: "DASHBOARD_UPDATE",
          category: "SYSTEM",
          severity: "INFO",
          title: action.payload.title || "Dashboard Updated",
          message: action.payload.message || "Dashboard state refreshed.",
          metadata: {
            updatedAt: new Date().toISOString(),
            state: action.payload.state || action.payload,
          },
          dedupeKey: action.payload.dedupeKey,
        };
        const notification = await createNotification(params);
        return {
          success: true,
          actionType: action.type,
          result: { notification, state: action.payload },
        };
      }

      case "CREATE_DAILY_SUMMARY": {
        const todayStr = new Date().toISOString().slice(0, 10);
        const params: CreateNotificationParams = {
          businessId: action.businessId,
          type: "DAILY_SUMMARY",
          category: "FINANCE",
          severity: "INFO",
          title: action.payload.title || "Daily Business Summary",
          message: action.payload.message || "Daily summary report generated.",
          actionLabel: action.payload.actionLabel || "View Summary",
          actionUrl: action.payload.actionUrl || "/analytics",
          metadata: action.payload.metadata || action.payload,
          dedupeKey: action.payload.dedupeKey || `DAILY_SUMMARY_${action.businessId}_${todayStr}`,
        };
        const notification = await createNotification(params);
        return {
          success: true,
          actionType: action.type,
          result: notification,
        };
      }

      case "CREATE_WEEKLY_SUMMARY": {
        const todayStr = new Date().toISOString().slice(0, 10);
        const params: CreateNotificationParams = {
          businessId: action.businessId,
          type: "WEEKLY_SUMMARY",
          category: "FINANCE",
          severity: "INFO",
          title: action.payload.title || "Weekly Performance Summary",
          message: action.payload.message || "Weekly summary report generated.",
          actionLabel: action.payload.actionLabel || "View Report",
          actionUrl: action.payload.actionUrl || "/reports",
          metadata: action.payload.metadata || action.payload,
          dedupeKey: action.payload.dedupeKey || `WEEKLY_SUMMARY_${action.businessId}_${todayStr}`,
        };
        const notification = await createNotification(params);
        return {
          success: true,
          actionType: action.type,
          result: notification,
        };
      }

      default: {
        if (action.payload && action.payload.title && action.payload.message) {
          const notification = await createNotification({
            businessId: action.businessId,
            type: action.type,
            category: action.payload.category || "SYSTEM",
            severity: action.payload.severity || "INFO",
            title: action.payload.title,
            message: action.payload.message,
            metadata: action.payload.metadata,
          });
          return { success: true, actionType: action.type, result: notification };
        }
        return {
          success: false,
          actionType: action.type,
          error: `Unsupported action type: ${action.type}`,
        };
      }
    }
  } catch (err: any) {
    console.error(`[AutomationAction] Execution error for action type ${action.type}:`, err);
    return {
      success: false,
      actionType: action.type,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
