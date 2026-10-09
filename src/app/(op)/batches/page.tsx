"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
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

      {/* Summary Metrics Bar */}
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Active Shipments
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tabular-nums tracking-tight">
              {activeBatchesCount}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Currently selling through</div>
          </div>

          <div className="p-4 sm:p-5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Capital Invested
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tracking-tight">
              <Money amount={totalInvestedCapital} />
            </div>
            <div className="text-xs text-muted-foreground mt-1">Product wholesale + logistics</div>
          </div>

          <div className="p-4 sm:p-5 bg-muted/20">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Remaining Bottles
            </span>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1 tabular-nums tracking-tight">
              {totalUnitsInBatches}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Across active shipments</div>
          </div>
        </div>
      </Card>

      {/* Filter Segmented Control */}
      <div className="inline-flex p-0.5 bg-muted rounded-md border border-border">
        <button
          type="button"
          onClick={() => setStatusFilter("ACTIVE")}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
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
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
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
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            statusFilter === "ALL"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All Batches
        </button>
      </div>

      {/* Shipment Ledger */}
      {batches.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <p className="text-sm font-medium">No shipment batches found</p>
          <p className="text-xs mt-1">Create a new batch to start logging incoming inventory</p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold text-muted-foreground border-b border-border">
                <tr>
                  <th className="py-3 px-4">Shipment Reference</th>
                  <th className="py-3 px-4">Purchase Date</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4 text-right">Total Investment</th>
                  <th className="py-3 px-4 text-right">Landed Extra</th>
                  <th className="py-3 px-4">Sell-Through Rate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
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

                  return (
                    <tr key={batch.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">
                        <Link href={`/batches/${batch.id}`} className="hover:underline">
                          {batch.reference}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(batch.purchaseDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-xs text-foreground">
                        {batch.supplier?.name || "—"}
                      </td>
                      <td className="py-3 px-4 text-right text-xs font-medium text-foreground tabular-nums whitespace-nowrap">
                        <Money amount={batch.totalInvestment} />
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                        <Money amount={batch.additionalCosts} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-32 space-y-1">
                          <div className="flex justify-between text-[11px] text-muted-foreground">
                            <span>{progress}%</span>
                            <span className="tabular-nums">{soldCount}/{totalPurchased}</span>
                          </div>
                          <div className="w-full h-1.5 bg-muted rounded overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={isCompleted ? "outline" : "default"}>
                          {batch.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/batches/${batch.id}`)}
                          className="text-xs h-7 px-2.5"
                        >
                          Manage
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Row View */}
          <div className="md:hidden divide-y divide-border">
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

              return (
                <div key={batch.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{batch.reference}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(batch.purchaseDate).toLocaleDateString()}
                        {batch.supplier && ` • ${batch.supplier.name}`}
                      </div>
                    </div>
                    <Badge variant={isCompleted ? "outline" : "default"}>
                      {batch.status}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Sell-through</span>
                      <span className="font-medium text-foreground">{progress}% ({soldCount}/{totalPurchased})</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                    <div className="font-medium text-foreground">
                      Investment: <Money amount={batch.totalInvestment} />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/batches/${batch.id}`)}
                      className="text-xs h-7 px-2.5"
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
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
