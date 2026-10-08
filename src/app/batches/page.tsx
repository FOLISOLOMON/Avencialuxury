"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
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
  Layers,
  Plus,
  Calendar,
  AlertTriangle,
  Package,
  CheckCheck,
  ArrowRight,
  Truck,
  TrendingUp,
  DollarSign,
  Boxes,
  Clock,
  Sparkles,
} from "lucide-react";

interface BatchItem {
  id: string;
  quantityPurchased: number;
  quantityRemaining: number;
  unitCost: number;
  totalCost: number;
  product: { id: string; name: string; sku: string | null };
}

interface Batch {
  id: string;
  reference: string;
  purchaseDate: string;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
  purchaseCost: number;
  additionalCosts: number;
  totalInvestment: number;
  notes: string | null;
  supplier?: { id: string; name: string } | null;
  batchItems: BatchItem[];
}

export default function BatchesPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "COMPLETED">("ACTIVE");

  // Create Batch Sheet
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);

  // Form Fields
  const [reference, setReference] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [additionalCosts, setAdditionalCosts] = useState("0");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");

  const fetchBatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = statusFilter !== "ALL" ? `?status=${statusFilter}` : "";
      const res = await fetch(`/api/batches${q}`);
      const json = await res.json();
      if (json.success) setBatches(json.data || []);
      else setError(json.error || "Failed to load batches");
    } catch (err: any) {
      setError(err.message || "Failed to fetch batches");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [statusFilter]);

  // Global Header Event Listener
  useEffect(() => {
    const handler = () => openCreateModal();
    window.addEventListener("avencia:open-add-batch", handler);
    return () => window.removeEventListener("avencia:open-add-batch", handler);
  }, []);

  const openCreateModal = async () => {
    const today = new Date().toISOString().split("T")[0];
    const autoRef = `BATCH-${today.replace(/-/g, "")}-${Math.floor(100 + Math.random() * 900)}`;
    setReference(autoRef);
    setPurchaseDate(today);
    setAdditionalCosts("0");
    setSupplierId("");
    setNotes("");
    setFormError(null);
    setIsModalOpen(true);

    try {
      const res = await fetch("/api/suppliers");
      const json = await res.json();
      if (json.success) setSuppliers(json.data || []);
    } catch (e) {}
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!reference.trim()) {
      setFormError("Batch reference is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: reference.trim(),
          purchaseDate,
          additionalCosts: parseFloat(additionalCosts || "0"),
          supplierId: supplierId || undefined,
          notes: notes.trim() || undefined,
          items: [],
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        router.push(`/batches/${json.data.id}`);
      } else {
        setFormError(json.error || "Could not create batch");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to create shipment batch");
    } finally {
      setSubmitting(false);
    }
  };

  // Metrics
  const activeBatchesCount = useMemo(
    () => batches.filter((b) => b.status === "ACTIVE").length,
    [batches]
  );
  const totalInvestedCapital = useMemo(
    () => batches.reduce((sum, b) => sum + Number(b.totalInvestment || 0), 0),
    [batches]
  );
  const totalUnitsInBatches = useMemo(
    () =>
      batches.reduce(
        (sum, b) =>
          sum + (b.batchItems || []).reduce((acc, i) => acc + (i.quantityRemaining || 0), 0),
        0
      ),
    [batches]
  );

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header & New Batch Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Inventory Batches & Shipments
          </h1>
          <p className="text-sm text-muted-foreground">
            Track imported perfume batches, landed costs & FIFO inventory allocation
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          size="md"
          className="gap-2 font-bold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Shipment Batch</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Active Shipments</span>
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{activeBatchesCount}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Currently selling through
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Total Capital Invested</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            <Money amount={totalInvestedCapital} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Product wholesale + logistics
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Remaining Bottles</span>
            <Boxes className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">
            {totalUnitsInBatches}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Across active shipments
          </div>
        </Card>
      </div>

      {/* Filter Segmented Control */}
      <div className="inline-flex p-1 bg-muted rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setStatusFilter("ACTIVE")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === "ACTIVE"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Active Shipments
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("COMPLETED")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === "COMPLETED"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Completed / Sold Out
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            statusFilter === "ALL"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Batches
        </button>
      </div>

      {/* Batch Cards Grid */}
      {batches.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No shipment batches found</p>
          <p className="text-xs mt-1">Create a new batch to start logging incoming inventory</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch) => {
            const totalPurchased = (batch.batchItems || []).reduce(
              (acc, i) => acc + (i.quantityPurchased || 0),
              0
            );
            const totalRemaining = (batch.batchItems || []).reduce(
              (acc, i) => acc + (i.quantityRemaining || 0),
              0
            );
            const soldCount = totalPurchased - totalRemaining;
            const progress = totalPurchased > 0 ? Math.round((soldCount / totalPurchased) * 100) : 0;
            const isCompleted = batch.status === "COMPLETED";

            const purchaseDateStr = new Date(batch.purchaseDate).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Card
                key={batch.id}
                className="p-5 flex flex-col justify-between hover:border-primary/40 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-primary" />
                      {batch.reference}
                    </span>

                    <Badge variant={isCompleted ? "secondary" : "success"}>
                      {batch.status}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center gap-2 mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Purchased {purchaseDateStr}</span>
                    {batch.supplier && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-foreground">{batch.supplier.name}</span>
                      </>
                    )}
                  </div>

                  {/* Financial Stats */}
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs mb-3">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Total Investment
                      </div>
                      <div className="font-black text-foreground mt-0.5">
                        <Money amount={batch.totalInvestment} />
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Landed Extra Costs
                      </div>
                      <div className="font-black text-muted-foreground mt-0.5">
                        <Money amount={batch.additionalCosts} />
                      </div>
                    </div>
                  </div>

                  {/* Sell-Through Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Sell-through rate</span>
                      <span className="font-bold text-foreground">{progress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{soldCount} units sold</span>
                      <span>{totalRemaining} units left</span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-4 mt-4 border-t border-border/60">
                  <Button
                    size="md"
                    variant="outline"
                    className="w-full justify-between group-hover:border-primary/60 group-hover:text-primary transition-all font-bold"
                    onClick={() => router.push(`/batches/${batch.id}`)}
                  >
                    <span>Manage Shipment & Items</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE BATCH SHEET */}
      <Sheet
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Shipment Batch"
        description="Initialize a new inventory purchase order or imported shipment"
      >
        <form onSubmit={handleCreateBatch} className="space-y-4 pt-2">
          {formError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Shipment Reference / Invoice #"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. BATCH-202610-001"
            required
          />

          <Input
            label="Purchase / Import Date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            required
          />

          <Input
            label="Additional Landed Costs (Logistics / Shipping GH₵)"
            type="number"
            step="any"
            min="0"
            value={additionalCosts}
            onChange={(e) => setAdditionalCosts(e.target.value)}
            placeholder="0.00"
          />

          {suppliers.length > 0 && (
            <Select
              label="Supplier / Vendor (Optional)"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              options={[
                { value: "", label: "Select vendor (or leave blank)" },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          )}

          <Textarea
            label="Shipment Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Air freight tracking #, customs clearing notes..."
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
              Create & Add Items
            </Button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}
