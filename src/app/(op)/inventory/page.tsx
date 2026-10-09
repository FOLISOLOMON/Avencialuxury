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

      {/* Summary Metrics Bar */}
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Stock Units
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tabular-nums tracking-tight">
              {summary?.totalUnitsInStock || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Physical bottles on hand</div>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Wholesale Valuation
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tracking-tight">
              <Money amount={summary?.totalStockCostValue || 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Total inventory cost</div>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Potential Revenue
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tracking-tight">
              <Money amount={summary?.totalStockPotentialRevenue || 0} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">At retail list price</div>
          </div>

          <div className="p-4 sm:p-5 bg-muted/20">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Low Stock Alerts
            </span>
            <div className="text-xl sm:text-2xl font-bold text-warning mt-1 tabular-nums tracking-tight">
              {summary?.lowStockCount || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Below alert threshold</div>
          </div>
        </div>
      </Card>

      {/* Filter Toolbar */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search inventory by product name or SKU..."
            />
          </div>

          <div className="inline-flex p-0.5 bg-muted rounded-md border border-border self-start sm:self-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("ALL")}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors shrink-0 ${
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
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors shrink-0 ${
                activeTab === "LOW_STOCK"
                  ? "bg-card text-warning shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Low Stock ({summary?.lowStockCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("OUT_OF_STOCK")}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors shrink-0 ${
                activeTab === "OUT_OF_STOCK"
                  ? "bg-card text-destructive shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Out of Stock
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("LEDGER")}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors shrink-0 ${
                activeTab === "LEDGER"
                  ? "bg-card text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Audit Trail ({ledger.length})
            </button>
          </div>
        </div>
      </Card>

      {/* Inventory Products (Tab: ALL, LOW_STOCK, OUT_OF_STOCK) */}
      {activeTab !== "LEDGER" && (
        <Card className="p-0 overflow-hidden">
          {filteredProducts.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <p className="text-sm font-medium">No products match this stock filter</p>
            </div>
          ) : (
            <div>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Stock Level</th>
                      <th className="py-3 px-4 text-right">Cost Valuation</th>
                      <th className="py-3 px-4 text-right">Potential Revenue</th>
                      <th className="py-3 px-4 text-center">Batches</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredProducts.map((p) => {
                      const isOut = p.stockUnits <= 0;
                      const isLow = p.isLowStock && !isOut;

                      return (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-foreground">{p.name}</div>
                            {p.sku && (
                              <div className="text-xs text-muted-foreground">SKU: {p.sku}</div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {p.category || "Perfumes"}
                          </td>
                          <td className="py-3 px-4">
                            {isOut ? (
                              <Badge variant="destructive">0 units</Badge>
                            ) : isLow ? (
                              <Badge variant="warning">{p.stockUnits} units</Badge>
                            ) : (
                              <span className="text-xs font-medium text-foreground tabular-nums">
                                {p.stockUnits} units
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-medium text-foreground tabular-nums">
                            <Money amount={p.stockCostValue} />
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-medium text-foreground tabular-nums">
                            <Money amount={p.potentialRevenue} />
                          </td>
                          <td className="py-3 px-4 text-center text-xs text-muted-foreground tabular-nums">
                            {p.activeBatchesCount}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAdjustModal(p.id)}
                              className="text-xs h-7 px-2.5"
                            >
                              Adjust
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Rows View */}
              <div className="md:hidden divide-y divide-border">
                {filteredProducts.map((p) => {
                  const isOut = p.stockUnits <= 0;
                  const isLow = p.isLowStock && !isOut;

                  return (
                    <div key={p.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-foreground">{p.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {p.category || "Perfumes"} {p.sku ? `• ${p.sku}` : ""}
                          </div>
                        </div>
                        {isOut ? (
                          <Badge variant="destructive">Out</Badge>
                        ) : isLow ? (
                          <Badge variant="warning">{p.stockUnits} left</Badge>
                        ) : (
                          <span className="text-xs font-medium text-foreground tabular-nums">
                            {p.stockUnits} units
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                        <div className="text-muted-foreground">
                          Valuation: <Money amount={p.stockCostValue} />
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAdjustModal(p.id)}
                          className="text-xs h-7 px-2"
                        >
                          Adjust
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Audit History Ledger (Tab: LEDGER) */}
      {activeTab === "LEDGER" && (
        <Card className="p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Inventory Audit Entries
            </h3>
            <span className="text-xs text-muted-foreground">{ledger.length} events logged</span>
          </div>

          {ledger.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-xs">No ledger entries recorded yet</p>
            </div>
          ) : (
            <div>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Batch</th>
                      <th className="py-3 px-4">Notes</th>
                      <th className="py-3 px-4 text-right">Adjustment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {ledger.map((txn) => {
                      const isDeduction =
                        txn.type === "SALE" ||
                        txn.type === "DAMAGE" ||
                        txn.type === "TESTER" ||
                        txn.type === "LOSS" ||
                        txn.type === "ADJUSTMENT_OUT";

                      return (
                        <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(txn.createdAt).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-medium text-foreground">
                            {txn.product.name}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{txn.type}</Badge>
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground">
                            {txn.batch?.reference || "—"}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground italic">
                            {txn.note || "—"}
                          </td>
                          <td className="py-3 px-4 text-right text-xs font-semibold tabular-nums whitespace-nowrap">
                            <span className={isDeduction ? "text-destructive" : "text-foreground"}>
                              {isDeduction ? `-${txn.quantity}` : `+${txn.quantity}`} units
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Rows */}
              <div className="md:hidden divide-y divide-border">
                {ledger.map((txn) => {
                  const isDeduction =
                    txn.type === "SALE" ||
                    txn.type === "DAMAGE" ||
                    txn.type === "TESTER" ||
                    txn.type === "LOSS" ||
                    txn.type === "ADJUSTMENT_OUT";

                  return (
                    <div key={txn.id} className="p-3 text-xs flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="font-medium text-foreground">{txn.product.name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {txn.type} • {new Date(txn.createdAt).toLocaleDateString()}
                        </div>
                        {txn.note && (
                          <div className="text-[11px] text-muted-foreground italic">
                            "{txn.note}"
                          </div>
                        )}
                      </div>
                      <div className={`font-semibold tabular-nums ${isDeduction ? "text-destructive" : "text-foreground"}`}>
                        {isDeduction ? `-${txn.quantity}` : `+${txn.quantity}`}
                      </div>
                    </div>
                  );
                })}
              </div>
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
