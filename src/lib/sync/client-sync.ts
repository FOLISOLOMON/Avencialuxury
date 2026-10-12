"use client";

export type SyncEntity =
  | "products"
  | "sales"
  | "cancellations"
  | "customers"
  | "inventory"
  | "batches"
  | "team"
  | "all";

const CHANNEL_NAME = "avencia_realtime_sync_channel";
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.onmessage = (event) => {
      const entity = event.data?.entity as SyncEntity;
      if (entity) {
        window.dispatchEvent(new CustomEvent(`avencia:sync:${entity}`, { detail: event.data }));
        window.dispatchEvent(new CustomEvent("avencia:sync", { detail: event.data }));
      }
    };
  } catch (e) {
    console.warn("[LiveSync] BroadcastChannel not supported in this environment");
  }
}

/**
 * Triggers an instant local + cross-tab synchronization event.
 * Call this immediately after any successful create/update/delete operation.
 */
export function triggerClientSync(entity: SyncEntity = "all", metadata?: Record<string, any>) {
  if (typeof window === "undefined") return;

  const payload = {
    entity,
    timestamp: Date.now(),
    ...metadata,
  };

  // 1. Dispatch in the current window/tab
  window.dispatchEvent(new CustomEvent(`avencia:sync:${entity}`, { detail: payload }));
  window.dispatchEvent(new CustomEvent("avencia:sync", { detail: payload }));

  // 2. Broadcast across all other open tabs/windows
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(payload);
    } catch (e) {
      // Ignored
    }
  }
}
