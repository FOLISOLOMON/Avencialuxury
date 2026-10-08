"use client";

import React, { useState } from "react";
import { useSyncStatus, usePendingQueue } from "@/lib/mobile/hooks";
import { CheckCircle2, CloudOff, RefreshCw, AlertCircle, Wifi, Clock, ArrowRight } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";

export function SyncStatusBadge() {
  const { state, pendingCount, lastSyncedAt, triggerSync } = useSyncStatus();
  const { pendingSales, pendingCustomers } = usePendingQueue();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    await triggerSync();
    setTimeout(() => setSyncing(false), 800);
  };

  const getBadgeContent = () => {
    switch (state) {
      case "offline":
        return {
          icon: <CloudOff className="w-3 h-3 text-red-400" />,
          label: "Offline",
          classes: "bg-red-500/10 text-red-400 border-red-500/20",
        };
      case "syncing":
        return {
          icon: <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />,
          label: "Syncing...",
          classes: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "pending":
        return {
          icon: <RefreshCw className="w-3 h-3 text-amber-400" />,
          label: `${pendingCount} to sync`,
          classes: "bg-amber-500/10 text-amber-300 border-amber-500/20 animate-pulse",
        };
      case "synced":
      default:
        return {
          icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
          label: "Synced",
          classes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
    }
  };

  const badge = getBadgeContent();

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-95 ${badge.classes}`}
        aria-label="View sync status"
      >
        {badge.icon}
        <span>{badge.label}</span>
      </button>

      {/* Sync Status Bottom Sheet */}
      <Sheet
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Offline & Sync Status"
        footer={
          <Button
            type="button"
            variant="outline"
            onClick={() => setSheetOpen(false)}
            className="w-full h-11 text-sm font-semibold rounded-xl"
          >
            Close
          </Button>
        }
      >
        <div className="space-y-4 pt-2">
          {/* Connection summary */}
          <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center ${
                  state === "offline"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {state === "offline" ? (
                  <CloudOff className="w-4 h-4" />
                ) : (
                  <Wifi className="w-4 h-4" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {state === "offline" ? "No Internet Connection" : "Connected to Avencia Server"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {lastSyncedAt
                    ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                    : "Not yet synced this session"}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={state === "offline" || syncing}
              onClick={handleManualSync}
              className="text-xs h-8 px-2.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? "animate-spin" : ""}`} />
              Sync Now
            </Button>
          </div>

          {/* Pending items overview */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Offline Queue ({pendingCount} pending)
            </h4>

            {pendingCount === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-foreground">All data is up to date</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All sales and customers are securely synced with the server.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSheetOpen(false)}
                  className="w-full text-xs h-9 font-medium"
                >
                  Close Window
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {pendingCustomers.map((c) => (
                  <div
                    key={c.offlineId}
                    className="p-3 rounded-lg bg-card/60 border border-amber-500/30 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Customer: {c.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{c.phone || "No phone"}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                      Waiting to sync
                    </span>
                  </div>
                ))}

                {pendingSales.map((s) => (
                  <div
                    key={s.offlineId}
                    className="p-3 rounded-lg bg-card/60 border border-amber-500/30 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Sale: GH₵{s.totalAmount.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {s.items.length} item(s) • {s.paymentMethod}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                      Waiting to sync
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Offline note */}
          <div className="p-3 rounded-xl bg-muted/40 text-xs text-muted-foreground leading-relaxed">
            <p className="font-medium text-foreground mb-0.5 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-primary" />
              Offline Guarantee
            </p>
            You can continue adding customers and recording sales without internet. When your phone reconnects, everything uploads automatically without duplicates.
          </div>
        </div>
      </Sheet>
    </>
  );
}
