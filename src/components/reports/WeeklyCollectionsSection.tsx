"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Button,
  Card,
  Badge,
  Money,
  DateRangeBar,
  QuickDateRange,
  DateRangePreset,
  Sheet,
  Input,
} from "@/components/ui";
import {
  Landmark,
  Plus,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Receipt,
  Smartphone,
  Banknote,
  FileText,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { CollectionsReportResult } from "@/lib/calculations/collections";

const COLLECTIONS_PRESETS: DateRangePreset[] = [
  { id: "THIS_WEEK", label: "This Week" },
  { id: "LAST_WEEK", label: "Last Week" },
  { id: "THIS_MONTH", label: "This Month" },
  { id: "CUSTOM", label: "Custom Range" },
];

export function WeeklyCollectionsSection() {
  const [dateRange, setDateRange] = useState<QuickDateRange>("THIS_WEEK");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<CollectionsReportResult | null>(null);

  // Deposit modal state
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDate, setDepositDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [depositReference, setDepositReference] = useState("");
  const [depositNotes, setDepositNotes] = useState("");
  const [isSubmittingDeposit, setIsSubmittingDeposit] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositSuccessMsg, setDepositSuccessMsg] = useState<string | null>(null);

  const fetchCollectionsData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (dateRange === "CUSTOM") {
        if (customStart) params.append("startDate", customStart);
        if (customEnd) params.append("endDate", customEnd);
      } else {
        params.append("quickRange", dateRange);
      }

      const res = await fetch(`/api/reports/collections?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load collections report.");
      }

      setReport(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve collections data.");
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStart, customEnd]);

  useEffect(() => {
    fetchCollectionsData();
  }, [fetchCollectionsData]);

  // Handle deposit submission
  const handleRecordDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDepositError(null);
    setDepositSuccessMsg(null);

    const amountNum = parseFloat(depositAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setDepositError("Please enter a valid deposit amount greater than GH₵0.00.");
      return;
    }

    const maxEligible = report?.metrics.allTimeUnallocatedPool ?? 0;
    if (amountNum > maxEligible) {
      setDepositError(
        `Deposit amount (GH₵${amountNum.toFixed(
          2
        )}) cannot exceed eligible unallocated collections of GH₵${maxEligible.toFixed(2)}.`
      );
      return;
    }

    setIsSubmittingDeposit(true);

    try {
      // Safe idempotency key to prevent duplicate submissions on retry
      const idempotencyKey = `DEP_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const res = await fetch("/api/deposits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          depositDate: depositDate || new Date().toISOString(),
          reference: depositReference.trim() || undefined,
          notes: depositNotes.trim() || undefined,
          idempotencyKey,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to record bank deposit.");
      }

      setDepositSuccessMsg(`Bank deposit of GH₵${amountNum.toFixed(2)} recorded successfully.`);
      setDepositAmount("");
      setDepositReference("");
      setDepositNotes("");
      setIsDepositModalOpen(false);

      // Refresh data to reflect updated balances
      await fetchCollectionsData();
    } catch (err: any) {
      setDepositError(err.message || "An unexpected error occurred while recording the deposit.");
    } finally {
      setIsSubmittingDeposit(false);
    }
  };

  const allTimePool = report?.metrics.allTimeUnallocatedPool ?? 0;

  return (
    <div className="space-y-6">
      {/* Action Header & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" />
            Weekly Collections & Bank Deposits
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track customer funds actually received, allocate bank deposits, and monitor awaiting deposits
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCollectionsData()}
            disabled={loading}
            className="gap-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setDepositError(null);
              setIsDepositModalOpen(true);
            }}
            className="gap-1.5 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            Record Bank Deposit
          </Button>
        </div>
      </div>

      {depositSuccessMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{depositSuccessMsg}</span>
          </div>
          <button
            onClick={() => setDepositSuccessMsg(null)}
            className="text-xs font-medium underline hover:text-emerald-300"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Date Range Selector */}
      <Card className="p-3">
        <DateRangeBar
          value={dateRange}
          onChange={setDateRange}
          startDate={customStart}
          endDate={customEnd}
          onCustomDateChange={(start, end) => {
            setCustomStart(start);
            setCustomEnd(end);
          }}
          presets={COLLECTIONS_PRESETS}
        />
      </Card>

      {/* Primary KPI Metrics */}
      <Card className="p-0 overflow-hidden shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {/* 1. Total Collected */}
          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Collected
            </span>
            <div className="text-xl sm:text-2xl font-black text-foreground mt-1 tracking-tight">
              <Money amount={report?.metrics.totalCollected ?? 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1.5 flex flex-wrap gap-2 items-center">
              <span className="inline-flex items-center gap-1 text-[11px] bg-muted/40 px-1.5 py-0.5 rounded">
                <Banknote className="w-3 h-3 text-emerald-500" />
                Cash: {formatCurrency(report?.paymentMethodBreakdown.cash ?? 0)}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] bg-muted/40 px-1.5 py-0.5 rounded">
                <Smartphone className="w-3 h-3 text-amber-500" />
                MoMo: {formatCurrency(report?.paymentMethodBreakdown.mobileMoney ?? 0)}
              </span>
            </div>
          </div>

          {/* 2. Total Deposited */}
          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Deposited
            </span>
            <div className="text-xl sm:text-2xl font-black text-primary mt-1 tracking-tight">
              <Money amount={report?.metrics.totalDeposited ?? 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Deposits allocated to this period&apos;s collections
            </div>
          </div>

          {/* 3. Awaiting Deposit */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Awaiting Deposit
              </span>
              {(report?.metrics.awaitingDeposit ?? 0) === 0 ? (
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                  Fully Deposited
                </Badge>
              ) : (
                <Badge variant="warning" className="text-[10px]">
                  Pending Deposit
                </Badge>
              )}
            </div>
            <div
              className={`text-xl sm:text-2xl font-black mt-1 tracking-tight ${
                (report?.metrics.awaitingDeposit ?? 0) > 0 ? "text-amber-500" : "text-foreground"
              }`}
            >
              <Money amount={report?.metrics.awaitingDeposit ?? 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Unaccounted collections from this selected period
            </div>
          </div>

          {/* 4. All-Time Unallocated Pool */}
          <div className="p-4 sm:p-5 bg-muted/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
                All-Time Undeposited
              </span>
              <div title="Total collected funds across all business history that have not yet been marked as deposited.">
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-foreground mt-1 tracking-tight">
              <Money amount={report?.metrics.allTimeUnallocatedPool ?? 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1.5">
              Max available for bank deposit right now
            </div>
          </div>
        </div>
      </Card>

      {/* Daily Breakdown Table */}
      <Card className="p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Daily Collection & Deposit Breakdown
            </h3>
            <p className="text-xs text-muted-foreground">
              Day-by-day cash & mobile money collections and allocation status
            </p>
          </div>
          <Badge variant="outline" className="text-xs self-start sm:self-auto">
            {report?.dailyBreakdown.length ?? 0} active days in period
          </Badge>
        </div>

        {report && report.dailyBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 font-semibold">Date</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Collected</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Deposited</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Awaiting</th>
                  <th className="py-2.5 px-3 font-semibold">Payment Methods</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Txns</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {report.dailyBreakdown.map((row) => (
                  <tr key={row.dateKey} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-3 font-medium text-foreground whitespace-nowrap">
                      {row.dayLabel}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">
                      <Money amount={row.totalCollected} />
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-primary">
                      <Money amount={row.totalDeposited} />
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {row.awaitingDeposit > 0 ? (
                        <span className="text-amber-500">
                          <Money amount={row.awaitingDeposit} />
                        </span>
                      ) : (
                        <span className="text-emerald-500 font-normal">GH₵0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        {row.cashAmount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Cash: {formatCurrency(row.cashAmount)}
                          </span>
                        )}
                        {row.momoAmount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                            MoMo: {formatCurrency(row.momoAmount)}
                          </span>
                        )}
                        {row.otherAmount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            Other: {formatCurrency(row.otherAmount)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center text-muted-foreground">
                      {row.transactionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">No collections recorded during this period.</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Customer payments and sales will appear here automatically.
            </p>
          </div>
        )}
      </Card>

      {/* Summaries: Weekly & Monthly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Summaries */}
        <Card className="p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Weekly Summaries</h3>
            <Badge variant="outline" className="text-[10px]">Calendar Weeks</Badge>
          </div>

          <div className="divide-y divide-border/60">
            {report?.weeklySummaries.map((w) => (
              <div key={w.periodKey} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-foreground">{w.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Deposited: {formatCurrency(w.totalDeposited)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground">
                    <Money amount={w.totalCollected} />
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {w.awaitingDeposit > 0 ? (
                      <span className="text-amber-500 font-medium">
                        {formatCurrency(w.awaitingDeposit)} awaiting
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-normal">Fully deposited</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Monthly Summaries */}
        <Card className="p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <h3 className="text-sm font-bold text-foreground">Monthly Summaries</h3>
            <Badge variant="outline" className="text-[10px]">Calendar Months</Badge>
          </div>

          <div className="divide-y divide-border/60">
            {report?.monthlySummaries.map((m) => (
              <div key={m.periodKey} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-foreground">{m.label}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Deposited: {formatCurrency(m.totalDeposited)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground">
                    <Money amount={m.totalCollected} />
                  </div>
                  <div className="text-[11px] mt-0.5">
                    {m.awaitingDeposit > 0 ? (
                      <span className="text-amber-500 font-medium">
                        {formatCurrency(m.awaitingDeposit)} awaiting
                      </span>
                    ) : (
                      <span className="text-emerald-500 font-normal">Fully deposited</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Deposit History */}
      <Card className="p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Bank Deposit History
            </h3>
            <p className="text-xs text-muted-foreground">
              Official records of funds transferred from collections to business bank accounts
            </p>
          </div>
          <Badge variant="outline" className="text-xs self-start sm:self-auto">
            {report?.depositHistory.length ?? 0} deposits recorded
          </Badge>
        </div>

        {report && report.depositHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3 font-semibold">Deposit Date</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Amount</th>
                  <th className="py-2.5 px-3 font-semibold">Reference / Slip</th>
                  <th className="py-2.5 px-3 font-semibold">Notes</th>
                  <th className="py-2.5 px-3 font-semibold">Recorded By</th>
                  <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {report.depositHistory.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-3 font-medium text-foreground whitespace-nowrap">
                      {new Date(d.depositDate).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-foreground">
                      <Money amount={d.amount} />
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {d.reference ? (
                        <span className="font-mono text-[11px] bg-muted/60 px-1.5 py-0.5 rounded">
                          {d.reference}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground max-w-xs truncate">
                      {d.notes || "—"}
                    </td>
                    <td className="py-3 px-3 text-muted-foreground">
                      {d.createdByName || "Owner"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                        Allocated
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <Landmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-xs font-medium">No bank deposits recorded yet.</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Click &quot;Record Bank Deposit&quot; after depositing business funds into your bank account.
            </p>
          </div>
        )}
      </Card>

      {/* Record Bank Deposit Modal */}
      <Sheet
        isOpen={isDepositModalOpen}
        onClose={() => {
          if (!isSubmittingDeposit) {
            setIsDepositModalOpen(false);
            setDepositError(null);
          }
        }}
        size="sm"
        title={
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-primary/10 text-primary">
              <Landmark className="w-4 h-4" />
            </div>
            <span className="font-bold text-base">Record Bank Deposit</span>
          </div>
        }
        description="Record money deposited into the business bank account and allocate it to outstanding collections."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDepositModalOpen(false)}
              disabled={isSubmittingDeposit}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRecordDeposit}
              disabled={isSubmittingDeposit || allTimePool <= 0}
              className="gap-1.5 font-bold"
            >
              {isSubmittingDeposit ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Recording...
                </>
              ) : (
                "Confirm Deposit"
              )}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleRecordDeposit} className="space-y-4 pt-2">
          {depositError && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{depositError}</span>
            </div>
          )}

          {/* Current Available Pool Helper */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Eligible Collections to Deposit:</span>
              <span className="font-bold text-foreground">
                {formatCurrency(allTimePool)}
              </span>
            </div>
            {allTimePool > 0 ? (
              <button
                type="button"
                onClick={() => setDepositAmount(allTimePool.toFixed(2))}
                className="text-[11px] text-primary hover:underline font-semibold block"
              >
                Deposit Full Outstanding ({formatCurrency(allTimePool)})
              </button>
            ) : (
              <p className="text-[11px] text-amber-500">
                All collections are currently deposited. No unallocated funds available.
              </p>
            )}
          </div>

          {/* Deposit Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Deposit Amount (GH₵) <span className="text-destructive">*</span>
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={allTimePool}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="e.g. 500.00"
              required
              disabled={isSubmittingDeposit || allTimePool <= 0}
              className="font-medium"
            />
          </div>

          {/* Actual Deposit Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Actual Deposit Date <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              value={depositDate}
              onChange={(e) => setDepositDate(e.target.value)}
              required
              disabled={isSubmittingDeposit}
            />
          </div>

          {/* Reference / Bank Slip # */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Bank Slip # / Reference <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <Input
              type="text"
              value={depositReference}
              onChange={(e) => setDepositReference(e.target.value)}
              placeholder="e.g. GCB-SLIP-84920"
              disabled={isSubmittingDeposit}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground block">
              Internal Notes <span className="text-muted-foreground font-normal">(Optional)</span>
            </label>
            <Input
              type="text"
              value={depositNotes}
              onChange={(e) => setDepositNotes(e.target.value)}
              placeholder="e.g. End of week cash deposit at Ridge branch"
              disabled={isSubmittingDeposit}
            />
          </div>
        </form>
      </Sheet>
    </div>
  );
}
