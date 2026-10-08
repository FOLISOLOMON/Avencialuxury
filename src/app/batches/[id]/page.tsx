"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
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
  ConfirmDialog,
} from "@/components/ui";
import {
  Layers,
  ArrowLeft,
  Plus,
  Package,
  CheckCheck,
  AlertTriangle,
  Search,
  Barcode,
  Camera,
  Calendar,
  Truck,
  DollarSign,
  TrendingUp,
  X,
  Pencil,
  Boxes,
  Sparkles,
} from "lucide-react";

const CameraScanner = dynamic(() => import("@/components/scanner/CameraScanner"), { ssr: false });

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  size: string | null;
  category: string | null;
  sellingPriceNum?: number;
  defaultCostPriceNum?: number;
}

interface BatchItem {
  id: string;
  batchId: string;
  productId: string;
  quantityPurchased: number;
  quantityRemaining: number;
  unitCost: number;
  totalCost: number;
  product: Product;
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

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: batchId } = use(params);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Close Batch Confirm
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closing, setClosing] = useState(false);

  // Edit Additional Landed Cost Sheet
  const [isCostSheetOpen, setIsCostSheetOpen] = useState(false);
  const [additionalCostInput, setAdditionalCostInput] = useState("");
  const [costSubmitting, setCostSubmitting] = useState(false);

  // Add Item to Batch Sheet
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [addMode, setAddMode] = useState<"search" | "new">("search");
  const [addItemSubmitting, setAddItemSubmitting] = useState(false);
  const [addItemError, setAddItemError] = useState<string | null>(null);

  // Search existing product state
  const [productQuery, setProductQuery] = useState("");
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form Fields for Item
  const [itemQuantity, setItemQuantity] = useState("1");
  const [itemUnitCost, setItemUnitCost] = useState("0");

  // Form Fields for Inline New Product
  const [newName, setNewName] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newSize, setNewSize] = useState("100ml");
  const [newCategory, setNewCategory] = useState("Perfumes");
  const [newSku, setNewSku] = useState("");
  const [newBarcode, setNewBarcode] = useState("");
  const [newSellingPrice, setNewSellingPrice] = useState("");

  // Camera Scanner
  const [showCamera, setShowCamera] = useState(false);

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${batchId}`);
      const json = await res.json();
      if (json.success) {
        setBatch(json.data);
        setAdditionalCostInput(json.data.additionalCosts?.toString() || "0");
      } else {
        setError(json.error || "Failed to load batch");
      }
    } catch (err: any) {
      setError(err.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  // Search Catalog Products
  useEffect(() => {
    if (!productQuery.trim()) {
      setCatalogProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(productQuery)}`);
        const json = await res.json();
        if (json.success) setCatalogProducts(json.data || []);
      } catch (e) {}
    }, 250);
    return () => clearTimeout(timer);
  }, [productQuery]);

  const handleSaveCost = async (e: React.FormEvent) => {
    e.preventDefault();
    setCostSubmitting(true);
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ additionalCosts: parseFloat(additionalCostInput || "0") }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchBatch();
        setIsCostSheetOpen(false);
      } else {
        alert(json.error || "Failed to update cost");
      }
    } catch {
      alert("Server error");
    } finally {
      setCostSubmitting(false);
    }
  };

  const handleCloseBatch = async () => {
    setClosing(true);
    try {
      const res = await fetch(`/api/batches/${batchId}/close`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        await fetchBatch();
        setShowCloseConfirm(false);
      } else {
        alert(json.error || "Failed to close batch");
      }
    } catch {
      alert("Server error");
    } finally {
      setClosing(false);
    }
  };

  const handleAddExistingProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setAddItemError(null);

    const qty = parseInt(itemQuantity);
    if (isNaN(qty) || qty <= 0) {
      setAddItemError("Quantity must be greater than 0.");
      return;
    }

    setAddItemSubmitting(true);
    try {
      const res = await fetch(`/api/batches/${batchId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantityPurchased: qty,
          unitCost: parseFloat(itemUnitCost || "0"),
        }),
      });

      const json = await res.json();
      if (json.success) {
        await fetchBatch();
        setIsAddItemOpen(false);
        setSelectedProduct(null);
        setProductQuery("");
      } else {
        setAddItemError(json.error || "Failed to add item to batch");
      }
    } catch (err: any) {
      setAddItemError(err.message || "Server error");
    } finally {
      setAddItemSubmitting(false);
    }
  };

  const handleAddNewProductToBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddItemError(null);

    if (!newName.trim()) {
      setAddItemError("Product name is required.");
      return;
    }
    const sellPrice = parseFloat(newSellingPrice);
    if (isNaN(sellPrice) || sellPrice <= 0) {
      setAddItemError("Valid selling price is required.");
      return;
    }
    const qty = parseInt(itemQuantity);
    if (isNaN(qty) || qty <= 0) {
      setAddItemError("Quantity must be greater than 0.");
      return;
    }

    setAddItemSubmitting(true);
    try {
      // 1. Create product
      const prodRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          brand: newBrand.trim() || undefined,
          size: newSize || undefined,
          category: newCategory || undefined,
          sku: newSku.trim() || undefined,
          barcode: newBarcode.trim() || undefined,
          sellingPrice: sellPrice,
          defaultCostPrice: parseFloat(itemUnitCost || "0"),
        }),
      });

      const prodJson = await prodRes.json();
      if (!prodJson.success) {
        setAddItemError(prodJson.error || "Failed to create product");
        setAddItemSubmitting(false);
        return;
      }

      // 2. Add to batch
      const itemRes = await fetch(`/api/batches/${batchId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: prodJson.data.id,
          quantityPurchased: qty,
          unitCost: parseFloat(itemUnitCost || "0"),
        }),
      });

      const itemJson = await itemRes.json();
      if (itemJson.success) {
        await fetchBatch();
        setIsAddItemOpen(false);
        setNewName("");
        setNewBrand("");
        setNewSellingPrice("");
      } else {
        setAddItemError(itemJson.error || "Product created but failed to link to batch");
      }
    } catch (err: any) {
      setAddItemError(err.message || "Server error");
    } finally {
      setAddItemSubmitting(false);
    }
  };

  if (loading && !batch) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-muted-foreground font-semibold">Loading shipment details...</p>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
        <h2 className="text-base font-bold text-foreground">{error || "Batch not found"}</h2>
        <Button variant="outline" onClick={() => router.push("/batches")}>
          Return to Batches
        </Button>
      </div>
    );
  }

  const items = batch.batchItems || [];
  const totalPurchased = items.reduce((acc, i) => acc + (i.quantityPurchased || 0), 0);
  const totalRemaining = items.reduce((acc, i) => acc + (i.quantityRemaining || 0), 0);
  const totalSold = totalPurchased - totalRemaining;
  const sellThroughRate = totalPurchased > 0 ? Math.round((totalSold / totalPurchased) * 100) : 0;
  const isCompleted = batch.status === "COMPLETED";

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/batches"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Shipments</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Truck className="w-6 h-6 text-primary" />
              <span>{batch.reference}</span>
            </h1>
            <Badge variant={isCompleted ? "secondary" : "success"}>{batch.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Purchased {new Date(batch.purchaseDate).toLocaleDateString()}
            {batch.supplier && ` • Vendor: ${batch.supplier.name}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!isCompleted && (
            <>
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsCostSheetOpen(true)}
                className="gap-1.5"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Landed Cost</span>
              </Button>

              <Button
                size="md"
                className="gap-2 font-bold"
                onClick={() => {
                  setSelectedProduct(null);
                  setProductQuery("");
                  setItemQuantity("1");
                  setItemUnitCost("0");
                  setIsAddItemOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Add Items</span>
              </Button>

              <Button
                variant="ghost"
                size="md"
                onClick={() => setShowCloseConfirm(true)}
                className="text-muted-foreground hover:text-destructive"
              >
                Close Batch
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Financial & Inventory Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Total Investment
          </span>
          <div className="text-2xl font-black text-foreground mt-1">
            <Money amount={batch.totalInvestment} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Products: {formatCurrency(batch.purchaseCost)}
          </div>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Extra Landed Costs
          </span>
          <div className="text-2xl font-black text-primary mt-1">
            <Money amount={batch.additionalCosts} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Shipping & import duties
          </div>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Units Remaining
          </span>
          <div className="text-2xl font-black text-foreground tabular-nums mt-1">
            {totalRemaining} / {totalPurchased}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {totalSold} units sold
          </div>
        </Card>

        <Card className="p-4">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">
            Sell-Through
          </span>
          <div className="text-2xl font-black text-success mt-1">{sellThroughRate}%</div>
          <div className="w-full h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
            <div
              className="h-full bg-success rounded-full"
              style={{ width: `${sellThroughRate}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Shipment Manifest / Items Table */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-foreground">Shipment Manifest</h3>
            <p className="text-xs text-muted-foreground">
              {items.length} unique perfume lines in this consignment
            </p>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-semibold">No products added yet</p>
            <p className="text-xs mt-1">Click "Add Items" to log perfume bottles into this batch</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const itemProgress =
                item.quantityPurchased > 0
                  ? Math.round(
                      ((item.quantityPurchased - item.quantityRemaining) / item.quantityPurchased) *
                        100
                    )
                  : 0;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-foreground leading-snug">
                        {item.product.name}
                      </h4>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        {item.product.sku && <span>SKU: {item.product.sku}</span>}
                        <span>•</span>
                        <span>Unit Cost: {formatCurrency(item.unitCost)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-bold text-foreground">
                        {item.quantityRemaining} of {item.quantityPurchased} left
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {itemProgress}% sold through
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black text-foreground">
                        <Money amount={item.totalCost} />
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase font-semibold">
                        Total Cost
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* EDIT LANDED COST SHEET */}
      <Sheet
        isOpen={isCostSheetOpen}
        onClose={() => setIsCostSheetOpen(false)}
        title="Update Landed Costs"
        description="Add air freight, shipping or customs clearance costs"
      >
        <form onSubmit={handleSaveCost} className="space-y-4 pt-2">
          <Input
            label="Additional Shipping & Clearing Cost (GH₵)"
            type="number"
            step="any"
            min="0"
            value={additionalCostInput}
            onChange={(e) => setAdditionalCostInput(e.target.value)}
            required
          />

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsCostSheetOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-black"
              isLoading={costSubmitting}
            >
              Save Costs
            </Button>
          </div>
        </form>
      </Sheet>

      {/* ADD ITEMS TO BATCH SHEET */}
      <Sheet
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title="Add Inventory Item to Shipment"
        description="Select from existing catalog or register a new perfume SKU"
      >
        <div className="space-y-4 pt-2">
          {addItemError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{addItemError}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="inline-flex p-1 bg-muted rounded-xl border border-border w-full">
            <button
              type="button"
              onClick={() => setAddMode("search")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                addMode === "search"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Existing Catalog SKU
            </button>
            <button
              type="button"
              onClick={() => setAddMode("new")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                addMode === "new"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Create New Perfume
            </button>
          </div>

          {addMode === "search" ? (
            <form onSubmit={handleAddExistingProduct} className="space-y-4">
              {!selectedProduct ? (
                <div className="space-y-3">
                  <SearchField
                    value={productQuery}
                    onChange={setProductQuery}
                    placeholder="Search existing perfumes by name or SKU..."
                  />

                  {catalogProducts.length > 0 && (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {catalogProducts.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedProduct(p);
                            setItemUnitCost(p.defaultCostPriceNum?.toString() || "0");
                          }}
                          className="w-full text-left p-2.5 rounded-xl border border-border/80 hover:border-primary/60 hover:bg-muted/40 transition-all flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-foreground">{p.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {p.sku || p.category || "Perfume"}
                            </div>
                          </div>
                          <Plus className="w-4 h-4 text-primary" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-foreground">{selectedProduct.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {selectedProduct.sku && `SKU: ${selectedProduct.sku}`}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedProduct(null)}
                    className="text-xs"
                  >
                    Change
                  </Button>
                </div>
              )}

              {selectedProduct && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Quantity Purchased (Bottles)"
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(e.target.value)}
                      required
                    />
                    <Input
                      label="Unit Wholesale Cost (GH₵)"
                      type="number"
                      step="any"
                      min="0"
                      value={itemUnitCost}
                      onChange={(e) => setItemUnitCost(e.target.value)}
                      required
                    />
                  </div>

                  <div className="pt-2 flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsAddItemOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="flex-1 font-black"
                      isLoading={addItemSubmitting}
                    >
                      Add to Batch
                    </Button>
                  </div>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={handleAddNewProductToBatch} className="space-y-4">
              <Input
                label="Perfume Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Baccarat Rouge 540 Extrait"
                required
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Brand / House"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="e.g. MFK"
                />
                <Select
                  label="Size"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  options={[
                    { value: "30ml", label: "30ml" },
                    { value: "50ml", label: "50ml" },
                    { value: "100ml", label: "100ml" },
                    { value: "200ml", label: "200ml" },
                  ]}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Selling Price (GH₵)"
                  type="number"
                  step="any"
                  min="0"
                  value={newSellingPrice}
                  onChange={(e) => setNewSellingPrice(e.target.value)}
                  placeholder="0.00"
                  required
                />
                <Input
                  label="Wholesale Cost in Batch (GH₵)"
                  type="number"
                  step="any"
                  min="0"
                  value={itemUnitCost}
                  onChange={(e) => setItemUnitCost(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <Input
                label="Quantity in this Shipment (Bottles)"
                type="number"
                min="1"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(e.target.value)}
                required
              />

              <div className="pt-2 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsAddItemOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 font-black"
                  isLoading={addItemSubmitting}
                >
                  Create & Add
                </Button>
              </div>
            </form>
          )}
        </div>
      </Sheet>

      {/* CLOSE BATCH CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={showCloseConfirm}
        title="Mark Shipment as Completed?"
        message="This closes the batch for further additions. Remaining inventory units will continue to be allocated according to FIFO logic."
        confirmLabel="Complete Shipment"
        variant="primary"
        isLoading={closing}
        onClose={() => setShowCloseConfirm(false)}
        onConfirm={handleCloseBatch}
      />
    </div>
  );
}
