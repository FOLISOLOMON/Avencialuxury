"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, generateProductSku } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Layers,
  ArrowLeft,
  Plus,
  Scan,
  Package,
  Trash2,
  CheckCheck,
  X,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Barcode,
  Camera,
  Calendar,
  Truck,
  Info,
  ShoppingBag,
  Tag,
  Sparkles,
  Edit3,
  Save,
} from "lucide-react";
import dynamic from "next/dynamic";

const CameraScanner = dynamic(() => import("@/components/scanner/CameraScanner"), { ssr: false });

interface Product {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  size: string | null;
  category: string | null;
  sellingPrice: number;
  defaultCostPrice: number;
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
  batchItems: BatchItem[];
}

type AddProductStep = "scan" | "fill-existing" | "fill-new" | "confirm";

interface NewProductForm {
  name: string;
  brand: string;
  size: string;
  category: string;
  sku: string;
  barcode: string;
  sellingPrice: string;
  defaultCostPrice: string;
}

const emptyNewProduct: NewProductForm = {
  name: "",
  brand: "",
  size: "",
  category: "",
  sku: "",
  barcode: "",
  sellingPrice: "",
  defaultCostPrice: "",
};

export default function BatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: batchId } = use(params);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Add Cost Modal state
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [additionalCostInput, setAdditionalCostInput] = useState("");
  const [costSubmitting, setCostSubmitting] = useState(false);

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
        setIsCostModalOpen(false);
      } else {
        alert(json.error || "Failed to update cost");
      }
    } catch {
      alert("Server error");
    } finally {
      setCostSubmitting(false);
    }
  };

  // Add Product Panel State
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [step, setStep] = useState<AddProductStep>("scan");
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelSuccess, setPanelSuccess] = useState<string | null>(null);

  // Scan / Search
  const [scanInput, setScanInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Camera scanner
  const [showCamera, setShowCamera] = useState(false);

  // Selected product (existing) or new product form
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState<NewProductForm>(emptyNewProduct);

  // Qty + cost (shared for both paths)
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");

  // Tab: scan barcode vs search by name
  const [inputMode, setInputMode] = useState<"barcode" | "search">("barcode");

  const fetchBatch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/batches/${batchId}`);
      const json = await res.json();
      if (json.success) setBatch(json.data);
      else setError(json.error || "Failed to load batch");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    fetchBatch();
  }, [fetchBatch]);

  useEffect(() => {
    if (isPanelOpen && step === "scan" && inputMode === "barcode") {
      setTimeout(() => barcodeInputRef.current?.focus(), 150);
    }
  }, [isPanelOpen, step, inputMode]);

  useEffect(() => {
    if (inputMode !== "search" || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}`);
        const json = await res.json();
        if (json.success) setSearchResults(json.data.slice(0, 8));
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, inputMode]);

  const resetPanel = () => {
    setStep("scan");
    setScanInput("");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedProduct(null);
    setNewProduct(emptyNewProduct);
    setQuantity("1");
    setUnitCost("0");
    setPanelError(null);
    setPanelSuccess(null);
    setPanelLoading(false);
  };

  const openPanel = () => {
    resetPanel();
    setIsPanelOpen(true);
  };

  const closePanel = () => {
    setIsPanelOpen(false);
    resetPanel();
  };

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode.trim()) return;
    setPanelLoading(true);
    setPanelError(null);
    try {
      const res = await fetch(`/api/products/barcode?code=${encodeURIComponent(barcode.trim())}`);
      const json = await res.json();
      if (json.success && json.data) {
        const product: Product = json.data;
        setSelectedProduct(product);
        setUnitCost(product.defaultCostPrice?.toString() || "0");
        setStep("fill-existing");
      } else {
        setNewProduct({ ...emptyNewProduct, barcode: barcode.trim() });
        setStep("fill-new");
      }
    } catch {
      setPanelError("Failed to look up barcode. Please try again.");
    } finally {
      setPanelLoading(false);
    }
  };

  const handleSelectExistingProduct = (product: Product) => {
    setSelectedProduct(product);
    setUnitCost(product.defaultCostPrice?.toString() || "0");
    setSearchResults([]);
    setSearchQuery("");
    setStep("fill-existing");
  };

  const handleSaveExistingItem = async () => {
    if (!selectedProduct) return;
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setPanelError("Quantity must be a positive whole number.");
      return;
    }
    setPanelLoading(true);
    setPanelError(null);
    try {
      const res = await fetch(`/api/batches/${batchId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantityPurchased: qty,
          unitCost: parseFloat(unitCost) || 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPanelSuccess(`✓ ${qty} × ${selectedProduct.name} added to batch`);
        await fetchBatch();
        setTimeout(() => {
          resetPanel();
        }, 1500);
      } else {
        setPanelError(json.error || "Failed to add product");
      }
    } catch (err: any) {
      setPanelError(err.message || "Server error");
    } finally {
      setPanelLoading(false);
    }
  };

  const handleSaveNewProduct = async () => {
    if (!newProduct.name.trim()) {
      setPanelError("Product name is required.");
      return;
    }
    const sellingPriceNum = parseFloat(newProduct.sellingPrice);
    if (isNaN(sellingPriceNum) || sellingPriceNum < 0) {
      setPanelError("Enter a valid selling price.");
      return;
    }
    const qty = parseInt(quantity);
    if (isNaN(qty) || qty <= 0) {
      setPanelError("Quantity must be a positive whole number.");
      return;
    }

    setPanelLoading(true);
    setPanelError(null);
    try {
      const prodRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProduct.name.trim(),
          brand: newProduct.brand.trim() || undefined,
          size: newProduct.size.trim() || undefined,
          category: newProduct.category.trim() || undefined,
          sku: newProduct.sku.trim() || undefined,
          barcode: newProduct.barcode.trim() || undefined,
          sellingPrice: sellingPriceNum,
          defaultCostPrice: parseFloat(unitCost) || 0,
        }),
      });
      const prodJson = await prodRes.json();
      if (!prodJson.success) {
        setPanelError(prodJson.error || "Failed to create product");
        setPanelLoading(false);
        return;
      }

      const createdProduct: Product = prodJson.data;

      const itemRes = await fetch(`/api/batches/${batchId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: createdProduct.id,
          quantityPurchased: qty,
          unitCost: parseFloat(unitCost) || 0,
        }),
      });
      const itemJson = await itemRes.json();
      if (itemJson.success) {
        setPanelSuccess(`✓ New product "${createdProduct.name}" created & added to batch`);
        await fetchBatch();
        setTimeout(() => {
          resetPanel();
        }, 1800);
      } else {
        setPanelError(itemJson.error || "Product created but failed to add to batch");
      }
    } catch (err: any) {
      setPanelError(err.message || "Server error");
    } finally {
      setPanelLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin" />
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-6 rounded-2xl text-rose-700 dark:text-rose-300 text-sm flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0" />
        <span>{error || "Batch not found"}</span>
      </div>
    );
  }

  const totalPurchased = batch.batchItems.reduce((a, b) => a + b.quantityPurchased, 0);
  const totalRemaining = batch.batchItems.reduce((a, b) => a + b.quantityRemaining, 0);
  const totalSold = Math.max(0, totalPurchased - totalRemaining);
  const sellThrough = totalPurchased > 0 ? Math.round((totalSold / totalPurchased) * 100) : 0;
  const isHighSellThrough = sellThrough >= 80;
  const isActive = batch.status === "ACTIVE";

  const totalRevenue = batch.batchItems.reduce(
    (sum, item) => sum + (item.quantityPurchased - item.quantityRemaining) * Number(item.product.sellingPrice),
    0
  );
  const totalCostOfSold = batch.batchItems.reduce(
    (sum, item) => sum + (item.quantityPurchased - item.quantityRemaining) * Number(item.unitCost),
    0
  );
  const batchProfit = totalRevenue - totalCostOfSold;

  return (
    <div className="space-y-6 font-sans">
      {/* Detail Workspace Header */}
      <PageHeader
        backLink={{ href: "/batches", label: "Back to Batches" }}
        title={batch.reference}
        subtitle={`Purchased on ${new Date(batch.purchaseDate).toLocaleDateString()} ${
          batch.additionalCosts > 0 ? `• Landing Transport Cost: ${formatCurrency(batch.additionalCosts)}` : ""
        }`}
        badge={
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                isActive ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              {batch.status}
            </span>
            {isActive && isHighSellThrough && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                🔥 {sellThrough}% Sold — Ready to Close
              </span>
            )}
          </div>
        }
        actions={
          isActive ? (
            <>
              <button
                onClick={openPanel}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-amber-300" /> Add Item
              </button>
              <button
                onClick={() => {
                  setAdditionalCostInput(batch.additionalCosts.toString());
                  setIsCostModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
              >
                <Truck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Add Cost
              </button>
              <button
                onClick={() => setShowCloseConfirm(true)}
                disabled={!isHighSellThrough && batch.batchItems.length === 0}
                className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-bold text-xs transition-colors ${
                  isHighSellThrough
                    ? "bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                <CheckCheck className="w-3.5 h-3.5" /> Close Batch
              </button>
            </>
          ) : undefined
        }
      />

      {/* Financial Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 dark:bg-slate-800/80 p-4 rounded-3xl text-white border border-slate-800 space-y-1 shadow-lg shadow-slate-900/10">
          <span className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider block">Investment</span>
          <span className="font-black text-xl text-white block">{formatCurrency(batch.totalInvestment)}</span>
          <span className="text-[10px] text-slate-400 font-medium block">Total Landing Cost</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 space-y-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider block">Revenue</span>
          <span className="font-black text-xl text-slate-900 dark:text-slate-100 block">{formatCurrency(totalRevenue)}</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">Sales from this batch</span>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-900 space-y-1">
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider block">Profit</span>
          <span className="font-black text-xl text-emerald-800 dark:text-emerald-300 block">{formatCurrency(batchProfit)}</span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">Revenue minus unit cost</span>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 space-y-1">
          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider block">Remaining Stock</span>
          <span className="font-black text-xl text-slate-900 dark:text-slate-100 block">{totalRemaining} units</span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block">{totalSold} / {totalPurchased} sold ({sellThrough}%)</span>
        </div>
      </div>

      {/* Product Items Table */}
      <div className="rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            Products in this Batch
          </h3>
          {isActive && (
            <button
              onClick={openPanel}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product
            </button>
          )}
        </div>

        {batch.batchItems.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            </div>
            <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200">No products added yet</h4>
            <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto">
              Click <strong>Add Product</strong> to start recording what you bought on this trip. You can scan a
              barcode or search by name.
            </p>
            {isActive && (
              <button
                onClick={openPanel}
                className="mx-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 transition-all font-bold text-xs"
              >
                <Scan className="w-3.5 h-3.5 text-amber-300" /> Add First Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
                  <th className="font-semibold py-3 px-5">Product</th>
                  <th className="font-semibold py-3 px-3">Purchased</th>
                  <th className="font-semibold py-3 px-3">Remaining</th>
                  <th className="font-semibold py-3 px-3">Sold</th>
                  <th className="font-semibold py-3 px-3">Unit Cost</th>
                  <th className="font-semibold py-3 px-3">Selling Price</th>
                  <th className="font-semibold py-3 px-5 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {batch.batchItems.map((item) => {
                  const sold = item.quantityPurchased - item.quantityRemaining;
                  const sellPct = Math.round((sold / item.quantityPurchased) * 100);
                  return (
                    <tr key={item.id} className="text-slate-800 dark:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{item.product.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {item.product.brand && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.product.brand}</span>
                          )}
                          {item.product.size && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{item.product.size}</span>
                          )}
                          {item.product.sku && (
                            <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400">
                              {item.product.sku}
                            </span>
                          )}
                          {item.product.barcode && (
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                              <Barcode className="w-2.5 h-2.5" />
                              {item.product.barcode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 dark:text-slate-100">{item.quantityPurchased}</td>
                      <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">{item.quantityRemaining}</td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{sold}</span>
                          {item.quantityPurchased > 0 && (
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-400 rounded-full"
                                style={{ width: `${sellPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">{formatCurrency(item.unitCost)}</td>
                      <td className="py-3 px-3 font-medium text-slate-500 dark:text-slate-400">
                        {formatCurrency(item.product.sellingPrice)}
                      </td>
                      <td className="py-3 px-5 font-bold text-right text-slate-900 dark:text-slate-100">{formatCurrency(item.totalCost)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
                <tr>
                  <td className="py-3 px-5 font-bold text-xs text-slate-700 dark:text-slate-300">
                    {batch.batchItems.length} product line{batch.batchItems.length !== 1 ? "s" : ""}
                  </td>
                  <td className="py-3 px-3 font-bold text-xs text-slate-900 dark:text-slate-100">{totalPurchased}</td>
                  <td className="py-3 px-3 font-bold text-xs text-emerald-600 dark:text-emerald-400">{totalRemaining}</td>
                  <td className="py-3 px-3 font-bold text-xs text-amber-700 dark:text-amber-400">{totalSold}</td>
                  <td colSpan={2} className="py-3 px-3 text-xs text-slate-400 dark:text-slate-500">
                    {batch.additionalCosts > 0 && (
                      <span>+{formatCurrency(batch.additionalCosts)} transport</span>
                    )}
                  </td>
                  <td className="py-3 px-5 font-extrabold text-xs text-right text-slate-900 dark:text-slate-100">
                    {formatCurrency(batch.totalInvestment)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ── ADD PRODUCT SLIDE-OVER PANEL ── */}
      {isPanelOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Panel Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Add Product to Batch</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{batch.reference}</p>
              </div>
              <button
                onClick={closePanel}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Success message */}
              {panelSuccess && (
                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{panelSuccess}</span>
                </div>
              )}

              {/* Error */}
              {panelError && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{panelError}</span>
                  <button onClick={() => setPanelError(null)} className="ml-auto">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* STEP 1 — Scan or Search */}
              {step === "scan" && (
                <div className="space-y-4">
                  {/* Mode toggle */}
                  <div className="flex rounded-full bg-slate-100 dark:bg-slate-800 p-1">
                    <button
                      onClick={() => setInputMode("barcode")}
                      className={`flex-1 py-2 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 transition-all ${
                        inputMode === "barcode"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Scan className="w-3.5 h-3.5" /> Scan Barcode
                    </button>
                    <button
                      onClick={() => setInputMode("search")}
                      className={`flex-1 py-2 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 transition-all ${
                        inputMode === "search"
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" /> Search by Name
                    </button>
                  </div>

                  {inputMode === "barcode" ? (
                    <div className="space-y-3">
                      {/* PRIMARY: Camera scan button */}
                      <button
                        onClick={() => setShowCamera(true)}
                        className="w-full bg-indigo-600 rounded-3xl p-5 flex flex-col items-center gap-3 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-amber-400 flex items-center justify-center shadow-md">
                          <Camera className="w-9 h-9 text-slate-900" />
                        </div>
                        <div className="text-center">
                          <p className="text-white text-sm font-bold">Tap to Open Camera</p>
                          <p className="text-indigo-100 text-[11px] mt-0.5">
                            Point your camera at the barcode or QR code on the product box
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-indigo-200">
                          <span className="flex items-center gap-1">✓ EAN-13 / EAN-8</span>
                          <span className="flex items-center gap-1">✓ QR Code</span>
                          <span className="flex items-center gap-1">✓ Code128</span>
                        </div>
                      </button>

                      {/* FALLBACK: Manual barcode entry */}
                      <div className="relative">
                        <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <input
                          ref={barcodeInputRef}
                          type="text"
                          placeholder="Or type / paste barcode manually..."
                          value={scanInput}
                          onChange={(e) => setScanInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && scanInput.trim()) {
                              handleBarcodeScan(scanInput);
                            }
                          }}
                          className="w-full pl-9 pr-24 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        />
                        <button
                          onClick={() => handleBarcodeScan(scanInput)}
                          disabled={!scanInput.trim() || panelLoading}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold shadow-md shadow-indigo-500/20 disabled:opacity-40"
                        >
                          {panelLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Look Up"}
                        </button>
                      </div>

                      <button
                        onClick={() => {
                          setNewProduct(emptyNewProduct);
                          setStep("fill-new");
                        }}
                        className="w-full py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        + Add new product without barcode
                      </button>
                    </div>

                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <input
                          ref={searchInputRef}
                          type="text"
                          placeholder="Type product name, brand..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                          autoFocus
                        />
                        {searching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500 animate-spin" />
                        )}
                      </div>

                      {searchResults.length > 0 && (
                        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                          {searchResults.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => handleSelectExistingProduct(p)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                            >
                              <div className="font-bold text-xs text-slate-900 dark:text-slate-100">{p.name}</div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                {p.brand && <span>{p.brand}</span>}
                                {p.size && <span>{p.size}</span>}
                                <span className="ml-auto font-bold text-slate-700 dark:text-slate-300">
                                  {formatCurrency(p.sellingPrice)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}

                      {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                        <div className="text-center py-4 space-y-2">
                          <p className="text-xs text-slate-400 dark:text-slate-500">No products found for "{searchQuery}"</p>
                          <button
                            onClick={() => {
                              setNewProduct({ ...emptyNewProduct, name: searchQuery });
                              setStep("fill-new");
                            }}
                            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            + Create new product "{searchQuery}"
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2A — Existing product found: enter qty + cost */}
              {step === "fill-existing" && selectedProduct && (
                <div className="space-y-4">
                  {/* Product card */}
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Product Found</span>
                        </div>
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 mt-1">{selectedProduct.name}</h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {selectedProduct.brand && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
                              {selectedProduct.brand}
                            </span>
                          )}
                          {selectedProduct.size && (
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded">
                              {selectedProduct.size}
                            </span>
                          )}
                          {selectedProduct.barcode && (
                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                              <Barcode className="w-2.5 h-2.5" />
                              {selectedProduct.barcode}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          Catalog selling price:{" "}
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {formatCurrency(selectedProduct.sellingPrice)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProduct(null);
                          setScanInput("");
                          setStep("scan");
                        }}
                        className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Quantity + cost */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Quantity Purchased *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="e.g. 10"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Unit Cost Price (GH₵) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                        placeholder="0.00"
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  {/* Live total */}
                  {parseInt(quantity) > 0 && (
                    <div className="bg-slate-900 dark:bg-slate-800 text-white border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                      <span className="text-slate-400 dark:text-slate-400">
                        {quantity} × {formatCurrency(parseFloat(unitCost) || 0)}
                      </span>
                      <span className="font-bold text-amber-400">
                        = {formatCurrency((parseInt(quantity) || 0) * (parseFloat(unitCost) || 0))}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2B — New product: fill all details */}
              {step === "fill-new" && (
                <div className="space-y-4">
                  <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 p-3 rounded-xl text-indigo-800 dark:text-indigo-300 text-xs flex items-center gap-2">
                    <Tag className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <span>
                      This product doesn't exist in your catalog yet. Fill in the details to create it and add
                      it to this batch.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Creed Aventus"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      autoFocus
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Brand</label>
                      <input
                        type="text"
                        placeholder="e.g. Creed"
                        value={newProduct.brand}
                        onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Size / Volume</label>
                      <input
                        type="text"
                        placeholder="e.g. 100ml"
                        value={newProduct.size}
                        onChange={(e) => setNewProduct({ ...newProduct, size: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                      <input
                        type="text"
                        placeholder="e.g. Perfume, Body Care"
                        value={newProduct.category}
                        onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">SKU (Auto-Generated)</label>
                        <button
                          type="button"
                          onClick={() => setNewProduct({ ...newProduct, sku: generateProductSku(newProduct.name, newProduct.brand, newProduct.size) })}
                          className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full transition-colors"
                          title="Auto-generate SKU"
                        >
                          <Sparkles className="w-3 h-3" /> Auto
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. AV-PRF-100ML-9A2F"
                        value={newProduct.sku}
                        onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Barcode (Optional)
                    </label>
                    <div className="relative">
                      <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <input
                        type="text"
                        placeholder="Scan or type barcode..."
                        value={newProduct.barcode}
                        onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Selling Price (GH₵) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={newProduct.sellingPrice}
                        onChange={(e) => setNewProduct({ ...newProduct, sellingPrice: e.target.value })}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Cost Price (GH₵) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                        className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Quantity Purchased *
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 10"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>

                  {parseInt(quantity) > 0 && parseFloat(unitCost) > 0 && (
                    <div className="bg-slate-900 dark:bg-slate-800 text-white border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
                      <span className="text-slate-400 dark:text-slate-400">
                        {quantity} × {formatCurrency(parseFloat(unitCost) || 0)} cost
                      </span>
                      <span className="font-bold text-amber-400">
                        = {formatCurrency((parseInt(quantity) || 0) * (parseFloat(unitCost) || 0))}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Panel Footer Buttons */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-2">
              {step === "fill-existing" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setStep("scan");
                      setScanInput("");
                      setSelectedProduct(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSaveExistingItem}
                    disabled={panelLoading}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {panelLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5 text-amber-300" /> Add to Batch
                      </>
                    )}
                  </button>
                </div>
              )}

              {step === "fill-new" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setStep("scan");
                      setNewProduct(emptyNewProduct);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSaveNewProduct}
                    disabled={panelLoading}
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {panelLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Create & Add to Batch
                      </>
                    )}
                  </button>
                </div>
              )}

              {step === "scan" && (
                <button
                  onClick={closePanel}
                  className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Done Adding Products
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Close Batch Confirmation */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/50 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Close this Batch?</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The batch will be marked as <strong className="text-slate-800 dark:text-slate-200">Completed</strong>. Any remaining stock from this batch
                will still be available for sale via FIFO.
              </p>
              {!isHighSellThrough && (
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 p-2 rounded-lg text-amber-700 dark:text-amber-300 text-xs">
                  ⚠️ Only {sellThrough}% sold. Batches are typically closed at 80%+. Are you sure?
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseBatch}
                disabled={closing}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-900 text-xs font-bold hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {closing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Yes, Close Batch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Landing Cost Modal */}
      {isCostModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Add Landing / Transport Cost</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Log additional freight or shipping expenses</p>
              </div>
              <button
                onClick={() => setIsCostModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCost} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Additional Transport / Freight Cost (GH₵)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00"
                  value={additionalCostInput}
                  onChange={(e) => setAdditionalCostInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCostModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={costSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {costSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Landing Cost"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Scanner Overlay */}
      {showCamera && (
        <CameraScanner
          hint="Point camera at the barcode or QR code on the product box"
          onScan={(barcode) => {
            setShowCamera(false);
            setScanInput(barcode);
            handleBarcodeScan(barcode);
          }}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}
