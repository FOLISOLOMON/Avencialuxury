"use client";

import { useEffect, useRef } from "react";
import { syncManager } from "@/lib/mobile/sync";

export function LiveSyncProvider() {
  const lastVersionsRef = useRef<Record<string, number>>({});
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkSyncStatus = async () => {
      if (isCheckingRef.current || !navigator.onLine) return;
      isCheckingRef.current = true;

      try {
        const res = await fetch("/api/sync/status", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!res.ok) {
          // If 401 unauthenticated, simply skip silently
          return;
        }

        const json = await res.json();
        if (json && json.success && json.versions) {
          const currentVersions = json.versions;
          const prevVersions = lastVersionsRef.current;

          // If this is the initial load, record baseline versions without triggering reloads
          if (Object.keys(prevVersions).length === 0) {
            lastVersionsRef.current = currentVersions;
            return;
          }

          const changedEntities: string[] = [];

          for (const [entity, timestamp] of Object.entries(currentVersions)) {
            if (entity === "timestamp") continue;
            const prevTime = prevVersions[entity] || 0;
            const newTime = Number(timestamp) || 0;

            if (newTime > prevTime) {
              changedEntities.push(entity);
              // Dispatch individual entity event
              window.dispatchEvent(
                new CustomEvent(`avencia:sync:${entity}`, {
                  detail: { entity, timestamp: newTime },
                })
              );
            }
          }

          if (changedEntities.length > 0) {
            // Dispatch general sync event
            window.dispatchEvent(
              new CustomEvent("avencia:sync", {
                detail: { changedEntities, versions: currentVersions },
              })
            );

            // If products or inventory changed, refresh mobile offline cache in background
            if (
              changedEntities.includes("products") ||
              changedEntities.includes("inventory") ||
              changedEntities.includes("batches")
            ) {
              syncManager.refreshCacheFromServer().catch(() => {});
            }

            // Update tracked baseline
            lastVersionsRef.current = currentVersions;
          }
        }
      } catch (err) {
        // Network fluctuation — suppress error to avoid console noise
      } finally {
        isCheckingRef.current = false;
      }
    };

    // 1. Initial check after 500ms
    const initialTimer = setTimeout(checkSyncStatus, 500);

    // 2. High-frequency 2.5-second live heartbeat
    const intervalTimer = setInterval(checkSyncStatus, 2500);

    // 3. Instant sync check on tab focus or visibility change (e.g. phone unlocked)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        checkSyncStatus();
      }
    };

    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("online", checkSyncStatus);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("online", checkSyncStatus);
    };
  }, []);

  return null;
}

export default LiveSyncProvider;
