"use client";

import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import { calculate50_30_20Allocation } from "@/lib/calculations/financial";
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Sheet,
  Card,
  Badge,
  Money,
} from "@/components/ui";
import {
  PiggyBank,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Plus,
  PieChart,
  History,
  DollarSign,
  Wallet,
  Sparkles,
  ArrowRight,
  Receipt,
  Scale,
  CheckCircle2,
  Info,
} from "lucide-react";

interface CashBreakdown {
  verifiedCollectedCash: number;
  costOfGoodsSold: number;
  costRecovered: number;
  unrecoveredCost: number;
  realizedGrossProfit: number;
  totalExpenses: number;
  realizedNetProfit: number;
  totalAllocated: number;
  eligibleCashProfit: number;
  isOverAllocated: boolean;
  overAllocatedAmount: number;
  warnings: string[];
}

interface ProfitSummary {
  totalRevenue: number;
  totalAmountCollected: number;
  totalOutstandingDebt: number;
  totalCostOfGoods: number;
  totalGrossProfit: number;
  totalAccrualGrossProfit?: number;
  totalExpenses: number;
  totalNetProfit: number;
  totalAccrualNetProfit?: number;
  allocations: {
    savings: number;
    needs: number;
    wants: number;
    totalAllocated: number;
    remainingAllocatableProfit: number;
    eligibleCashProfit: number;
    isOverAllocated?: boolean;
    overAllocatedAmount?: number;
  };
  cashBreakdown?: CashBreakdown;
  warnings?: string[];
}

interface Allocation {
  id: string;
  amount: number;
  type: "SAVINGS" | "NEEDS" | "WANTS";
  source: string | null;
  allocationDate: string;
  notes: string | null;
}

export default function ProfitPage() {
  const [summary, setSummary] = useState<ProfitSummary | null>(null);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 50/30/20 Allocate Profit Sheet
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profit");
      const json = await res.json();
      if (json.success) {
        setSummary(json.data.summary);
        setAllocations(json.data.allocations || []);
      } else {
        setError(json.error || "Failed to load profit data");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const eligibleCashProfit =
    summary?.allocations?.eligibleCashProfit ?? summary?.allocations?.remainingAllocatableProfit ?? 0;

  const openAllocateModal = () => {
    setAmount(eligibleCashProfit > 0 ? eligibleCashProfit.toFixed(2) : "");
    setSource("Monthly Cash Allocation");
    setNotes("50/30/20 cash-backed split");
    setConfirmed(false);
    setIdempotencyKey(`alloc_idemp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
    setFormError(null);
    setIsModalOpen(true);
  };

  const numericAmount = parseFloat(amount) || 0;
  const previewSplit = useMemo(() => {
    if (numericAmount <= 0) return { savings: 0, needs: 0, wants: 0 };
    return calculate50_30_20Allocation(numericAmount);
  }, [numericAmount]);

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) {
      setFormError("Allocation amount must be greater than GH₵0.");
      return;
    }

    if (val > eligibleCashProfit) {
      setFormError(
        `Allocation exceeds available cash-backed profit of GH₵${eligibleCashProfit.toFixed(2)}.`
      );
      return;
    }

    if (!confirmed) {
      setFormError("Please check the confirmation box to authorize this allocation.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/profit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          split: "50_30_20",
          amount: val,
          confirmedEligibleAmount: eligibleCashProfit,
          idempotencyKey,
          source: source.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        fetchData();
      } else {
        setFormError(json.error || "Failed to record allocation");
      }
    } catch (err: any) {
      setFormError(err.message || "Server error");
    } finally {
      setSubmitting(false);
    }
  };

  const netProfit = summary?.totalNetProfit || 0;
  const alloc = summary?.allocations || {
    savings: 0,
    needs: 0,
    wants: 0,
    totalAllocated: 0,
    remainingAllocatableProfit: 0,
    eligibleCashProfit: 0,
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header & Allocate Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">
              Cash-Backed Profit Allocation
            </h1>
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
              Verified Cash
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Realized cash collections, inventory recovery, and owner-confirmed 50/30/20 wealth split
          </p>
        </div>

        <Button
          onClick={openAllocateModal}
          disabled={eligibleCashProfit <= 0}
          size="md"
          className="gap-2 font-bold self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Allocate 50/30/20</span>
        </Button>
      </div>

      {/* Warnings & Data Integrity Banner */}
      {summary?.allocations?.isOverAllocated && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Historical Over-Allocation Detected</p>
            <p className="text-xs font-normal mt-0.5 text-destructive/90">
              Historical allocations (GH₵{alloc.totalAllocated.toFixed(2)}) exceed realized cash net profit
              (GH₵{netProfit.toFixed(2)}) by GH₵{(alloc.overAllocatedAmount || 0).toFixed(2)}. No new profit
              allocations can be made until further cash collections or gross profit are realized.
            </p>
          </div>
        </div>
      )}

      {summary?.warnings && summary.warnings.length > 0 && !summary.allocations.isOverAllocated && (
        <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/30 text-warning text-xs font-medium flex items-start gap-2.5">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {summary.warnings.map((w, idx) => (
              <p key={idx}>{w}</p>
            ))}
          </div>
        </div>
      )}

      {/* Financial Health Waterfall (Cash-Backed) */}
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border">
          {/* Card 1: Verified Collected Cash */}
          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Collected Cash
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tracking-tight">
              <Money amount={summary?.totalAmountCollected || 0} />
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {summary?.totalOutstandingDebt !== undefined && summary.totalOutstandingDebt > 0 ? (
                <span>
                  From sales • <span className="text-warning font-medium">GH₵{summary.totalOutstandingDebt.toFixed(2)} unpaid debt</span>
                </span>
              ) : (
                "Verified cash receipts"
              )}
            </div>
          </div>

          {/* Card 2: Cost of Goods Sold (Recovered) */}
          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Cost Recovery (COGS)
            </span>
            <div className="text-xl sm:text-2xl font-bold text-muted-foreground mt-1 tracking-tight">
              <Money amount={summary?.cashBreakdown?.costRecovered || summary?.totalCostOfGoods || 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Wholesale bottle cost
            </div>
          </div>

          {/* Card 3: Realized Gross Profit */}
          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Realized Gross Profit
            </span>
            <div className="text-xl sm:text-2xl font-bold text-primary mt-1 tracking-tight">
              <Money amount={summary?.totalGrossProfit || 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Cash minus cost recovery</div>
          </div>

          {/* Card 4: Operating Expenses */}
          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Operating Expenses
            </span>
            <div className="text-xl sm:text-2xl font-bold text-destructive mt-1 tracking-tight">
              <Money amount={summary?.totalExpenses || 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Overhead & logistics</div>
          </div>

          {/* Card 5: Realized Net Profit (Eligible) */}
          <div className="p-4 sm:p-5 col-span-2 lg:col-span-1 bg-muted/20">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
              Realized Net Profit
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tracking-tight">
              <Money amount={netProfit} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Eligible: <span className="font-bold text-emerald-500">GH₵{eligibleCashProfit.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* The 3 Wealth Allocation Buckets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bucket 1: Reinvestment / Savings (50%) */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-semibold text-foreground tracking-wide">
                Reinvestment & Savings
              </span>
              <Badge variant="outline">50% Target</Badge>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Next batch imports, emergency cash reserve, and inventory expansion capital.
            </p>

            <div className="my-4 p-3.5 rounded-md bg-muted/20 border border-border">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Allocated</div>
              <div className="text-xl font-bold text-foreground mt-1">
                <Money amount={alloc.savings} />
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2"
            onClick={openAllocateModal}
            disabled={eligibleCashProfit <= 0}
          >
            Allocate 50/30/20
          </Button>
        </Card>

        {/* Bucket 2: Operating Needs (30%) */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-semibold text-foreground tracking-wide">
                Operational Needs
              </span>
              <Badge variant="outline">30% Target</Badge>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Showroom rent, marketing campaigns, couriers, and packaging supplies.
            </p>

            <div className="my-4 p-3.5 rounded-md bg-muted/20 border border-border">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Allocated</div>
              <div className="text-xl font-bold text-foreground mt-1">
                <Money amount={alloc.needs} />
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2"
            onClick={openAllocateModal}
            disabled={eligibleCashProfit <= 0}
          >
            Allocate 50/30/20
          </Button>
        </Card>

        {/* Bucket 3: Wants / Owner Draw (20%) */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <span className="text-xs font-semibold text-foreground tracking-wide">
                Owner Draw & Profits
              </span>
              <Badge variant="outline">20% Target</Badge>
            </div>

            <p className="text-xs text-muted-foreground mt-3">
              Personal dividends, founder compensation, and discretionary returns.
            </p>

            <div className="my-4 p-3.5 rounded-md bg-muted/20 border border-border">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Allocated</div>
              <div className="text-xl font-bold text-foreground mt-1">
                <Money amount={alloc.wants} />
              </div>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            className="w-full mt-2"
            onClick={openAllocateModal}
            disabled={eligibleCashProfit <= 0}
          >
            Allocate 50/30/20
          </Button>
        </Card>
      </div>

      {/* Allocation History Ledger */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Allocation History Ledger</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total distributed: {formatCurrency(alloc.totalAllocated)} • Remaining eligible cash:{" "}
              <span className="font-bold text-foreground">{formatCurrency(eligibleCashProfit)}</span>
            </p>
          </div>
        </div>

        {allocations.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-sm font-medium">No profit distributions logged yet</p>
            <p className="text-xs mt-1">Click &quot;Allocate 50/30/20&quot; above to record a distribution</p>
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Bucket</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allocations.map((a) => {
                    const isSavings = a.type === "SAVINGS";
                    const isNeeds = a.type === "NEEDS";

                    return (
                      <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                        <td className="py-3 px-4 text-xs font-medium text-foreground whitespace-nowrap">
                          {new Date(a.allocationDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">
                            {isSavings ? "Savings (50%)" : isNeeds ? "Needs (30%)" : "Draw (20%)"}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {a.source || "—"}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground italic">
                          {a.notes || "—"}
                        </td>
                        <td className="py-3 px-4 text-right text-sm font-bold text-foreground tabular-nums whitespace-nowrap">
                          <Money amount={a.amount} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Row View */}
            <div className="md:hidden divide-y divide-border">
              {allocations.map((a) => (
                <div key={a.id} className="p-4 flex items-center justify-between text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {a.type === "SAVINGS" ? "Savings" : a.type === "NEEDS" ? "Needs" : "Draw"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(a.allocationDate).toLocaleDateString()}
                      </span>
                    </div>
                    {a.source && (
                      <div className="text-[11px] text-muted-foreground">{a.source}</div>
                    )}
                  </div>
                  <div className="text-right font-bold text-foreground tabular-nums">
                    <Money amount={a.amount} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* 50/30/20 ALLOCATE PROFIT SHEET (OWNER REVIEW & CONFIRMATION) */}
      <Sheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Distribute Realized Cash Profit"
        description="Review cash-backed availability and confirm the 50/30/20 split"
      >
        <form onSubmit={handleAllocate} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Realized Cash Eligibility Review Card */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Verified Cash Collected:</span>
              <span className="font-semibold text-foreground">GH₵{(summary?.totalAmountCollected || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Total Cost of Sold Goods (Restocking Reserve):</span>
              <span className="font-semibold text-foreground">-GH₵{(summary?.cashBreakdown?.costOfGoodsSold || summary?.totalCostOfGoods || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Operating Expenses (Paid Cash Outflows):</span>
              <span className="font-semibold text-destructive">-GH₵{(summary?.totalExpenses || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
              <span>Previously Allocated:</span>
              <span className="font-semibold text-foreground">-GH₵{alloc.totalAllocated.toFixed(2)}</span>
            </div>
            <div className="pt-2 border-t border-border flex justify-between items-center font-bold text-sm">
              <span className="text-foreground">Available to Allocate:</span>
              <span className="text-emerald-500 tabular-nums">GH₵{eligibleCashProfit.toFixed(2)}</span>
            </div>
            <div className="pt-1 text-[11px] text-muted-foreground border-t border-border/50 leading-relaxed">
              * Note: Recorded expenses are assumed to be paid cash outflows. Unrecovered wholesale costs from credit sales are reserved in full to protect inventory restocking capital.
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-foreground">Amount to Allocate (GH₵)</label>
              <button
                type="button"
                onClick={() => setAmount(eligibleCashProfit.toFixed(2))}
                className="text-[11px] font-bold text-primary hover:underline"
              >
                Use Full Max (GH₵{eligibleCashProfit.toFixed(2)})
              </button>
            </div>
            <Input
              type="number"
              step="any"
              min="0.01"
              max={eligibleCashProfit > 0 ? eligibleCashProfit : undefined}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setConfirmed(false);
              }}
              placeholder="0.00"
              required
              className="text-lg font-black"
            />
          </div>

          {/* Live 50/30/20 Breakdown Preview */}
          {numericAmount > 0 && (
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 space-y-2 text-xs">
              <span className="font-bold text-foreground block tracking-tight">Proposed 50/30/20 Distribution:</span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-lg bg-card border border-border">
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">50% Savings</span>
                  <span className="font-bold text-foreground text-sm tabular-nums mt-0.5 block">
                    GH₵{previewSplit.savings.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-card border border-border">
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">30% Needs</span>
                  <span className="font-bold text-foreground text-sm tabular-nums mt-0.5 block">
                    GH₵{previewSplit.needs.toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-card border border-border">
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">20% Wants</span>
                  <span className="font-bold text-foreground text-sm tabular-nums mt-0.5 block">
                    GH₵{previewSplit.wants.toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground text-center pt-1">
                Total conserved: GH₵{(previewSplit.savings + previewSplit.needs + previewSplit.wants).toFixed(2)} (exact penny balance)
              </p>
            </div>
          )}

          <Input
            label="Profit Source / Description"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. October Sales Retained Earnings"
          />

          <Textarea
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Bank deposit ref, reserve note..."
          />

          {/* Explicit Owner Confirmation Checkbox */}
          <div className="pt-2">
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-border bg-muted/20 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-border text-primary focus:ring-primary w-4 h-4 shrink-0"
              />
              <span className="text-xs text-foreground font-medium">
                I confirm this cash-backed allocation of{" "}
                <span className="font-bold">GH₵{numericAmount.toFixed(2)}</span> across Savings (50%), Operating Needs (30%), and Owner Draw (20%). I understand that this allocation is permanent in financial history and cannot be automatically undone.
              </span>
            </label>
          </div>

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-black"
              isLoading={submitting}
              disabled={!confirmed || numericAmount <= 0 || numericAmount > eligibleCashProfit}
            >
              Confirm & Save Split
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

