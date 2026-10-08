import { MobileProduct, MobileCustomer, PendingSale, PendingCustomer } from "./types";

const DB_NAME = "avencia_mobile_db";
const DB_VERSION = 1;

interface AvenciaDB {
  products: MobileProduct;
  customers: MobileCustomer;
  pendingSales: PendingSale;
  pendingCustomers: PendingCustomer;
  metadata: { key: string; value: any };
}

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only accessible in the browser environment");
  }

  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("customers")) {
        db.createObjectStore("customers", { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains("pendingSales")) {
        const saleStore = db.createObjectStore("pendingSales", { keyPath: "offlineId" });
        saleStore.createIndex("status", "status", { unique: false });
        saleStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("pendingCustomers")) {
        const custStore = db.createObjectStore("pendingCustomers", { keyPath: "offlineId" });
        custStore.createIndex("status", "status", { unique: false });
        custStore.createIndex("createdAt", "createdAt", { unique: false });
      }

      if (!db.objectStoreNames.contains("metadata")) {
        db.createObjectStore("metadata", { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error("IndexedDB open error:", (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// ==========================================
// PRODUCTS
// ==========================================
export async function cacheProducts(products: MobileProduct[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction("products", "readwrite");
    const store = tx.objectStore("products");

    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const p of products) {
          store.put(p);
        }
      };
      clearReq.onerror = () => reject(clearReq.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("cacheProducts error:", err);
  }
}

export async function getCachedProducts(): Promise<MobileProduct[]> {
  try {
    const db = await getDB();
    const tx = db.transaction("products", "readonly");
    const store = tx.objectStore("products");

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("getCachedProducts fallback:", err);
    return [];
  }
}

// ==========================================
// CUSTOMERS
// ==========================================
export async function cacheCustomers(customers: MobileCustomer[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction("customers", "readwrite");
    const store = tx.objectStore("customers");

    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const c of customers) {
          store.put(c);
        }
      };
      clearReq.onerror = () => reject(clearReq.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("cacheCustomers error:", err);
  }
}

export async function putCachedCustomer(customer: MobileCustomer): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction("customers", "readwrite");
    tx.objectStore("customers").put(customer);
  } catch (err) {
    console.error("putCachedCustomer error:", err);
  }
}

export async function getCachedCustomers(): Promise<MobileCustomer[]> {
  try {
    const db = await getDB();
    const tx = db.transaction("customers", "readonly");
    const store = tx.objectStore("customers");

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("getCachedCustomers fallback:", err);
    return [];
  }
}

// ==========================================
// PENDING CUSTOMERS QUEUE
// ==========================================
export async function addPendingCustomer(customer: Omit<PendingCustomer, "status" | "retryCount" | "createdAt">): Promise<PendingCustomer> {
  const db = await getDB();
  const tx = db.transaction("pendingCustomers", "readwrite");
  const store = tx.objectStore("pendingCustomers");

  const record: PendingCustomer = {
    ...customer,
    status: "pending",
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const req = store.add(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingCustomers(): Promise<PendingCustomer[]> {
  try {
    const db = await getDB();
    const tx = db.transaction("pendingCustomers", "readonly");
    const store = tx.objectStore("pendingCustomers");

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return [];
  }
}

export async function removePendingCustomer(offlineId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("pendingCustomers", "readwrite");
  tx.objectStore("pendingCustomers").delete(offlineId);
}

// ==========================================
// PENDING SALES QUEUE
// ==========================================
export async function addPendingSale(sale: Omit<PendingSale, "status" | "retryCount" | "createdAt">): Promise<PendingSale> {
  const db = await getDB();
  const tx = db.transaction("pendingSales", "readwrite");
  const store = tx.objectStore("pendingSales");

  const record: PendingSale = {
    ...sale,
    status: "pending",
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve, reject) => {
    const req = store.add(record);
    req.onsuccess = () => resolve(record);
    req.onerror = () => reject(req.error);
  });
}

export async function getPendingSales(): Promise<PendingSale[]> {
  try {
    const db = await getDB();
    const tx = db.transaction("pendingSales", "readonly");
    const store = tx.objectStore("pendingSales");

    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return [];
  }
}

export async function updatePendingSale(sale: PendingSale): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("pendingSales", "readwrite");
  tx.objectStore("pendingSales").put(sale);
}

export async function removePendingSale(offlineId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("pendingSales", "readwrite");
  tx.objectStore("pendingSales").delete(offlineId);
}

// ==========================================
// METADATA
// ==========================================
export async function setMeta(key: string, value: any): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction("metadata", "readwrite");
    tx.objectStore("metadata").put({ key, value });
  } catch (err) {
    console.error("setMeta error:", err);
  }
}

export async function getMeta<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const tx = db.transaction("metadata", "readonly");
    const store = tx.objectStore("metadata");

    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}
