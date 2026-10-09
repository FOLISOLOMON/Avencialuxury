"use client";

import { useState, useEffect, useCallback } from "react";

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported";

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function detectDeviceName(): string {
  if (typeof window === "undefined") return "Web Device";
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "Apple iPhone (PWA)";
  if (/iPad/i.test(ua)) return "Apple iPad (PWA)";
  if (/Android/i.test(ua)) return "Android Phone";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Macintosh/i.test(ua)) return "Apple Mac";
  if (/Linux/i.test(ua)) return "Linux Workstation";
  return "Web Browser";
}

export function useWebPush() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<PushPermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize and check status
  const checkSubscription = useCallback(async () => {
    if (typeof window === "undefined") return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      setIsSupported(false);
      setPermission("unsupported");
      setLoading(false);
      return;
    }

    setIsSupported(true);
    setPermission(Notification.permission as PushPermissionState);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch (err: any) {
      console.warn("Push subscription check error:", err);
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Ensure service worker is registered
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => checkSubscription())
        .catch((err) => {
          console.warn("Service worker register error in useWebPush:", err);
          checkSubscription();
        });
    } else {
      checkSubscription();
    }
  }, [checkSubscription]);

  // Subscribe current device
  const subscribe = async (): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      if (!isSupported) {
        throw new Error("Push notifications are not supported on this browser or platform.");
      }

      // 1. Request Notification permission
      const result = await Notification.requestPermission();
      setPermission(result as PushPermissionState);

      if (result !== "granted") {
        if (result === "denied") {
          throw new Error("Notification permission was denied. Please allow notifications in your browser or phone site settings.");
        }
        setLoading(false);
        return false;
      }

      // 2. Fetch server VAPID public key
      const keyRes = await fetch("/api/push/vapid-public-key");
      const keyJson = await keyRes.json();

      if (!keyJson.success || !keyJson.publicKey) {
        throw new Error(keyJson.error || "Failed to retrieve VAPID public key from server");
      }

      const applicationServerKey = urlBase64ToUint8Array(keyJson.publicKey);

      // 3. Register push subscription with the browser push service
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any,
        });
      }

      // 4. Save to backend database
      const deviceName = detectDeviceName();
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          deviceName,
        }),
      });

      const saveJson = await saveRes.json();
      if (!saveJson.success) {
        throw new Error(saveJson.error || "Failed to save device subscription on server");
      }

      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      console.error("Failed to subscribe device to push notifications:", err);
      setError(err.message || "Failed to enable notifications");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Unsubscribe current device
  const unsubscribe = async (): Promise<boolean> => {
    setError(null);
    setLoading(true);

    try {
      if (!("serviceWorker" in navigator)) return false;

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();

        // Inform backend
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }

      setIsSubscribed(false);
      return true;
    } catch (err: any) {
      console.error("Failed to unsubscribe device:", err);
      setError(err.message || "Failed to remove notification subscription");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Send a test notification
  const sendTestNotification = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        return {
          success: true,
          message: json.message || "Test notification dispatched to your device!",
        };
      } else {
        return {
          success: false,
          message: json.error || "Failed to send test notification.",
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "Network error sending test notification",
      };
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
    refreshStatus: checkSubscription,
  };
}
