"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { formatCurrency, generateProductSku } from "@/lib/utils";
import { normalizeBarcode } from "@/lib/barcode/decoder";
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
  FilterChips,
} from "@/components/ui";
import {
  Package,
  Plus,
  Pencil,
  Camera,
  Barcode,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Tag,
  DollarSign,
  Layers,
  Search,
  X,
  Boxes,
  TrendingUp,
} from "lucide-react";

const CameraScanner = dynamic(() => import("@/components/scanner/CameraScanner"), { ssr: false });

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
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [stockStatusFilter, setStockStatusFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");

  // Add Product Sheet
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [lookupInfo, setLookupInfo] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [showAddCamera, setShowAddCamera] = useState(false);

  // Add Form Fields
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
  const [activeBatches, setActiveBatches] = useState<Array<{ id: string; reference: string }>>([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");

  // Edit Product Sheet
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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

  const fetchActiveBatches = async () => {
    try {
      const res = await fetch("/api/batches?status=ACTIVE");
      const json = await res.json();
      if (json.success) setActiveBatches(json.data || []);
    } catch (e) {}
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}`);
      const json = await res.json();
      if (json.success) {
        setProducts(json.data || []);
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

  // Global Add Product Header Trigger
  useEffect(() => {
    const handler = () => openAddModal();
    window.addEventListener("avencia:open-add-product", handler);
    return () => window.removeEventListener("avencia:open-add-product", handler);
  }, []);

  const openAddModal = () => {
    setAddError(null);
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
    setIsAddOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditBarcode(p.barcode || "");
    setEditName(p.name);
    setEditSku(p.sku || "");
    setEditCategory(p.category || "Perfumes");
    setEditBrand(p.brand || "");
    setEditSize(p.size || "100ml");
    setEditSellingPrice(p.sellingPriceNum ? p.sellingPriceNum.toString() : "0");
    setEditDefaultCostPrice(p.defaultCostPriceNum ? p.defaultCostPriceNum.toString() : "0");
    setEditLowStockThreshold(p.lowStockThreshold ? p.lowStockThreshold.toString() : "3");
    setEditDescription(p.description || "");
    setEditError(null);
  };

  // Barcode Lookup for Add Form
  const handleBarcodeLookup = async (codeToLookup?: string) => {
    const code = normalizeBarcode(codeToLookup || barcode);
    if (!code) return;

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

        setLookupInfo(
          json.source === "local"
            ? `Found existing catalog entry: ${p.name}`
            : `Details found online for: ${p.name}`
        );
      } else {
        setLookupInfo(`Barcode detected (${code}). Please complete remaining fields.`);
      }
    } catch (err: any) {
      setLookupInfo(`Barcode detected (${code}). Complete product details manually.`);
    } finally {
      setLookingUp(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    if (!name.trim()) {
      setAddError("Product name is required.");
      return;
    }
    if (!sellingPrice || parseFloat(sellingPrice) < 0) {
      setAddError("Valid selling price is required.");
      return;
    }
    if (!defaultCostPrice || parseFloat(defaultCostPrice) < 0) {
      setAddError("Valid cost price is required.");
      return;
    }

    setAddSubmitting(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: barcode || undefined,
          name: name.trim(),
          sku: sku || undefined,
          category: category || undefined,
          brand: brand.trim() || undefined,
          size: size || undefined,
          sellingPrice: parseFloat(sellingPrice),
          defaultCostPrice: parseFloat(defaultCostPrice),
          lowStockThreshold: parseInt(lowStockThreshold || "3"),
          initialStock: initialStock ? parseInt(initialStock) : 0,
          batchId: selectedBatchId || undefined,
          description: description.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsAddOpen(false);
        fetchProducts();
      } else {
        setAddError(json.error || "Failed to create product");
      }
    } catch (err: any) {
      setAddError(err.message || "Server error creating product");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setEditError(null);

    if (!editName.trim()) {
      setEditError("Product name is required.");
      return;
    }
    if (!editSellingPrice || parseFloat(editSellingPrice) < 0) {
      setEditError("Valid selling price is required.");
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barcode: editBarcode || undefined,
          name: editName.trim(),
          sku: editSku || undefined,
          category: editCategory || undefined,
          brand: editBrand.trim() || undefined,
          size: editSize || undefined,
          sellingPrice: parseFloat(editSellingPrice),
          defaultCostPrice: editDefaultCostPrice ? parseFloat(editDefaultCostPrice) : undefined,
          lowStockThreshold: parseInt(editLowStockThreshold || "3"),
          description: editDescription.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setEditingProduct(null);
        fetchProducts();
      } else {
        setEditError(json.error || "Failed to update product");
      }
    } catch (err: any) {
      setEditError(err.message || "Server error updating product");
    } finally {
      setEditSubmitting(false);
    }
  };

  // Metrics
  const totalUnits = useMemo(() => products.reduce((sum, p) => sum + (p.remainingStock || 0), 0), [products]);
  const lowStockCount = useMemo(() => products.filter((p) => p.isLowStock && p.remainingStock > 0).length, [products]);
  const outOfStockCount = useMemo(() => products.filter((p) => p.remainingStock <= 0).length, [products]);
  const totalCostValuation = useMemo(
    () => products.reduce((sum, p) => sum + (p.remainingStock || 0) * (p.defaultCostPriceNum || 0), 0),
    [products]
  );

  // Category Options
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [products]);

  // Filtered List
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === "ALL" || p.category === selectedCategory;
      let matchStock = true;
      if (stockStatusFilter === "LOW_STOCK") matchStock = p.isLowStock && p.remainingStock > 0;
      if (stockStatusFilter === "OUT_OF_STOCK") matchStock = p.remainingStock <= 0;
      return matchCat && matchStock;
    });
  }, [products, selectedCategory, stockStatusFilter]);

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Header with Title and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Product Catalog
          </h1>
          <p className="text-sm text-muted-foreground">
            SKUs, wholesale costs, margins & real-time inventory levels
          </p>
        </div>

        <Button
          onClick={openAddModal}
          size="md"
          className="gap-2 font-bold self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Total SKUs</span>
            <Package className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">{products.length}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Active catalog variants</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Units in Stock</span>
            <Boxes className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground tabular-nums">{totalUnits}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Physical bottles available</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Inventory Value</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            <Money amount={totalCostValuation} />
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">At wholesale cost basis</div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase">Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-warning" />
          </div>
          <div className="text-2xl font-black text-warning">
            {lowStockCount + outOfStockCount}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {lowStockCount} low • {outOfStockCount} out of stock
          </div>
        </Card>
      </div>

      {/* Filters Toolbar */}
      <Card className="p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by perfume name, barcode or SKU..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              options={[
                { value: "ALL", label: "All Stock Levels" },
                { value: "LOW_STOCK", label: `Low Stock (${lowStockCount})` },
                { value: "OUT_OF_STOCK", label: `Out of Stock (${outOfStockCount})` },
              ]}
              className="w-44"
            />
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="overflow-x-auto pb-0.5 no-scrollbar">
          <FilterChips
            options={categories.map((c) => ({
              id: c,
              label: c === "ALL" ? "All Categories" : c,
              count:
                c === "ALL"
                  ? products.length
                  : products.filter((p) => p.category === c).length,
            }))}
            selected={selectedCategory}
            onChange={setSelectedCategory}
          />
        </div>
      </Card>

      {/* Products Grid / List */}
      {filteredProducts.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-semibold">No products match your criteria</p>
          <p className="text-xs mt-1">Try relaxing filters or click "Add Product" above</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredProducts.map((p) => {
            const isOutOfStock = p.remainingStock <= 0;
            const isLow = p.isLowStock && !isOutOfStock;
            const margin =
              p.sellingPriceNum > 0
                ? Math.round(
                    ((p.sellingPriceNum - p.defaultCostPriceNum) / p.sellingPriceNum) * 100
                  )
                : 0;

            return (
              <Card
                key={p.id}
                className="p-4 flex flex-col justify-between hover:border-primary/40 transition-all group"
              >
                <div>
                  {/* Category and Stock Pill */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      {p.category || "Perfumes"}
                    </span>

                    {isOutOfStock ? (
                      <Badge variant="destructive">0 Units</Badge>
                    ) : isLow ? (
                      <Badge variant="warning">{p.remainingStock} Low Stock</Badge>
                    ) : (
                      <Badge variant="success">{p.remainingStock} Units</Badge>
                    )}
                  </div>

                  {/* Product Title */}
                  <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                    {p.name}
                  </h3>

                  {/* SKU & Brand */}
                  <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                    {p.sku && <span>SKU: {p.sku}</span>}
                    {p.brand && (
                      <>
                        <span>•</span>
                        <span>{p.brand}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Pricing & Actions Footer */}
                <div className="pt-3 mt-3 border-t border-border/60 flex items-end justify-between">
                  <div>
                    <div className="text-sm font-black text-foreground">
                      <Money amount={p.sellingPriceNum} />
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>Cost: {formatCurrency(p.defaultCostPriceNum)}</span>
                      {margin > 0 && <span className="text-success font-semibold">({margin}% margin)</span>}
                    </div>
                  </div>

                  <IconButton
                    aria-label={`Edit ${p.name}`}
                    size="sm"
                    variant="outline"
                    onClick={() => openEditModal(p)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </IconButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ADD PRODUCT SHEET */}
      <Sheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Perfume"
        description="Add a new SKU to Avencia's product catalog"
      >
        <form onSubmit={handleAddProduct} className="space-y-4 pt-2">
          {addError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          {/* Barcode & Fast Lookup */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-primary" />
                Barcode / Scan (Optional)
              </label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowAddCamera(true)}
                className="text-xs gap-1.5"
              >
                <Camera className="w-3.5 h-3.5 text-primary" />
                <span>Camera</span>
              </Button>
            </div>

            <div className="flex gap-2">
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Scan or enter barcode number"
                className="flex-1"
              />
              <Button
                type="button"
                size="md"
                variant="outline"
                disabled={!barcode || lookingUp}
                isLoading={lookingUp}
                onClick={() => handleBarcodeLookup(barcode)}
              >
                Lookup
              </Button>
            </div>

            {lookupInfo && (
              <div className="text-xs font-semibold text-primary flex items-center gap-1.5 pt-1">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>{lookupInfo}</span>
              </div>
            )}
          </div>

          <Input
            label="Product Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setSku(generateProductSku(e.target.value, brand, size));
            }}
            placeholder="e.g. Sauvage Elixir Extrait de Parfum"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU Code"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. SAU-ELI-100"
            />
            <Input
              label="Brand / House"
              value={brand}
              onChange={(e) => {
                setBrand(e.target.value);
                setSku(generateProductSku(name, e.target.value, size));
              }}
              placeholder="e.g. Dior"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              options={[
                { value: "Perfumes", label: "Perfumes" },
                { value: "Oils", label: "Perfume Oils" },
                { value: "Deodorants", label: "Deodorants & Sprays" },
                { value: "Gift Sets", label: "Gift Sets" },
                { value: "Accessories", label: "Accessories" },
              ]}
            />
            <Select
              label="Bottle Size"
              value={size}
              onChange={(e) => {
                setSize(e.target.value);
                setSku(generateProductSku(name, brand, e.target.value));
              }}
              options={[
                { value: "30ml", label: "30ml" },
                { value: "50ml", label: "50ml" },
                { value: "100ml", label: "100ml" },
                { value: "150ml", label: "150ml" },
                { value: "200ml", label: "200ml" },
                { value: "Roll-on", label: "Roll-on (6-12ml)" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Selling Price (GH₵)"
              type="number"
              step="any"
              min="0"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value)}
              placeholder="0.00"
              required
            />
            <Input
              label="Default Wholesale Cost (GH₵)"
              type="number"
              step="any"
              min="0"
              value={defaultCostPrice}
              onChange={(e) => setDefaultCostPrice(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Low Stock Alert Threshold"
              type="number"
              min="1"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value)}
            />
            <Input
              label="Initial Opening Stock (Units)"
              type="number"
              min="0"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              placeholder="0"
            />
          </div>

          {activeBatches.length > 0 && (
            <Select
              label="Assign to Active Shipment/Batch (Optional)"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              options={[
                { value: "", label: "No batch (Direct inventory)" },
                ...activeBatches.map((b) => ({
                  value: b.id,
                  label: b.reference,
                })),
              ]}
            />
          )}

          <Textarea
            label="Product Description / Scent Notes"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Top notes: Bergamot, Cardamom..."
          />

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-black"
              isLoading={addSubmitting}
            >
              Save Product
            </Button>
          </div>
        </form>
      </Sheet>

      {/* EDIT PRODUCT SHEET */}
      <Sheet
        isOpen={!!editingProduct}
        onClose={() => setEditingProduct(null)}
        title="Edit Product"
        description={editingProduct?.name}
      >
        <form onSubmit={handleEditProduct} className="space-y-4 pt-2">
          {editError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <Input
            label="Product Name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU Code"
              value={editSku}
              onChange={(e) => setEditSku(e.target.value)}
            />
            <Input
              label="Barcode"
              value={editBarcode}
              onChange={(e) => setEditBarcode(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Brand"
              value={editBrand}
              onChange={(e) => setEditBrand(e.target.value)}
            />
            <Input
              label="Bottle Size"
              value={editSize}
              onChange={(e) => setEditSize(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Selling Price (GH₵)"
              type="number"
              step="any"
              min="0"
              value={editSellingPrice}
              onChange={(e) => setEditSellingPrice(e.target.value)}
              required
            />
            <Input
              label="Default Cost (GH₵)"
              type="number"
              step="any"
              min="0"
              value={editDefaultCostPrice}
              onChange={(e) => setEditDefaultCostPrice(e.target.value)}
            />
          </div>

          <Input
            label="Low Stock Alert Threshold"
            type="number"
            min="1"
            value={editLowStockThreshold}
            onChange={(e) => setEditLowStockThreshold(e.target.value)}
          />

          <Textarea
            label="Product Notes"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setEditingProduct(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-black"
              isLoading={editSubmitting}
            >
              Update Product
            </Button>
          </div>
        </form>
      </Sheet>

      {/* CAMERA BARCODE SCANNER FOR ADD MODAL */}
      {showAddCamera && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-3xl overflow-hidden border border-border shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                Scan Product Barcode
              </h3>
              <IconButton
                aria-label="Close Scanner"
                size="sm"
                variant="ghost"
                onClick={() => setShowAddCamera(false)}
              >
                <X className="w-4 h-4" />
              </IconButton>
            </div>

            <div className="mt-4">
              <CameraScanner
                onScan={(code) => {
                  setBarcode(code);
                  setShowAddCamera(false);
                  handleBarcodeLookup(code);
                }}
                onClose={() => setShowAddCamera(false)}
                hint="Scan barcode on the perfume packaging"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
