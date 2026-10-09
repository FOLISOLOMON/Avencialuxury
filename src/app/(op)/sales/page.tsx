"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { formatCurrency } from "@/lib/utils";
import { normalizeBarcode } from "@/lib/barcode/decoder";
import { voidSaleAction } from "@/lib/actions/sale-actions";
import { ReceiptModal } from "@/components/sales/ReceiptModal";
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
  FilterChips,
} from "@/components/ui";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Camera,
  Barcode,
  CreditCard,
  Banknote,
  Receipt,
  RotateCcw,
  User,
  CheckCircle2,
  AlertTriangle,
  History,
  Store,
  ArrowRight,
  Printer,
  Share2,
  Calendar,
  DollarSign,
  TrendingUp,
  X,
  Search,
  Sparkles,
} from "lucide-react";

const CameraScanner = dynamic(() => import("@/components/scanner/CameraScanner"), { ssr: false });

interface Product {
  id: string;
  name: string;
  barcode?: string | null;
  sku?: string | null;
  category?: string | null;
  sellingPriceNum: number;
  remainingStock: number;
}

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
}

interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  revenue: number;
  cost: number;
  profit: number;
  product: { name: string; sku: string | null };
  batch: { reference: string };
}

interface Sale {
  id: string;
  saleDate: string;
  subtotal: number;
  discount: number;
  totalAmount: number;
  totalCost: number;
  grossProfit: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
  paymentMethod: string;
  status: string;
  notes: string | null;
  customerId?: string | null;
  customer: { id?: string; name: string; phone?: string | null } | null;
  saleItems: SaleItem[];
}

interface SalesSummary {
  totalTransactions: number;
  totalItemsSold: number;
  totalSalesRevenue: number;
  totalAmountCollected: number;
  totalOutstanding: number;
  totalCostOfGoods: number;
  totalGrossProfit: number;
  totalExpenses: number;
  netProfit: number;
  averageOrderValue: number;
  profitMargin: number;
}

interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  unitPrice: number;
}

export default function SalesPage() {
  // Navigation / View Tabs
  const [activeTab, setActiveTab] = useState<"pos" | "history">("pos");

  // Core Data
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [summary, setSummary] = useState<SalesSummary>({
    totalTransactions: 0,
    totalItemsSold: 0,
    totalSalesRevenue: 0,
    totalAmountCollected: 0,
    totalOutstanding: 0,
    totalCostOfGoods: 0,
    totalGrossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    averageOrderValue: 0,
    profitMargin: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // POS State
  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckoutSheet, setShowCheckoutSheet] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");
  const [scanNotice, setScanNotice] = useState<string | null>(null);

  // Checkout Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discount, setDiscount] = useState("0");
  const [isPartialCredit, setIsPartialCredit] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [submittingSale, setSubmittingSale] = useState(false);
  const [saleError, setSaleError] = useState<string | null>(null);

  // Modals & Sheets
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

  // Record Debt Payment State
  const [debtSale, setDebtSale] = useState<Sale | null>(null);
  const [debtAmount, setDebtAmount] = useState("");
  const [debtMethod, setDebtMethod] = useState("CASH");
  const [debtNotes, setDebtNotes] = useState("");
  const [debtSubmitting, setDebtSubmitting] = useState(false);
  const [debtError, setDebtError] = useState<string | null>(null);

  // Void Sale State
  const [voidSaleTarget, setVoidSaleTarget] = useState<Sale | null>(null);
  const [voidReason, setVoidReason] = useState("Customer Return");
  const [voidSubmitting, setVoidSubmitting] = useState(false);

  // History Filter State
  const [historySearch, setHistorySearch] = useState("");
  const [historyRange, setHistoryRange] = useState("ALL");
  const [historyPaymentStatus, setHistoryPaymentStatus] = useState("ALL");

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (historyRange !== "ALL") q.set("quickRange", historyRange);
      if (historyPaymentStatus !== "ALL") q.set("paymentStatus", historyPaymentStatus);
      if (historySearch.trim()) q.set("search", historySearch.trim());

      const [salesRes, prodRes, custRes] = await Promise.all([
        fetch(`/api/sales?${q.toString()}`),
        fetch("/api/products"),
        fetch("/api/customers"),
      ]);

      const [salesJson, prodJson, custJson] = await Promise.all([
        salesRes.json(),
        prodRes.json(),
        custRes.json(),
      ]);

      if (salesJson.success) {
        setSales(salesJson.data || []);
        if (salesJson.summary) setSummary(salesJson.summary);
      }
      if (prodJson.success) setProducts(prodJson.data || []);
      if (custJson.success) setCustomers(custJson.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load sales data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [historyRange, historyPaymentStatus, historySearch]);

  // Listen to Global "Add Sale" Header Event
  useEffect(() => {
    const handler = () => {
      setActiveTab("pos");
    };
    window.addEventListener("avencia:open-add-sale", handler);
    return () => window.removeEventListener("avencia:open-add-sale", handler);
  }, []);

  // Filter products for POS
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory;
      const term = productSearch.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, productSearch]);

  // Cart operations
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.remainingStock) return prev;
        return prev.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      if (product.remainingStock <= 0) return prev;
      return [
        ...prev,
        {
          productId: product.id,
          product,
          quantity: 1,
          unitPrice: product.sellingPriceNum,
        },
      ];
    });
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.remainingStock) return item;
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  // Barcode Scanning Handler
  const handleBarcodeScanned = async (rawCode: string) => {
    const code = normalizeBarcode(rawCode);
    if (!code) return;
    setScanNotice(null);

    let matched = products.find(
      (p) =>
        (p.barcode && normalizeBarcode(p.barcode) === code) ||
        (p.sku && p.sku.toLowerCase() === code.toLowerCase()) ||
        p.name.toLowerCase() === code.toLowerCase()
    );

    if (!matched) {
      try {
        const res = await fetch(`/api/products/barcode?code=${encodeURIComponent(code)}`);
        const json = await res.json();
        if (json.success && json.data) {
          matched = json.data;
        }
      } catch (err) {}
    }

    if (matched) {
      addToCart(matched);
      setScanNotice(`Added: ${matched.name}`);
      setManualBarcode("");
      setShowCameraScanner(false);
      setTimeout(() => setScanNotice(null), 3000);
    } else {
      setScanNotice(`Barcode (${code}) not recognized.`);
      setTimeout(() => setScanNotice(null), 4000);
    }
  };

  // Cart calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountVal = Math.max(0, parseFloat(discount) || 0);
  const cartTotal = Math.max(0, cartSubtotal - discountVal);
  const parsedPaid = isPartialCredit ? Math.max(0, parseFloat(amountPaid) || 0) : cartTotal;
  const balanceDue = Math.max(0, cartTotal - parsedPaid);

  // Complete Sale
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaleError(null);

    if (cart.length === 0) {
      setSaleError("Your cart is empty.");
      return;
    }

    if (balanceDue > 0 && !selectedCustomerId) {
      setSaleError("A customer must be selected for sales on credit or partial payment.");
      return;
    }

    setSubmittingSale(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId || undefined,
          paymentMethod,
          discount: discountVal,
          amountPaid: parsedPaid,
          notes: notes.trim() || undefined,
          items: cart.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }),
      });

      const json = await res.json();
      if (json.success) {
        // Reset POS state
        clearCart();
        setSelectedCustomerId("");
        setDiscount("0");
        setIsPartialCredit(false);
        setAmountPaid("");
        setNotes("");
        setShowCheckoutSheet(false);

        // Fetch refreshed history and open receipt
        await fetchData();
        if (json.data) {
          setReceiptSale(json.data);
        }
      } else {
        setSaleError(json.error || "Failed to process sale.");
      }
    } catch (err: any) {
      setSaleError(err.message || "Network error submitting sale.");
    } finally {
      setSubmittingSale(false);
    }
  };

  // Record Debt Settlement
  const handleRecordDebtPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtSale) return;
    setDebtError(null);

    const custId = debtSale.customerId || debtSale.customer?.id;
    if (!custId) {
      setDebtError("A customer record is required to apply payment.");
      return;
    }

    const amt = parseFloat(debtAmount);
    if (isNaN(amt) || amt <= 0) {
      setDebtError("Payment amount must be greater than 0.");
      return;
    }

    setDebtSubmitting(true);
    try {
      const res = await fetch("/api/debt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: custId,
          saleId: debtSale.id,
          amount: amt,
          paymentMethod: debtMethod,
          notes: debtNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setDebtSale(null);
        setDebtAmount("");
        setDebtNotes("");
        fetchData();
      } else {
        setDebtError(json.error || "Failed to record payment.");
      }
    } catch (err: any) {
      setDebtError(err.message || "Failed to process debt payment.");
    } finally {
      setDebtSubmitting(false);
    }
  };

  // Void Sale
  const handleVoidSale = async () => {
    if (!voidSaleTarget) return;
    setVoidSubmitting(true);
    try {
      const res = await voidSaleAction(voidSaleTarget.id, voidReason);
      if (res.success) {
        setVoidSaleTarget(null);
        setSelectedSaleDetail(null);
        fetchData();
      } else {
        alert(res.error || "Failed to void sale");
      }
    } catch (err: any) {
      alert(err.message || "Error voiding sale");
    } finally {
      setVoidSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      {/* Top Segmented Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Sales & POS Register
          </h1>
          <p className="text-sm text-muted-foreground">
            Instant point-of-sale checkout, FIFO batch allocation & invoice register
          </p>
        </div>

        {/* View Switcher */}
        <div className="inline-flex p-1 bg-muted rounded-2xl border border-border self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("pos")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "pos"
                ? "bg-card text-foreground shadow-sm border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Store className="w-4 h-4 text-primary" />
            <span>POS Register</span>
            {cart.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "history"
                ? "bg-card text-foreground shadow-sm border border-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="w-4 h-4 text-primary" />
            <span>Sales History ({sales.length})</span>
          </button>
        </div>
      </div>

      {/* POS VIEW */}
      {activeTab === "pos" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Product Catalog & Scanner (Cols 1-7 or 1-8) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Search, Barcode & Camera Bar */}
            <Card className="p-3">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SearchField
                    value={productSearch}
                    onChange={setProductSearch}
                    placeholder="Search perfumes by name, SKU or brand..."
                  />
                </div>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setShowCameraScanner(true)}
                  className="gap-2 shrink-0"
                >
                  <Camera className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline">Camera</span>
                </Button>
              </div>

              {/* Quick Manual Barcode Input */}
              <div className="mt-2.5 pt-2.5 border-t border-border/60 flex items-center gap-2">
                <Barcode className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleBarcodeScanned(manualBarcode);
                    }
                  }}
                  placeholder="Scan or enter barcode number + Press Enter"
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                {manualBarcode && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleBarcodeScanned(manualBarcode)}
                  >
                    Lookup
                  </Button>
                )}
              </div>

              {scanNotice && (
                <div className="mt-2 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary flex items-center gap-2 animate-in fade-in">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{scanNotice}</span>
                </div>
              )}
            </Card>

            {/* Category Filter Chips */}
            <div className="overflow-x-auto pb-1 no-scrollbar">
              <FilterChips
                options={categories.map((c) => ({
                  id: c,
                  label: c === "ALL" ? "All Items" : c,
                  count:
                    c === "ALL"
                      ? products.length
                      : products.filter((p) => p.category === c).length,
                }))}
                selected={selectedCategory}
                onChange={setSelectedCategory}
              />
            </div>

            {/* Product Grid */}
            {filteredProducts.length === 0 ? (
              <Card className="p-12 text-center text-muted-foreground">
                <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">No perfumes match your search</p>
                <p className="text-xs mt-1">Try another keyword or category</p>
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((p) => {
                  const inCart = cart.find((item) => item.productId === p.id);
                  const isOutOfStock = p.remainingStock <= 0;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => addToCart(p)}
                      className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[135px] relative group ${
                        isOutOfStock
                          ? "bg-muted/40 border-border opacity-50 cursor-not-allowed"
                          : inCart
                          ? "bg-card border-primary/60 shadow-md shadow-primary/5 ring-1 ring-primary/40"
                          : "bg-card border-border hover:border-primary/40 hover:shadow-sm"
                      }`}
                    >
                      {inCart && (
                        <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-primary text-primary-foreground font-black text-xs flex items-center justify-center shadow-sm">
                          {inCart.quantity}
                        </div>
                      )}

                      <div>
                        <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider line-clamp-1">
                          {p.category || "Perfume"}
                        </div>
                        <h4 className="text-xs font-bold text-foreground mt-0.5 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                          {p.name}
                        </h4>
                      </div>

                      <div className="pt-2 mt-2 border-t border-border/40 flex items-end justify-between">
                        <div>
                          <div className="text-xs font-black text-foreground">
                            <Money amount={p.sellingPriceNum} />
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {isOutOfStock ? (
                              <span className="text-destructive font-bold">Out of stock</span>
                            ) : (
                              <span>{p.remainingStock} in stock</span>
                            )}
                          </div>
                        </div>

                        {!isOutOfStock && (
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                            <Plus className="w-3.5 h-3.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Desktop Cart Ticket (Cols 8-12) */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-20">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Current Order</h3>
                  <p className="text-xs text-muted-foreground">
                    {cart.reduce((s, i) => s + i.quantity, 0)} items in ticket
                  </p>
                </div>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart} className="text-xs text-muted-foreground hover:text-destructive">
                    Clear Ticket
                  </Button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {cart.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-semibold">Cart is currently empty</p>
                    <p className="text-[11px] mt-0.5">Click any perfume to add to this sale</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.productId}
                      className="p-2.5 rounded-xl bg-muted/30 border border-border/60 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-foreground truncate">
                          {item.product.name}
                        </h4>
                        <div className="text-[11px] text-muted-foreground">
                          <Money amount={item.unitPrice} /> each
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <IconButton
                          aria-label="Decrease quantity"
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartQty(item.productId, -1)}
                        >
                          <Minus className="w-3 h-3" />
                        </IconButton>
                        <span className="w-6 text-center text-xs font-black tabular-nums">
                          {item.quantity}
                        </span>
                        <IconButton
                          aria-label="Increase quantity"
                          size="sm"
                          variant="outline"
                          disabled={item.quantity >= item.product.remainingStock}
                          onClick={() => updateCartQty(item.productId, 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </IconButton>
                        <IconButton
                          aria-label="Remove item"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.productId)}
                          className="text-muted-foreground hover:text-destructive ml-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </IconButton>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Order Calculations */}
              {cart.length > 0 && (
                <div className="pt-3 border-t border-border space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="font-semibold text-foreground">
                      <Money amount={cartSubtotal} />
                    </span>
                  </div>
                  {discountVal > 0 && (
                    <div className="flex justify-between text-success">
                      <span>Discount</span>
                      <span className="font-semibold">
                        -<Money amount={discountVal} />
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-foreground pt-2 border-t border-border">
                    <span>Total Due</span>
                    <span className="text-primary text-base">
                      <Money amount={cartTotal} />
                    </span>
                  </div>

                  <Button
                    size="lg"
                    className="w-full mt-4 font-black"
                    onClick={() => setShowCheckoutSheet(true)}
                  >
                    Proceed to Payment
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Mobile Sticky Bottom Cart Bar */}
          {cart.length > 0 && (
            <div className="lg:hidden fixed bottom-16 left-0 right-0 p-3 z-40 bg-background/90 backdrop-blur-md border-t border-border animate-in slide-in-from-bottom-2">
              <div className="max-w-md mx-auto flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground">
                    {cart.reduce((s, i) => s + i.quantity, 0)} items in ticket
                  </div>
                  <div className="text-base font-black text-primary">
                    <Money amount={cartTotal} />
                  </div>
                </div>
                <Button
                  size="md"
                  onClick={() => setShowCheckoutSheet(true)}
                  className="font-black px-6"
                >
                  Review & Charge
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SALES HISTORY VIEW */}
      {activeTab === "history" && (
        <div className="space-y-6">
          {/* KPI Summary Bar */}
          <div className="rounded-lg border border-border bg-card grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-border">
            <div className="p-4">
              <div className="text-xs font-medium text-muted-foreground mb-1">Total Revenue</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                <Money amount={summary.totalSalesRevenue} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {summary.totalTransactions} transactions
              </div>
            </div>

            <div className="p-4">
              <div className="text-xs font-medium text-muted-foreground mb-1">Cash Collected</div>
              <div className="text-2xl font-bold text-success tabular-nums">
                <Money amount={summary.totalAmountCollected} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Realized cash inflow</div>
            </div>

            <div className="p-4">
              <div className="text-xs font-medium text-muted-foreground mb-1">Outstanding Credit</div>
              <div className="text-2xl font-bold text-warning tabular-nums">
                <Money amount={summary.totalOutstanding} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Pending debtor balance</div>
            </div>

            <div className="p-4">
              <div className="text-xs font-medium text-muted-foreground mb-1">Gross Profit</div>
              <div className="text-2xl font-bold text-foreground tabular-nums">
                <Money amount={summary.totalGrossProfit} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {summary.profitMargin ? `${summary.profitMargin.toFixed(1)}% margin` : "FIFO calculated"}
              </div>
            </div>
          </div>

          {/* History Filters */}
          <div className="rounded-lg border border-border bg-card p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <SearchField
                  value={historySearch}
                  onChange={setHistorySearch}
                  placeholder="Filter sales by invoice # or customer..."
                />
              </div>

              <div className="flex gap-2">
                <Select
                  value={historyRange}
                  onChange={(e) => setHistoryRange(e.target.value)}
                  options={[
                    { value: "ALL", label: "All Time" },
                    { value: "TODAY", label: "Today" },
                    { value: "THIS_WEEK", label: "This Week" },
                    { value: "THIS_MONTH", label: "This Month" },
                  ]}
                  className="w-36"
                />

                <Select
                  value={historyPaymentStatus}
                  onChange={(e) => setHistoryPaymentStatus(e.target.value)}
                  options={[
                    { value: "ALL", label: "All Statuses" },
                    { value: "PAID", label: "Fully Paid" },
                    { value: "PARTIAL", label: "Partial / Credit" },
                    { value: "VOIDED", label: "Voided" },
                  ]}
                  className="w-36"
                />
              </div>
            </div>
          </div>

          {/* Sales Transactions Table */}
          {sales.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-12 text-center text-muted-foreground">
              <p className="text-sm font-medium">No sales transactions found</p>
              <p className="text-xs mt-1 text-muted-foreground/80">Try relaxing filters or record a new sale in the Sell tab</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground border-b border-border select-none">
                    <tr>
                      <th className="py-3 px-4 font-medium">Invoice & Date</th>
                      <th className="py-3 px-4 font-medium">Customer</th>
                      <th className="py-3 px-4 font-medium">Items</th>
                      <th className="py-3 px-4 font-medium">Payment Method</th>
                      <th className="py-3 px-4 font-medium text-right">Amount</th>
                      <th className="py-3 px-4 font-medium">Status</th>
                      <th className="py-3 px-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {sales.map((s) => {
                      const isVoided = s.status === "VOIDED";
                      const isPartial = s.paymentStatus === "PARTIAL" || s.balanceDue > 0;
                      const formattedDate = new Date(s.saleDate).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-secondary/40 transition-colors ${
                            isVoided ? "opacity-60 bg-secondary/20" : ""
                          }`}
                        >
                          <td className="py-3 px-4">
                            <span className="font-mono text-xs font-semibold text-foreground">
                              #{s.id.slice(-6).toUpperCase()}
                            </span>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{formattedDate}</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className="font-medium text-foreground">
                              {s.customer?.name || "Walk-in Client"}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-muted-foreground tabular-nums">
                            {s.saleItems.length} {s.saleItems.length === 1 ? "item" : "items"}
                          </td>

                          <td className="py-3 px-4 text-muted-foreground">
                            {s.paymentMethod}
                          </td>

                          <td className="py-3 px-4 text-right tabular-nums">
                            <div className="font-semibold text-foreground">
                              <Money amount={s.totalAmount} />
                            </div>
                            <div className="text-[11px] text-success font-medium">
                              +<Money amount={s.grossProfit} /> margin
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            {isVoided ? (
                              <span className="text-destructive font-medium text-xs">Voided</span>
                            ) : isPartial ? (
                              <span className="text-warning font-medium text-xs">
                                Due: {formatCurrency(s.balanceDue)}
                              </span>
                            ) : (
                              <span className="text-success font-medium text-xs">Paid</span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReceiptSale(s)}
                              >
                                Receipt
                              </Button>

                              {isPartial && !isVoided && (
                                <Button
                                  size="sm"
                                  variant="primary"
                                  onClick={() => {
                                    setDebtSale(s);
                                    setDebtAmount(s.balanceDue.toString());
                                    setDebtNotes(`Payment for #${s.id.slice(-6)}`);
                                  }}
                                >
                                  Collect
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedSaleDetail(s)}
                              >
                                Details
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Transaction Rows */}
              <div className="md:hidden divide-y divide-border">
                {sales.map((s) => {
                  const isVoided = s.status === "VOIDED";
                  const isPartial = s.paymentStatus === "PARTIAL" || s.balanceDue > 0;
                  const formattedDate = new Date(s.saleDate).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <div
                      key={s.id}
                      className={`p-3.5 space-y-2.5 ${
                        isVoided ? "opacity-60 bg-secondary/20" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-foreground text-xs">
                            {s.customer?.name || "Walk-in Client"}
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            #{s.id.slice(-6).toUpperCase()} • {formattedDate}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold text-foreground text-xs tabular-nums">
                            <Money amount={s.totalAmount} />
                          </div>
                          <div className="text-[10px] text-success font-medium tabular-nums mt-0.5">
                            +<Money amount={s.grossProfit} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
                        <div>
                          {isVoided ? (
                            <span className="text-destructive font-medium text-[11px]">Voided</span>
                          ) : isPartial ? (
                            <span className="text-warning font-medium text-[11px]">
                              Due: {formatCurrency(s.balanceDue)}
                            </span>
                          ) : (
                            <span className="text-success font-medium text-[11px]">Paid • {s.paymentMethod}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setReceiptSale(s)}
                          >
                            Receipt
                          </Button>
                          {isPartial && !isVoided && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => {
                                setDebtSale(s);
                                setDebtAmount(s.balanceDue.toString());
                                setDebtNotes(`Payment for #${s.id.slice(-6)}`);
                              }}
                            >
                              Collect
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedSaleDetail(s)}
                          >
                            Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* CHECKOUT SHEET / MODAL */}
      <Sheet
        isOpen={showCheckoutSheet}
        onClose={() => setShowCheckoutSheet(false)}
        title="Complete Checkout"
        description="Verify order total, customer record & payment method"
      >
        <form onSubmit={handleCheckout} className="space-y-4 pt-2">
          {saleError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{saleError}</span>
            </div>
          )}

          {/* Cart Items Summary inside Checkout */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-2">
            <div className="text-xs font-bold text-foreground">Items in Order ({cart.length})</div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {cart.map((i) => (
                <div key={i.productId} className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate max-w-[200px]">
                    {i.quantity}x {i.product.name}
                  </span>
                  <span className="font-semibold text-foreground">
                    <Money amount={i.quantity * i.unitPrice} />
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border flex justify-between text-sm font-black text-foreground">
              <span>Total Payable</span>
              <span className="text-primary">
                <Money amount={cartTotal} />
              </span>
            </div>
          </div>

          {/* Customer Selection */}
          <Select
            label="Customer (Required for Debt/Credit)"
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            options={[
              { value: "", label: "Walk-in Customer (No debt allowed)" },
              ...customers.map((c) => ({
                value: c.id,
                label: `${c.name} ${c.phone ? `(${c.phone})` : ""}`,
              })),
            ]}
          />

          {/* Payment Method */}
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: "CASH", label: "Cash" },
              { value: "BANK_TRANSFER", label: "Bank Transfer" },
              { value: "MOMO", label: "Mobile Money (MoMo)" },
              { value: "CARD", label: "POS Card Payment" },
              { value: "CREDIT", label: "100% Credit / Pay Later" },
            ]}
          />

          {/* Discount & Partial Payment */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Discount (GH₵)"
              type="number"
              step="any"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0.00"
            />

            <div className="flex flex-col justify-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                <input
                  type="checkbox"
                  checked={isPartialCredit}
                  onChange={(e) => {
                    setIsPartialCredit(e.target.checked);
                    if (e.target.checked && !amountPaid) {
                      setAmountPaid(Math.floor(cartTotal / 2).toString());
                    }
                  }}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <span>Partial / Split Credit</span>
              </label>
            </div>
          </div>

          {isPartialCredit && (
            <div className="p-3 rounded-2xl bg-warning/10 border border-warning/30 space-y-2">
              <Input
                label="Amount Paid Upfront (GH₵)"
                type="number"
                step="any"
                min="0"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
              />
              <div className="flex justify-between text-xs font-bold text-foreground pt-1">
                <span>Remaining Debt Due:</span>
                <span className="text-warning">
                  <Money amount={balanceDue} />
                </span>
              </div>
            </div>
          )}

          {/* Notes */}
          <Textarea
            label="Internal Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Delivery details, special packaging request..."
          />

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowCheckoutSheet(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-black"
              isLoading={submittingSale}
            >
              Confirm & Print Receipt
            </Button>
          </div>
        </form>
      </Sheet>

      {/* RECORD DEBT PAYMENT SHEET */}
      <Sheet
        isOpen={!!debtSale}
        onClose={() => setDebtSale(null)}
        title="Record Debt Settlement"
        description={debtSale ? `Invoice #${debtSale.id.slice(-6).toUpperCase()} • Customer: ${debtSale.customer?.name}` : ""}
      >
        <form onSubmit={handleRecordDebtPayment} className="space-y-4 pt-2">
          {debtError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{debtError}</span>
            </div>
          )}

          <div className="p-3 rounded-2xl bg-muted/40 border border-border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Original Invoice Total:</span>
              <span className="font-bold">{debtSale && formatCurrency(debtSale.totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Already Paid:</span>
              <span className="font-bold text-success">{debtSale && formatCurrency(debtSale.amountPaid)}</span>
            </div>
            <div className="flex justify-between text-sm font-black pt-1 border-t border-border">
              <span>Outstanding Due:</span>
              <span className="text-warning">{debtSale && formatCurrency(debtSale.balanceDue)}</span>
            </div>
          </div>

          <Input
            label="Settlement Amount (GH₵)"
            type="number"
            step="any"
            min="0.01"
            value={debtAmount}
            onChange={(e) => setDebtAmount(e.target.value)}
            required
          />

          <Select
            label="Payment Method"
            value={debtMethod}
            onChange={(e) => setDebtMethod(e.target.value)}
            options={[
              { value: "CASH", label: "Cash" },
              { value: "BANK_TRANSFER", label: "Bank Transfer" },
              { value: "MOMO", label: "Mobile Money (MoMo)" },
              { value: "CARD", label: "Card Payment" },
            ]}
          />

          <Input
            label="Notes"
            value={debtNotes}
            onChange={(e) => setDebtNotes(e.target.value)}
            placeholder="MoMo transaction ID or settlement note"
          />

          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setDebtSale(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1 font-black"
              isLoading={debtSubmitting}
            >
              Apply Payment
            </Button>
          </div>
        </form>
      </Sheet>

      {/* SALE DETAIL SHEET */}
      <Sheet
        isOpen={!!selectedSaleDetail}
        onClose={() => setSelectedSaleDetail(null)}
        title={selectedSaleDetail ? `Invoice #${selectedSaleDetail.id.slice(-6).toUpperCase()}` : "Sale Details"}
        description={selectedSaleDetail?.customer?.name || "Walk-in Customer"}
      >
        {selectedSaleDetail && (
          <div className="space-y-4 pt-2 text-xs">
            {/* Quick Summary Pill */}
            <div className="p-3 rounded-2xl bg-muted/40 border border-border space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sale Date</span>
                <span className="font-bold text-foreground">
                  {new Date(selectedSaleDetail.saleDate).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method</span>
                <Badge variant="outline">{selectedSaleDetail.paymentMethod}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={
                    selectedSaleDetail.status === "VOIDED"
                      ? "destructive"
                      : selectedSaleDetail.balanceDue > 0
                      ? "warning"
                      : "success"
                  }
                >
                  {selectedSaleDetail.status}
                </Badge>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <h4 className="font-bold text-foreground mb-2">Line Items (FIFO Allocated)</h4>
              <div className="space-y-2">
                {selectedSaleDetail.saleItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-card border border-border flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-foreground">{item.product.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        Batch: {item.batch.reference} • {item.quantity} units @ {formatCurrency(item.unitPrice)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-foreground">
                        {formatCurrency(item.revenue)}
                      </div>
                      <div className="text-[11px] text-success">
                        +{formatCurrency(item.profit)} profit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-3 rounded-2xl bg-muted/20 border border-border space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedSaleDetail.subtotal)}</span>
              </div>
              {selectedSaleDetail.discount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span>-{formatCurrency(selectedSaleDetail.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-foreground pt-1 border-t border-border">
                <span>Total Amount</span>
                <span className="text-primary">{formatCurrency(selectedSaleDetail.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-success">
                <span>Total Amount Paid</span>
                <span>{formatCurrency(selectedSaleDetail.amountPaid)}</span>
              </div>
              {selectedSaleDetail.balanceDue > 0 && (
                <div className="flex justify-between text-warning font-bold">
                  <span>Balance Due</span>
                  <span>{formatCurrency(selectedSaleDetail.balanceDue)}</span>
                </div>
              )}
            </div>

            {/* Actions: Print Receipt & Void */}
            <div className="pt-2 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setReceiptSale(selectedSaleDetail);
                }}
              >
                <Printer className="w-4 h-4 mr-2" />
                Print / Share Receipt
              </Button>

              {selectedSaleDetail.status !== "VOIDED" && (
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => setVoidSaleTarget(selectedSaleDetail)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Void Sale
                </Button>
              )}
            </div>
          </div>
        )}
      </Sheet>

      {/* CONFIRM VOID DIALOG */}
      <ConfirmDialog
        isOpen={!!voidSaleTarget}
        title="Void Sale Invoice?"
        message="Voiding returns all sold perfume units back to their original batch inventories and marks this transaction as cancelled."
        confirmLabel="Confirm Void Sale"
        variant="destructive"
        isLoading={voidSubmitting}
        onClose={() => setVoidSaleTarget(null)}
        onConfirm={handleVoidSale}
      />

      {/* CAMERA BARCODE SCANNER MODAL */}
      {showCameraScanner && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-lg overflow-hidden border border-border shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                Scan Product Barcode
              </h3>
              <IconButton
                aria-label="Close Scanner"
                size="sm"
                variant="ghost"
                onClick={() => setShowCameraScanner(false)}
              >
                <X className="w-4 h-4" />
              </IconButton>
            </div>

            <div className="mt-4">
              <CameraScanner
                onScan={(code) => handleBarcodeScanned(code)}
                onClose={() => setShowCameraScanner(false)}
                hint="Position perfume box barcode inside the viewfinder"
              />
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE / SHAREABLE RECEIPT MODAL */}
      {receiptSale && (
        <ReceiptModal
          sale={receiptSale}
          isOpen={!!receiptSale}
          onClose={() => setReceiptSale(null)}
        />
      )}
    </div>
  );
}
