"use client";

import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Button,
  IconButton,
  Input,
  Select,
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
} from "lucide-react";

interface ProfitSummary {
  totalRevenue: number;
  totalCostOfGoods: number;
  totalGrossProfit: number;
  totalExpenses: number;
  totalNetProfit: number;
  allocations: {
    savings: number;
    needs: number;
    wants: number;
    totalAllocated: number;
    remainingAllocatableProfit: number;
  };
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

  // Allocate Profit Sheet
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allocationType, setAllocationType] = useState<"SAVINGS" | "NEEDS" | "WANTS">("SAVINGS");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
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

  const openAllocateModal = (type?: "SAVINGS" | "NEEDS" | "WANTS") => {
    if (type) setAllocationType(type);
    setAmount("");
    setSource("Monthly Perfume Operations");
    setNotes("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) {
      setFormError("Allocation amount must be greater than GH₵0.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/profit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: allocationType,
          amount: val,
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
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header & Allocate Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Profit Allocation & Wealth Split
          </h1>
          <p className="text-sm text-muted-foreground">
            50/30/20 reinvestment, operating reserve & dividend distribution ledger
          </p>
        </div>

        <Button
          onClick={() => openAllocateModal()}
          size="md"
          className="gap-2 font-bold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Allocate Profit</span>
        </Button>
      </div>

      {/* Financial Health Waterfall */}
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Gross Revenue
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tracking-tight">
              <Money amount={summary?.totalRevenue || 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Top-line turnover</div>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Cost of Goods (COGS)
            </span>
            <div className="text-xl sm:text-2xl font-bold text-muted-foreground mt-1 tracking-tight">
              <Money amount={summary?.totalCostOfGoods || 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Wholesale bottle cost</div>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Gross Profit
            </span>
            <div className="text-xl sm:text-2xl font-bold text-primary mt-1 tracking-tight">
              <Money amount={summary?.totalGrossProfit || 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Revenue minus COGS</div>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Operating Expenses
            </span>
            <div className="text-xl sm:text-2xl font-bold text-destructive mt-1 tracking-tight">
              <Money amount={summary?.totalExpenses || 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Overhead & logistics</div>
          </div>

          <div className="p-4 sm:p-5 col-span-2 lg:col-span-1 bg-muted/20">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider block">
              Realized Net Profit
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tracking-tight">
              <Money amount={netProfit} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Available for wealth split
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
            onClick={() => openAllocateModal("SAVINGS")}
          >
            Deposit to Savings
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
            onClick={() => openAllocateModal("NEEDS")}
          >
            Fund Operations
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
            onClick={() => openAllocateModal("WANTS")}
          >
            Distribute Dividends
          </Button>
        </Card>
      </div>

      {/* Allocation History Ledger */}
      <Card className="p-0 overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Allocation History Ledger</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total distributed: {formatCurrency(alloc.totalAllocated)} • Remaining allocatable:{" "}
              {formatCurrency(alloc.remainingAllocatableProfit)}
            </p>
          </div>
        </div>

        {allocations.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-sm font-medium">No profit distributions logged yet</p>
            <p className="text-xs mt-1">Click "Allocate Profit" above to record a distribution</p>
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

      {/* ALLOCATE PROFIT SHEET */}
      <Sheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Distribute Realized Profit"
        description="Allocate earnings to savings reinvestment, business operations, or dividends"
      >
        <form onSubmit={handleAllocate} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Select
            label="Allocation Bucket"
            value={allocationType}
            onChange={(e) => setAllocationType(e.target.value as any)}
            options={[
              { value: "SAVINGS", label: "50% Savings / Batch Reinvestment" },
              { value: "NEEDS", label: "30% Operating Needs & Rent" },
              { value: "WANTS", label: "20% Owner Draw & Dividends" },
            ]}
          />

          <Input
            label="Amount (GH₵)"
            type="number"
            step="any"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="text-lg font-black"
          />

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
            >
              Save Allocation
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
