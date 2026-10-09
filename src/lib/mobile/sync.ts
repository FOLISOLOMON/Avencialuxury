import {
  getPendingCustomers,
  removePendingCustomer,
  getPendingSales,
  updatePendingSale,
  removePendingSale,
  getPendingDebtPayments,
  updatePendingDebtPayment,
  removePendingDebtPayment,
  cacheProducts,
  cacheCustomers,
  putCachedCustomer,
  setMeta,
  getMeta,
} from "./db";
import { SyncStatus, MobileProduct, MobileCustomer } from "./types";

type SyncListener = (status: {
  state: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  message?: string;
}) => void;

class MobileSyncManager {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();
  private lastSyncedAt: string | null = null;
  private currentState: SyncStatus = "synced";
  private syncTimer: any = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private async init() {
    this.lastSyncedAt = await getMeta<string>("lastSyncedAt");
    this.updateOnlineState();

    window.addEventListener("online", () => {
      this.updateOnlineState();
      this.syncNow("Connection restored");
    });

    window.addEventListener("offline", () => {
      this.updateOnlineState();
    });

    // Background sync heartbeat every 60 seconds if online
    this.syncTimer = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.syncNow("Periodic sync");
      }
    }, 60000);
  }

  public subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    this.notify();
    return () => this.listeners.delete(listener);
  }

  private async notify(message?: string) {
    const pendingSales = await getPendingSales();
    const pendingCusts = await getPendingCustomers();
    const pendingDebts = await getPendingDebtPayments();
    const pendingCount = pendingSales.length + pendingCusts.length + pendingDebts.length;

    let state: SyncStatus = this.currentState;
    if (!navigator.onLine) {
      state = "offline";
    } else if (this.isSyncing) {
      state = "syncing";
    } else if (pendingCount > 0) {
      state = "pending";
    } else {
      state = "synced";
    }

    this.currentState = state;

    for (const listener of this.listeners) {
      try {
        listener({
          state,
          pendingCount,
          lastSyncedAt: this.lastSyncedAt,
          message,
        });
      } catch (e) {
        console.error("Sync listener error:", e);
      }
    }
  }

  private updateOnlineState() {
    if (!navigator.onLine) {
      this.currentState = "offline";
    } else {
      this.currentState = "synced";
    }
    this.notify();
  }

  public async syncNow(triggerSource = "manual"): Promise<{ success: boolean; error?: string }> {
    if (typeof window === "undefined" || !navigator.onLine) {
      this.notify("Cannot sync while offline");
      return { success: false, error: "Offline" };
    }

    if (this.isSyncing) {
      return { success: true };
    }

    this.isSyncing = true;
    this.notify("Sync in progress...");

    try {
      // 1. Process Pending Customers first
      const pendingCustomers = await getPendingCustomers();
      const customerIdMapping: Record<string, string> = {};

      for (const pendingCust of pendingCustomers) {
        try {
          const res = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: pendingCust.name,
              phone: pendingCust.phone || undefined,
              email: pendingCust.email || undefined,
              notes: pendingCust.notes || undefined,
            }),
          });

          const json = await res.json();
          if (json.success && json.data) {
            customerIdMapping[pendingCust.offlineId] = json.data.id;
            await removePendingCustomer(pendingCust.offlineId);
            await putCachedCustomer({
              id: json.data.id,
              name: json.data.name,
              phone: json.data.phone,
              email: json.data.email,
              notes: json.data.notes,
              totalDebt: 0,
            });
          }
        } catch (custErr) {
          console.warn("Failed to sync customer:", pendingCust.name, custErr);
        }
      }

      // 2. Process Pending Sales
      const pendingSales = await getPendingSales();
      for (const pendingSale of pendingSales) {
        try {
          // Remap customer ID if customer was created offline
          let actualCustomerId = pendingSale.customerId;
          if (actualCustomerId && customerIdMapping[actualCustomerId]) {
            actualCustomerId = customerIdMapping[actualCustomerId];
          }

          const res = await fetch("/api/sales", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Offline-Idempotency-Key": pendingSale.offlineId,
            },
            body: JSON.stringify({
              customerId: actualCustomerId || undefined,
              saleDate: pendingSale.saleDate,
              dueDate: pendingSale.dueDate || undefined,
              paymentMethod: pendingSale.paymentMethod,
              amountPaid: pendingSale.amountPaid,
              discount: pendingSale.discount || 0,
              notes: pendingSale.notes ? `${pendingSale.notes} (Synced from Mobile PWA)` : "Recorded via Mobile PWA",
              items: pendingSale.items.map((it) => ({
                productId: it.productId,
                quantity: it.quantity,
                unitPrice: it.unitPrice,
              })),
            }),
          });

          const json = await res.json();
          if (json.success) {
            await removePendingSale(pendingSale.offlineId);
          } else {
            console.error("Sale sync rejected by backend:", json.error);
            pendingSale.status = "failed";
            pendingSale.retryCount = (pendingSale.retryCount || 0) + 1;
            pendingSale.errorMessage = json.error || "Server rejected sale";
            await updatePendingSale(pendingSale);
          }
        } catch (saleErr: any) {
          console.error("Sale sync network failure:", saleErr);
          pendingSale.status = "failed";
          pendingSale.errorMessage = saleErr.message || "Network error";
          await updatePendingSale(pendingSale);
        }
      }

      // 3. Process Pending Debt Payments
      const pendingDebts = await getPendingDebtPayments();
      for (const pendingDebt of pendingDebts) {
        try {
          let actualCustomerId = pendingDebt.customerId;
          if (actualCustomerId && customerIdMapping[actualCustomerId]) {
            actualCustomerId = customerIdMapping[actualCustomerId];
          }

          const res = await fetch("/api/debt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customerId: actualCustomerId,
              amount: pendingDebt.amount,
              paymentMethod: pendingDebt.paymentMethod,
              notes: pendingDebt.notes ? `${pendingDebt.notes} (Synced from Mobile PWA)` : "Recorded via Mobile PWA",
            }),
          });

          const json = await res.json();
          if (json.success) {
            await removePendingDebtPayment(pendingDebt.offlineId);
          } else {
            console.error("Debt payment sync rejected:", json.error);
            pendingDebt.status = "failed";
            pendingDebt.retryCount = (pendingDebt.retryCount || 0) + 1;
            pendingDebt.errorMessage = json.error || "Server rejected debt payment";
            await updatePendingDebtPayment(pendingDebt);
          }
        } catch (debtErr: any) {
          console.error("Debt payment sync failure:", debtErr);
          pendingDebt.status = "failed";
          pendingDebt.errorMessage = debtErr.message || "Network error";
          await updatePendingDebtPayment(pendingDebt);
        }
      }

      // 4. Refresh Catalog & Customer Caches from Server
      await this.refreshCacheFromServer();

      this.lastSyncedAt = new Date().toISOString();
      await setMeta("lastSyncedAt", this.lastSyncedAt);

      this.isSyncing = false;
      this.notify("Sync completed successfully");
      return { success: true };
    } catch (err: any) {
      console.error("Sync error:", err);
      this.isSyncing = false;
      this.notify(err.message || "Sync encountered an issue");
      return { success: false, error: err.message };
    }
  }

  public async refreshCacheFromServer(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const [prodRes, custRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/customers"),
      ]);

      if (prodRes.ok) {
        const prodJson = await prodRes.json();
        if (prodJson.success && Array.isArray(prodJson.data)) {
          const mobileProducts: MobileProduct[] = prodJson.data.map((p: any) => ({
            id: p.id,
            name: p.name,
            brand: p.brand,
            sellingPrice: Number(p.sellingPriceNum ?? p.sellingPrice ?? 0),
            costPrice: Number(p.defaultCostPriceNum ?? p.defaultCostPrice ?? 0),
            stockLevel: Number(p.remainingStock ?? p.stockLevel ?? 0),
            lowStockAlert: Number(p.lowStockThreshold ?? p.lowStockAlert ?? 5),
            barcode: p.barcode,
            volumeMl: p.volumeMl || (p.size ? parseInt(p.size, 10) || null : null),
            genderCategory: p.category || p.genderCategory,
            concentration: p.concentration,
          }));
          await cacheProducts(mobileProducts);
        }
      }

      if (custRes.ok) {
        const custJson = await custRes.json();
        if (custJson.success && Array.isArray(custJson.data)) {
          const mobileCustomers: MobileCustomer[] = custJson.data.map((c: any) => ({
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
          await cacheCustomers(mobileCustomers);
        }
      }
    } catch (e) {
      console.warn("Failed to refresh mobile cache from server:", e);
    }
  }
}

export const syncManager = new MobileSyncManager();
