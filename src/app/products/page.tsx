"use client";

import { useState, useEffect } from "react";
import { formatCurrency, generateProductSku } from "@/lib/utils";
import { normalizeBarcode } from "@/lib/barcode/decoder";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Filter,
  X,
  Loader2,
  Tag,
  DollarSign,
  Layers,
  Barcode,
  ScanLine,
  Pencil,
  Sparkles,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  sku: string | null;
  description: string | null;
  category: string | null;
  brand: string | null;
  size: string | null;
  sellingPriceNum: number;
  defaultCostPriceNum: number;
  lowStockThreshold: number;
  remainingStock: number;
  isLowStock: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Add Product Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [lookupInfo, setLookupInfo] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  // Edit Product Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFormError, setEditFormError] = useState<string | null>(null);
  const [editFormSuccess, setEditFormSuccess] = useState(false);

  // Edit Form Fields
  const [editBarcode, setEditBarcode] = useState("");
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editSellingPrice, setEditSellingPrice] = useState("");
  const [editDefaultCostPrice, setEditDefaultCostPrice] = useState("");
  const [editLowStockThreshold, setEditLowStockThreshold] = useState("3");
  const [editDescription, setEditDescription] = useState("");

  // Form Fields
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState("Perfumes");
  const [brand, setBrand] = useState("");
  const [size, setSize] = useState("100ml");
  const [sellingPrice, setSellingPrice] = useState("");
  const [defaultCostPrice, setDefaultCostPrice] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("3");
  const [initialStock, setInitialStock] = useState("");
  const [description, setDescription] = useState("");

  // Active Batches for Assignment
  const [activeBatches, setActiveBatches] = useState<Array<{ id: string; reference: string }>>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  const fetchActiveBatches = async () => {
    try {
      const res = await fetch("/api/batches?status=ACTIVE");
      const json = await res.json();
      if (json.success) {
        setActiveBatches(json.data);
      }
    } catch (e) {
      console.error("Failed to fetch active batches for product modal", e);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data);
      } else {
        setError(json.error || "Failed to load products");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search]);

  const openAddModal = () => {
    setFormError(null);
    setLookupInfo(null);
    setSelectedBatchId("");
    setBarcode("");
    setName("");
    setBrand("");
    setSize("100ml");
    setCategory("Perfumes");
    setSellingPrice("");
    setDefaultCostPrice("");
    setLowStockThreshold("3");
    setInitialStock("");
    setDescription("");
    setSku(generateProductSku("", "", "100ml"));
    fetchActiveBatches();
    setIsModalOpen(true);
  };

  useEffect(() => {
    const handler = () => openAddModal();
    window.addEventListener("avencia:open-add-product", handler);
    return () => window.removeEventListener("avencia:open-add-product", handler);
  }, []);

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditBarcode(p.barcode || "");
    setEditName(p.name);
    setEditSku(p.sku || "");
    setEditCategory(p.category || "");
    setEditBrand(p.brand || "");
    setEditSize(p.size || "");
    setEditSellingPrice(p.sellingPriceNum.toString());
    setEditDefaultCostPrice(p.defaultCostPriceNum.toString());
    setEditLowStockThreshold(p.lowStockThreshold.toString());
    setEditDescription(p.description || "");
    setEditFormError(null);
    setEditFormSuccess(false);
    setIsEditModalOpen(true);
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setEditFormError(null);
    setEditFormSuccess(false);

    if (!editName.trim()) {
      setEditFormError("Product name is required.");
      return;
    }
    if (!editSellingPrice || parseFloat(editSellingPrice) < 0) {
      setEditFormError("Valid selling price is required.");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: editBarcode || undefined,
          name: editName,
          sku: editSku || undefined,
          category: editCategory || undefined,
          brand: editBrand || undefined,
          size: editSize || undefined,
          sellingPrice: parseFloat(editSellingPrice),
          defaultCostPrice: editDefaultCostPrice ? parseFloat(editDefaultCostPrice) : undefined,
          lowStockThreshold: parseInt(editLowStockThreshold || "3"),
          description: editDescription || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setEditFormSuccess(true);
        setTimeout(() => {
          setIsEditModalOpen(false);
          setEditingProduct(null);
          setEditFormSuccess(false);
          fetchProducts();
        }, 800);
      } else {
        setEditFormError(json.error || "Could not update product");
      }
    } catch (err: any) {
      setEditFormError(err.message || "Failed to connect to server");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleBarcodeLookup = async (codeToLookup?: string) => {
    const code = normalizeBarcode(codeToLookup || barcode);
    if (!code) return;

    console.log("[BARCODE] Image/scan received");
    console.log("[BARCODE] Decoder result:", code);
    console.log("[BARCODE] Normalized value:", code);
    console.log("[BARCODE] Product lookup started");
    console.log("[BARCODE] Lookup query:", code);

    setLookingUp(true);
    setLookupInfo(null);
    try {
      const res = await fetch(`/api/products/barcode?code=${encodeURIComponent(code)}`);
      const json = await res.json();
      if (json.success && json.data) {
        const p = json.data;
        setName(p.name || "");
        if (p.sku) setSku(p.sku);
        if (p.category) setCategory(p.category);
        if (p.brand) setBrand(p.brand);
        if (p.size) setSize(p.size);
        if (p.sellingPriceNum) setSellingPrice(p.sellingPriceNum.toString());
        if (p.defaultCostPriceNum) setDefaultCostPrice(p.defaultCostPriceNum.toString());
        if (p.lowStockThreshold) setLowStockThreshold(p.lowStockThreshold.toString());
        if (p.description) setDescription(p.description);

        if (json.source === "local") {
          console.log(`[BARCODE] Product found: true (${p.name})`);
          setLookupInfo(`Product found in catalog: ${p.name}`);
        } else if (json.source === "external") {
          console.log(`[BARCODE] Product found: true (Online: ${p.name})`);
          setLookupInfo(`Barcode detected (${code}), found online! Review details for ${p.name}.`);
        } else {
          setLookupInfo(`Barcode detected (${code}): ${p.name}`);
        }
      } else {
        console.log("[BARCODE] Product found: false");
        setLookupInfo(json.message || `Barcode detected (${code}), but no matching product was found in Avencia.`);
      }
    } catch (err: any) {
      console.log("[BARCODE] Product lookup error:", err);
      setLookupInfo(`Barcode detected (${code}). Lookup unavailable; enter details manually below.`);
    } finally {
      setLookingUp(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(false);

    if (!name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (!sellingPrice || parseFloat(sellingPrice) < 0) {
      setFormError("Valid selling price is required.");
      return;
    }
    if (!defaultCostPrice || parseFloat(defaultCostPrice) < 0) {
      setFormError("Valid cost price is required.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: barcode || undefined,
          name,
          sku: sku || undefined,
          category: category || undefined,
          brand: brand || undefined,
          size: size || undefined,
          sellingPrice: parseFloat(sellingPrice),
          defaultCostPrice: parseFloat(defaultCostPrice),
          lowStockThreshold: parseInt(lowStockThreshold || "3"),
          initialStock: initialStock ? parseInt(initialStock) : undefined,
          batchId: selectedBatchId || undefined,
          description: description || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFormSuccess(true);
        // Reset form
        setBarcode("");
        setName("");
        setSku("");
        setSellingPrice("");
        setDefaultCostPrice("");
        setInitialStock("");
        setSelectedBatchId("");
        setDescription("");
        setLookupInfo(null);

        setTimeout(() => {
          setIsModalOpen(false);
          setFormSuccess(false);
          fetchProducts();
        }, 800);
      } else {
        setFormError(json.error || "Could not add product");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to connect to server");
    } finally {
      setSubmitting(false);
    }
  };

  // Preset categories + any additional categories from database products
  const categoryPresets = ["ALL", "Perfumes", "Oils", "Body Care"];
  const databaseCategories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  ) as string[];
  const allCategoryPills = Array.from(new Set([...categoryPresets, ...databaseCategories]));

  const filteredProducts = products.filter((p) => {
    if (selectedCategory !== "ALL" && p.category?.toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Clean Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search & Add Product */}
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search by product name, barcode, SKU, or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={openAddModal}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 transition-all whitespace-nowrap active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>Add Product</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {allCategoryPills.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-xs font-extrabold whitespace-nowrap transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                selectedCategory === cat || (selectedCategory === "ALL" && cat === "ALL")
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {cat === "ALL" ? "All Products" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content State */}
      {loading ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center space-y-3 shadow-xl shadow-indigo-500/5">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loading catalog items...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-4 rounded-2xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-100 dark:border-slate-800 text-center space-y-3 shadow-xl shadow-indigo-500/5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
            <Package className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">No Products Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto font-medium">
            {search || selectedCategory !== "ALL"
              ? "No products match your current search or category filter. Try clearing filters."
              : "No products added yet. Click 'Add Product' to get started."}
          </p>
        </div>
      ) : (
        <>
          {/* DESKTOP VIEW: Clean Table with compact product rows */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-indigo-500/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/60">
                    <th className="font-bold py-3.5 px-5">Brand & Product Name</th>
                    <th className="font-bold py-3.5 px-3">Size / Category</th>
                    <th className="font-bold py-3.5 px-3">Auto-SKU</th>
                    <th className="font-bold py-3.5 px-3">Selling Price</th>
                    <th className="font-bold py-3.5 px-3">Cost Price</th>
                    <th className="font-bold py-3.5 px-3">Stock Level</th>
                    <th className="font-bold py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="text-slate-800 dark:text-slate-200 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-5">
                        <div className="font-black text-slate-900 dark:text-slate-100 text-sm">{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          {p.brand && <span className="font-bold text-slate-700 dark:text-slate-300">{p.brand}</span>}
                          {p.barcode && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                              <Barcode className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {p.barcode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{p.size || "100ml"}</span>
                        {p.category && (
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 font-normal">{p.category}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-600 dark:text-slate-400">
                        {p.sku || "N/A"}
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900 dark:text-slate-100 text-sm">
                        {formatCurrency(p.sellingPriceNum)}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-500 dark:text-slate-400">
                        {formatCurrency(p.defaultCostPriceNum)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${p.isLowStock ? "text-amber-700 dark:text-amber-400" : p.remainingStock === 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {p.remainingStock} units
                          </span>
                          {p.isLowStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                              Low Stock
                            </span>
                          ) : p.remainingStock === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              Out of Stock
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          onClick={() => openEditModal(p)}
                          className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1 font-bold text-xs"
                          title="Edit product"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE VIEW: Compact product cards */}
          <div className="md:hidden grid grid-cols-1 gap-4">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className={`bg-white dark:bg-slate-900 rounded-3xl p-5 border transition-all space-y-4 flex flex-col justify-between shadow-xl shadow-indigo-500/5 ${
                  p.isLowStock
                    ? "border-amber-300 dark:border-amber-700 ring-1 ring-amber-200/50 dark:ring-amber-800/50"
                    : p.remainingStock === 0
                    ? "border-rose-300 dark:border-rose-800"
                    : "border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-sm text-slate-900 dark:text-slate-100 leading-snug">{p.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
                        {p.barcode && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                            <Barcode className="w-3 h-3 text-slate-500 dark:text-slate-400" /> {p.barcode}
                          </span>
                        )}
                        <span>SKU: {p.sku || "N/A"}</span>
                        {p.brand && <span>• {p.brand}</span>}
                      </p>
                    </div>
                    {p.isLowStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 animate-pulse">
                        <AlertTriangle className="w-3 h-3" /> Low Stock
                      </span>
                    ) : p.remainingStock === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        Out of Stock
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Stock OK
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {p.category && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium flex items-center gap-1">
                        <Tag className="w-2.5 h-2.5" /> {p.category}
                      </span>
                    )}
                    {p.size && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-medium">
                        {p.size}
                      </span>
                    )}
                  </div>
                </div>

                {/* Price & Stock Footer */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-end justify-between gap-2">
                  <div className="grid grid-cols-2 gap-2 text-xs flex-1">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">Selling Price</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{formatCurrency(p.sellingPriceNum)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium block">Remaining Stock</span>
                      <span className={`font-bold ${p.isLowStock ? "text-amber-700 dark:text-amber-400" : p.remainingStock === 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {p.remainingStock} units
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openEditModal(p)}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex-shrink-0 font-bold text-xs flex items-center gap-1"
                    title="Edit product"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Add New Product</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Scan or enter barcode to auto-fill, then set catalog details</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {lookupInfo && (
              <div className="bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 p-3 rounded-xl text-sky-800 dark:text-sky-300 text-xs flex items-center gap-2">
                <ScanLine className="w-4 h-4 flex-shrink-0 text-sky-600 dark:text-sky-400" />
                <span>{lookupInfo}</span>
              </div>
            )}

            {formError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Product created successfully!</span>
              </div>
            )}

            <form onSubmit={handleAddProduct} className="space-y-4">
              {/* Barcode input with Instant Lookup */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Barcode (Permanent Identifier)</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">USB Scanner / Manual</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      placeholder="Scan or enter product barcode..."
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleBarcodeLookup();
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleBarcodeLookup()}
                    disabled={lookingUp || !barcode.trim()}
                    className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {lookingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
                    Auto-Fill
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Amber Wood Cologne"
                  value={name}
                  onChange={(e) => {
                    const val = e.target.value;
                    setName(val);
                    if (!sku || sku.startsWith("AV-")) {
                      setSku(generateProductSku(val, brand, size));
                    }
                  }}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">SKU (Auto-Generated)</label>
                    <button
                      type="button"
                      onClick={() => setSku(generateProductSku(name, brand, size))}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full transition-colors"
                      title="Generate new unique SKU"
                    >
                      <Sparkles className="w-3 h-3" /> Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. AV-AMB-100ML-8F9A"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Perfumes"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Avencia"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Size / Volume</label>
                  <input
                    type="text"
                    placeholder="e.g. 100ml"
                    value={size}
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Selling Price (GH₵) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Cost Price (GH₵) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={defaultCostPrice}
                    onChange={(e) => setDefaultCostPrice(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* Assign Initial Stock to Active Batch (Optional) */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center justify-between">
                    <span>Assign Stock to Active Batch (Optional)</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">Select shopping trip</span>
                  </label>
                  <select
                    value={selectedBatchId}
                    onChange={(e) => setSelectedBatchId(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">-- None (Catalog Only / No Initial Stock) --</option>
                    {activeBatches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.reference}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Initial Stock Qty
                    </label>
                    <input
                      type="number"
                      min="0"
                      disabled={!selectedBatchId}
                      placeholder={selectedBatchId ? "e.g. 10" : "Select batch first"}
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:bg-slate-100 dark:disabled:bg-slate-800/40 disabled:text-slate-400 dark:disabled:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Low Stock Threshold
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/25"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Product"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-5 animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">Edit Product</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Update catalog details for {editingProduct.name}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editFormError && (
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 p-3 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{editFormError}</span>
              </div>
            )}

            {editFormSuccess && (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-3 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>Product updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleEditProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Barcode</label>
                  <input
                    type="text"
                    placeholder="Scan or enter barcode"
                    value={editBarcode}
                    onChange={(e) => setEditBarcode(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amber Wood Cologne"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">SKU</label>
                    <button
                      type="button"
                      onClick={() => setEditSku(generateProductSku(editName, editBrand, editSize))}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-0.5 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full transition-colors"
                      title="Auto-generate SKU"
                    >
                      <Sparkles className="w-3 h-3" /> Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. AV-AMB-100ML-8F9A"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Perfumes"
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Brand</label>
                  <input
                    type="text"
                    placeholder="e.g. Avencia"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Size / Volume</label>
                  <input
                    type="text"
                    placeholder="e.g. 100ml"
                    value={editSize}
                    onChange={(e) => setEditSize(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Selling Price (GH₵) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Default Cost Price (GH₵)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={editDefaultCostPrice}
                    onChange={(e) => setEditDefaultCostPrice(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Low Stock Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={editLowStockThreshold}
                    onChange={(e) => setEditLowStockThreshold(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/25"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
