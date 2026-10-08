"use client";

import { useState, useEffect, useMemo } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Button,
  IconButton,
  Input,
  Select,
  Textarea,
  SearchField,
  Sheet,
  Card,
  Badge,
  Money,
} from "@/components/ui";
import {
  Boxes,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  PackageCheck,
  History,
  Plus,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

interface InventoryProduct {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  lowStockThreshold: number;
  stockUnits: number;
  stockCostValue: number;
  potentialRevenue: number;
  isLowStock: boolean;
  activeBatchesCount: number;
}

interface InventorySummary {
  totalUnitsInStock: number;
  totalStockCostValue: number;
  totalStockPotentialRevenue: number;
  lowStockCount: number;
  products: InventoryProduct[];
}

interface InventoryTxn {
  id: string;
  type: string;
  quantity: number;
  note: string | null;
  referenceId: string | null;
  createdAt: string;
  product: {
    name: string;
    sku: string | null;
  };
  batch: {
    reference: string;
  } | null;
}

export default function InventoryPage() {
  const [summary, setSummary] = useState<InventorySummary | null>(null);
  const [ledger, setLedger] = useState<InventoryTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Operational Filter Tabs
  const [activeTab, setActiveTab] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK" | "LEDGER">("ALL");
  const [search, setSearch] = useState("");

  // Stock Adjustment Sheet
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustType, setAdjustType] = useState<
    "DAMAGE" | "TESTER" | "LOSS" | "ADJUSTMENT_IN" | "ADJUSTMENT_OUT"
  >("DAMAGE");
  const [adjustQuantity, setAdjustQuantity] = useState("1");
  const [adjustNote, setAdjustNote] = useState("");
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustError, setAdjustError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const searchParam = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/inventory${searchParam}`);
      const json = await res.json();

      if (json.success) {
        setSummary(json.data.summary);
        setLedger(json.data.ledger || []);
      } else {
        setError(json.error || "Failed to load inventory data");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const openAdjustModal = (productId?: string) => {
    setAdjustProductId(productId || (summary?.products[0]?.id || ""));
    setAdjustType("DAMAGE");
    setAdjustQuantity("1");
    setAdjustNote("");
    setAdjustError(null);
    setIsAdjustOpen(true);
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjustError(null);

    const qty = parseInt(adjustQuantity);
    if (isNaN(qty) || qty <= 0) {
      setAdjustError("Quantity must be a positive number.");
      return;
    }

    setAdjustSubmitting(true);
    try {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: adjustProductId,
          type: adjustType,
          quantity: qty,
          note: adjustNote.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsAdjustOpen(false);
        fetchData();
      } else {
        setAdjustError(json.error || "Adjustment failed");
      }
    } catch (err: any) {
      setAdjustError(err.message || "Server error");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const products = summary?.products || [];

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (activeTab === "LOW_STOCK") return p.isLowStock && p.stockUnits > 0;
      if (activeTab === "OUT_OF_STOCK") return p.stockUnits <= 0;
      return true;
    });
  }, [products, activeTab]);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header & Adjust Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Inventory & Stock Auditing
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time stock valuation, tester/damage write-offs & audit trail
          </p>
        </div>

        <Button
          onClick={() => openAdjustModal()}
          size="md"
          className="gap-2 font-bold self-start sm:self-auto"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Adjust Stock</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Total Stock Units</span>
            <Boxes className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {summary?.totalUnitsInStock || 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Physical bottles on hand</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Wholesale Value</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            <Money amount={summary?.totalStockCostValue || 0} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Total inventory cost</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Potential Revenue</span>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <div className="text-2xl font-black text-success">
            <Money amount={summary?.totalStockPotentialRevenue || 0} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">At current selling prices</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Low Stock SKUs</span>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <div className="text-2xl font-black text-warning">
            {summary?.lowStockCount || 0}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Below alert threshold</div>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search inventory by product name or SKU..."
            />
          </div>

          <div className="inline-flex p-1 bg-muted rounded-xl border border-border self-start sm:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === "ALL"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Stock ({products.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("LOW_STOCK")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === "LOW_STOCK"
                  ? "bg-card text-warning shadow-sm font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Low Stock ({summary?.lowStockCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("OUT_OF_STOCK")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === "OUT_OF_STOCK"
                  ? "bg-card text-destructive shadow-sm font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Out of Stock
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("LEDGER")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                activeTab === "LEDGER"
                  ? "bg-card text-primary shadow-sm font-black"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Audit Trail ({ledger.length})
            </button>
          </div>
        </div>
      </Card>

      {/* Inventory Products List (Tab: ALL, LOW_STOCK, OUT_OF_STOCK) */}
      {activeTab !== "LEDGER" && (
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <Boxes className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No products match this stock filter</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredProducts.map((p) => {
                const isOut = p.stockUnits <= 0;
                const isLow = p.isLowStock && !isOut;

                return (
                  <Card
                    key={p.id}
                    className="p-4 flex flex-col justify-between hover:border-primary/40 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          {p.category || "Perfumes"}
                        </span>
                        {isOut ? (
                          <Badge variant="destructive">0 Units</Badge>
                        ) : isLow ? (
                          <Badge variant="warning">{p.stockUnits} Low Stock</Badge>
                        ) : (
                          <Badge variant="success">{p.stockUnits} In Stock</Badge>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-foreground line-clamp-1">{p.name}</h3>
                      {p.sku && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">SKU: {p.sku}</div>
                      )}

                      {/* Stock Valuation Breakdown */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-xs mt-3">
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Cost Value
                          </div>
                          <div className="font-bold text-foreground mt-0.5">
                            <Money amount={p.stockCostValue} />
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                            Potential Rev
                          </div>
                          <div className="font-bold text-success mt-0.5">
                            <Money amount={p.potentialRevenue} />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-border/60 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">
                        {p.activeBatchesCount} active {p.activeBatchesCount === 1 ? "batch" : "batches"}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openAdjustModal(p.id)}
                        className="text-xs"
                      >
                        Adjust
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Audit History Ledger (Tab: LEDGER) */}
      {activeTab === "LEDGER" && (
        <Card className="p-4 space-y-3">
          <div className="pb-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Recent Inventory Audit Entries
            </h3>
            <span className="text-xs text-muted-foreground">{ledger.length} events logged</span>
          </div>

          {ledger.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs font-semibold">No ledger entries recorded yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {ledger.map((txn) => {
                const isDeduction =
                  txn.type === "SALE" ||
                  txn.type === "DAMAGE" ||
                  txn.type === "TESTER" ||
                  txn.type === "LOSS" ||
                  txn.type === "ADJUSTMENT_OUT";

                return (
                  <div
                    key={txn.id}
                    className="p-3 rounded-xl bg-card border border-border/80 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isDeduction
                            ? "bg-destructive/10 text-destructive"
                            : "bg-success/10 text-success"
                        }`}
                      >
                        {isDeduction ? (
                          <ArrowDownRight className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div>
                        <div className="font-bold text-foreground">{txn.product.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                          <Badge variant="outline">{txn.type}</Badge>
                          <span>{new Date(txn.createdAt).toLocaleString()}</span>
                          {txn.batch && <span>• Batch: {txn.batch.reference}</span>}
                        </div>
                        {txn.note && (
                          <div className="text-[11px] text-muted-foreground mt-1 italic">
                            "{txn.note}"
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-black tabular-nums ${
                          isDeduction ? "text-destructive" : "text-success"
                        }`}
                      >
                        {isDeduction ? `-${txn.quantity}` : `+${txn.quantity}`} units
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* STOCK ADJUSTMENT SHEET */}
      <Sheet
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        title="Stock Adjustment & Audit"
        description="Record testers, damaged bottles, loss or inventory reconciliation"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-4 pt-2">
          {adjustError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{adjustError}</span>
            </div>
          )}

          <Select
            label="Product"
            value={adjustProductId}
            onChange={(e) => setAdjustProductId(e.target.value)}
            options={products.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.stockUnits} in stock)`,
            }))}
          />

          <Select
            label="Adjustment Reason / Type"
            value={adjustType}
            onChange={(e) => setAdjustType(e.target.value as any)}
            options={[
              { value: "DAMAGE", label: "Damaged / Broken Bottle" },
              { value: "TESTER", label: "Store Tester / Sample Use" },
              { value: "LOSS", label: "Lost / Missing Unit" },
              { value: "ADJUSTMENT_IN", label: "Found Stock / Count Addition (+)" },
              { value: "ADJUSTMENT_OUT", label: "Manual Count Deduction (-)" },
            ]}
          />

          <Input
            label="Quantity of Bottles"
            type="number"
            min="1"
            value={adjustQuantity}
            onChange={(e) => setAdjustQuantity(e.target.value)}
            required
          />

          <Textarea
            label="Audit Explanation / Reason"
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
            placeholder="e.g. Broken in transit, opened for shop customer sampling..."
          />

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsAdjustOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-black"
              isLoading={adjustSubmitting}
            >
              Apply Adjustment
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
