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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Gross Revenue
          </span>
          <div className="text-xl sm:text-2xl font-black text-foreground mt-1">
            <Money amount={summary?.totalRevenue || 0} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Top-line turnover</div>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Cost of Goods (COGS)
          </span>
          <div className="text-xl sm:text-2xl font-black text-muted-foreground mt-1">
            <Money amount={summary?.totalCostOfGoods || 0} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Wholesale bottle cost</div>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Gross Profit
          </span>
          <div className="text-xl sm:text-2xl font-black text-primary mt-1">
            <Money amount={summary?.totalGrossProfit || 0} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Revenue minus COGS</div>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Operating Expenses
          </span>
          <div className="text-xl sm:text-2xl font-black text-destructive mt-1">
            <Money amount={summary?.totalExpenses || 0} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Logistics & packaging</div>
        </Card>

        <Card className="p-4 col-span-2 lg:col-span-1 bg-primary/5 border-primary/30">
          <span className="text-[11px] font-bold text-primary uppercase">Realized Net Profit</span>
          <div className="text-xl sm:text-2xl font-black text-foreground mt-1">
            <Money amount={netProfit} />
          </div>
          <div className="text-[11px] text-primary font-semibold mt-0.5">
            Available for wealth split
          </div>
        </Card>
      </div>

      {/* The 3 Wealth Allocation Buckets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bucket 1: Reinvestment / Savings (50%) */}
        <Card className="p-5 flex flex-col justify-between border-primary/40 bg-card hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-primary uppercase tracking-wider">
                50% Target Bucket
              </span>
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>

            <h3 className="text-base font-black text-foreground">Reinvestment & Savings</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Next batch imports, emergency cash cushion & inventory expansion fund.
            </p>

            <div className="my-4 p-3 rounded-2xl bg-muted/40 border border-border">
              <div className="text-xs text-muted-foreground font-semibold">Total Allocated</div>
              <div className="text-2xl font-black text-foreground mt-0.5">
                <Money amount={alloc.savings} />
              </div>
            </div>
          </div>

          <Button
            size="md"
            variant="outline"
            className="w-full font-bold justify-between"
            onClick={() => openAllocateModal("SAVINGS")}
          >
            <span>Deposit to Savings</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>

        {/* Bucket 2: Operating Needs (30%) */}
        <Card className="p-5 flex flex-col justify-between bg-card hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-warning uppercase tracking-wider">
                30% Target Bucket
              </span>
              <div className="w-8 h-8 rounded-xl bg-warning/10 text-warning flex items-center justify-center">
                <Scale className="w-4 h-4" />
              </div>
            </div>

            <h3 className="text-base font-black text-foreground">Operational Needs</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Store rent, marketing campaigns, delivery fees & packaging procurement.
            </p>

            <div className="my-4 p-3 rounded-2xl bg-muted/40 border border-border">
              <div className="text-xs text-muted-foreground font-semibold">Total Allocated</div>
              <div className="text-2xl font-black text-foreground mt-0.5">
                <Money amount={alloc.needs} />
              </div>
            </div>
          </div>

          <Button
            size="md"
            variant="outline"
            className="w-full font-bold justify-between"
            onClick={() => openAllocateModal("NEEDS")}
          >
            <span>Fund Operations</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>

        {/* Bucket 3: Wants / Owner Draw (20%) */}
        <Card className="p-5 flex flex-col justify-between bg-card hover:shadow-md transition-all">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-success uppercase tracking-wider">
                20% Target Bucket
              </span>
              <div className="w-8 h-8 rounded-xl bg-success/10 text-success flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>

            <h3 className="text-base font-black text-foreground">Owner Draw & Profits</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Personal dividends, founder compensation & lifestyle rewards.
            </p>

            <div className="my-4 p-3 rounded-2xl bg-muted/40 border border-border">
              <div className="text-xs text-muted-foreground font-semibold">Total Allocated</div>
              <div className="text-2xl font-black text-foreground mt-0.5">
                <Money amount={alloc.wants} />
              </div>
            </div>
          </div>

          <Button
            size="md"
            variant="outline"
            className="w-full font-bold justify-between"
            onClick={() => openAllocateModal("WANTS")}
          >
            <span>Distribute Dividends</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </Card>
      </div>

      {/* Allocation History Ledger */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">Allocation History Ledger</h3>
            <p className="text-xs text-muted-foreground">
              Total distributed: {formatCurrency(alloc.totalAllocated)} • Remaining allocatable:{" "}
              {formatCurrency(alloc.remainingAllocatableProfit)}
            </p>
          </div>
        </div>

        {allocations.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <PiggyBank className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">No profit distributions logged yet</p>
            <p className="text-xs mt-1">Click "Allocate Profit" above to record your first split</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {allocations.map((a) => {
              const isSavings = a.type === "SAVINGS";
              const isNeeds = a.type === "NEEDS";

              return (
                <div
                  key={a.id}
                  className="p-3 rounded-xl bg-card border border-border/80 flex items-center justify-between text-xs"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSavings
                          ? "bg-primary/10 text-primary"
                          : isNeeds
                          ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                      }`}
                    >
                      {isSavings ? (
                        <PiggyBank className="w-4 h-4" />
                      ) : isNeeds ? (
                        <Scale className="w-4 h-4" />
                      ) : (
                        <Wallet className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {isSavings ? "Reinvestment Fund" : isNeeds ? "Operating Needs" : "Owner Draw"}
                        </span>
                        <Badge
                          variant={isSavings ? "gold" : isNeeds ? "warning" : "success"}
                        >
                          {a.type}
                        </Badge>
                      </div>

                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                        <span>{new Date(a.allocationDate).toLocaleDateString()}</span>
                        {a.source && <span>• Source: {a.source}</span>}
                        {a.notes && <span className="italic">"{a.notes}"</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-black text-foreground">
                      <Money amount={a.amount} />
                    </div>
                  </div>
                </div>
              );
            })}
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
