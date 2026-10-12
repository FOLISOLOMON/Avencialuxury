"use client";

import React, { useState, useEffect } from "react";
import {
  History,
  RotateCcw,
  Shield,
  User,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  createdAt: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export function AuditLogCard() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit?limit=30");
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
      } else {
        setError(json.error || "Failed to load audit logs");
      }
    } catch (err: any) {
      setError(err.message || "Error fetching audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const getActionBadgeColor = (action: string) => {
    if (action.includes("APPROVED") || action.includes("ACCEPTED") || action.includes("LOGIN")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (action.includes("REJECTED") || action.includes("DEACTIVATE") || action.includes("REVOKE")) {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }
    if (action.includes("EDIT") || action.includes("UPDATE") || action.includes("CANCEL_REQUEST")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  };

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Security Audit Trail & Activity Log
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable server audit log recording authenticated user actions, financial operations, and role changes
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={fetchLogs} className="text-xs">
          <RotateCcw className="w-3.5 h-3.5 mr-1" />
          Refresh Log
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-4 text-center text-xs text-muted-foreground">Loading audit records...</div>
      ) : logs.length === 0 ? (
        <div className="p-4 rounded-md border border-dashed border-border text-center text-xs text-muted-foreground">
          No audit entries recorded yet.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border bg-card overflow-hidden">
          {logs.map((log) => (
            <div key={log.id} className="p-3 sm:px-4 space-y-1 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getActionBadgeColor(
                      log.action
                    )}`}
                  >
                    {log.action}
                  </span>
                  <span className="font-semibold text-foreground">
                    {log.user ? `${log.user.name} (${log.user.role})` : "System / Unauthenticated"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    {new Date(log.createdAt).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}{" "}
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              </div>

              {log.details && (
                <div className="text-[11px] text-neutral-400 font-mono bg-muted/40 p-1.5 rounded">
                  {typeof log.details === "string"
                    ? log.details
                    : JSON.stringify(log.details)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
