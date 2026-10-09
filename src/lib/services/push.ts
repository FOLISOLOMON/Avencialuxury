import webpush from "web-push";
import { prisma, DEFAULT_BUSINESS_ID, ensureDefaultBusiness } from "@/lib/db/prisma";

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: {
    url?: string;
    saleId?: string;
    customerId?: string;
    notificationType?: string;
    timestamp?: string;
    [key: string]: any;
  };
}

export interface ClientSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceName?: string;
}

// Lazy configure VAPID details to ensure environment variables are loaded
let vapidConfigured = false;
function configureVapid() {
  if (vapidConfigured) return;

  const subject = process.env.VAPID_SUBJECT || "mailto:solomonfoli19@gmail.com";
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }
}

export function getPublicVapidKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
}

/**
 * Register or reactivate a device push subscription
 */
export async function registerPushSubscription(params: {
  businessId?: string;
  userId?: string;
  subscription: ClientSubscriptionInput;
}) {
  const businessId = params.businessId || DEFAULT_BUSINESS_ID;
  await ensureDefaultBusiness(businessId);

  const { endpoint, keys, userAgent, deviceName } = params.subscription;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error("Invalid push subscription data: missing endpoint or cryptographic keys");
  }

  const result = await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || null,
      deviceName: deviceName || null,
      isActive: true,
      businessId,
      userId: params.userId || null,
      updatedAt: new Date(),
    },
    create: {
      businessId,
      userId: params.userId || null,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || null,
      deviceName: deviceName || null,
      isActive: true,
    },
  });

  return {
    id: result.id,
    deviceName: result.deviceName,
    createdAt: result.createdAt,
    isActive: result.isActive,
  };
}

/**
 * Remove or deactivate a device push subscription
 */
export async function unregisterPushSubscription(endpoint: string, businessId = DEFAULT_BUSINESS_ID) {
  if (!endpoint) {
    throw new Error("Push subscription endpoint is required for unregistration");
  }

  const updated = await prisma.pushSubscription.updateMany({
    where: { endpoint, businessId },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });

  return updated.count > 0;
}

/**
 * List registered devices for a business (keys masked for security)
 */
export async function getDeviceSubscriptions(businessId = DEFAULT_BUSINESS_ID) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { businessId, isActive: true },
    select: {
      id: true,
      deviceName: true,
      userAgent: true,
      createdAt: true,
      updatedAt: true,
      endpoint: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return subscriptions.map((sub) => ({
    id: sub.id,
    deviceName: sub.deviceName || "Web Device",
    browser: parseBrowserFromUA(sub.userAgent),
    subscribedAt: sub.createdAt,
    lastActiveAt: sub.updatedAt,
    endpointSnippet: sub.endpoint.slice(-12),
  }));
}

/**
 * Helper to parse a human-readable browser & OS from User-Agent
 */
function parseBrowserFromUA(ua?: string | null): string {
  if (!ua) return "Unknown Browser";
  if (ua.includes("iPhone") || ua.includes("iPad")) return "iOS Safari PWA";
  if (ua.includes("Android")) return "Android Chrome";
  if (ua.includes("Edg/")) return "Microsoft Edge";
  if (ua.includes("Chrome")) return "Google Chrome";
  if (ua.includes("Firefox")) return "Mozilla Firefox";
  if (ua.includes("Safari")) return "Apple Safari";
  return "Web Browser";
}

export interface SendPushOptions {
  businessId?: string;
  notificationType: string;
  title: string;
  body: string;
  url?: string;
  entityType?: string;
  entityId?: string;
  customerId?: string;
  saleId?: string;
  dedupeKey: string;
  scheduledDate?: Date;
  extraData?: Record<string, any>;
}

/**
 * Core push dispatch engine.
 * Dispatches to all active registered devices for a business,
 * handles stale subscriptions (410/404), and persists the delivery log.
 */
export async function sendPushNotification(options: SendPushOptions) {
  configureVapid();

  const businessId = options.businessId || DEFAULT_BUSINESS_ID;
  const {
    notificationType,
    title,
    body,
    url = "/customers",
    entityType,
    entityId,
    customerId,
    saleId,
    dedupeKey,
    scheduledDate,
    extraData = {},
  } = options;

  // 1. Idempotency Check: if this exact notification has already been recorded and sent, skip
  const existingLog = await prisma.pushDeliveryLog.findUnique({
    where: { dedupeKey },
  });

  if (existingLog && existingLog.status === "SENT") {
    return {
      status: "SKIPPED",
      reason: "ALREADY_SENT",
      dedupeKey,
      logId: existingLog.id,
    };
  }

  // 2. Fetch active subscriptions for business
  const subscriptions = await prisma.pushSubscription.findMany({
    where: {
      businessId,
      isActive: true,
    },
  });

  if (subscriptions.length === 0) {
    // Record log indicating no active devices are currently subscribed
    const log = await prisma.pushDeliveryLog.upsert({
      where: { dedupeKey },
      update: {
        status: "NO_SUBSCRIBERS",
        error: "No active device push subscriptions registered",
      },
      create: {
        businessId,
        notificationType,
        entityType,
        entityId,
        customerId,
        saleId,
        scheduledDate: scheduledDate || new Date(),
        dedupeKey,
        title,
        body,
        status: "NO_SUBSCRIBERS",
        recipientCount: 0,
        error: "No active device push subscriptions registered",
      },
    });

    return {
      status: "NO_SUBSCRIBERS",
      dedupeKey,
      logId: log.id,
    };
  }

  // 3. Assemble push notification payload
  const pushPayload: PushNotificationPayload = {
    title,
    body,
    icon: "/logo/Avencia gold icon logo.png",
    badge: "/icon.png",
    url,
    tag: dedupeKey,
    data: {
      url,
      saleId,
      customerId,
      notificationType,
      timestamp: new Date().toISOString(),
      ...extraData,
    },
  };

  const stringifiedPayload = JSON.stringify(pushPayload);

  let successCount = 0;
  let failureCount = 0;
  const expiredEndpoints: string[] = [];
  const errors: string[] = [];

  // 4. Dispatch to all registered devices in parallel
  const sendPromises = subscriptions.map(async (sub) => {
    try {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      await webpush.sendNotification(pushSub, stringifiedPayload, {
        TTL: 86400, // 24 hours time to live in push gateway
        urgency: "high",
      });

      successCount++;
    } catch (err: any) {
      failureCount++;
      const statusCode = err.statusCode || err.status;

      // 410 Gone or 404 Not Found means the subscription expired or was revoked by the user
      if (statusCode === 410 || statusCode === 404) {
        expiredEndpoints.push(sub.endpoint);
      } else {
        errors.push(`Sub ${sub.id}: ${err.message || "Push service error"}`);
      }
    }
  });

  await Promise.all(sendPromises);

  // 5. Clean up expired endpoints immediately
  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { endpoint: { in: expiredEndpoints } },
      data: { isActive: false, updatedAt: new Date() },
    });
  }

  // 6. Record or update delivery log
  const deliveryStatus = successCount > 0 ? "SENT" : "FAILED";
  const errorMessage = errors.length > 0 ? errors.join("; ") : null;

  const log = await prisma.pushDeliveryLog.upsert({
    where: { dedupeKey },
    update: {
      title,
      body,
      status: deliveryStatus,
      recipientCount: successCount,
      error: errorMessage,
      sentAt: successCount > 0 ? new Date() : null,
    },
    create: {
      businessId,
      notificationType,
      entityType,
      entityId,
      customerId,
      saleId,
      scheduledDate: scheduledDate || new Date(),
      dedupeKey,
      title,
      body,
      status: deliveryStatus,
      recipientCount: successCount,
      error: errorMessage,
      sentAt: successCount > 0 ? new Date() : null,
    },
  });

  return {
    status: deliveryStatus,
    successCount,
    failureCount,
    expiredCount: expiredEndpoints.length,
    dedupeKey,
    logId: log.id,
  };
}
