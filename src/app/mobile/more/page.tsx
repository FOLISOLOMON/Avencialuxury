"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Cloud,
  Moon,
  Sun,
  Monitor,
  Laptop,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Info,
  ShieldCheck,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useSyncStatus, usePendingQueue } from "@/lib/mobile/hooks";
import { useTheme } from "@/components/theme/ThemeProvider";
import { NotificationSettingsCard } from "@/components/notifications/NotificationSettingsCard";



export default function MobileMorePage() {
  const { state, lastSyncedAt, triggerSync } = useSyncStatus();
  const { totalPending } = usePendingQueue();
  const { theme, setTheme } = useTheme();
  const [syncing, setSyncing] = useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    await triggerSync();
    setTimeout(() => setSyncing(false), 800);
  };

  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground tracking-tight">App Settings</h1>
        <p className="text-xs text-muted-foreground">Sync status, themes & desktop system</p>
      </div>

      {/* 2. SYNC & OFFLINE CENTER */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-foreground">Offline Sync Engine</h3>
              <p className="text-[11px] text-muted-foreground">
                Status: <span className="font-semibold capitalize text-foreground">{state}</span>
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            disabled={syncing || state === "offline"}
            isLoading={syncing}
            onClick={handleManualSync}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Sync Now
          </Button>
        </div>

        <div className="p-3 rounded-xl bg-muted/40 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pending in Queue:</span>
            <span className="font-bold text-foreground">{totalPending} operation(s)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Cloud Sync:</span>
            <span className="font-medium text-foreground">
              {lastSyncedAt
                ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                : "Just now"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. THEME SELECTOR */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-foreground">Appearance</h3>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
              theme === "dark"
                ? "bg-primary/15 border-primary text-primary font-bold"
                : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Moon className="w-4 h-4" />
            <span className="text-xs">Dark</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
              theme === "light"
                ? "bg-primary/15 border-primary text-primary font-bold"
                : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sun className="w-4 h-4" />
            <span className="text-xs">Light</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
              theme === "system"
                ? "bg-primary/15 border-primary text-primary font-bold"
                : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <Monitor className="w-4 h-4" />
            <span className="text-xs">System</span>
          </button>
        </div>
      </div>

      {/* 4. PERFUMES & INVENTORY */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Perfume Catalog & Stock</h3>
            <p className="text-[11px] text-muted-foreground">
              View prices, fragrance notes & remaining bottles
            </p>
          </div>
        </div>

        <Link
          href="/mobile/products"
          className="w-full mt-2 h-10 px-3 rounded-xl bg-muted/60 hover:bg-muted text-xs font-semibold text-primary inline-flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span>Open Perfume Catalog</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 5. EXTERNAL WEB PUSH NOTIFICATIONS & DEBT REMINDERS */}
      <NotificationSettingsCard />

      {/* 6. SWITCH TO DESKTOP AVENCIA OP */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Laptop className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-foreground">Avencia OP (Full System)</h3>
            <p className="text-[11px] text-muted-foreground">
              Batches, inventory ledger, 50/30/20 profit & reports
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="w-full mt-2 h-10 px-3 rounded-xl bg-muted/60 hover:bg-muted text-xs font-semibold text-primary inline-flex items-center justify-center gap-1.5 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <span>Open Desktop Business System</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* 5. DATABASE ARCHITECTURE VERIFICATION */}
      <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/60 text-xs text-muted-foreground space-y-1">
        <p className="font-bold text-foreground flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-primary" />
          Single Source of Truth
        </p>
        <p className="text-[11px] leading-relaxed">
          Avencia Mobile and Avencia OP share the same backend, database, product pricing, customer balances, and FIFO stock ledger.
        </p>
      </div>
    </div>
  );
}
