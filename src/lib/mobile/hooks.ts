"use client";

import { useState, useEffect, useCallback } from "react";
import { syncManager } from "./sync";
import {
  getCachedProducts,
  getCachedCustomers,
  cacheCustomers,
  getPendingSales,
  getPendingCustomers,
} from "./db";
import { MobileProduct, MobileCustomer, PendingSale, PendingCustomer, SyncStatus } from "./types";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export function useSyncStatus() {
  const [status, setStatus] = useState<{
    state: SyncStatus;
    pendingCount: number;
    lastSyncedAt: string | null;
    message?: string;
  }>({
    state: "synced",
    pendingCount: 0,
    lastSyncedAt: null,
  });

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const triggerSync = useCallback(() => {
    return syncManager.syncNow("user_tap");
  }, []);

  return { ...status, triggerSync };
}

export function useMobileProducts() {
  const [products, setProducts] = useState<MobileProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadProducts = useCallback(async () => {
    setLoading(true);
    try {
      // 1. First get cached items from IndexedDB instantly
      const cached = await getCachedProducts();
      if (cached && cached.length > 0) {
        setProducts(cached);
        setLoading(false);
      }

      // 2. If online, fetch fresh products in background
      if (navigator.onLine) {
        await syncManager.refreshCacheFromServer();
        const fresh = await getCachedProducts();
        setProducts(fresh);
      }
    } catch (e) {
      console.warn("Failed to load mobile products:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadProducts();
  }, [reloadProducts]);

  return { products, loading, refetch: reloadProducts };
}

export function useMobileCustomers() {
  const [customers, setCustomers] = useState<MobileCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      // 1. First get cached customers for instant UI display
      const cached = await getCachedCustomers();
      if (cached && cached.length > 0) {
        setCustomers(cached);
        setLoading(false);
      }

      // 2. If online, fetch directly from server without stale cache
      if (typeof window !== "undefined" && navigator.onLine) {
        try {
          const res = await fetch("/api/customers", { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
              const mapped: MobileCustomer[] = json.data.map((c: any) => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                email: c.email,
                notes: c.notes,
                totalDebt: Number(c.totalDebt ?? c.totalOutstandingDebt ?? 0),
                totalSpent: Number(c.totalSpent ?? c.totalSpend ?? 0),
                lastPurchaseDate: c.lastPurchaseDate,
                sales: c.sales || [],
              }));
              setCustomers(mapped);
              setLoading(false);
              cacheCustomers(mapped).catch(() => {});
              return;
            }
          }
        } catch (fetchErr) {
          console.warn("Direct fetch /api/customers error:", fetchErr);
        }

        // Fallback to syncManager refresh if direct fetch failed
        await syncManager.refreshCacheFromServer();
        const fresh = await getCachedCustomers();
        if (fresh && fresh.length > 0) {
          setCustomers(fresh);
        }
      }
    } catch (e) {
      console.warn("Failed to load mobile customers:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadCustomers();
  }, [reloadCustomers]);

  return { customers, loading, refetch: reloadCustomers };
}

export function usePendingQueue() {
  const [pendingSales, setPendingSales] = useState<PendingSale[]>([]);
  const [pendingCusts, setPendingCusts] = useState<PendingCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const [sales, custs] = await Promise.all([
        getPendingSales(),
        getPendingCustomers(),
      ]);
      setPendingSales(sales);
      setPendingCusts(custs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadQueue();
    const unsubscribe = syncManager.subscribe(() => {
      reloadQueue();
    });
    return () => unsubscribe();
  }, [reloadQueue]);

  return {
    pendingSales,
    pendingCustomers: pendingCusts,
    totalPending: pendingSales.length + pendingCusts.length,
    loading,
    reloadQueue,
  };
}
