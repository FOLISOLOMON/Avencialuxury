"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  History,
  RotateCcw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  Shield,
  User,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Clock,
  Layers,
  Key,
  Users,
  Package,
  ShieldAlert,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: {
    id?: string;
    name: string;
    email: string;
    role: string;
  };
}

type CategoryFilter = "ALL" | "AUTH" | "TEAM" | "SALES" | "INVENTORY";
type RoleFilter = "ALL" | "OWNER" | "WORKER" | "SYSTEM";

export function AuditLogCard() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const [role, setRole] = useState<RoleFilter>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit?limit=100");
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

  const getActionCategory = (action: string): CategoryFilter => {
    const act = action.toUpperCase();
    if (act.includes("AUTH") || act.includes("LOGIN") || act.includes("LOGOUT") || act.includes("PASSWORD")) {
      return "AUTH";
    }
    if (act.includes("WORKER") || act.includes("TEAM") || act.includes("INVIT") || act.includes("ACTIVATE") || act.includes("DEACTIVATE")) {
      return "TEAM";
    }
    if (act.includes("SALE") || act.includes("DEBT") || act.includes("PAYMENT") || act.includes("CANCEL")) {
      return "SALES";
    }
    if (act.includes("PRODUCT") || act.includes("BATCH") || act.includes("INVENTORY") || act.includes("STOCK")) {
      return "INVENTORY";
    }
    return "ALL";
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("APPROVED") || act.includes("ACCEPTED") || act.includes("LOGIN_SUCCESS") || act.includes("ACTIVATED")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
    if (act.includes("REJECTED") || act.includes("DEACTIVATE") || act.includes("REVOKE") || act.includes("FAILED")) {
      return "bg-red-500/10 text-red-400 border-red-500/30";
    }
    if (act.includes("EDIT") || act.includes("UPDATE") || act.includes("CANCEL_REQUEST")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    }
    return "bg-blue-500/10 text-blue-400 border-blue-500/30";
  };

  const getActionIcon = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("AUTH") || act.includes("LOGIN") || act.includes("PASSWORD")) {
      return <Key className="w-3.5 h-3.5" />;
    }
    if (act.includes("WORKER") || act.includes("TEAM") || act.includes("INVIT")) {
      return <Users className="w-3.5 h-3.5" />;
    }
    if (act.includes("SALE") || act.includes("DEBT") || act.includes("CANCEL")) {
      return <ShoppingBag className="w-3.5 h-3.5" />;
    }
    if (act.includes("PRODUCT") || act.includes("BATCH")) {
      return <Package className="w-3.5 h-3.5" />;
    }
    return <Shield className="w-3.5 h-3.5" />;
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Category Filter
      if (category !== "ALL") {
        const cat = getActionCategory(log.action);
        if (cat !== category) return false;
      }

      // 2. Role Filter
      if (role !== "ALL") {
        if (role === "SYSTEM" && log.user) return false;
        if (role !== "SYSTEM" && (!log.user || log.user.role !== role)) return false;
      }

      // 3. Search Query Filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const actionMatch = log.action.toLowerCase().includes(q);
        const nameMatch = log.user?.name?.toLowerCase().includes(q) || false;
        const emailMatch = log.user?.email?.toLowerCase().includes(q) || false;
        const entityMatch = log.entityType?.toLowerCase().includes(q) || false;
        const detailsMatch = log.details
          ? JSON.stringify(log.details).toLowerCase().includes(q)
          : false;

        if (!actionMatch && !nameMatch && !emailMatch && !entityMatch && !detailsMatch) {
          return false;
        }
      }

      return true;
    });
  }, [logs, search, category, role]);

  const clearFilters = () => {
    setSearch("");
    setCategory("ALL");
    setRole("ALL");
  };

  const isFiltered = search.trim() !== "" || category !== "ALL" || role !== "ALL";

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            Security Audit Trail & Activity Log
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable server audit log recording authenticated user actions, financial operations, and role changes
          </p>
        </div>

        <Button variant="ghost" size="sm" onClick={fetchLogs} disabled={loading} className="text-xs self-start sm:self-auto">
          <RotateCcw className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh Log
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="bg-muted/30 border border-border/80 rounded-xl p-3 space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Keyword Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter by actor, email, action, details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 text-xs h-9 bg-card border-border/80"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Role Filter Selector */}
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as RoleFilter)}
              className="text-xs h-9 px-2.5 rounded-lg bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Roles</option>
              <option value="OWNER">Owner Only</option>
              <option value="WORKER">Worker Only</option>
              <option value="SYSTEM">System Only</option>
            </select>

            {isFiltered && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-9 px-2 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Category Pills & Count */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap items-center gap-1">
            {(
              [
                { id: "ALL", label: "All Logs" },
                { id: "AUTH", label: "Security & Auth" },
                { id: "TEAM", label: "Team & Workers" },
                { id: "SALES", label: "Sales & Payments" },
                { id: "INVENTORY", label: "Inventory" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  category === tab.id
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-muted-foreground">
            Showing <strong className="text-foreground">{filteredLogs.length}</strong> of {logs.length} records
          </span>
        </div>
      </div>

      {/* Scrollable Audit List Container */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
          <RotateCcw className="w-5 h-5 animate-spin mx-auto text-primary" />
          <p>Loading security audit records...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-border text-center space-y-2">
          <History className="w-7 h-7 text-muted-foreground mx-auto" />
          <p className="text-xs font-semibold text-foreground">No audit entries match your filter</p>
          <p className="text-[11px] text-muted-foreground">Try clearing or adjusting the search keyword and filters.</p>
          {isFiltered && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs mt-2">
              Reset Filters
            </Button>
          )}
        </div>
      ) : (
        <div className="max-h-[460px] overflow-y-auto rounded-xl border border-border bg-card divide-y divide-border/60 shadow-inner scrollbar-thin">
          {filteredLogs.map((log) => {
            const isExpanded = expandedId === log.id;
            const category = getActionCategory(log.action);

            return (
              <div
                key={log.id}
                className="p-3 sm:px-4 hover:bg-muted/30 transition-colors space-y-2"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Action Badge */}
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border tracking-wide uppercase ${getActionBadgeColor(
                        log.action
                      )}`}
                    >
                      {getActionIcon(log.action)}
                      {log.action}
                    </span>

                    {/* Actor Identity */}
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-semibold text-foreground">
                        {log.user ? log.user.name : "System Daemon"}
                      </span>
                      {log.user?.email && (
                        <span className="text-[11px] text-muted-foreground">
                          ({log.user.email})
                        </span>
                      )}
                      {log.user?.role && (
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.2 rounded uppercase ${
                            log.user.role === "OWNER"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                          }`}
                        >
                          {log.user.role}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp & Expand Toggle */}
                  <div className="flex items-center gap-2 self-start sm:self-auto text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground/70" />
                      {new Date(log.createdAt).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      •{" "}
                      {new Date(log.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>

                    {log.details && (
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="inline-flex items-center gap-0.5 text-[10px] font-medium text-primary hover:underline ml-1"
                      >
                        {isExpanded ? (
                          <>
                            Less <ChevronDown className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            Details <ChevronRight className="w-3 h-3" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Collapsible Details Drawer */}
                {isExpanded && log.details && (
                  <div className="text-[11px] bg-muted/50 border border-border/80 rounded-lg p-2.5 font-mono text-neutral-300 space-y-1.5 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground border-b border-border/40 pb-1">
                      <span>Entity: <strong className="text-foreground">{log.entityType}</strong> {log.entityId ? `(${log.entityId})` : ""}</span>
                      {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                    </div>
                    <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[11px]">
                      {typeof log.details === "string"
                        ? log.details
                        : JSON.stringify(log.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
